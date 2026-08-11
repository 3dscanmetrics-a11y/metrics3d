import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import db from '@/lib/db';
import { randomUUID } from 'crypto';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const logExpenseTool = {
  name: 'log_expense',
  description: 'Logs a business expense into the CRM ledger',
  parameters: {
    type: 'OBJECT',
    properties: {
      vendor: { type: 'STRING', description: 'The name of the vendor or supplier' },
      amount: { type: 'NUMBER', description: 'The total amount of the expense in ZAR' },
      category: { type: 'STRING', description: 'The category of the expense (e.g. Hardware/Equipment, Travel, Software)' }
    },
    required: ['vendor', 'amount', 'category']
  }
};

const getFinancialSummaryTool = {
  name: 'get_financial_summary',
  description: 'Retrieves the total revenue, expenses, and net profit for the business',
};

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: "You are the Executive AI Assistant inside MetricsCRM for 3D Scan Metrics. Use the provided tools to execute database actions on behalf of the user when requested.",
        tools: [{ functionDeclarations: [logExpenseTool, getFinancialSummaryTool] }],
        temperature: 0,
      }
    });

    const call = response.functionCalls?.[0];

    if (call) {
      if (call.name === 'log_expense') {
        const { vendor, amount, category } = call.args as any;
        const stmt = db.prepare('INSERT INTO expenses (id, vendor, amount, category) VALUES (?, ?, ?, ?)');
        stmt.run(randomUUID(), vendor, amount, category);
        
        return NextResponse.json({ 
          text: `Done! I have successfully logged a ${amount} ZAR expense for ${vendor} under ${category}.`,
          actionTaken: true
        });
      }

      if (call.name === 'get_financial_summary') {
        const invoices: any[] = db.prepare("SELECT amount FROM invoices WHERE status = 'PAID'").all();
        const expenses: any[] = db.prepare("SELECT amount FROM expenses").all();
        
        const rev = invoices.reduce((s, i) => s + i.amount, 0);
        const exp = expenses.reduce((s, e) => s + e.amount, 0);
        const profit = rev - exp;

        // Ask Gemini to summarize this data naturally
        const summaryResponse = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: `The financial data is: Revenue=${rev}, Expenses=${exp}, Profit=${profit}. Please summarize this professionally in one sentence for the director.`,
          config: { temperature: 0.3 }
        });

        return NextResponse.json({ 
          text: summaryResponse.text,
          actionTaken: false
        });
      }
    }

    // If no tool was called, just return the text response
    return NextResponse.json({ text: response.text, actionTaken: false });

  } catch (error) {
    console.error('[Assistant Error]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
