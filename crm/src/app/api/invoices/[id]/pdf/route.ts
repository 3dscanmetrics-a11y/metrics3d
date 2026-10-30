import { getDb } from '@/lib/db';
import { generateTaxInvoicePDF } from '@/lib/pdf';
import { mapLead } from '@/lib/map';
import { getLeadBreakdownItems } from '@/lib/financials';
import { NextRequest } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = await getDb();

    const invoice = await db
      .prepare('SELECT * FROM invoices WHERE id = ?')
      .bind(id)
      .first<Record<string, unknown>>();

    if (!invoice) {
      return new Response('Invoice Not Found', { status: 404 });
    }

    const { results: itemRows } = await db
      .prepare('SELECT * FROM invoice_items WHERE invoice_id = ?')
      .bind(id)
      .all<Record<string, unknown>>();

    let items: any[] = itemRows || [];
    let lead: any = null;
    let client: any = null;

    const leadId = invoice.leadId || invoice.lead_id;
    if (leadId) {
      const leadRow = await db
        .prepare('SELECT * FROM leads WHERE id = ?')
        .bind(leadId)
        .first<Record<string, unknown>>();
      lead = mapLead(leadRow);
      if (items.length === 0 && lead) {
        items = getLeadBreakdownItems(lead);
      }
    }

    const searchEmail = String(lead?.email || invoice.clientEmail || invoice.client_email || '').trim();
    const searchName = String(invoice.client_name || invoice.clientName || lead?.company || lead?.name || '').trim();

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

    const fullInvoice = {
      ...invoice,
      clientCompany: client?.company || lead?.company || '',
      contactName: client?.name || lead?.name || invoice.client_name || invoice.clientName || 'Valued Client',
      clientName: invoice.client_name || invoice.clientName || client?.company || lead?.company || client?.name || lead?.name || 'Valued Client',
      clientEmail: client?.email || lead?.email || invoice.clientEmail || invoice.client_email || '',
      clientPhone: client?.phone || client?.mobile || lead?.phone || '',
      clientAddress: [client?.billingStreet || client?.billing_street, client?.billingCity || client?.billing_city, client?.billingPostalCode || client?.billing_postal_code].filter(Boolean).join(', ') || (lead?.payload as any)?.siteLocation || '',
      clientVat: client?.vatNumber || client?.vat_number || client?.taxNumber || client?.tax_number || '',
      clientReg: client?.registrationNumber || client?.registration_number || '',
      items,
    };

    const pdfBuffer = await generateTaxInvoicePDF(fullInvoice);

    return new Response(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="Tax_Invoice_${String(invoice.project || '3DScanMetrics').replace(/\s+/g, '_')}.pdf"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (err: any) {
    console.error('[Invoice PDF Error]', err);
    return new Response('Failed to generate Tax Invoice PDF', { status: 500 });
  }
}
