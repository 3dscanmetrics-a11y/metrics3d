import { getWebsiteLeads, getQuotations, getInvoices, getExpenses, getClients } from './actions';
import {
  DollarSign,
  CheckCircle,
  FileText,
  TrendingUp,
  CreditCard,
  Receipt,
  BarChart3,
  Users,
  Calculator,
  Inbox,
  Send,
  FileCheck,
} from 'lucide-react';
import Link from 'next/link';
import AssistantWidget from '../components/AssistantWidget';
import InvoiceManagement from '../components/InvoiceManagement';
import LeadCard from '../components/LeadCard';
import QuoteCard from '../components/QuoteCard';
import ReceiptUploader from '../components/ReceiptUploader';
import ClientManagement from '../components/ClientManagement';
import AdminQuoteCalculator from '../components/AdminQuoteCalculator';

import CreateQuotationModal from '../components/CreateQuotationModal';

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const params = await searchParams;
  const view = params?.view || 'leads';

  const pendingLeads = (await getWebsiteLeads()) as any[];
  const quotations = (await getQuotations()) as any[];
  const invoices = (await getInvoices()) as any[];
  const expenses = (await getExpenses()) as any[];
  const clients = (await getClients()) as any[];

  // P&L Calculations
  const totalRevenue = invoices.filter((i) => i.status === 'PAID').reduce((sum, i) => sum + i.amount, 0);
  const pendingRevenue = invoices.filter((i) => i.status === 'UNPAID').reduce((sum, i) => sum + i.amount, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const netProfit = totalRevenue - totalExpenses;

  const formatZAR = (val: number) =>
    new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(val || 0);

  return (
    <div className="min-h-screen bg-gray-50 flex text-gray-900 font-sans">
      {/* Sidebar Navigation (desktop) */}
      <aside className="hidden md:flex w-64 bg-gray-900 text-white min-h-screen flex-col shadow-xl shrink-0">
        <div className="p-6 flex items-center space-x-3 mb-6">
          <div className="bg-orange-500 text-gray-900 p-2 rounded-lg">
            <TrendingUp size={24} />
          </div>
          <h1 className="text-xl font-bold tracking-tight">
            Metrics<span className="text-orange-500">CRM</span>
          </h1>
        </div>

        <nav className="flex-1 px-4 space-y-2 text-xs font-semibold">
          <div className="pb-1">
            <p className="px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Inbound & Pipeline</p>
          </div>
          <Link
            href="/?view=leads"
            className={`flex items-center justify-between px-4 py-3 rounded-xl transition-colors ${
              view === 'leads' ? 'bg-orange-500/10 text-orange-400 font-bold' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            }`}
          >
            <div className="flex items-center">
              <Inbox className="w-4 h-4 mr-3 text-orange-500" />
              <span>Website Leads</span>
            </div>
            {pendingLeads.length > 0 && (
              <span className="bg-orange-500 text-gray-900 px-2 py-0.5 rounded-full text-[10px] font-extrabold">
                {pendingLeads.length}
              </span>
            )}
          </Link>

          <Link
            href="/?view=quotes"
            className={`flex items-center justify-between px-4 py-3 rounded-xl transition-colors ${
              view === 'quotes' ? 'bg-orange-500/10 text-orange-400 font-bold' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            }`}
          >
            <div className="flex items-center">
              <FileCheck className="w-4 h-4 mr-3 text-orange-500" />
              <span>Formal Quotations</span>
            </div>
            {quotations.length > 0 && (
              <span className="bg-gray-800 text-orange-400 px-2 py-0.5 rounded-full text-[10px] font-bold border border-gray-700">
                {quotations.length}
              </span>
            )}
          </Link>

          <Link
            href="/?view=calculator"
            className={`flex items-center px-4 py-3 rounded-xl transition-colors ${
              view === 'calculator' ? 'bg-orange-500/10 text-orange-400 font-bold' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            }`}
          >
            <Calculator className="w-4 h-4 mr-3 text-orange-500" />
            <span>Admin Calculator</span>
          </Link>

          <div className="pt-4 pb-1">
            <p className="px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Client Directory</p>
          </div>
          <Link
            href="/?view=clients"
            className={`flex items-center px-4 py-3 rounded-xl transition-colors ${
              view === 'clients' ? 'bg-amber-500/10 text-amber-400 font-bold' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4 mr-3 text-amber-500" />
            <span>Client Directory</span>
          </Link>

          <div className="pt-4 pb-1">
            <p className="px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Bookkeeping & Accounts</p>
          </div>
          <Link
            href="/?view=invoices"
            className={`flex items-center px-4 py-3 rounded-xl transition-colors ${
              view === 'invoices' ? 'bg-emerald-500/10 text-emerald-400 font-bold' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4 mr-3 text-emerald-500" />
            <span>Invoices (A/R)</span>
          </Link>
          <Link
            href="/?view=expenses"
            className={`flex items-center px-4 py-3 rounded-xl transition-colors ${
              view === 'expenses' ? 'bg-rose-500/10 text-rose-400 font-bold' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            }`}
          >
            <Receipt className="w-4 h-4 mr-3 text-rose-500" />
            <span>Expenses (A/P)</span>
          </Link>
          <Link
            href="/?view=overview"
            className={`flex items-center px-4 py-3 rounded-xl transition-colors ${
              view === 'overview' ? 'bg-indigo-500/10 text-indigo-400 font-bold' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            }`}
          >
            <BarChart3 className="w-4 h-4 mr-3 text-indigo-500" />
            <span>Profit & Loss</span>
          </Link>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto min-w-0 pb-20 md:pb-0">
        {/* TOPBAR */}
        <header className="bg-white border-b border-gray-200 px-4 md:px-8 py-3 md:py-4 flex items-center justify-between sticky top-0 z-10 shadow-2xs">
          <h2 className="text-base md:text-xl font-bold text-gray-900 capitalize truncate">
            {view === 'leads'
              ? 'Stage 1: Website Lead Submissions'
              : view === 'quotes'
                ? 'Stage 2: Formal Quotations Pipeline'
                : view === 'calculator'
                  ? 'Admin Scoping & Pricing Engine'
                  : view === 'clients'
                    ? 'Client Directory'
                    : view === 'invoices'
                      ? 'Stage 3: Accounts Receivable (Invoices)'
                      : view === 'expenses'
                        ? 'Accounts Payable (Expenses & OCR)'
                        : 'Financial Overview & Profit Loss'}
          </h2>
          <div className="flex items-center space-x-3 shrink-0">
            <CreateQuotationModal clients={clients} />
          </div>
        </header>

        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          {/* VIEW 1: WEBSITE LEADS */}
          {view === 'leads' && (
            <div className="space-y-6">
              <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-gray-900 flex items-center space-x-2">
                    <Inbox className="w-5 h-5 text-orange-600" />
                    <span>Inbound Website Lead Submissions</span>
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Un-actioned scoping requests submitted directly from the public website calculator.
                  </p>
                </div>
                <div className="bg-orange-50 border border-orange-200 text-orange-800 text-xs px-3 py-1.5 rounded-lg font-bold">
                  {pendingLeads.length} Pending Un-actioned Leads
                </div>
              </div>

              {pendingLeads.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-sm">
                  <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Inbox size={24} />
                  </div>
                  <h4 className="font-bold text-gray-900 text-base mb-1">No Pending Website Leads</h4>
                  <p className="text-xs text-gray-500 max-w-md mx-auto mb-4">
                    All website leads have been actioned! Once a quote is sent, it automatically moves to the <strong>Formal Quotations</strong> tab.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {pendingLeads.map((lead, idx) => (
                    <LeadCard key={lead.id} lead={lead} defaultOpen={idx === 0} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* VIEW 2: FORMAL QUOTATIONS TAB */}
          {view === 'quotes' && (
            <div className="space-y-6">
              <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-gray-900 flex items-center space-x-2">
                    <FileCheck className="w-5 h-5 text-orange-600" />
                    <span>Active Formal Quotations</span>
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Actioned formal quotes sent to clients. Once a client accepts, convert it to an invoice below.
                  </p>
                </div>
                <div className="flex items-center space-x-3">
                  <CreateQuotationModal clients={clients} />
                  <div className="bg-orange-50 border border-orange-200 text-orange-800 text-xs px-3 py-1.5 rounded-lg font-bold">
                    {quotations.length} Active Formal Quotes
                  </div>
                </div>
              </div>

              {quotations.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-sm">
                  <div className="w-12 h-12 bg-gray-100 text-gray-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Send size={24} />
                  </div>
                  <h4 className="font-bold text-gray-900 text-base mb-1">No Active Formal Quotations</h4>
                  <p className="text-xs text-gray-500 max-w-md mx-auto mb-4">
                    When you action a website lead or create a custom quote in the Admin Calculator, it will appear here awaiting client acceptance.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {quotations.map((lead, idx) => (
                    <QuoteCard key={lead.id} lead={lead} defaultOpen={idx === 0} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* VIEW 3: ADMIN CALCULATOR */}
          {view === 'calculator' && <AdminQuoteCalculator clients={clients} />}

          {/* VIEW 4: CLIENT DIRECTORY */}
          {view === 'clients' && <ClientManagement initialClients={clients} />}

          {/* VIEW 5: INVOICES */}
          {view === 'invoices' && <InvoiceManagement initialInvoices={invoices} initialClients={clients} />}

          {/* VIEW 6: EXPENSES */}
          {view === 'expenses' && (
            <div>
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 md:p-6 mb-6 md:mb-8">
                <form
                  action={async (formData) => {
                    'use server';
                    await import('./actions').then((a) =>
                      a.addExpense(
                        formData.get('vendor') as string,
                        Number(formData.get('amount')),
                        formData.get('category') as string
                      )
                    );
                  }}
                  className="flex-1 flex flex-col md:flex-row gap-4 md:items-end"
                >
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Vendor / Description</label>
                    <input
                      type="text"
                      name="vendor"
                      required
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-orange-500"
                      placeholder="e.g., Leica Geosystems"
                    />
                  </div>
                  <div className="w-full md:w-48">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Amount (ZAR)</label>
                    <input
                      type="number"
                      name="amount"
                      required
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-orange-500"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="w-full md:w-48">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Category</label>
                    <select
                      name="category"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs bg-white focus:ring-2 focus:ring-orange-500"
                    >
                      <option>Hardware/Equipment</option>
                      <option>Software Subscriptions</option>
                      <option>Travel & Accommodation</option>
                      <option>Contractors</option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    className="bg-gray-900 hover:bg-gray-800 text-white px-5 py-2 rounded-lg font-bold transition-colors text-xs cursor-pointer"
                  >
                    Log Expense
                  </button>
                </form>
              </div>

              <ReceiptUploader />

              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3.5 text-left font-bold text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3.5 text-left font-bold text-gray-500 uppercase tracking-wider">Vendor</th>
                      <th className="px-6 py-3.5 text-left font-bold text-gray-500 uppercase tracking-wider">Category</th>
                      <th className="px-6 py-3.5 text-right font-bold text-gray-500 uppercase tracking-wider">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {expenses.map((exp) => (
                      <tr key={exp.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                          {new Date(exp.date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-bold text-gray-900">{exp.vendor}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-500">{exp.category}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right font-bold text-rose-600">
                          -{formatZAR(exp.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VIEW 7: OVERVIEW */}
          {view === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-gray-500 font-semibold text-xs uppercase tracking-wider">Total Revenue (Paid)</h3>
                    <div className="p-2.5 bg-emerald-100 text-emerald-600 rounded-xl">
                      <DollarSign size={20} />
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{formatZAR(totalRevenue)}</p>
                  <p className="text-xs text-amber-600 mt-2 font-bold">+{formatZAR(pendingRevenue)} Pending</p>
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-gray-500 font-semibold text-xs uppercase tracking-wider">Total Expenses</h3>
                    <div className="p-2.5 bg-rose-100 text-rose-600 rounded-xl">
                      <CreditCard size={20} />
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{formatZAR(totalExpenses)}</p>
                  <p className="text-xs text-gray-400 mt-2">All time Accounts Payable</p>
                </div>

                <div className="bg-gray-900 p-6 rounded-xl shadow-lg relative overflow-hidden text-white">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <BarChart3 className="w-24 h-24 text-white" />
                  </div>
                  <div className="relative z-10">
                    <h3 className="text-gray-400 font-semibold text-xs uppercase tracking-wider mb-4">Net Profit</h3>
                    <p className={`text-4xl font-bold ${netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {formatZAR(netProfit)}
                    </p>
                    <div className="mt-4 inline-flex items-center text-xs font-bold text-white bg-white/10 px-3 py-1 rounded-full">
                      {totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0}% Margin
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Mobile Navigation */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-gray-900 border-t border-gray-800 grid grid-cols-6 text-[9px] pb-[env(safe-area-inset-bottom)]">
        <Link
          href="/?view=leads"
          className={`flex flex-col items-center justify-center gap-1 py-2 min-h-14 ${
            view === 'leads' ? 'text-orange-400 font-bold' : 'text-gray-400'
          }`}
        >
          <Inbox className="w-4 h-4" /> Leads
        </Link>
        <Link
          href="/?view=quotes"
          className={`flex flex-col items-center justify-center gap-1 py-2 min-h-14 ${
            view === 'quotes' ? 'text-orange-400 font-bold' : 'text-gray-400'
          }`}
        >
          <FileCheck className="w-4 h-4" /> Quotes
        </Link>
        <Link
          href="/?view=calculator"
          className={`flex flex-col items-center justify-center gap-1 py-2 min-h-14 ${
            view === 'calculator' ? 'text-orange-400 font-bold' : 'text-gray-400'
          }`}
        >
          <Calculator className="w-4 h-4" /> Calc
        </Link>
        <Link
          href="/?view=clients"
          className={`flex flex-col items-center justify-center gap-1 py-2 min-h-14 ${
            view === 'clients' ? 'text-amber-400 font-bold' : 'text-gray-400'
          }`}
        >
          <Users className="w-4 h-4" /> Clients
        </Link>
        <Link
          href="/?view=invoices"
          className={`flex flex-col items-center justify-center gap-1 py-2 min-h-14 ${
            view === 'invoices' ? 'text-emerald-400 font-bold' : 'text-gray-400'
          }`}
        >
          <FileText className="w-4 h-4" /> Invoices
        </Link>
        <Link
          href="/?view=expenses"
          className={`flex flex-col items-center justify-center gap-1 py-2 min-h-14 ${
            view === 'expenses' ? 'text-rose-400 font-bold' : 'text-gray-400'
          }`}
        >
          <Receipt className="w-4 h-4" /> Expenses
        </Link>
      </nav>

      <AssistantWidget />
    </div>
  );
}
