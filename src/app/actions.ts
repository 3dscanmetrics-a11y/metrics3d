'use server';
import db from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { randomUUID } from 'crypto';

export async function getLeads() {
  return db.prepare('SELECT * FROM leads ORDER BY createdAt DESC').all();
}

export async function getInvoices() {
  return db.prepare('SELECT * FROM invoices ORDER BY createdAt DESC').all();
}

export async function getExpenses() {
  return db.prepare('SELECT * FROM expenses ORDER BY date DESC').all();
}

export async function addExpense(vendor: string, amount: number, category: string) {
  const stmt = db.prepare('INSERT INTO expenses (id, vendor, amount, category) VALUES (?, ?, ?, ?)');
  stmt.run(randomUUID(), vendor, amount, category);
  revalidatePath('/');
}

export async function markInvoicePaid(id: string) {
  const stmt = db.prepare("UPDATE invoices SET status = 'PAID' WHERE id = ?");
  stmt.run(id);
  revalidatePath('/');
}

import { generateQuotePDF } from '@/lib/pdf';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy');

export async function approveLead(id: string) {
  const lead: any = db.prepare('SELECT * FROM leads WHERE id = ?').get(id);
  if (!lead) return;

  // 1. Generate the PDF Quote
  const pdfBuffer = await generateQuotePDF(lead);

  // 2. Dispatch Email via Resend
  if (process.env.RESEND_API_KEY) {
    try {
      await resend.emails.send({
        from: '3D Scan Metrics <estimates@3dscanmetrics.co.za>',
        to: lead.email,
        subject: `Your Formal Quote: ${lead.project || '3D Scanning Project'}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #111827;">
              <h2 style="color: #00e5ff;">3D Scan Metrics</h2>
              <p>Hi ${lead.name || 'there'},</p>
              <p>Thank you for reaching out regarding the <strong>${lead.project || 'project'}</strong>.</p>
              <p>Please find attached your formal scoping estimate based on the parameters extracted from your request.</p>
              <p>Our lead engineer will review this file and follow up shortly to confirm availability.</p>
              <br/>
              <p>Best regards,<br/>The 3D Scan Metrics Team</p>
          </div>
        `,
        attachments: [
          {
            filename: `Quote_3DScanMetrics_${(lead.project || 'Project').replace(/\s+/g, '_')}.pdf`,
            content: pdfBuffer,
          }
        ]
      });
      console.log(`[Email] Successfully dispatched quote to ${lead.email}`);
    } catch (e) {
      console.error('[Email] Failed to send quote via Resend:', e);
    }
  } else {
    console.warn('[Email] RESEND_API_KEY missing, skipping actual email dispatch. PDF generated in memory.');
  }

  // 3. Update Status to SENT
  const stmt = db.prepare("UPDATE leads SET status = 'SENT' WHERE id = ?");
  stmt.run(id);

  // 4. Automatically create an invoice in the ledger
  const invStmt = db.prepare("INSERT INTO invoices (id, leadId, clientName, project, amount) VALUES (?, ?, ?, ?, ?)");
  invStmt.run(randomUUID(), lead.id, lead.name || lead.company || 'Unknown Client', lead.project || 'Unknown Project', lead.quoteTotal);

  revalidatePath('/');
}

export async function rejectLead(id: string) {
  const stmt = db.prepare("UPDATE leads SET status = 'REJECTED' WHERE id = ?");
  stmt.run(id);
  revalidatePath('/');
}

import { calculateQuote } from '../../scripts/engine';

export async function updateAndApproveLead(formData: FormData) {
  const id = formData.get('id') as string;
  const lead: any = db.prepare('SELECT * FROM leads WHERE id = ?').get(id);
  if (!lead) return;

  const newArea = Number(formData.get('area'));
  const newComplexity = formData.get('complexity') as string;
  const parsedDeliverables = JSON.parse(lead.deliverables || '[]');

  // Check for advanced overrides
  const baseRateStr = formData.get('baseRate');
  const finalPriceStr = formData.get('finalPrice');
  
  const overrides: any = {};
  if (baseRateStr) overrides.baseRate = Number(baseRateStr);
  if (finalPriceStr) overrides.finalPrice = Number(finalPriceStr);

  // Recalculate quote based on manual overrides
  const quote = calculateQuote(newArea, newComplexity as any, parsedDeliverables, overrides);

  // Update DB with overridden values and new quote
  const updateStmt = db.prepare("UPDATE leads SET area = ?, complexity = ?, quoteTotal = ?, fieldDays = ?, processDays = ?, status = 'APPROVED' WHERE id = ?");
  updateStmt.run(newArea, newComplexity, quote.totalPrice, quote.fieldDays, quote.processDays, id);

  // Re-fetch updated lead for PDF generation
  const updatedLead: any = db.prepare('SELECT * FROM leads WHERE id = ?').get(id);

  // 1. Generate the PDF Quote
  const pdfBuffer = await generateQuotePDF(updatedLead);

  // Parse any extra custom attachments from the UI
  const files = formData.getAll('extra_attachments') as File[];
  const customAttachments = await Promise.all(
    files.filter(f => f.size > 0).map(async (file) => {
      const arrayBuffer = await file.arrayBuffer();
      return {
        filename: file.name,
        content: Buffer.from(arrayBuffer)
      };
    })
  );

  const allAttachments = [
    { filename: `Quote_3DScanMetrics_${(updatedLead.project || 'Project').replace(/\s+/g, '_')}.pdf`, content: pdfBuffer },
    ...customAttachments
  ];

  // 2. Dispatch Email via Resend
  if (process.env.RESEND_API_KEY) {
    try {
      await resend.emails.send({
        from: '3D Scan Metrics <estimates@3dscanmetrics.co.za>',
        to: updatedLead.email,
        subject: `Your Formal Quote: ${updatedLead.project || '3D Scanning Project'}`,
        html: `<p>Hi ${updatedLead.name || 'there'},</p><p>Please find attached your formal scoping estimate, along with any requested documentation.</p>`,
        attachments: allAttachments
      });
    } catch (e) {}
  }

  // 3. Update Status to SENT
  db.prepare("UPDATE leads SET status = 'SENT' WHERE id = ?").run(id);

  // 4. Create Invoice
  const invStmt = db.prepare("INSERT INTO invoices (id, leadId, clientName, project, amount) VALUES (?, ?, ?, ?, ?)");
  invStmt.run(randomUUID(), updatedLead.id, updatedLead.name || updatedLead.company || 'Unknown', updatedLead.project || 'Unknown', updatedLead.quoteTotal);

  revalidatePath('/');
}


