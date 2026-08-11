import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import db from '@/lib/db';
import { extractMetricsFromRFP } from '../../../../../scripts/ai'; // Re-use the Gemini pipelineogic
import { calculateQuote } from '../../../../../scripts/engine';

// This is the endpoint Resend will hit when an email arrives
export async function POST(req: Request) {
  try {
    const payload = await req.json();
    
    // Resend Inbound Webhook payload structure
    const sender = payload.from;
    const subject = payload.subject;
    const textBody = payload.text;
    const attachments = payload.attachments || [];

    // Parse email header for name and email
    const emailMatch = sender.match(/<(.+)>/);
    const emailAddr = emailMatch ? emailMatch[1] : sender;
    const nameMatch = sender.match(/^"([^"]+)"/);
    const senderName = nameMatch ? nameMatch[1] : emailAddr.split('@')[0];
    
    // Compile all text from body + attachments
    let rawContext = `Subject: ${subject}\n\nBody: ${textBody}`;
    
    for (const attachment of attachments) {
      if (attachment.content) {
        // If it's a PDF, we'd normally parse it here. For the MVP webhook, 
        // we'll assume the email text and attachment text (if provided by Resend as plain text) is sufficient.
        // Resend doesn't natively OCR PDFs in the payload, so we'd need pdf-parse here in production, 
        // fetching from attachment.content (base64).
        rawContext += `\n\n[Attachment: ${attachment.filename}]`;
      }
    }

    // Call Gemini (re-using the logic from ai.ts)
    const metrics = await extractMetricsFromRFP(rawContext);
    
    // Feed into Pricing Engine
    const pricing = calculateQuote(metrics.area, metrics.complexity as any, metrics.deliverables);
    
    // Save to Database
    const stmt = db.prepare(`
      INSERT INTO leads (id, email, name, company, project, area, complexity, deliverables, quoteTotal, fieldDays, processDays, status) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      randomUUID(), 
      emailAddr, 
      metrics.name || 'Unknown', 
      metrics.company || '', 
      metrics.project || 'New RFP', 
      metrics.area, 
      metrics.complexity, 
      JSON.stringify(metrics.deliverables), 
      pricing.totalPrice, 
      pricing.fieldDays, 
      pricing.processDays, 
      'PENDING'
    );

    console.log(`[Webhook] Successfully ingested RFP from ${emailAddr}`);
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('[Webhook Error]:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
