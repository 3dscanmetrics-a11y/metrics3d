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
    const projectParam = (request.nextUrl.searchParams.get('project') || '').trim();
    const db = await getDb();

    // Fetch client record by ID
    const client = await db
      .prepare('SELECT * FROM clients WHERE id = ?')
      .bind(id)
      .first<Record<string, unknown>>();

    if (!client) {
      return new Response('Client Not Found', { status: 404 });
    }

    // Fetch all system invoices and filter those matching this client's ID, email, company, or name
    const allInvoices = await getInvoices();
    const clientEmail = String(client.email || '').toLowerCase().trim();
    const clientCompany = String(client.company || '').toLowerCase().trim();
    const clientName = String(client.name || '').toLowerCase().trim();

    let clientInvoices = allInvoices.filter((inv: any) => {
      if (inv.clientId && String(inv.clientId) === String(client.id)) return true;

      const invEmail = String(inv.clientEmail || '').toLowerCase().trim();
      const invComp = String(inv.clientCompany || inv.clientName || '').toLowerCase().trim();
      const invContact = String(inv.contactName || inv.clientName || '').toLowerCase().trim();
      const invRawName = String(inv.clientName || '').toLowerCase().trim();

      if (clientEmail && invEmail && clientEmail === invEmail) return true;
      if (clientCompany && (clientCompany === invComp || clientCompany === invRawName || invComp.includes(clientCompany) || clientCompany.includes(invRawName))) {
        if (invRawName.length > 2) return true;
      }
      if (clientName && (clientName === invContact || clientName === invRawName || invContact.includes(clientName) || clientName.includes(invRawName))) {
        if (invRawName.length > 2) return true;
      }
      return false;
    });

    // Filter per project if ?project= query parameter is supplied
    let resolvedProjectScope = projectParam;
    if (projectParam && projectParam.toUpperCase() !== 'ALL') {
      const targetProj = projectParam.toLowerCase();
      clientInvoices = clientInvoices.filter(
        (inv: any) => String(inv.project || '').trim().toLowerCase() === targetProj
      );
    } else {
      resolvedProjectScope = '';
      // If all invoices for this client belong to a single project, display that project in the statement header
      const uniqueProjects = Array.from(
        new Set(clientInvoices.map((inv: any) => String(inv.project || '').trim()).filter(Boolean))
      );
      if (uniqueProjects.length === 1) {
        resolvedProjectScope = uniqueProjects[0];
      }
    }

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
      projectScope: resolvedProjectScope,
    };

    const pdfBuffer = await generateClientStatementPDF(clientRecord, clientInvoices, resolvedProjectScope);

    const safeClientName = String(clientRecord.company || clientRecord.name || 'Client').replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeProjectSuffix = resolvedProjectScope
      ? `_${resolvedProjectScope.replace(/[^a-zA-Z0-9_-]/g, '_')}`
      : '';

    return new Response(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="Statement_of_Account_${safeClientName}${safeProjectSuffix}.pdf"`,
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
