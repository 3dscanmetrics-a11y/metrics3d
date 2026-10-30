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

    const allInvoices = await getInvoices();
    const targetInvoice = allInvoices.find((inv: any) => String(inv.id) === String(id));

    if (!targetInvoice) {
      return new Response('Invoice Not Found', { status: 404 });
    }

    const targetProject = String(targetInvoice.project || '3D Laser Scanning Services').trim();
    const targetEmail = String(targetInvoice.clientEmail || '').toLowerCase().trim();
    const targetName = String(targetInvoice.clientName || '').toLowerCase().trim();
    const targetCompany = String(targetInvoice.clientCompany || '').toLowerCase().trim();

    // Find all invoices belonging to this client for this specific project
    const projectInvoices = allInvoices.filter((inv: any) => {
      if (String(inv.id) === String(targetInvoice.id)) return true;

      const sameProject = String(inv.project || '').trim().toLowerCase() === targetProject.toLowerCase();
      if (!sameProject) return false;

      if (targetInvoice.clientId && inv.clientId && String(targetInvoice.clientId) === String(inv.clientId)) {
        return true;
      }
      const invEmail = String(inv.clientEmail || '').toLowerCase().trim();
      const invName = String(inv.clientName || '').toLowerCase().trim();
      const invCompany = String(inv.clientCompany || '').toLowerCase().trim();

      if (targetEmail && invEmail && targetEmail === invEmail) return true;
      if (targetName && invName && targetName === invName) return true;
      if (targetCompany && invCompany && targetCompany === invCompany) return true;
      return false;
    });

    // Resolve client record from DB if available, or construct from targetInvoice
    let clientRow: Record<string, unknown> | null = null;
    if (targetInvoice.clientId) {
      clientRow = await db
        .prepare('SELECT * FROM clients WHERE id = ?')
        .bind(targetInvoice.clientId)
        .first<Record<string, unknown>>();
    } else if (targetEmail) {
      clientRow = await db
        .prepare('SELECT * FROM clients WHERE LOWER(email) = LOWER(?)')
        .bind(targetEmail)
        .first<Record<string, unknown>>();
    } else if (targetName) {
      clientRow = await db
        .prepare('SELECT * FROM clients WHERE LOWER(company) = LOWER(?) OR LOWER(name) = LOWER(?)')
        .bind(targetName, targetName)
        .first<Record<string, unknown>>();
    }

    const clientRecord = {
      id: String(clientRow?.id || targetInvoice.clientId || targetInvoice.id),
      name: String(clientRow?.name || targetInvoice.contactName || targetInvoice.clientName || 'Valued Client'),
      company: String(clientRow?.company || targetInvoice.clientCompany || targetInvoice.clientName || ''),
      accountNumber: String(
        clientRow?.account_number ||
          clientRow?.accountNumber ||
          `CLI-${String(clientRow?.id || targetInvoice.id).slice(0, 6).toUpperCase()}`
      ),
      email: String(clientRow?.email || targetInvoice.clientEmail || ''),
      phone: String(clientRow?.phone || clientRow?.mobile || targetInvoice.clientPhone || ''),
      vatNumber: String(
        clientRow?.vat_number ||
          clientRow?.vatNumber ||
          clientRow?.tax_number ||
          clientRow?.taxNumber ||
          targetInvoice.clientVat ||
          ''
      ),
      billingStreet: String(clientRow?.billing_street || clientRow?.billingStreet || targetInvoice.clientAddress || ''),
      billingCity: String(clientRow?.billing_city || clientRow?.billingCity || ''),
      billingPostalCode: String(clientRow?.billing_postal_code || clientRow?.billingPostalCode || ''),
      projectScope: targetProject,
    };

    const pdfBuffer = await generateClientStatementPDF(clientRecord, projectInvoices, targetProject);

    const safeClient = String(clientRecord.company || clientRecord.name || 'Client').replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeProject = targetProject.replace(/[^a-zA-Z0-9_-]/g, '_');

    return new Response(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="Statement_${safeClient}_${safeProject}.pdf"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (err: any) {
    console.error('[Project Statement PDF Error]', err);
    return new Response('Failed to generate Project Statement PDF', { status: 500 });
  }
}
