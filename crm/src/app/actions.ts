'use server';
import { getDb } from '@/lib/db';
import { mapInvoice, mapLead, toDbStatus } from '@/lib/map';
import { revalidatePath } from 'next/cache';
import { randomUUID } from 'crypto';
import { generateQuotePDF, generateTaxInvoicePDF, generateClientStatementPDF } from '@/lib/pdf';
import { Resend } from 'resend';
import { calculateEstimateRange, DEFAULT_PRICING, formatRange } from '@/lib/pricing';
import { generateInvoiceLineItems, getLeadBreakdownItems } from '@/lib/financials';
import { draftOverdueInvoiceEmail } from '@/lib/ai/followup';

export async function getLeads() {
  const db = await getDb();
  const { results } = await db.prepare('SELECT * FROM leads ORDER BY created_at DESC').all<Record<string, unknown>>();
  return (results ?? []).map((row) => mapLead(row)!);
}

export async function getWebsiteLeads() {
  const db = await getDb();
  const { results } = await db.prepare("SELECT * FROM leads WHERE LOWER(status) IN ('new', 'pending', 'contacted') ORDER BY created_at DESC").all<Record<string, unknown>>();
  return (results ?? []).map((row) => mapLead(row)!);
}

export async function getQuotations() {
  const db = await getDb();
  const { results } = await db.prepare("SELECT * FROM leads WHERE LOWER(status) IN ('sent', 'quote_sent', 'approved') ORDER BY created_at DESC").all<Record<string, unknown>>();
  return (results ?? []).map((row) => mapLead(row)!);
}

export async function getInvoices() {
  const db = await getDb();
  const { results: invoiceRows } = await db.prepare('SELECT * FROM invoices ORDER BY created_at DESC').all<Record<string, unknown>>();
  if (!invoiceRows || invoiceRows.length === 0) return [];

  // Load automation logs for invoice reminder tracking & per-invoice auto-remind toggles
  let logRows: Record<string, unknown>[] = [];
  try {
    const resLogs = await db
      .prepare("SELECT * FROM ai_automation_logs WHERE entity_type = 'invoice' ORDER BY created_at ASC")
      .all<Record<string, unknown>>();
    logRows = resLogs.results ?? [];
  } catch {
    logRows = [];
  }

  const invoices = [];
  for (const row of invoiceRows) {
    const invId = String(row.id);
    const { results: itemRows } = await db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').bind(invId).all<Record<string, unknown>>();

    let lead: any = null;
    let client: any = null;

    const leadId = row.leadId || row.lead_id;
    if (leadId) {
      const leadRow = await db.prepare('SELECT * FROM leads WHERE id = ?').bind(leadId).first<Record<string, unknown>>();
      lead = mapLead(leadRow);
    }

    const searchEmail = String(lead?.email || row.clientEmail || row.client_email || '').trim();
    const searchName = String(row.client_name || row.clientName || lead?.company || lead?.name || '').trim();

    if (searchEmail && searchName) {
      client = await db
        .prepare('SELECT * FROM clients WHERE LOWER(email) = LOWER(?) OR LOWER(company) = LOWER(?) OR LOWER(name) = LOWER(?)')
        .bind(searchEmail, searchName, searchName)
        .first<Record<string, unknown>>();
    } else if (searchEmail) {
      client = await db
        .prepare('SELECT * FROM clients WHERE LOWER(email) = LOWER(?)')
        .bind(searchEmail)
        .first<Record<string, unknown>>();
    } else if (searchName) {
      client = await db
        .prepare('SELECT * FROM clients WHERE LOWER(company) = LOWER(?) OR LOWER(name) = LOWER(?)')
        .bind(searchName, searchName)
        .first<Record<string, unknown>>();
    }

    let items: any[] = (itemRows || []).map((i) => ({
      id: String(i.id),
      description: String(i.description || 'Line Item'),
      quantity: Number(i.quantity || 1),
      unitPriceZar: Number(i.unit_price_zar || i.unitPriceZar || 0),
      totalZar: Number(i.total_zar || i.totalZar || 0),
    }));

    if (items.length === 0 && lead) {
      items = getLeadBreakdownItems(lead);
    }

    const invAmount = Number(row.amount || 0);
    let statusStr = String(row.status || 'UNPAID').toUpperCase();
    let amountPaid = Number(row.amount_paid ?? row.amountPaid ?? 0);
    if (statusStr === 'PAID') {
      amountPaid = invAmount;
    } else if (amountPaid >= invAmount && invAmount > 0) {
      amountPaid = invAmount;
      statusStr = 'PAID';
    } else if (amountPaid > 0 && statusStr === 'UNPAID') {
      statusStr = 'PARTIAL';
    }

    const createdAtIso = String(row.createdAt || row.created_at || new Date().toISOString());
    const paymentTermsStr = String(row.paymentTerms || row.payment_terms || client?.payment_terms || client?.paymentTerms || '30 Days');

    // Calculate due date from due_date column or createdAt + paymentTerms
    let dueDays = 30;
    const termsLower = paymentTermsStr.toLowerCase();
    if (termsLower.includes('receipt') || termsLower.includes('due on') || termsLower.includes('cod') || termsLower.includes('50%')) {
      dueDays = 0;
    } else if (termsLower.includes('7')) {
      dueDays = 7;
    } else if (termsLower.includes('14')) {
      dueDays = 14;
    } else if (termsLower.includes('60')) {
      dueDays = 60;
    }

    const rawDueDate = String(row.dueDate || row.due_date || '').trim();
    const createdMs = new Date(createdAtIso).getTime() || Date.now();
    const dueMs = rawDueDate ? (new Date(rawDueDate).getTime() || (createdMs + dueDays * 86400000)) : (createdMs + dueDays * 86400000);
    const computedDueDate = new Date(dueMs).toISOString();
    const daysOverdue = Math.floor((Date.now() - dueMs) / 86400000);

    // Inspect reminder settings & history for this invoice
    const invLogs = logRows.filter((l) => String(l.entity_id) === invId);
    const settingLogs = invLogs.filter((l) => String(l.action_type) === 'AUTO_REMIND_SETTING');
    const latestSetting = settingLogs.length > 0 ? settingLogs[settingLogs.length - 1] : null;
    const autoRemind = latestSetting ? String(latestSetting.status).toUpperCase() !== 'PAUSED' : true;

    const reminderLogs = invLogs.filter((l) => String(l.action_type) === 'PAYMENT_REMINDER');
    const reminderCount = reminderLogs.length;
    const latestReminder = reminderLogs.length > 0 ? reminderLogs[reminderLogs.length - 1] : null;
    const lastReminderAt = latestReminder ? String(latestReminder.created_at || '') : '';
    const lastReminderStage = latestReminder ? String(latestReminder.status || '') : '';
    const sentStages = new Set(reminderLogs.map((l) => String(l.status || '').toUpperCase()));

    let targetStage: string | null = null;
    if (daysOverdue >= 30) targetStage = 'STAGE_30_DAYS';
    else if (daysOverdue >= 14) targetStage = 'STAGE_14_DAYS';
    else if (daysOverdue >= 7) targetStage = 'STAGE_7_DAYS';
    else if (daysOverdue >= 0) targetStage = 'STAGE_DUE';

    const resolvedEmail = String(client?.email || lead?.email || row.clientEmail || row.client_email || '');
    const balanceRemaining = Math.max(0, Math.round((invAmount - amountPaid) * 100) / 100);
    const isUnpaidOrPartial = (statusStr === 'UNPAID' || statusStr === 'PARTIAL') && balanceRemaining > 0;
    const msSinceLastReminder = lastReminderAt ? Date.now() - (new Date(lastReminderAt).getTime() || 0) : Infinity;

    const nextDueStage =
      isUnpaidOrPartial &&
      autoRemind &&
      Boolean(resolvedEmail) &&
      targetStage &&
      !sentStages.has(targetStage) &&
      msSinceLastReminder > 2 * 86400000
        ? targetStage
        : null;

    invoices.push({
      ...row,
      id: invId,
      leadId: leadId ? String(leadId) : '',
      clientId: client?.id ? String(client.id) : '',
      clientName: String(row.client_name || row.clientName || client?.company || lead?.company || client?.name || lead?.name || 'Valued Client'),
      contactName: String(client?.name || lead?.name || row.clientName || row.client_name || 'Valued Client'),
      clientCompany: String(client?.company || lead?.company || row.client_name || row.clientName || ''),
      clientEmail: resolvedEmail,
      clientPhone: String(client?.phone || client?.mobile || lead?.phone || ''),
      clientAddress: [client?.billing_street || client?.billingStreet, client?.billing_city || client?.billingCity, client?.billing_postal_code || client?.billingPostalCode].filter(Boolean).join(', ') || (lead?.payload as any)?.siteLocation || '',
      clientVat: String(client?.vat_number || client?.vatNumber || client?.tax_number || client?.taxNumber || ''),
      clientReg: String(client?.registration_number || client?.registrationNumber || ''),
      paymentTerms: paymentTermsStr,
      project: String(row.project || lead?.project || '3D Laser Scanning Services'),
      amount: invAmount,
      amountPaid,
      status: statusStr,
      createdAt: createdAtIso,
      dueDate: computedDueDate,
      daysOverdue,
      autoRemind,
      reminderCount,
      lastReminderAt,
      lastReminderStage,
      nextDueStage,
      items,
    });
  }

  return invoices;
}

