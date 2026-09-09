import { GoogleGenAI, Type } from '@google/genai';
import { Resend } from 'resend';

export interface OverdueInvoicePromptInput {
  invoiceId: string;
  clientName: string;
  clientEmail: string;
  projectName: string;
  totalZar: number;
  dueDate: string;
}

/**
 * Uses Gemini 2.5 Flash to draft personalized, professional follow-up emails for overdue invoices.
 */
export async function draftOverdueInvoiceEmail(input: OverdueInvoicePromptInput) {
  const apiKey = process.env.GEMINI_API_KEY || '';
  if (!apiKey) {
    console.warn('[AI Follow-up] GEMINI_API_KEY is not set. Using fallback message.');
    return {
      subject: `Overdue Invoice Reminder: ${input.projectName}`,
      htmlBody: `<p>Hi ${input.clientName},</p><p>This is a reminder that invoice ${input.invoiceId} for ZAR ${input.totalZar} was due on ${input.dueDate}.</p>`,
      urgencyScore: 5,
    };
  }

  const ai = new GoogleGenAI({ apiKey });
  const prompt = `Draft a polite, professional payment reminder email for an overdue 3D laser scanning invoice.
Client: ${input.clientName}
Project: ${input.projectName}
Invoice ID: ${input.invoiceId}
Amount Due: ZAR ${input.totalZar}
Due Date: ${input.dueDate}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            subject: { type: Type.STRING },
            htmlBody: { type: Type.STRING },
            urgencyScore: { type: Type.NUMBER },
          },
          required: ['subject', 'htmlBody', 'urgencyScore'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');

    if (process.env.RESEND_API_KEY && parsed.htmlBody && input.clientEmail) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: '3D Scan Metrics Accounts <estimates@3dscanmetrics.co.za>',
        to: input.clientEmail,
        subject: parsed.subject,
        html: parsed.htmlBody,
      });
    }

    return parsed;
  } catch (error) {
    console.error('[AI Follow-up Error]:', error);
    return {
      subject: `Overdue Invoice Reminder: ${input.projectName}`,
      htmlBody: `<p>Hi ${input.clientName},</p><p>Reminder: Invoice ${input.invoiceId} for ZAR ${input.totalZar} is overdue.</p>`,
      urgencyScore: 5,
    };
  }
}
