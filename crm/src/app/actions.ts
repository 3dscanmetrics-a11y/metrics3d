'use server';
import { getDb } from '@/lib/db';
import { mapInvoice, mapLead, toDbStatus } from '@/lib/map';
import { revalidatePath } from 'next/cache';
import { randomUUID } from 'crypto';
import { generateQuotePDF } from '@/lib/pdf';
import { Resend } from 'resend';
import { calculateQuote } from '../../scripts/engine';

export async function getLeads() {
  const db = await getDb();
  const { results } = await db.prepare('SELECT * FROM leads ORDER BY created_at DESC').all<Record<string, unknown>>();
  return (results ?? []).map((row) => mapLead(row)!);
}

export async function getInvoices() {
  const db = await getDb();
  const { results } = await db.prepare('SELECT * FROM invoices ORDER BY created_at DESC').all<Record<string, unknown>>();
  return (results ?? []).map(mapInvoice);
}

export async function getExpenses() {
  const db = await getDb();
  const { results } = await db.prepare('SELECT * FROM expenses ORDER BY date DESC').all();
  return results ?? [];
}

export async function addExpense(vendor: string, amount: number, category: string) {
  const db = await getDb();
  await db
    .prepare('INSERT INTO expenses (id, vendor, amount, category) VALUES (?, ?, ?, ?)')
    .bind(randomUUID(), vendor, amount, category)
    .run();
  revalidatePath('/');
}

export async function markInvoicePaid(id: string) {
  const db = await getDb();
  await db.prepare("UPDATE invoices SET status = 'PAID' WHERE id = ?").bind(id).run();
  revalidatePath('/');
}

async function fetchLead(db: CloudflareEnv['DB'], id: string) {
  const row = await db.prepare('SELECT * FROM leads WHERE id = ?').bind(id).first<Record<string, unknown>>();
  return mapLead(row);
}

export async function approveLead(id: string) {
  const db = await getDb();
  const lead = await fetchLead(db, id);
  if (!lead) return;

  const pdfBuffer = await generateQuotePDF(lead);
  const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy');

  if (process.env.RESEND_API_KEY) {
    try {
      await resend.emails.send({
        from: '3D Scan Metrics <estimates@3dscanmetrics.co.za>',
        to: String(lead.email),
        subject: `Your Formal Quote: ${(lead.project as string) || '3D Scanning Project'}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #111827;">
              <h2 style="color: #00e5ff;">3D Scan Metrics</h2>
              <p>Hi ${(lead.name as string) || 'there'},</p>
              <p>Thank you for reaching out regarding the <strong>${(lead.project as string) || 'project'}</strong>.</p>
              <p>Please find attached your formal scoping estimate based on the parameters extracted from your request.</p>
              <p>Our lead engineer will review this file and follow up shortly to confirm availability.</p>
              <br/>
              <p>Best regards,<br/>The 3D Scan Metrics Team</p>
          </div>
        `,
        attachments: [
          {
            filename: `Quote_3DScanMetrics_${String(lead.project || 'Project').replace(/\s+/g, '_')}.pdf`,
            content: pdfBuffer,
          },
        ],
      });
    } catch (e) {
      console.error('[Email] Failed to send quote via Resend:', e);
    }
  }

  await db
    .prepare("UPDATE leads SET status = ?, updated_at = datetime('now') WHERE id = ?")
    .bind(toDbStatus('SENT'), id)
    .run();

  await db
    .prepare('INSERT INTO invoices (id, lead_id, client_name, project, amount) VALUES (?, ?, ?, ?, ?)')
    .bind(
      randomUUID(),
      lead.id,
      (lead.name as string) || (lead.company as string) || 'Unknown Client',
      (lead.project as string) || 'Unknown Project',
      lead.quoteTotal
    )
    .run();

  revalidatePath('/');
}

export async function rejectLead(id: string) {
  const db = await getDb();
  await db
    .prepare("UPDATE leads SET status = ?, updated_at = datetime('now') WHERE id = ?")
    .bind(toDbStatus('REJECTED'), id)
    .run();
  revalidatePath('/');
}

export async function updateAndApproveLead(formData: FormData) {
  const id = formData.get('id') as string;
  const db = await getDb();
  const lead = await fetchLead(db, id);
  if (!lead) return;

  const newArea = Number(formData.get('area'));
  const newComplexity = formData.get('complexity') as string;
  const parsedDeliverables = JSON.parse((lead.deliverables as string) || '[]');

  const baseRateStr = formData.get('baseRate');
  const finalPriceStr = formData.get('finalPrice');

  const overrides: { baseRate?: number; finalPrice?: number } = {};
  if (baseRateStr) overrides.baseRate = Number(baseRateStr);
  if (finalPriceStr) overrides.finalPrice = Number(finalPriceStr);

  const quote = calculateQuote(newArea, newComplexity as never, parsedDeliverables, overrides);
  const formatted = new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(quote.totalPrice);

  await db
    .prepare(
      `UPDATE leads SET area = ?, complexity = ?, estimate_zar = ?, estimate_formatted = ?,
       field_days = ?, process_days = ?, status = ?, updated_at = datetime('now') WHERE id = ?`
    )
    .bind(newArea, newComplexity, quote.totalPrice, formatted, quote.fieldDays, quote.processDays, toDbStatus('APPROVED'), id)
    .run();

  const updatedLead = await fetchLead(db, id);
  if (!updatedLead) return;

  const pdfBuffer = await generateQuotePDF(updatedLead);

  const files = formData.getAll('extra_attachments') as File[];
  const customAttachments = await Promise.all(
    files
      .filter((f) => f.size > 0)
      .map(async (file) => {
        const arrayBuffer = await file.arrayBuffer();
        return {
          filename: file.name,
          content: Buffer.from(arrayBuffer),
        };
      })
  );

  const allAttachments = [
    {
      filename: `Quote_3DScanMetrics_${String(updatedLead.project || 'Project').replace(/\s+/g, '_')}.pdf`,
      content: pdfBuffer,
    },
    ...customAttachments,
  ];

  if (process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: '3D Scan Metrics <estimates@3dscanmetrics.co.za>',
        to: String(updatedLead.email),
        subject: `Your Formal Quote: ${(updatedLead.project as string) || '3D Scanning Project'}`,
        html: `<p>Hi ${(updatedLead.name as string) || 'there'},</p><p>Please find attached your formal scoping estimate, along with any requested documentation.</p>`,
        attachments: allAttachments,
      });
    } catch {
      /* ignore email failures for MVP */
    }
  }

  await db
    .prepare("UPDATE leads SET status = ?, updated_at = datetime('now') WHERE id = ?")
    .bind(toDbStatus('SENT'), id)
    .run();

  await db
    .prepare('INSERT INTO invoices (id, lead_id, client_name, project, amount) VALUES (?, ?, ?, ?, ?)')
    .bind(
      randomUUID(),
      updatedLead.id,
      (updatedLead.name as string) || (updatedLead.company as string) || 'Unknown',
      (updatedLead.project as string) || 'Unknown',
      updatedLead.quoteTotal
    )
    .run();

  revalidatePath('/');
}