export async function updateInvoice(formData: FormData) {
  const id = String(formData.get('id') || '');
  const db = await getDb();
  if (!id) throw new Error('Invoice ID required');

  const clientName = String(formData.get('clientName') || '').trim();
  const clientEmail = String(formData.get('clientEmail') || '').trim();
  const clientPhone = String(formData.get('clientPhone') || '').trim();
  const clientAddress = String(formData.get('clientAddress') || '').trim();
  const clientVat = String(formData.get('clientVat') || '').trim();
  const paymentTerms = String(formData.get('paymentTerms') || '30 Days').trim();
  const project = String(formData.get('project') || '').trim();
  const amount = Number(formData.get('amount')) || 0;
  let rawStatus = String(formData.get('status') || 'UNPAID').toUpperCase();
  if (!['DRAFT', 'UNPAID', 'PARTIAL', 'PAID', 'VOID'].includes(rawStatus)) {
    rawStatus = 'UNPAID';
  }

  let amountPaid = Math.max(0, Number(formData.get('amountPaid')) || 0);
  let finalStatus = rawStatus;

  if (rawStatus === 'PAID') {
    amountPaid = amount;
    finalStatus = 'PAID';
  } else if (amountPaid >= amount && amount > 0) {
    amountPaid = amount;
    finalStatus = 'PAID';
  } else if (amountPaid > 0) {
    finalStatus = 'PARTIAL';
  } else {
    amountPaid = 0;
    finalStatus = rawStatus === 'DRAFT' || rawStatus === 'VOID' ? rawStatus : 'UNPAID';
  }

  let items: Array<{ id?: string; description: string; quantity: number; unitPriceZar: number; totalZar: number }> = [];
  try {
    items = JSON.parse(String(formData.get('items') || '[]'));
  } catch {
    items = [];
  }

  await db
    .prepare('UPDATE invoices SET client_name = ?, project = ?, amount = ?, amount_paid = ?, status = ?, payment_terms = ?, updated_at = datetime(\'now\') WHERE id = ?')
    .bind(clientName, project, amount, amountPaid, finalStatus, paymentTerms, id)
    .run();

  // Upsert client details into clients table so Address, VAT, and Payment Terms are persisted and mapped to invoice PDFs
  if (clientEmail || clientName) {
    const existing = clientEmail
      ? await db.prepare('SELECT * FROM clients WHERE LOWER(email) = LOWER(?)').bind(clientEmail).first<Record<string, unknown>>()
      : await db.prepare('SELECT * FROM clients WHERE LOWER(company) = LOWER(?) OR LOWER(name) = LOWER(?)').bind(clientName, clientName).first<Record<string, unknown>>();

    if (existing) {
      await db
        .prepare(
          `UPDATE clients SET
            name = COALESCE(NULLIF(?, ''), name),
            phone = COALESCE(NULLIF(?, ''), phone),
            vat_number = COALESCE(NULLIF(?, ''), vat_number),
            billing_street = COALESCE(NULLIF(?, ''), billing_street),
            payment_terms = COALESCE(NULLIF(?, ''), payment_terms)
           WHERE id = ?`
        )
        .bind(clientName, clientPhone, clientVat, clientAddress, paymentTerms, String(existing.id))
        .run();
    } else if (clientEmail) {
      await db
        .prepare('INSERT INTO clients (id, name, company, email, phone, vat_number, billing_street, payment_terms) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(randomUUID(), clientName, clientName, clientEmail, clientPhone, clientVat, clientAddress, paymentTerms)
        .run();
    }
  }

  await db.prepare('DELETE FROM invoice_items WHERE invoice_id = ?').bind(id).run();

  for (const item of items) {
    const qty = Number(item.quantity || 1);
    const unitPrice = Number(item.unitPriceZar || 0);
    const lineTotal = Number(item.totalZar || (qty * unitPrice));
    await db
      .prepare('INSERT INTO invoice_items (id, invoice_id, description, quantity, unit_price_zar, total_zar) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(randomUUID(), id, item.description || 'Line Item', qty, unitPrice, lineTotal)
      .run();
  }

  revalidatePath('/');
  return { success: true, amount, amountPaid, status: finalStatus };
}

export async function createStandaloneInvoice(formData: FormData) {
  const db = await getDb();
  const clientName = String(formData.get('clientName') || '').trim();
  const clientEmail = String(formData.get('clientEmail') || '').trim();
  const clientPhone = String(formData.get('clientPhone') || '').trim();
  const clientAddress = String(formData.get('clientAddress') || '').trim();
  const clientVat = String(formData.get('clientVat') || '').trim();
  const paymentTerms = String(formData.get('paymentTerms') || '30 Days').trim();
  const project = String(formData.get('project') || '3D Laser Scanning Services').trim();
  let rawStatus = String(formData.get('status') || 'UNPAID').toUpperCase();
  if (!['DRAFT', 'UNPAID', 'PARTIAL', 'PAID', 'VOID'].includes(rawStatus)) {
    rawStatus = 'UNPAID';
  }

  let items: Array<{ description: string; quantity: number; unitPriceZar: number; totalZar: number }> = [];
  try {
    items = JSON.parse(String(formData.get('items') || '[]'));
  } catch {
    items = [];
  }

  const amount = items.reduce((sum, i) => sum + Number(i.totalZar || (Number(i.quantity || 1) * Number(i.unitPriceZar || 0))), 0);
  let amountPaid = Math.max(0, Number(formData.get('amountPaid')) || 0);
  let finalStatus = rawStatus;
  if (rawStatus === 'PAID') {
    amountPaid = amount;
    finalStatus = 'PAID';
  } else if (amountPaid >= amount && amount > 0) {
    amountPaid = amount;
    finalStatus = 'PAID';
  } else if (amountPaid > 0) {
    finalStatus = 'PARTIAL';
  } else {
    amountPaid = 0;
    finalStatus = rawStatus === 'DRAFT' ? 'DRAFT' : 'UNPAID';
  }

  const invoiceId = randomUUID();

  await db
    .prepare('INSERT INTO invoices (id, client_name, project, amount, amount_paid, status, payment_terms) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(invoiceId, clientName || 'Valued Client', project, amount, amountPaid, finalStatus, paymentTerms)
    .run();

  for (const item of items) {
    const qty = Number(item.quantity || 1);
    const unitPrice = Number(item.unitPriceZar || 0);
    const lineTotal = Number(item.totalZar || (qty * unitPrice));
    await db
      .prepare('INSERT INTO invoice_items (id, invoice_id, description, quantity, unit_price_zar, total_zar) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(randomUUID(), invoiceId, item.description || 'Service Line Item', qty, unitPrice, lineTotal)
      .run();
  }

  if (clientEmail || clientName) {
    const existing = clientEmail
      ? await db.prepare('SELECT * FROM clients WHERE LOWER(email) = LOWER(?)').bind(clientEmail).first<Record<string, unknown>>()
      : (clientName ? await db.prepare('SELECT * FROM clients WHERE LOWER(company) = LOWER(?) OR LOWER(name) = LOWER(?)').bind(clientName, clientName).first<Record<string, unknown>>() : null);

    if (existing) {
      await db
        .prepare(
          `UPDATE clients SET
            name = COALESCE(NULLIF(?, ''), name),
            phone = COALESCE(NULLIF(?, ''), phone),
            vat_number = COALESCE(NULLIF(?, ''), vat_number),
            billing_street = COALESCE(NULLIF(?, ''), billing_street),
            payment_terms = COALESCE(NULLIF(?, ''), payment_terms)
           WHERE id = ?`
        )
        .bind(clientName, clientPhone, clientVat, clientAddress, paymentTerms, String(existing.id))
        .run();
    } else if (clientEmail) {
      await db
        .prepare('INSERT INTO clients (id, name, company, email, phone, vat_number, billing_street, payment_terms) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(randomUUID(), clientName, clientName, clientEmail, clientPhone, clientVat, clientAddress, paymentTerms)
        .run();
    }
  }

  revalidatePath('/');
  return { success: true, invoiceId };
}

export async function sendCustomQuoteEmail(formData: FormData) {
  const id = String(formData.get('id') || '');
  const to = String(formData.get('to') || '').trim();
  const cc = String(formData.get('cc') || '').trim();
  const subject = String(formData.get('subject') || '').trim();
  const messageBody = String(formData.get('message') || '').trim();

  let additionalFiles: Array<{ filename: string; contentBase64: string }> = [];
  try {
    additionalFiles = JSON.parse(String(formData.get('additionalFiles') || '[]'));
  } catch {
    additionalFiles = [];
  }

  const db = await getDb();
  const lead = await fetchLead(db, id);
  if (!lead) throw new Error('Lead quote not found');

  const pdfBuffer = await generateQuotePDF(lead);

  const ccList = cc ? cc.split(',').map((e) => e.trim()).filter(Boolean) : [];
  if (!ccList.some((e) => e.toLowerCase() === 'isaiah@3dscanmetrics.co.za')) {
    ccList.push('isaiah@3dscanmetrics.co.za');
  }
  const attachments: Array<{ filename: string; content: Buffer | string }> = [
    {
      filename: `Formal_Quote_${String(lead.project || '3DScan').replace(/\s+/g, '_')}.pdf`,
      content: pdfBuffer,
    },
  ];

  for (const extra of additionalFiles) {
    if (extra.filename && extra.contentBase64) {
      attachments.push({
        filename: extra.filename,
        content: Buffer.from(extra.contentBase64, 'base64'),
      });
    }
  }

  if (process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: '3D Scan Metrics <isaiah@3dscanmetrics.co.za>',
      to: to || String(lead.email),
      cc: ccList.length > 0 ? ccList : undefined,
      subject: subject || `Your Formal Quote: ${lead.project || '3D Scanning Project'}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #111827; line-height: 1.6;">
          <h2 style="color: #ea580c;">3D Scan Metrics</h2>
          <div style="white-space: pre-line; margin-bottom: 20px;">${messageBody || 'Please find attached your formal quote.'}</div>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
          <p style="font-size: 12px; color: #6b7280;">3D Scan Metrics Laser Scanning | Reg: 2018/643721/07 | isaiah@3dscanmetrics.co.za | +27 82 733 6873</p>
        </div>
      `,
      attachments,
    });
  }

  await db.prepare("UPDATE leads SET status = 'sent' WHERE id = ?").bind(id).run();
  revalidatePath('/');
  return { success: true };
}

export async function sendCustomInvoiceEmail(formData: FormData) {
  const id = String(formData.get('id') || '');
  const to = String(formData.get('to') || '').trim();
  const cc = String(formData.get('cc') || '').trim();
  const subject = String(formData.get('subject') || '').trim();
  const messageBody = String(formData.get('message') || '').trim();

  let additionalFiles: Array<{ filename: string; contentBase64: string }> = [];
  try {
    additionalFiles = JSON.parse(String(formData.get('additionalFiles') || '[]'));
  } catch {
    additionalFiles = [];
  }

  const db = await getDb();
  const invoices = await getInvoices();
  const inv = invoices.find((i) => i.id === id);
  if (!inv) throw new Error('Invoice not found');

  const pdfBuffer = await generateTaxInvoicePDF(inv);

  const ccList = cc ? cc.split(',').map((e) => e.trim()).filter(Boolean) : [];
  if (!ccList.some((e) => e.toLowerCase() === 'isaiah@3dscanmetrics.co.za')) {
    ccList.push('isaiah@3dscanmetrics.co.za');
  }
  const attachments: Array<{ filename: string; content: Buffer | string }> = [
    {
      filename: `Invoice_${String(inv.project || '3DScanMetrics').replace(/\s+/g, '_')}.pdf`,
      content: pdfBuffer,
    },
  ];

  for (const extra of additionalFiles) {
    if (extra.filename && extra.contentBase64) {
      attachments.push({
        filename: extra.filename,
        content: Buffer.from(extra.contentBase64, 'base64'),
      });
    }
  }

  if (process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: '3D Scan Metrics <isaiah@3dscanmetrics.co.za>',
      to: to || String(inv.clientEmail),
      cc: ccList.length > 0 ? ccList : undefined,
      subject: subject || `Invoice INV-${String(inv.id).slice(0, 8).toUpperCase()}: ${inv.project || '3D Scanning Services'}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #111827; line-height: 1.6;">
          <h2 style="color: #ea580c;">3D Scan Metrics Invoicing</h2>
          <div style="white-space: pre-line; margin-bottom: 20px;">${messageBody || 'Please find attached your invoice document.'}</div>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
          <p style="font-size: 12px; color: #6b7280;">3D Scan Metrics Laser Scanning | Reg: 2018/643721/07 | isaiah@3dscanmetrics.co.za | +27 82 733 6873</p>
        </div>
      `,
      attachments,
    });
  }

  await db.prepare("UPDATE invoices SET status = CASE WHEN status = 'DRAFT' THEN 'UNPAID' ELSE status END WHERE id = ?").bind(id).run();
  revalidatePath('/');
  return { success: true };
}

export async function sendInvoiceEmail(invoiceId: string) {
  const db = await getDb();
  const invoices = await getInvoices();
  const inv = invoices.find((i) => i.id === invoiceId);
  if (!inv) throw new Error('Invoice not found');

  if (!inv.clientEmail) throw new Error('Client email address is missing for this invoice');

  const pdfBuffer = await generateTaxInvoicePDF(inv);
  if (process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: '3D Scan Metrics <isaiah@3dscanmetrics.co.za>',
      to: inv.clientEmail,
      cc: ['isaiah@3dscanmetrics.co.za'],
      subject: `Invoice INV-${String(inv.id).slice(0, 8).toUpperCase()}: ${inv.project || '3D Scanning Services'}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #111827;">
          <h2 style="color: #ea580c;">3D Scan Metrics Invoicing</h2>
          <p>Dear ${inv.contactName || inv.clientName},</p>
          <p>Please find attached your invoice <strong>INV-${String(inv.id).slice(0, 8).toUpperCase()}</strong> for project <strong>${inv.project}</strong>.</p>
          <p><strong>Amount Due: R ${new Intl.NumberFormat('en-ZA').format(inv.amount)}</strong></p>
          <p>Payment terms & banking details are specified in the attached PDF invoice.</p>
          <br/>
          <p>Kind regards,<br/>Accounts Department<br/>3D Scan Metrics</p>
        </div>
      `,
      attachments: [
        {
          filename: `Invoice_${String(inv.project || '3DScanMetrics').replace(/\s+/g, '_')}.pdf`,
          content: pdfBuffer,
        },
      ],
    });
  }

  await db.prepare("UPDATE invoices SET status = CASE WHEN status = 'DRAFT' THEN 'UNPAID' ELSE status END WHERE id = ?").bind(invoiceId).run();
  revalidatePath('/');
  return { success: true };
}

