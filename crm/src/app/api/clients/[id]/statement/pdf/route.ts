import { getDb } from '@/lib/db';
import { generateClientStatementPDF } from '@/lib/pdf';
import { getInvoices } from '@/app/actions';
import { NextRequest } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = await getDb();

    // Fetch client record by ID
    const client = await db
      .prepare('SELECT * FROM clients WHERE id = ?')
      .bind(id)
      .first<Record<string, unknown>>();

    if (!client) {
      return new Response('Client Not Found', { status: 404 });
    }

    // Fetch all system invoices and filter those matching this client's email, company, or name
    const allInvoices = await getInvoices();
    const clientEmail = String(client.email || '').toLowerCase().trim();
    const clientCompany = String(client.company || '').toLowerCase().trim();
    const clientName = String(client.name || '').toLowerCase().trim();

    const clientInvoices = allInvoices.filter((inv: any) => {
      const invEmail = String(inv.clientEmail || '').toLowerCase().trim();
      const invComp = String(inv.clientCompany || inv.clientName || '').toLowerCase().trim();
      const invContact = String(inv.contactName || inv.clientName || '').toLowerCase().trim();

      if (clientEmail && invEmail && clientEmail === invEmail) return true;
      if (clientCompany && invComp && (clientCompany === invComp || invComp.includes(clientCompany))) return true;
      if (clientName && invContact && (clientName === invContact || invContact.includes(clientName))) return true;
      return false;
    });

    const clientRecord = {
      ...client,
      id: String(client.id),
      name: String(client.name || ''),
      company: String(client.company || ''),
      accountNumber: String(client.account_number || client.accountNumber || `CLI-${String(client.id).slice(0, 6).toUpperCase()}`),
      email: String(client.email || ''),
      phone: String(client.phone || client.mobile || ''),
      vatNumber: String(client.vat_number || client.vatNumber || client.tax_number || client.taxNumber || ''),
      billingStreet: String(client.billing_street || client.billingStreet || ''),
      billingCity: String(client.billing_city || client.billingCity || ''),
      billingPostalCode: String(client.billing_postal_code || client.billingPostalCode || ''),
    };

    const pdfBuffer = await generateClientStatementPDF(clientRecord, clientInvoices);

    const safeFileName = String(clientRecord.company || clientRecord.name || 'Client').replace(/[^a-zA-Z0-9_-]/g, '_');

    return new Response(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="Statement_of_Account_${safeFileName}.pdf"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (err: any) {
    console.error('[Client Statement PDF Error]', err);
    return new Response('Failed to generate Statement of Account PDF', { status: 500 });
  }
}
