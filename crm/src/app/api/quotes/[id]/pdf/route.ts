import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { mapLead } from '@/lib/map';
import { generateQuotePDF } from '@/lib/pdf';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return new NextResponse('Quote ID missing', { status: 400 });
  }

  try {
    const db = await getDb();
    const row = await db
      .prepare('SELECT * FROM leads WHERE id = ?')
      .bind(id)
      .first<Record<string, unknown>>();

    const lead = mapLead(row);
    if (!lead) {
      return new NextResponse('Failed to process quote', { status: 500 });
    }

    let client: any = null;
    if (lead.email) {
      client = await db
        .prepare('SELECT * FROM clients WHERE email = ? OR company = ?')
        .bind(lead.email, lead.company || '')
        .first<Record<string, unknown>>();
    }

    const enrichedLead = {
      ...lead,
      company: client?.company || lead.company || '',
      name: client?.name || lead.name || 'Valued Client',
      phone: client?.phone || client?.mobile || lead.phone || '',
      vatNumber: client?.vatNumber || client?.vat_number || '',
      registrationNumber: client?.registrationNumber || client?.registration_number || '',
      billingAddress: [client?.billingStreet || client?.billing_street, client?.billingCity || client?.billing_city, client?.billingPostalCode || client?.billing_postal_code].filter(Boolean).join(', ') || '',
    };

    const pdfBuffer = await generateQuotePDF(enrichedLead);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="Formal_Quote_${String(enrichedLead.project || '3DScan').replace(/\s+/g, '_')}.pdf"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error: any) {
    console.error('[PDF Generation Error]:', error);
    return new NextResponse(error?.message || 'Failed to render PDF', { status: 500 });
  }
}