export async function duplicateInvoice(invoiceId: string) {
  const db = await getDb();
  const invoices = await getInvoices();
  const inv = invoices.find((i) => i.id === invoiceId);
  if (!inv) throw new Error('Invoice not found');

  const newId = randomUUID();
  await db
    .prepare('INSERT INTO invoices (id, client_name, project, amount, status) VALUES (?, ?, ?, ?, "UNPAID")')
    .bind(newId, `${inv.clientName} (Copy)`, inv.project, inv.amount)
    .run();

  for (const item of (inv.items || [])) {
    await db
      .prepare('INSERT INTO invoice_items (id, invoice_id, description, quantity, unit_price_zar, total_zar) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(randomUUID(), newId, item.description, item.quantity, item.unitPriceZar, item.totalZar)
      .run();
  }

  revalidatePath('/');
  return { success: true, newId };
}

export async function deleteInvoice(invoiceId: string) {
  const db = await getDb();
  await db.prepare('DELETE FROM invoice_items WHERE invoice_id = ?').bind(invoiceId).run();
  await db.prepare('DELETE FROM invoices WHERE id = ?').bind(invoiceId).run();
  revalidatePath('/');
  return { success: true };
}

export async function deleteLead(id: string) {
  const db = await getDb();
  await db.prepare('UPDATE invoices SET lead_id = NULL WHERE lead_id = ?').bind(id).run();
  await db.prepare('DELETE FROM leads WHERE id = ?').bind(id).run();
  revalidatePath('/');
  return { success: true };
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
  const invoiceRow = await db.prepare('SELECT amount FROM invoices WHERE id = ?').bind(id).first<Record<string, unknown>>();
  const amount = Number(invoiceRow?.amount || 0);

  await db.prepare("UPDATE invoices SET status = 'PAID', amount_paid = ?, updated_at = datetime('now') WHERE id = ?").bind(amount, id).run();
  revalidatePath('/');
}

export async function recordInvoicePayment(
  invoiceId: string,
  paymentAmount: number,
  mode: 'add' | 'set' = 'add'
) {
  const db = await getDb();
  const invoiceRow = await db.prepare('SELECT * FROM invoices WHERE id = ?').bind(invoiceId).first<Record<string, unknown>>();
  if (!invoiceRow) throw new Error('Invoice not found');

  const totalAmount = Number(invoiceRow.amount || 0);
  const currentPaid = Number(invoiceRow.amount_paid ?? invoiceRow.amountPaid ?? 0);
  const rawTarget = mode === 'set' ? Math.max(0, paymentAmount) : currentPaid + Math.max(0, paymentAmount);
  const newAmountPaid = Math.min(totalAmount, Math.round(rawTarget * 100) / 100);

  let newStatus = 'PARTIAL';
  if (newAmountPaid >= totalAmount && totalAmount > 0) {
    newStatus = 'PAID';
  } else if (newAmountPaid <= 0) {
    newStatus = 'UNPAID';
  }

  await db
    .prepare("UPDATE invoices SET amount_paid = ?, status = ?, updated_at = datetime('now') WHERE id = ?")
    .bind(newAmountPaid, newStatus, invoiceId)
    .run();
  revalidatePath('/');
  return { success: true, amountPaid: newAmountPaid, status: newStatus };
}

export async function toggleInvoiceAutoRemind(invoiceId: string, enabled: boolean) {
  const db = await getDb();
  await db
    .prepare("DELETE FROM ai_automation_logs WHERE entity_type = 'invoice' AND entity_id = ? AND action_type = 'AUTO_REMIND_SETTING'")
    .bind(invoiceId)
    .run();

  await db
    .prepare(
      "INSERT INTO ai_automation_logs (id, entity_type, entity_id, action_type, status, result_json) VALUES (?, 'invoice', ?, 'AUTO_REMIND_SETTING', ?, ?)"
    )
    .bind(randomUUID(), invoiceId, enabled ? 'ENABLED' : 'PAUSED', JSON.stringify({ enabled, updatedAt: new Date().toISOString() }))
    .run();

  revalidatePath('/');
  return { success: true, autoRemind: enabled };
}

export async function sendInvoiceReminder(invoiceId: string, stageOverride?: string) {
  const db = await getDb();
  const allInvoices = await getInvoices();
  const inv = allInvoices.find((i: any) => String(i.id) === String(invoiceId));
  if (!inv) throw new Error('Invoice not found');

  if (!inv.clientEmail) {
    throw new Error(`Client email address is missing for invoice INV-${String(inv.id).slice(0, 8).toUpperCase()}`);
  }

  const totalAmount = Number(inv.amount || 0);
  const paidAmount = Number(inv.amountPaid || 0);
  const balanceDue = Math.max(0, Math.round((totalAmount - paidAmount) * 100) / 100);
  if (balanceDue <= 0 || String(inv.status).toUpperCase() === 'PAID') {
    throw new Error('This invoice is already paid in full.');
  }

  const daysOverdue = Number(inv.daysOverdue ?? 0);
  const stage =
    stageOverride ||
    (daysOverdue >= 30
      ? 'STAGE_30_DAYS'
      : daysOverdue >= 14
        ? 'STAGE_14_DAYS'
        : daysOverdue >= 7
          ? 'STAGE_7_DAYS'
          : 'STAGE_DUE');

  const invRef = `INV-${String(inv.id).slice(0, 8).toUpperCase()}`;
  const projectScope = String(inv.project || '3D Laser Scanning Services').trim();
  const dueDateDisplay = new Date(inv.dueDate || Date.now()).toLocaleDateString('en-ZA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const fmtZAR = (val: number) =>
    new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(val || 0);

  // Build both PDFs: 1) Tax Invoice PDF and 2) Per-Project Statement of Account PDF
  const invoicePdfBuffer = await generateTaxInvoicePDF(inv);

  const projectInvoices = allInvoices.filter((other: any) => {
    if (String(other.id) === String(inv.id)) return true;
    const sameProject = String(other.project || '').trim().toLowerCase() === projectScope.toLowerCase();
    if (!sameProject) return false;
    if (inv.clientId && other.clientId && String(inv.clientId) === String(other.clientId)) return true;
    if (inv.clientEmail && other.clientEmail && String(inv.clientEmail).toLowerCase() === String(other.clientEmail).toLowerCase()) return true;
    if (inv.clientName && other.clientName && String(inv.clientName).toLowerCase() === String(other.clientName).toLowerCase()) return true;
    return false;
  });

  const clientRecord = {
    id: String(inv.clientId || inv.id),
    name: String(inv.contactName || inv.clientName || 'Valued Client'),
    company: String(inv.clientCompany || inv.clientName || ''),
    accountNumber: `CLI-${String(inv.clientId || inv.id).slice(0, 6).toUpperCase()}`,
    email: String(inv.clientEmail || ''),
    phone: String(inv.clientPhone || ''),
    vatNumber: String(inv.clientVat || ''),
    billingStreet: String(inv.clientAddress || ''),
    projectScope,
  };

  const statementPdfBuffer = await generateClientStatementPDF(clientRecord, projectInvoices, projectScope);

  let subjectLabel = `Payment Reminder: ${invRef} — ${projectScope}`;
  let headingBadge = 'PAYMENT DUE REMINDER';
  let introParagraph = `This is a friendly reminder regarding invoice <strong>${invRef}</strong> for project <strong>${projectScope}</strong>, due on <strong>${dueDateDisplay}</strong>.`;

  if (stage === 'STAGE_30_DAYS') {
    subjectLabel = `URGENT: 30+ Days Overdue Invoice ${invRef} — ${projectScope}`;
    headingBadge = 'FINAL OVERDUE ACCOUNTING NOTICE (30+ DAYS PAST DUE)';
    introParagraph = `Our records indicate that invoice <strong>${invRef}</strong> for project <strong>${projectScope}</strong> (due <strong>${dueDateDisplay}</strong>) remains outstanding by more than 30 days. Please arrange urgent settlement or forward proof of payment so we can update your project statement.`;
  } else if (stage === 'STAGE_14_DAYS') {
    subjectLabel = `2nd Overdue Notice: Invoice ${invRef} — ${projectScope}`;
    headingBadge = '2ND OVERDUE PAYMENT FOLLOW-UP (14+ DAYS PAST DUE)';
    introParagraph = `We are following up regarding invoice <strong>${invRef}</strong> for project <strong>${projectScope}</strong>, which became due on <strong>${dueDateDisplay}</strong>. Please find both your updated Tax Invoice and Project Statement of Account attached.`;
  } else if (stage === 'STAGE_7_DAYS') {
    subjectLabel = `Overdue Invoice Reminder: ${invRef} — ${projectScope}`;
    headingBadge = '1ST OVERDUE PAYMENT REMINDER (7+ DAYS PAST DUE)';
    introParagraph = `This is a polite follow-up that invoice <strong>${invRef}</strong> for project <strong>${projectScope}</strong> (due <strong>${dueDateDisplay}</strong>) has an outstanding balance. We have attached both the Invoice and your Project Statement of Account for your convenience.`;
  }

  const safeProject = projectScope.replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeClient = String(inv.clientCompany || inv.clientName || 'Client').replace(/[^a-zA-Z0-9_-]/g, '_');

  if (process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: '3D Scan Metrics <isaiah@3dscanmetrics.co.za>',
      to: inv.clientEmail,
      cc: ['isaiah@3dscanmetrics.co.za'],
      subject: subjectLabel,
      html: `
        <div style="font-family: sans-serif; max-width: 620px; margin: 0 auto; color: #0f172a; line-height: 1.6;">
          <div style="background: #0f172a; color: #ffffff; padding: 16px 20px; border-radius: 10px 10px 0 0;">
            <div style="font-size: 11px; font-weight: 700; color: #fb923c; letter-spacing: 0.06em;">${headingBadge}</div>
            <div style="font-size: 18px; font-weight: 800; margin-top: 4px;">3D Scan Metrics Laser Scanning</div>
          </div>
          <div style="border: 1px solid #e2e8f0; border-top: none; padding: 22px 20px; border-radius: 0 0 10px 10px;">
            <p>Dear ${inv.contactName || inv.clientName},</p>
            <p>${introParagraph}</p>
            <table style="width: 100%; border-collapse: collapse; margin: 18px 0; font-size: 13px; background: #f8fafc; border-radius: 8px; overflow: hidden;">
              <tr>
                <td style="padding: 8px 12px; color: #475569;">Invoice Reference:</td>
                <td style="padding: 8px 12px; font-weight: 700; text-align: right;">${invRef}</td>
              </tr>
              <tr>
                <td style="padding: 8px 12px; color: #475569;">Project Scope:</td>
                <td style="padding: 8px 12px; font-weight: 700; text-align: right;">${projectScope}</td>
              </tr>
              <tr>
                <td style="padding: 8px 12px; color: #475569;">Due Date:</td>
                <td style="padding: 8px 12px; font-weight: 700; text-align: right;">${dueDateDisplay}</td>
              </tr>
              <tr>
                <td style="padding: 8px 12px; color: #475569;">Total Invoiced:</td>
                <td style="padding: 8px 12px; font-weight: 700; text-align: right;">${fmtZAR(totalAmount)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 12px; color: #059669;">Payments / Deposits Received:</td>
                <td style="padding: 8px 12px; font-weight: 700; color: #059669; text-align: right;">${fmtZAR(paidAmount)}</td>
              </tr>
              <tr style="border-top: 1px solid #cbd5e1; background: #fff7ed;">
                <td style="padding: 10px 12px; font-weight: 800; color: #9a3412;">Net Balance Outstanding:</td>
                <td style="padding: 10px 12px; font-weight: 800; color: #9a3412; text-align: right; font-size: 15px;">${fmtZAR(balanceDue)}</td>
              </tr>
            </table>
            <div style="background: #f1f5f9; padding: 12px 14px; border-radius: 8px; font-size: 12px; color: #334155;">
              <strong>Banking Details:</strong> First National Bank (FNB) &bull; Account Name: Freelance Geomatics ZA (Pty) Ltd &bull; Account No: <strong>62909760185</strong> &bull; Branch: <strong>250655</strong> &bull; Reference: <strong>${invRef}</strong>
            </div>
            <p style="font-size: 12px; color: #64748b; margin-top: 16px;">
              If payment has already been made, please disregard this notice or reply with your proof of payment.
            </p>
            <p style="margin-top: 18px; font-size: 13px;">Kind regards,<br/><strong>Isaiah Mpofu</strong><br/>3D Scan Metrics Laser Scanning<br/>+27 82 733 6873 | isaiah@3dscanmetrics.co.za</p>
          </div>
        </div>
      `,
      attachments: [
        {
          filename: `Tax_Invoice_${invRef}_${safeProject}.pdf`,
          content: invoicePdfBuffer,
        },
        {
          filename: `Statement_${safeClient}_${safeProject}.pdf`,
          content: statementPdfBuffer,
        },
      ],
    });
  }

  const nowIso = new Date().toISOString();
  await db
    .prepare(
      "INSERT INTO ai_automation_logs (id, entity_type, entity_id, action_type, status, result_json, created_at) VALUES (?, 'invoice', ?, 'PAYMENT_REMINDER', ?, ?, ?)"
    )
    .bind(
      randomUUID(),
      invoiceId,
      stage,
      JSON.stringify({ stage, to: inv.clientEmail, balanceDue, project: projectScope, sentAt: nowIso }),
      nowIso
    )
    .run();

  revalidatePath('/');
  return {
    success: true,
    invoiceId,
    stage,
    sentAt: nowIso,
    to: inv.clientEmail,
    balanceDue,
  };
}

