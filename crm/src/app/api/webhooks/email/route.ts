import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getDb } from '@/lib/db';
import { extractMetricsFromRFP } from '../../../../../scripts/ai';
import { calculateQuote } from '../../../../../scripts/engine';

export async function POST(req: Request) {
  try {
    const payload = (await req.json()) as {
      from: string;
      subject: string;
      text: string;
      attachments?: Array<{ filename?: string; content?: string }>;
    };

    const sender = payload.from;
    const subject = payload.subject;
    const textBody = payload.text;
    const attachments = payload.attachments || [];

    const emailMatch = sender.match(/<(.+)>/);
    const emailAddr = emailMatch ? emailMatch[1] : sender;
    const nameMatch = sender.match(/^"([^"]+)"/);
    const senderName = nameMatch ? nameMatch[1] : emailAddr.split('@')[0];

    let rawContext = `Subject: ${subject}\n\nBody: ${textBody}`;

    for (const attachment of attachments) {
      if (attachment.content) {
        rawContext += `\n\n[Attachment: ${attachment.filename}]`;
      }
    }

    const metrics = await extractMetricsFromRFP(rawContext);
    const pricing = calculateQuote(metrics.area, metrics.complexity as never, metrics.deliverables);

    const formatted = new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(
      pricing.totalPrice || 0
    );

    const db = await getDb();
    await db
      .prepare(
        `INSERT INTO leads (
          id, email, phone, project, company, contact_name, site_location,
          area, complexity, deliverables_json, payload_json,
          estimate_zar, estimate_formatted, status, raw_email, field_days, process_days
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)`
      )
      .bind(
        randomUUID(),
        emailAddr,
        null,
        metrics.project || 'New RFP',
        metrics.company || '',
        metrics.name || senderName || 'Unknown',
        null,
        metrics.area,
        metrics.complexity,
        JSON.stringify(metrics.deliverables),
        JSON.stringify({ source: 'email-webhook', subject }),
        pricing.totalPrice,
        formatted,
        rawContext,
        pricing.fieldDays,
        pricing.processDays
      )
      .run();

    console.log(`[Webhook] Successfully ingested RFP from ${emailAddr}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Webhook Error]:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
