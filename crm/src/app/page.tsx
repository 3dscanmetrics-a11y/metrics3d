import { getLeads, getInvoices, getExpenses } from './actions';
import { Mail, Settings, Briefcase, Ruler, DollarSign, Clock, CheckCircle, XCircle, FileText, TrendingUp, CreditCard, Receipt, BarChart3, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import AssistantWidget from '../components/AssistantWidget';

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const params = await searchParams;
  const view = params?.view || 'inbox';

  const leads = await getLeads() as any[];
  const invoices = await getInvoices() as any[];
  const expenses = await getExpenses() as any[];

  // P&L Calculations
  const totalRevenue = invoices.filter(i => i.status === 'PAID').reduce((sum, i) => sum + i.amount, 0);
  const pendingRevenue = invoices.filter(i => i.status === 'UNPAID').reduce((sum, i) => sum + i.amount, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const netProfit = totalRevenue - totalExpenses;

  const formatZAR = (val: number) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(val || 0);

  return (
    <div className="min-h-screen bg-gray-50 flex text-gray-900 font-sans">
      
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-gray-900 text-white min-h-screen flex flex-col shadow-xl">
        <div className="p-6 flex items-center space-x-3 mb-6">
          <div className="bg-cyan-400 text-gray-900 p-2 rounded-lg">
            <TrendingUp size={24} />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Metrics<span className="text-cyan-400">CRM</span></h1>
        </div>
        <nav className="flex-1 px-4 space-y-2">
          <Link href="/?view=inbox" className={`flex items-center px-4 py-3 rounded-lg transition-colors ${view === 'inbox' ? 'bg-cyan-500/10 text-cyan-400 font-medium' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
            <Mail className="w-5 h-5 mr-3" /> RFP Inbox (AI)
          </Link>
          <div className="pt-4 pb-2">
            <p className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Bookkeeping</p>
          </div>
          <Link href="/?view=invoices" className={`flex items-center px-4 py-3 rounded-lg transition-colors ${view === 'invoices' ? 'bg-emerald-500/10 text-emerald-400 font-medium' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
            <FileText className="w-5 h-5 mr-3" /> Invoices (A/R)
          </Link>
          <Link href="/?view=expenses" className={`flex items-center px-4 py-3 rounded-lg transition-colors ${view === 'expenses' ? 'bg-rose-500/10 text-rose-400 font-medium' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
            <Receipt className="w-5 h-5 mr-3" /> Expenses (A/P)
          </Link>
          <Link href="/?view=overview" className={`flex items-center px-4 py-3 rounded-lg transition-colors ${view === 'overview' ? 'bg-indigo-500/10 text-indigo-400 font-medium' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
            <BarChart3 className="w-5 h-5 mr-3" /> Profit & Loss
          </Link>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
        
        {/* TOPBAR */}
        <header className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
          <h2 className="text-xl font-semibold text-gray-800 capitalize">
            {view === 'inbox' ? 'AI RFP Review Queue' : view === 'invoices' ? 'Accounts Receivable' : view === 'expenses' ? 'Accounts Payable' : 'Financial Overview'}
          </h2>
        </header>

        <div className="p-8 max-w-7xl mx-auto">
          
          {/* VIEW: INBOX */}
          {view === 'inbox' && (
            <div className="grid gap-6">
              {leads.map((lead) => (
                <div key={lead.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col md:flex-row transition-all hover:shadow-md">
                  <div className="p-6 border-b md:border-b-0 md:border-r border-gray-100 flex-1">
                    <div className="flex items-center justify-between mb-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${lead.status === 'PENDING' ? 'bg-amber-100 text-amber-800' : (lead.status === 'APPROVED' || lead.status === 'SENT') ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                        {lead.status}
                      </span>
                      <span className="text-sm text-gray-400">{new Date(lead.createdAt).toLocaleString()}</span>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">{lead.project || 'Unknown Project'}</h3>
                    <div className="mt-2 space-y-2 text-sm text-gray-600">
                      <p><span className="font-semibold text-gray-900">Client:</span> {lead.name} ({lead.company})</p>
                      <p><span className="font-semibold text-gray-900">Email:</span> {lead.email}</p>
                    </div>
                    <div className="mt-6 pt-6 border-t border-gray-100">
                      <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Original Email Context</h4>
                      <div className="bg-gray-50 rounded p-3 text-sm text-gray-600 max-h-32 overflow-y-auto font-mono">
                        {lead.rawEmail?.substring(0, 300)}...
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-6 md:w-96 flex flex-col justify-between">
                    <div>
                      <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center"><Settings className="w-4 h-4 mr-1"/> AI Extracted Parameters</h4>
                      <ul className="space-y-3 text-sm">
                        <li className="flex justify-between"><span className="text-gray-500 flex items-center"><Ruler className="w-4 h-4 mr-2"/> Area</span><span className="font-medium text-gray-900">{lead.area} sqm</span></li>
                        <li className="flex justify-between"><span className="text-gray-500 flex items-center"><Settings className="w-4 h-4 mr-2"/> Complexity</span><span className="font-medium text-gray-900">{lead.complexity}</span></li>
                        <li className="flex justify-between"><span className="text-gray-500 flex items-center"><Briefcase className="w-4 h-4 mr-2"/> Deliverables</span><span className="font-medium text-gray-900 truncate ml-4">{JSON.parse(lead.deliverables || '[]').join(', ')}</span></li>
                        <li className="flex justify-between"><span className="text-gray-500 flex items-center"><Clock className="w-4 h-4 mr-2"/> Est. Field Time</span><span className="font-medium text-gray-900">{lead.fieldDays} Days</span></li>
                      </ul>
                      <div className="mt-6 p-4 bg-white rounded-lg border border-cyan-100 shadow-sm">
                        <p className="text-xs text-cyan-600 font-semibold uppercase">Calculated Quote</p>
                        <p className="text-3xl font-bold text-gray-900 mt-1">{formatZAR(lead.quoteTotal || 0)}</p>
                      </div>
                    </div>
                    {lead.status === 'PENDING' && (
                      <div className="mt-6 flex space-x-3">
                        <form action={async () => { 'use server'; await import('./actions').then(a => a.approveLead(lead.id)); }} className="flex-1">
                          <button className="w-full bg-cyan-500 hover:bg-cyan-600 text-white py-2 rounded-lg font-medium text-sm transition-colors flex items-center justify-center">
                            <CheckCircle className="w-4 h-4 mr-2" /> Approve &amp; Invoice
                          </button>
                        </form>
                        <form action={async () => { 'use server'; await import('./actions').then(a => a.rejectLead(lead.id)); }}>
                          <button className="bg-white border border-gray-200 hover:bg-gray-50 text-rose-500 p-2 rounded-lg transition-colors">
                            <XCircle className="w-5 h-5" />
                          </button>
                        </form>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* VIEW: INVOICES */}
          {view === 'invoices' && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client & Project</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Created</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {invoices.map(inv => (
                    <tr key={inv.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{inv.clientName}</div>
                        <div className="text-sm text-gray-500">{inv.project}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-semibold text-gray-900">{formatZAR(inv.amount)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(inv.createdAt).toLocaleDateString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${inv.status === 'PAID' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {inv.status === 'UNPAID' && (
                          <form action={async () => { 'use server'; await import('./actions').then(a => a.markInvoicePaid(inv.id)); }}>
                            <button className="text-emerald-600 hover:text-emerald-900 flex items-center justify-end w-full">
                              Mark Paid <CheckCircle className="w-4 h-4 ml-1" />
                            </button>
                          </form>
                        )}
                      </td>
                    </tr>
                  ))}
                  {invoices.length === 0 && (
                    <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">No invoices yet. Approve a quote in the Inbox to generate one.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* VIEW: EXPENSES */}
          {view === 'expenses' && (
            <div>
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-8 flex gap-4">
                <form action={async (formData) => { 'use server'; await import('./actions').then(a => a.addExpense(formData.get('vendor') as string, Number(formData.get('amount')), formData.get('category') as string)); }} className="flex-1 flex gap-4 items-end">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Vendor / Description</label>
                    <input type="text" name="vendor" required className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-cyan-500 focus:border-cyan-500" placeholder="e.g., Leica Geosystems" />
                  </div>
                  <div className="w-48">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Amount (ZAR)</label>
                    <input type="number" name="amount" required className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-cyan-500 focus:border-cyan-500" placeholder="0.00" />
                  </div>
                  <div className="w-48">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <select name="category" className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-white">
                      <option>Hardware/Equipment</option>
                      <option>Software Subscriptions</option>
                      <option>Travel & Accommodation</option>
                      <option>Contractors</option>
                    </select>
                  </div>
                  <button type="submit" className="bg-gray-900 hover:bg-gray-800 text-white px-6 py-2 rounded-lg font-medium transition-colors">Log Expense</button>
                </form>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {expenses.map(exp => (
                      <tr key={exp.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(exp.date).toLocaleDateString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{exp.vendor}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{exp.category}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right font-semibold text-rose-600">-{formatZAR(exp.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VIEW: OVERVIEW */}
          {view === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-gray-500 font-medium">Total Revenue (Paid)</h3>
                    <div className="p-2 bg-emerald-100 rounded-lg"><DollarSign className="w-5 h-5 text-emerald-600" /></div>
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{formatZAR(totalRevenue)}</p>
                  <p className="text-sm text-amber-600 mt-2 font-medium">+{formatZAR(pendingRevenue)} Pending</p>
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-gray-500 font-medium">Total Expenses</h3>
                    <div className="p-2 bg-rose-100 rounded-lg"><CreditCard className="w-5 h-5 text-rose-600" /></div>
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{formatZAR(totalExpenses)}</p>
                  <p className="text-sm text-gray-400 mt-2">All time AP</p>
                </div>

                <div className="bg-gray-900 p-6 rounded-xl shadow-lg relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <BarChart3 className="w-24 h-24 text-white" />
                  </div>
                  <div className="relative z-10">
                    <h3 className="text-gray-400 font-medium mb-4">Net Profit</h3>
                    <p className={`text-4xl font-bold ${netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatZAR(netProfit)}</p>
                    <div className="mt-4 inline-flex items-center text-sm font-medium text-white bg-white/10 px-3 py-1 rounded-full">
                      {totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0}% Margin
                    </div>
                  </div>
                </div>

              </div>

              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <h3 className="font-bold text-lg mb-4">Recent Financial Activity</h3>
                <div className="space-y-4">
                  {invoices.slice(0, 3).map(inv => (
                    <div key={inv.id} className="flex justify-between items-center py-3 border-b border-gray-100 last:border-0">
                      <div>
                        <p className="font-medium text-gray-900">Invoice: {inv.clientName}</p>
                        <p className="text-sm text-gray-500">{new Date(inv.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-emerald-600">+{formatZAR(inv.amount)}</p>
                        <p className="text-xs text-gray-400">{inv.status}</p>
                      </div>
                    </div>
                  ))}
                  {expenses.slice(0, 3).map(exp => (
                    <div key={exp.id} className="flex justify-between items-center py-3 border-b border-gray-100 last:border-0">
                      <div>
                        <p className="font-medium text-gray-900">Expense: {exp.vendor}</p>
                        <p className="text-sm text-gray-500">{exp.category}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-rose-600">-{formatZAR(exp.amount)}</p>
                        <p className="text-xs text-gray-400">Paid</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>
      </main>
      <AssistantWidget />
    </div>
  );
}