export async function runAutomatedInvoiceReminders() {
  const allInvoices = await getInvoices();
  const eligible = allInvoices.filter((inv: any) => Boolean(inv.nextDueStage));
  const dispatched: Array<{ invoiceId: string; clientName: string; project: string; stage: string; balanceDue: number }> = [];

  for (const inv of eligible) {
    try {
      const res = await sendInvoiceReminder(String(inv.id), String(inv.nextDueStage));
      dispatched.push({
        invoiceId: String(inv.id),
        clientName: String(inv.clientName),
        project: String(inv.project),
        stage: res.stage,
        balanceDue: res.balanceDue,
      });
    } catch (err) {
      console.error(`[AutoReminder] Failed for invoice ${inv.id}:`, err);
    }
  }

  revalidatePath('/');
  return {
    success: true,
    checkedCount: allInvoices.length,
    eligibleCount: eligible.length,
    sentCount: dispatched.length,
    dispatched,
  };
}

export async function getClients() {
  const db = await getDb();
  const { results } = await db.prepare('SELECT * FROM clients ORDER BY created_at DESC').all<Record<string, unknown>>();
  return (results ?? []).map((row) => ({
    id: String(row.id),
    name: String(row.name || ''),
    company: row.company ? String(row.company) : '',
    accountNumber: row.account_number ? String(row.account_number) : '',
    clientType: row.client_type ? String(row.client_type) : 'Company',
    email: String(row.email || ''),
    phone: row.phone ? String(row.phone) : '',
    mobile: row.mobile ? String(row.mobile) : '',
    website: row.website ? String(row.website) : '',
    registrationNumber: row.registration_number ? String(row.registration_number) : '',
    vatNumber: row.vat_number ? String(row.vat_number) : (row.tax_number ? String(row.tax_number) : ''),
    taxNumber: row.tax_number ? String(row.tax_number) : '',
    currency: row.currency ? String(row.currency) : 'ZAR',
    paymentTerms: row.payment_terms ? String(row.payment_terms) : '30 Days',
    discountPercent: Number(row.discount_percent) || 0,
    billingStreet: row.billing_street ? String(row.billing_street) : '',
    billingCity: row.billing_city ? String(row.billing_city) : '',
    billingState: row.billing_state ? String(row.billing_state) : '',
    billingPostalCode: row.billing_postal_code ? String(row.billing_postal_code) : '',
    billingCountry: row.billing_country ? String(row.billing_country) : 'South Africa',
    postalStreet: row.postal_street ? String(row.postal_street) : '',
    postalCity: row.postal_city ? String(row.postal_city) : '',
    postalState: row.postal_state ? String(row.postal_state) : '',
    postalPostalCode: row.postal_postal_code ? String(row.postal_postal_code) : '',
    postalCountry: row.postal_country ? String(row.postal_country) : 'South Africa',
    industry: row.industry ? String(row.industry) : '',
    notes: row.notes ? String(row.notes) : '',
    created_at: row.created_at ? String(row.created_at) : '',
  }));
}

