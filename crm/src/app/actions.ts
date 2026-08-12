'use server';
import { getDb } from '@/lib/db';
import { mapInvoice, mapLead, toDbStatus } from '@/lib/map';
import { revalidatePath } from 'next/cache';
import { randomUUID } from 'crypto';
import { generateQuotePDF } from '@/lib/pdf';
import { Resend } from 'resend';
import { calculateEstimateRange, DEFAULT_PRICING, formatRange } from '@/lib/pricing';

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

function quoteFromForm(formData: FormData) {
  let deliverables: string[] = [];
  try {
    deliverables = JSON.parse(String(formData.get('deliverables') || '[]'));
  } catch {
    deliverables = [];
  }
  const area = Number(formData.get('area'));
  const complexity = String(formData.get('complexity') || '');
  const access = String(formData.get('access') || '');
  const accuracy = String(formData.get('accuracy') || 'Standard');
  const bimLevel = String(formData.get('bimLevel') || '300');
  const range = calculateEstimateRange(DEFAULT_PRICING, {
    area,
    complexity,
    deliverables,
    access,
    accuracy,
    bimLevel,
  });
  const firm = Number(formData.get('firmAmount')) || range.mid;
  return { area, complexity, access, accuracy, bimLevel, deliverables, range, firm };
}

async function persistLeadQuote(
  db: CloudflareEnv['DB'],
  id: string,
  existingPayload: Record<string, unknown>,
  q: ReturnType<typeof quoteFromForm>,
  originalFormatted?: string
) {
  const payload = {
    ...existingPayload,
    area: q.area,
    complexity: q.complexity,
    access: q.access,
    accuracy: q.accuracy,
    bimLevel: q.bimLevel,
    deliverables: q.deliverables,
    firmAmount: q.firm,
    publicEstimate:
      existingPayload.publicEstimate || originalFormatted || formatRange(q.range.low, q.range.high),
  };
  await db
    .prepare(
      `UPDATE leads SET area = ?, complexity = ?, deliverables_json = ?, payload_json = ?,
       estimate_zar = ?, estimate_formatted = ?, estimate_low = ?, estimate_high = ?,
       field_days = ?, process_days = ?, updated_at = datetime('now') WHERE id = ?`
    )
    .bind(
      q.area,
      q.complexity,
      JSON.stringify(q.deliverables),
      JSON.stringify(payload),
      q.range.mid,
      formatRange(q.range.low, q.range.high),
      q.range.low,
      q.range.high,
      q.range.fieldDays,
      q.range.processDays,
      id
    )
    .run();
}

export async function saveLeadQuote(formData: FormData) {
  const id = formData.get('id') as string;
  const db = await getDb();
  const lead = await fetchLead(db, id);
  if (!lead) return;
  const q = quoteFromForm(formData);
  await persistLeadQuote(db, id, lead.payload, q, lead.estimateFormatted);
  revalidatePath('/');
}

export async function sendFormalQuote(formData: FormData) {
  const id = formData.get('id') as string;
  const db = await getDb();
  const lead = await fetchLead(db, id);
  if (!lead) return;
  const q = quoteFromForm(formData);
  await persistLeadQuote(db, id, lead.payload, q, lead.estimateFormatted);

  const updated = await fetchLead(db, id);
  if (!updated) return;
  const forPdf = { ...updated, quoteTotal: q.firm };

  const pdfBuffer = await generateQuotePDF(forPdf);
  if (process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: '3D Scan Metrics <estimates@3dscanmetrics.co.za>',
        to: String(updated.email),
        subject: `Your Formal Quote: ${updated.project || '3D Scanning Project'}`,
        html: `<p>Hi ${updated.name || 'there'},</p><p>Please find attached your formal scoping estimate.</p>`,
        attachments: [
          {
            filename: `Quote_3DScanMetrics_${String(updated.project || 'Project').replace(/\s+/g, '_')}.pdf`,
            content: pdfBuffer,
          },
        ],
      });
    } catch (e) {
      console.error('[sendFormalQuote] email failed', e);
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
      updated.id,
      updated.name || updated.company || 'Unknown',
      updated.project || 'Unknown',
      q.firm
    )
    .run();

  revalidatePath('/');
}

export async function updateAndApproveLead(formData: FormData) {
  return sendFormalQuote(formData);
}
