import { NextRequest, NextResponse } from 'next/server';
import { runAutomatedInvoiceReminders } from '@/app/actions';

export async function GET(request: NextRequest) {
  try {
    const result = await runAutomatedInvoiceReminders();
    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    console.error('[Cron Invoice Reminders Error]', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to run automated invoice reminders' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