export async function createClient(formData: FormData) {
  const name = String(formData.get('name') || '').trim();
  const company = String(formData.get('company') || '').trim();
  const accountNumber = String(formData.get('accountNumber') || '').trim();
  const clientType = String(formData.get('clientType') || 'Company').trim();
  const email = String(formData.get('email') || '').trim();
  const phone = String(formData.get('phone') || '').trim();
  const mobile = String(formData.get('mobile') || '').trim();
  const website = String(formData.get('website') || '').trim();
  const registrationNumber = String(formData.get('registrationNumber') || '').trim();
  const vatNumber = String(formData.get('vatNumber') || formData.get('taxNumber') || '').trim();
  const currency = String(formData.get('currency') || 'ZAR').trim();
  const paymentTerms = String(formData.get('paymentTerms') || '30 Days').trim();
  const discountPercent = Number(formData.get('discountPercent')) || 0;
  
  const billingStreet = String(formData.get('billingStreet') || '').trim();
  const billingCity = String(formData.get('billingCity') || '').trim();
  const billingState = String(formData.get('billingState') || '').trim();
  const billingPostalCode = String(formData.get('billingPostalCode') || '').trim();
  const billingCountry = String(formData.get('billingCountry') || 'South Africa').trim();

  const postalStreet = String(formData.get('postalStreet') || '').trim();
  const postalCity = String(formData.get('postalCity') || '').trim();
  const postalState = String(formData.get('postalState') || '').trim();
  const postalPostalCode = String(formData.get('postalPostalCode') || '').trim();
  const postalCountry = String(formData.get('postalCountry') || 'South Africa').trim();

  const industry = String(formData.get('industry') || '').trim();
  const notes = String(formData.get('notes') || '').trim();

  if (!name || !email) {
    throw new Error('Contact Name and Email are required.');
  }

  const db = await getDb();
  const clientId = randomUUID();

  await db
    .prepare(
      `INSERT INTO clients (
        id, name, company, account_number, client_type, email, phone, mobile, website,
        registration_number, vat_number, tax_number, currency, payment_terms, discount_percent,
        billing_street, billing_city, billing_state, billing_postal_code, billing_country,
        postal_street, postal_city, postal_state, postal_postal_code, postal_country,
        industry, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      clientId, name, company, accountNumber, clientType, email, phone, mobile, website,
      registrationNumber, vatNumber, vatNumber, currency, paymentTerms, discountPercent,
      billingStreet, billingCity, billingState, billingPostalCode, billingCountry,
      postalStreet, postalCity, postalState, postalPostalCode, postalCountry,
      industry, notes
    )
    .run();

  revalidatePath('/');
  return { success: true, clientId };
}

export async function updateClient(formData: FormData) {
  const id = String(formData.get('id') || '').trim();
  if (!id) throw new Error('Client ID is missing.');

  const name = String(formData.get('name') || '').trim();
  const company = String(formData.get('company') || '').trim();
  const accountNumber = String(formData.get('accountNumber') || '').trim();
  const clientType = String(formData.get('clientType') || 'Company').trim();
  const email = String(formData.get('email') || '').trim();
  const phone = String(formData.get('phone') || '').trim();
  const mobile = String(formData.get('mobile') || '').trim();
  const website = String(formData.get('website') || '').trim();
  const registrationNumber = String(formData.get('registrationNumber') || '').trim();
  const vatNumber = String(formData.get('vatNumber') || formData.get('taxNumber') || '').trim();
  const currency = String(formData.get('currency') || 'ZAR').trim();
  const paymentTerms = String(formData.get('paymentTerms') || '30 Days').trim();
  const discountPercent = Number(formData.get('discountPercent')) || 0;
  
  const billingStreet = String(formData.get('billingStreet') || '').trim();
  const billingCity = String(formData.get('billingCity') || '').trim();
  const billingState = String(formData.get('billingState') || '').trim();
  const billingPostalCode = String(formData.get('billingPostalCode') || '').trim();
  const billingCountry = String(formData.get('billingCountry') || 'South Africa').trim();

  const postalStreet = String(formData.get('postalStreet') || '').trim();
  const postalCity = String(formData.get('postalCity') || '').trim();
  const postalState = String(formData.get('postalState') || '').trim();
  const postalPostalCode = String(formData.get('postalPostalCode') || '').trim();
  const postalCountry = String(formData.get('postalCountry') || 'South Africa').trim();

  const industry = String(formData.get('industry') || '').trim();
  const notes = String(formData.get('notes') || '').trim();

  if (!name || !email) {
    throw new Error('Contact Name and Email are required.');
  }

  const db = await getDb();

  await db
    .prepare(
      `UPDATE clients SET
        name = ?, company = ?, account_number = ?, client_type = ?, email = ?, phone = ?, mobile = ?, website = ?,
        registration_number = ?, vat_number = ?, tax_number = ?, currency = ?, payment_terms = ?, discount_percent = ?,
        billing_street = ?, billing_city = ?, billing_state = ?, billing_postal_code = ?, billing_country = ?,
        postal_street = ?, postal_city = ?, postal_state = ?, postal_postal_code = ?, postal_country = ?,
        industry = ?, notes = ?
       WHERE id = ?`
    )
    .bind(
      name, company, accountNumber, clientType, email, phone, mobile, website,
      registrationNumber, vatNumber, vatNumber, currency, paymentTerms, discountPercent,
      billingStreet, billingCity, billingState, billingPostalCode, billingCountry,
      postalStreet, postalCity, postalState, postalPostalCode, postalCountry,
      industry, notes, id
    )
    .run();

  revalidatePath('/');
  return { success: true };
}

export async function deleteClient(id: string) {
  const db = await getDb();
  await db.prepare('DELETE FROM clients WHERE id = ?').bind(id).run();
  revalidatePath('/');
  return { success: true };
}

export async function createAdminQuote(formData: FormData) {
  const db = await getDb();

  const mode = String(formData.get('mode') || 'calculator') as 'calculator' | 'custom';
  let customItems: Array<{ description: string; quantity: number; unitPrice: number; total: number }> = [];
  try {
    customItems = JSON.parse(String(formData.get('customItems') || '[]'));
  } catch {
    customItems = [];
  }

  const name = String(formData.get('name') || '').trim();
  const company = String(formData.get('company') || '').trim();
  const email = String(formData.get('email') || '').trim();
  const project = String(formData.get('project') || '3D Laser Scanning Project').trim();
  const area = Number(formData.get('area')) || 500;
  const complexity = String(formData.get('complexity') || 'Medium');
  const access = String(formData.get('access') || 'Standard');
  const accuracy = String(formData.get('accuracy') || 'Standard');
  const bimLevel = String(formData.get('bimLevel') || '300');
  const distanceKm = Number(formData.get('distanceKm')) || 0;
  
  const travelAccommodationCost = Number(formData.get('travelAccommodationCost') || formData.get('travelCost')) || 0;
  
  let deliverables: string[] = [];
  try {
    deliverables = JSON.parse(String(formData.get('deliverables') || '[]'));
  } catch {
    deliverables = ['raw', 'cad', 'bim'];
  }

  let systems: string[] = [];
  try {
    systems = JSON.parse(String(formData.get('systems') || '[]'));
  } catch {
    systems = ['architectural'];
  }

  const range = calculateEstimateRange(DEFAULT_PRICING, {
    area,
    complexity,
    deliverables,
    access,
    accuracy,
    bimLevel,
    systems,
    travelAccommodationCost,
  });

  let firmAmount = Number(formData.get('firmAmount')) || range.mid;
  if (mode === 'custom' && customItems.length > 0) {
    firmAmount = customItems.reduce((sum, item) => sum + (Number(item.total || (item.quantity * item.unitPrice)) || 0), 0);
  }

  const leadId = randomUUID();
  const payload = {
    mode,
    customItems,
    access,
    accuracy,
    bimLevel,
    systems,
    travelAccommodationCost,
    travelCost: travelAccommodationCost,
    firmAmount,
    deliverables,
  };

  await db
    .prepare('INSERT OR IGNORE INTO clients (id, name, company, email) VALUES (?, ?, ?, ?)')
    .bind(randomUUID(), name, company, email)
    .run();

  await db
    .prepare(
      `INSERT INTO leads (id, email, contact_name, company, project, area, complexity, deliverables_json, payload_json, estimate_zar, estimate_formatted, field_days, process_days, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'sent')`
    )
    .bind(
      leadId,
      email,
      name,
      company,
      project,
      area,
      complexity,
      JSON.stringify(deliverables),
      JSON.stringify(payload),
      firmAmount,
      formatRange(firmAmount, firmAmount),
      range.fieldDays,
      range.processDays
    )
    .run();

  revalidatePath('/');
  return { success: true, leadId, status: 'Quote Sent' };
}

export async function syncInvoiceForLead(db: CloudflareEnv['DB'], leadId: string) {
  const lead = await fetchLead(db, leadId);
  if (!lead) return null;

  if (lead.email) {
    await db
      .prepare('INSERT OR IGNORE INTO clients (id, name, company, email) VALUES (?, ?, ?, ?)')
      .bind(randomUUID(), (lead.name as string) || (lead.company as string) || 'Client', (lead.company as string) || '', lead.email)
      .run();
  }

  const invoice = await db
    .prepare('SELECT * FROM invoices WHERE lead_id = ?')
    .bind(leadId)
    .first<Record<string, unknown>>();

  let invoiceId = String(invoice?.id || '');
  if (!invoice) {
    invoiceId = randomUUID();
    await db
      .prepare('INSERT INTO invoices (id, lead_id, client_name, project, amount, status) VALUES (?, ?, ?, ?, ?, "UNPAID")')
      .bind(
        invoiceId,
        lead.id,
        (lead.name as string) || (lead.company as string) || 'Unknown Client',
        (lead.project as string) || 'Unknown Project',
        lead.quoteTotal
      )
      .run();
  } else {
    await db
      .prepare('UPDATE invoices SET amount = ?, client_name = ?, project = ?, updated_at = datetime(\'now\') WHERE id = ?')
      .bind(
        lead.quoteTotal,
        (lead.name as string) || (lead.company as string) || 'Unknown Client',
        (lead.project as string) || 'Unknown Project',
        invoiceId
      )
      .run();
  }

  await db.prepare('DELETE FROM invoice_items WHERE invoice_id = ?').bind(invoiceId).run();

  const items = getLeadBreakdownItems(lead);
  for (const item of items) {
    await db
      .prepare('INSERT INTO invoice_items (id, invoice_id, description, quantity, unit_price_zar, total_zar) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(randomUUID(), invoiceId, item.description, item.quantity, item.unitPriceZar, item.totalZar)
      .run();
  }

  return invoiceId;
}

export async function acceptQuoteAndGenerateInvoice(id: string) {
  const db = await getDb();
  const lead = await fetchLead(db, id);
  if (!lead) return;

  await db
    .prepare("UPDATE leads SET status = 'approved' WHERE id = ?")
    .bind(id)
    .run();

  const invoiceId = await syncInvoiceForLead(db, id);
  revalidatePath('/');
  return { success: true, invoiceId };
}

async function fetchLead(db: CloudflareEnv['DB'], id: string) {
  const row = await db.prepare('SELECT * FROM leads WHERE id = ?').bind(id).first<Record<string, unknown>>();
  return mapLead(row);
}

export async function sendQuoteEmail(id: string) {
  const db = await getDb();
  const lead = await fetchLead(db, id);
  if (!lead) throw new Error('Lead not found');

  const pdfBuffer = await generateQuotePDF(lead);
  const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy');

  if (process.env.RESEND_API_KEY) {
    try {
      await resend.emails.send({
        from: '3D Scan Metrics <isaiah@3dscanmetrics.co.za>',
        to: String(lead.email),
        cc: ['isaiah@3dscanmetrics.co.za'],
        subject: `Your Formal Quote: ${(lead.project as string) || '3D Scanning Project'}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #111827;">
              <h2 style="color: #00e5ff;">3D Scan Metrics</h2>
              <p>Hi ${(lead.name as string) || 'there'},</p>
              <p>Thank you for reaching out regarding the <strong>${(lead.project as string) || 'project'}</strong>.</p>
              <p>Please find attached your formal scoping quote based on your parameters.</p>
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
    .prepare("UPDATE leads SET status = 'sent' WHERE id = ?")
    .bind(id)
    .run();

  revalidatePath('/');
  return { success: true };
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
        from: '3D Scan Metrics <isaiah@3dscanmetrics.co.za>',
        to: String(lead.email),
        cc: ['isaiah@3dscanmetrics.co.za'],
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
    .prepare("UPDATE leads SET status = ? WHERE id = ?")
    .bind(toDbStatus('SENT'), id)
    .run();

  await syncInvoiceForLead(db, lead.id);
  revalidatePath('/');
}

export async function rejectLead(id: string) {
  const db = await getDb();
  await db
    .prepare("UPDATE leads SET status = ? WHERE id = ?")
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
  const mode = String(formData.get('mode') || 'calculator') as 'calculator' | 'custom';
  let customItems: Array<{ description: string; quantity: number; unitPrice: number; total: number }> = [];
  try {
    customItems = JSON.parse(String(formData.get('customItems') || '[]'));
  } catch {
    customItems = [];
  }

  const name = String(formData.get('name') || '').trim();
  const email = String(formData.get('email') || '').trim();
  const company = String(formData.get('company') || '').trim();
  const phone = String(formData.get('phone') || '').trim();
  const travelAccommodationCost = Number(formData.get('travelAccommodationCost') || formData.get('travelCost')) || 0;
  const area = Number(formData.get('area'));
  const complexity = String(formData.get('complexity') || '');
  const access = String(formData.get('access') || '');
  const accuracy = String(formData.get('accuracy') || 'Standard');
  const bimLevel = String(formData.get('bimLevel') || '300');

  const isManualFirmAmount = String(formData.get('isManualFirmAmount') || '') === 'true';

  const range = calculateEstimateRange(DEFAULT_PRICING, {
    area,
    complexity,
    deliverables,
    access,
    accuracy,
    bimLevel,
    travelAccommodationCost,
  });

  let firm = Number(formData.get('firmAmount')) || range.mid;
  if (mode === 'custom' && customItems.length > 0) {
    firm = customItems.reduce((sum, item) => sum + (Number(item.total || (item.quantity * item.unitPrice)) || 0), 0);
  }

  return { mode, customItems, name, email, company, phone, travelAccommodationCost, area, complexity, access, accuracy, bimLevel, deliverables, range, firm, isManualFirmAmount };
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
    isManualFirmAmount: q.isManualFirmAmount,
    firmAmount: q.firm,
    deliverables: q.deliverables,
    phone: q.phone,
    mode: q.mode,
    customItems: q.customItems,
    access: q.access,
    accuracy: q.accuracy,
    bimLevel: q.bimLevel,
    travelAccommodationCost: q.travelAccommodationCost,
    travelCost: q.travelAccommodationCost,
  };

  await db
    .prepare(
      `UPDATE leads SET 
        contact_name = COALESCE(NULLIF(?, ''), contact_name),
        email = COALESCE(NULLIF(?, ''), email),
        company = COALESCE(NULLIF(?, ''), company),
        area = ?, complexity = ?, deliverables_json = ?, payload_json = ?, estimate_zar = ?, estimate_formatted = ?,
        field_days = ?, process_days = ?, updated_at = datetime('now') WHERE id = ?`
    )
    .bind(
      q.name,
      q.email,
      q.company,
      q.area,
      q.complexity,
      JSON.stringify(q.deliverables),
      JSON.stringify(payload),
      q.firm,
      formatRange(q.firm, q.firm),
      q.range.fieldDays,
      q.range.processDays,
      id
    )
    .run();

  if (q.email || q.company || q.name) {
    const existing = q.email
      ? await db.prepare('SELECT * FROM clients WHERE email = ?').bind(q.email).first<Record<string, unknown>>()
      : await db.prepare('SELECT * FROM clients WHERE company = ? OR name = ?').bind(q.company || q.name, q.name || q.company).first<Record<string, unknown>>();

    if (existing) {
      await db
        .prepare('UPDATE clients SET name = COALESCE(NULLIF(?, ""), name), company = COALESCE(NULLIF(?, ""), company), phone = COALESCE(NULLIF(?, ""), phone) WHERE id = ?')
        .bind(q.name, q.company, q.phone, String(existing.id))
        .run();
    } else if (q.email) {
      await db
        .prepare('INSERT INTO clients (id, name, company, email, phone) VALUES (?, ?, ?, ?, ?)')
        .bind(randomUUID(), q.name || 'Valued Client', q.company || q.name || '', q.email || '', q.phone || '')
        .run();
    }
  }

  const existingInv = await db.prepare('SELECT id FROM invoices WHERE lead_id = ?').bind(id).first();
  if (existingInv) {
    await syncInvoiceForLead(db, id);
  }
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

  // Auto-sync client into Enterprise Client Directory
  if (updated.email) {
    await db
      .prepare('INSERT OR IGNORE INTO clients (id, name, company, email, phone) VALUES (?, ?, ?, ?, ?)')
      .bind(randomUUID(), updated.name || updated.company || 'Client', updated.company || '', updated.email, updated.phone || '')
      .run();
  }

  const pdfBuffer = await generateQuotePDF(forPdf);
  if (process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: '3D Scan Metrics <isaiah@3dscanmetrics.co.za>',
        to: String(updated.email),
        cc: ['isaiah@3dscanmetrics.co.za'],
        subject: `Your Formal Quote: ${updated.project || '3D Scanning Project'}`,
        html: `<p>Hi ${updated.name || 'there'},</p><p>Please find attached your formal scoping quote.</p>`,
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
    .prepare("UPDATE leads SET status = 'sent' WHERE id = ?")
    .bind(id)
    .run();

  revalidatePath('/');
  return { success: true };
}

export async function updateAndApproveLead(formData: FormData) {
  return sendFormalQuote(formData);
}
