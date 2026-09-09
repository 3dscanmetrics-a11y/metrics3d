import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';
import { getDb } from '@/lib/db';
import { randomUUID } from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('receipt') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No receipt file uploaded' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString('base64');

    const apiKey = process.env.GEMINI_API_KEY || '';
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is missing' }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey });
    const visionResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          inlineData: {
            mimeType: file.type || 'image/png',
            data: base64Data,
          },
        },
        {
          text: 'Extract the vendor name, total amount in ZAR, and expense category (EQUIPMENT, TRAVEL, PER-DIEM, SOFTWARE, SUBCONTRACTOR) from this receipt.',
        },
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            vendor: { type: Type.STRING },
            amountZar: { type: Type.NUMBER },
            category: { type: Type.STRING },
            confidence: { type: Type.NUMBER },
          },
          required: ['vendor', 'amountZar', 'category'],
        },
      },
    });

    const data = JSON.parse(visionResponse.text || '{}');
    const db = await getDb();
    const expenseId = randomUUID();

    await db
      .prepare('INSERT INTO expenses (id, vendor, amount, category) VALUES (?, ?, ?, ?)')
      .bind(expenseId, data.vendor || 'Unknown Vendor', data.amountZar || 0, data.category || 'EQUIPMENT')
      .run();

    return NextResponse.json({
      success: true,
      expenseId,
      extracted: data,
    });
  } catch (error) {
    console.error('[Receipt AI Extraction Error]:', error);
    return NextResponse.json({ error: 'Failed to extract receipt data' }, { status: 500 });
  }
}
