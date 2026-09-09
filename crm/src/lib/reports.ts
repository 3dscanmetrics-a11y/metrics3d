import { getDb } from '@/lib/db';

export interface MonthlyPLReport {
  period: string;
  totalRevenueZar: number;
  totalExpensesZar: number;
  netProfitZar: number;
  operatingMarginPercent: number;
}

/**
 * Calculates monthly Profit & Loss summaries:
 * Net Profit = Total Revenue - Total Expenses
 * Margin % = (Net Profit / Total Revenue) * 100
 */
export async function generateMonthlyProfitAndLoss(year: number, month: number): Promise<MonthlyPLReport> {
  const db = await getDb();

  const startDate = `${year}-${String(month).padStart(2, '0')}-01 00:00:00`;
  const endDate = `${year}-${String(month).padStart(2, '0')}-31 23:59:59`;

  const revenueRes = await db
    .prepare("SELECT SUM(amount) as total FROM invoices WHERE status = 'PAID' AND createdAt BETWEEN ? AND ?")
    .bind(startDate, endDate)
    .first<{ total: number | null }>();

  const expenseRes = await db
    .prepare('SELECT SUM(amount) as total FROM expenses WHERE date BETWEEN ? AND ?')
    .bind(startDate, endDate)
    .first<{ total: number | null }>();

  const totalRevenueZar = revenueRes?.total || 0;
  const totalExpensesZar = expenseRes?.total || 0;
  const netProfitZar = totalRevenueZar - totalExpensesZar;
  const operatingMarginPercent = totalRevenueZar > 0 ? Number(((netProfitZar / totalRevenueZar) * 100).toFixed(2)) : 0;

  return {
    period: `${year}-${String(month).padStart(2, '0')}`,
    totalRevenueZar,
    totalExpensesZar,
    netProfitZar,
    operatingMarginPercent,
  };
}
