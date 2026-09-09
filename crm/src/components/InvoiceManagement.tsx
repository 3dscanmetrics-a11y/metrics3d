'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileText,
  Plus,
  Search,
  CheckCircle,
  AlertCircle,
  Mail,
  Copy,
  Trash2,
  Edit,
  Building,
  X,
  DollarSign,
  CreditCard,
} from 'lucide-react';
import {
  updateInvoice,
  createStandaloneInvoice,
  sendInvoiceEmail,
  duplicateInvoice,
  deleteInvoice,
  markInvoicePaid,
  recordInvoicePayment,
} from '../app/actions';
import { ClientRecord } from './ClientManagement';
import SendEmailModal from './SendEmailModal';

export interface InvoiceItem {
  id?: string;
  description: string;
  quantity: number;
  unitPriceZar: number;
  totalZar: number;
}

export interface InvoiceRecord {
  id: string;
  leadId?: string;
  clientName: string;
  contactName?: string;
  clientCompany?: string;
  clientEmail?: string;
  clientPhone?: string;
  clientAddress?: string;
  clientVat?: string;
  clientReg?: string;
  paymentTerms?: string;
  project: string;
  amount: number;
  amountPaid?: number;
  status: string;
  createdAt: string;
  dueDate?: string;
  items?: InvoiceItem[];
}

const formatZAR = (val: number) =>
  new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(val || 0);

export default function InvoiceManagement({
  initialInvoices,
  initialClients,
}: {
  initialInvoices: InvoiceRecord[];
  initialClients: ClientRecord[];
}) {
  const router = useRouter();
  const [invoices, setInvoices] = useState<InvoiceRecord[]>(initialInvoices);

  useEffect(() => {
    setInvoices(initialInvoices);
  }, [initialInvoices]);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [editingInvoice, setEditingInvoice] = useState<InvoiceRecord | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [emailModalInvoice, setEmailModalInvoice] = useState<InvoiceRecord | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);

  // Record Payment Modal state
  const [recordPaymentInvoice, setRecordPaymentInvoice] = useState<InvoiceRecord | null>(null);
  const [paymentAmountInput, setPaymentAmountInput] = useState<number>(0);

  // New Invoice Form State
  const [newClientName, setNewClientName] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientAddress, setNewClientAddress] = useState('');
  const [newClientVat, setNewClientVat] = useState('');
  const [newPaymentTerms, setNewPaymentTerms] = useState('30 Days');
  const [newProject, setNewProject] = useState('');
  const [newStatus, setNewStatus] = useState('UNPAID');
  const [newAmountPaid, setNewAmountPaid] = useState<number>(0);
  const [newItems, setNewItems] = useState<InvoiceItem[]>([
    { description: '3D Laser Scanning Site Fieldwork', quantity: 1, unitPriceZar: 12500, totalZar: 12500 },
  ]);

  // Edit Invoice Form State
  const [editClientName, setEditClientName] = useState('');
  const [editClientEmail, setEditClientEmail] = useState('');
  const [editClientPhone, setEditClientPhone] = useState('');
  const [editClientAddress, setEditClientAddress] = useState('');
  const [editClientVat, setEditClientVat] = useState('');
  const [editPaymentTerms, setEditPaymentTerms] = useState('30 Days');
  const [editProject, setEditProject] = useState('');
  const [editStatus, setEditStatus] = useState('UNPAID');
  const [editAmountPaid, setEditAmountPaid] = useState<number>(0);
  const [editItems, setEditItems] = useState<InvoiceItem[]>([]);

  // Filter Invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const matchSearch =
        (inv.clientName || '').toLowerCase().includes(search.toLowerCase()) ||
        (inv.project || '').toLowerCase().includes(search.toLowerCase()) ||
        (inv.id || '').toLowerCase().includes(search.toLowerCase());

      const matchStatus =
        statusFilter === 'ALL'
          ? true
          : (inv.status || '').toUpperCase() === statusFilter.toUpperCase();

      return matchSearch && matchStatus;
    });
  }, [invoices, search, statusFilter]);

  // Financial Metrics
  const metrics = useMemo(() => {
    const totalInvoiced = invoices.reduce((sum, i) => sum + (i.amount || 0), 0);
    const paidRevenue = invoices.reduce((sum, i) => {
      const isPaid = (i.status || '').toUpperCase() === 'PAID';
      const paidAmt = isPaid ? (i.amount || 0) : Number(i.amountPaid || 0);
      return sum + paidAmt;
    }, 0);
    const unpaidAR = Math.max(0, totalInvoiced - paidRevenue);
    return { totalInvoiced, paidRevenue, unpaidAR, count: invoices.length };
  }, [invoices]);

  // Open Edit Modal
  function handleOpenEdit(inv: InvoiceRecord) {
    setEditingInvoice(inv);
    setEditClientName(inv.clientName || '');
    setEditClientEmail(inv.clientEmail || '');
    setEditClientPhone(inv.clientPhone || '');
    setEditClientAddress(inv.clientAddress || '');
    setEditClientVat(inv.clientVat || '');
    setEditPaymentTerms(inv.paymentTerms || '30 Days');
    setEditProject(inv.project || '');
    setEditStatus(inv.status || 'UNPAID');
    setEditAmountPaid(inv.amountPaid || 0);
    const existingItems =
      Array.isArray(inv.items) && inv.items.length > 0
        ? inv.items.map((i) => ({ ...i }))
        : [
            {
              description: `3D Laser Scanning Services: ${inv.project || 'Project'}`,
              quantity: 1,
              unitPriceZar: inv.amount || 0,
              totalZar: inv.amount || 0,
            },
          ];
    setEditItems(existingItems);
  }

  // Handle Save Edit
  async function handleSaveEdit() {
    if (!editingInvoice) return;
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const calcTotal = editItems.reduce(
        (sum, i) => sum + (Number(i.totalZar) || Number(i.quantity || 1) * Number(i.unitPriceZar || 0)),
        0
      );

      const fd = new FormData();
      fd.set('id', editingInvoice.id);
      fd.set('clientName', editClientName);
      fd.set('clientEmail', editClientEmail);
      fd.set('clientPhone', editClientPhone);
      fd.set('clientAddress', editClientAddress);
      fd.set('clientVat', editClientVat);
      fd.set('paymentTerms', editPaymentTerms);
      fd.set('project', editProject);
      fd.set('status', editStatus);
      fd.set('amountPaid', String(editAmountPaid));
      fd.set('amount', String(calcTotal));
      fd.set('items', JSON.stringify(editItems));

      await updateInvoice(fd);
      setMessage(`Invoice INV-${editingInvoice.id.slice(0, 8).toUpperCase()} updated successfully!`);
      setEditingInvoice(null);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to update invoice');
    } finally {
      setLoading(false);
    }
  }

  // Handle Create New Invoice
  async function handleCreateInvoice() {
    if (!newClientName) {
      setError('Please provide a Client Name.');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const fd = new FormData();
      fd.set('clientName', newClientName);
      fd.set('clientEmail', newClientEmail);
      fd.set('clientPhone', newClientPhone);
      fd.set('clientAddress', newClientAddress);
      fd.set('clientVat', newClientVat);
      fd.set('paymentTerms', newPaymentTerms);
      fd.set('project', newProject || '3D Laser Scanning Services');
      fd.set('status', newStatus);
      fd.set('amountPaid', String(newAmountPaid));
      fd.set('items', JSON.stringify(newItems));

      await createStandaloneInvoice(fd);
      setMessage('New Standalone Invoice created successfully!');
      setIsCreatingNew(false);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to create invoice');
    } finally {
      setLoading(false);
    }
  }

  // Handle Quick Record Payment
  async function handleRecordPaymentSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!recordPaymentInvoice) return;
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      await recordInvoicePayment(recordPaymentInvoice.id, Number(paymentAmountInput) || 0);
      setMessage(`Recorded payment entry of ${formatZAR(paymentAmountInput)} for INV-${recordPaymentInvoice.id.slice(0, 8).toUpperCase()}`);
      setRecordPaymentInvoice(null);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to record payment');
    } finally {
      setLoading(false);
    }
  }

  // Handle Send Email
  async function handleSendEmail(invId: string) {
    setSendingId(invId);
    setError(null);
    setMessage(null);
    try {
      await sendInvoiceEmail(invId);
      setMessage('Invoice email with attached PDF sent to client!');
    } catch (err: any) {
      setError(err.message || 'Failed to send invoice email');
    } finally {
      setSendingId(null);
    }
  }

  // Handle Duplicate
  async function handleDuplicate(invId: string) {
    setLoading(true);
    try {
      await duplicateInvoice(invId);
      setMessage('Invoice duplicated successfully!');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to duplicate invoice');
    } finally {
      setLoading(false);
    }
  }

  // Handle Delete
  async function handleDelete(invId: string) {
    if (!confirm('Are you sure you want to delete this invoice record? This action cannot be undone.')) return;
    setLoading(true);
    try {
      await deleteInvoice(invId);
      setMessage('Invoice deleted.');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to delete invoice');
    } finally {
      setLoading(false);
    }
  }

  // Select Client in Create Form
  function handleSelectClientInCreate(clientId: string) {
    const found = initialClients.find((c) => c.id === clientId);
    if (found) {
      setNewClientName(found.company || found.name);
      setNewClientEmail(found.email || '');
      setNewClientPhone(found.phone || found.mobile || '');
      setNewClientAddress([found.billingStreet, found.billingCity, found.billingPostalCode].filter(Boolean).join(', ') || '');
      setNewClientVat(found.vatNumber || found.taxNumber || '');
      setNewPaymentTerms(found.paymentTerms || '30 Days');
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Invoiced (AR)</div>
          <div className="text-xl font-black text-gray-900 mt-1">{formatZAR(metrics.totalInvoiced)}</div>
          <div className="text-[10px] text-gray-400 mt-0.5">{metrics.count} total billing documents</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
          <div className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Collected Revenue</div>
          <div className="text-xl font-black text-emerald-700 mt-1">{formatZAR(metrics.paidRevenue)}</div>
          <div className="text-[10px] text-emerald-600 font-medium mt-0.5">Paid & Cleared Funds</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
          <div className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Pending Accounts Receivable</div>
          <div className="text-xl font-black text-amber-700 mt-1">{formatZAR(metrics.unpaidAR)}</div>
          <div className="text-[10px] text-amber-600 font-medium mt-0.5">Outstanding Invoices</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs flex flex-col justify-between">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Quick Actions</div>
          <button
            type="button"
            onClick={() => setIsCreatingNew(true)}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold px-3 py-2 rounded-lg text-xs transition-colors flex items-center justify-center space-x-1.5 shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Invoice</span>
          </button>
        </div>
      </div>

      {/* Alert Messages */}
      {message && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>{message}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-emerald-700 font-bold hover:text-emerald-900 cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-600" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-700 font-bold hover:text-rose-900 cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by client name, project, or INV #..."
            className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-1.5 text-xs bg-white focus:ring-2 focus:ring-orange-500"
          />
        </div>

        <div className="flex items-center space-x-2 w-full md:w-auto overflow-x-auto">
          {['ALL', 'UNPAID', 'PARTIAL', 'PAID', 'OVERDUE', 'DRAFT'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                statusFilter === st
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {st === 'PARTIAL' ? 'PARTIALLY PAID' : st}
            </button>
          ))}
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                Invoice & Status
              </th>
              <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                Client & Project Scope
              </th>
              <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                Amount (ZAR)
              </th>
              <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                Date Issued
              </th>
              <th className="px-6 py-3.5 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">
                QuickBooks Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredInvoices.map((inv) => {
              const invNo = `INV-${inv.id.slice(0, 8).toUpperCase()}`;
              const isPaid = (inv.status || '').toUpperCase() === 'PAID';
              const isPartial = (inv.status || '').toUpperCase() === 'PARTIAL' || (inv.status || '').toUpperCase() === 'PARTIALLY PAID';
              const amountPaid = Number(inv.amountPaid || 0);

              return (
                <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-mono font-bold text-gray-900">{invNo}</div>
                    <span
                      className={`inline-block mt-1 px-2.5 py-0.5 text-[10px] font-extrabold rounded-full ${
                        isPaid
                          ? 'bg-emerald-100 text-emerald-800'
                          : isPartial || (amountPaid > 0 && !isPaid)
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : (inv.status || '').toUpperCase() === 'OVERDUE'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-slate-100 text-slate-800'
                      }`}
                    >
                      {isPartial || (amountPaid > 0 && !isPaid) ? 'PARTIALLY PAID' : (inv.status || 'UNPAID').toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-semibold text-gray-900">{inv.clientName}</div>
                    <div className="text-xs text-gray-500 truncate max-w-xs">{inv.project}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-black text-gray-900">{formatZAR(inv.amount)}</div>
                    {amountPaid > 0 && !isPaid && (
                      <div className="text-[10px] space-y-0.5 mt-0.5">
                        <div className="text-emerald-700 font-bold">Paid: {formatZAR(amountPaid)}</div>
                        <div className="text-amber-800 font-extrabold">Bal: {formatZAR(Math.max(0, inv.amount - amountPaid))}</div>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                    {new Date(inv.createdAt).toLocaleDateString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-medium">
                    <div className="flex items-center justify-end space-x-1.5">
                      {/* Edit Button */}
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(inv)}
                        title="Edit Invoice Details & Line Items"
                        className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors cursor-pointer"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>

                      {/* PDF View */}
                      <a
                        href={`/api/invoices/${inv.id}/pdf`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="View PDF Invoice Document"
                        className="inline-flex items-center space-x-1 bg-white border border-gray-300 hover:bg-gray-100 text-gray-800 font-semibold px-2.5 py-1.5 rounded-lg text-xs transition-colors shadow-2xs"
                      >
                        <FileText className="w-3.5 h-3.5 text-orange-600" />
                        <span>PDF</span>
                      </a>

                      {/* Send Email */}
                      <button
                        type="button"
                        onClick={() => setEmailModalInvoice(inv)}
                        title="Send PDF Invoice via Email (with CC & Attachments)"
                        className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg border border-blue-200 transition-colors cursor-pointer"
                      >
                        <Mail className="w-3.5 h-3.5" />
                      </button>

                      {/* Record Partial Payment */}
                      {!isPaid && (
                        <button
                          type="button"
                          onClick={() => {
                            setRecordPaymentInvoice(inv);
                            const rem = Math.max(0, inv.amount - (inv.amountPaid || 0));
                            setPaymentAmountInput(rem);
                          }}
                          title="Record Deposit or Partial Payment Entry"
                          className="bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold border border-amber-200 px-2 py-1.5 rounded-lg text-xs transition-colors cursor-pointer flex items-center space-x-1"
                        >
                          <DollarSign className="w-3.5 h-3.5 text-amber-600" />
                          <span>Payment</span>
                        </button>
                      )}

                      {/* Mark Paid */}
                      {!isPaid && (
                        <form
                          action={async () => {
                            await markInvoicePaid(inv.id);
                            router.refresh();
                          }}
                        >
                          <button
                            type="submit"
                            title="Mark Invoice as Paid in Full"
                            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold border border-emerald-200 px-2 py-1.5 rounded-lg text-xs transition-colors cursor-pointer flex items-center space-x-1"
                          >
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Paid</span>
                          </button>
                        </form>
                      )}

                      {/* Duplicate */}
                      <button
                        type="button"
                        onClick={() => handleDuplicate(inv.id)}
                        title="Duplicate Invoice"
                        className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition-colors cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => handleDelete(inv.id)}
                        title="Delete Invoice"
                        className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {filteredInvoices.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500 text-xs">
                  No invoices match your search criteria. Click <strong>"Create New Invoice"</strong> to generate a custom document.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* EDIT INVOICE MODAL */}
      {editingInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-3xl w-full p-6 space-y-6 my-8">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-lg font-black text-gray-900">
                  Edit Invoice: <span className="font-mono text-orange-600">INV-{editingInvoice.id.slice(0, 8).toUpperCase()}</span>
                </h3>
                <p className="text-xs text-gray-500">Modify client details, scope parameters, line items, and payment status.</p>
              </div>
              <button onClick={() => setEditingInvoice(null)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Client / Company Name</label>
                <input
                  type="text"
                  value={editClientName}
                  onChange={(e) => setEditClientName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Client Email Address</label>
                <input
                  type="email"
                  value={editClientEmail}
                  onChange={(e) => setEditClientEmail(e.target.value)}
                  placeholder="accounts@client.co.za"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Client Contact Phone</label>
                <input
                  type="text"
                  value={editClientPhone}
                  onChange={(e) => setEditClientPhone(e.target.value)}
                  placeholder="+27 82 000 0000"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-gray-700 mb-1">Physical / Billing Address (SA Invoice Requirement)</label>
                <input
                  type="text"
                  value={editClientAddress}
                  onChange={(e) => setEditClientAddress(e.target.value)}
                  placeholder="e.g. 12 Waterfront Way, Victoria & Alfred Waterfront, Cape Town, 8001"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Customer VAT Number</label>
                <input
                  type="text"
                  value={editClientVat}
                  onChange={(e) => setEditClientVat(e.target.value)}
                  placeholder="e.g. 4980289123 (or leave blank if non-VAT)"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-orange-500 font-mono"
                />
              </div>

              <div className="sm:col-span-1">
                <label className="block text-xs font-bold text-gray-700 mb-1">Project Name & Site</label>
                <input
                  type="text"
                  value={editProject}
                  onChange={(e) => setEditProject(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Payment Terms</label>
                <select
                  value={editPaymentTerms}
                  onChange={(e) => setEditPaymentTerms(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs bg-white font-bold focus:ring-2 focus:ring-orange-500"
                >
                  <option value="30 Days">30 Days (Net 30)</option>
                  <option value="Due on Receipt">Due on Receipt (Net 0)</option>
                  <option value="7 Days">7 Days (Net 7)</option>
                  <option value="14 Days">14 Days (Net 14)</option>
                  <option value="60 Days">60 Days (Net 60)</option>
                  <option value="50% Deposit / Balance on Delivery">50% Deposit / Balance on Delivery</option>
                  <option value="COD (Cash on Delivery)">COD (Cash on Delivery)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Invoice Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs bg-white font-bold focus:ring-2 focus:ring-orange-500"
                >
                  <option value="UNPAID">UNPAID</option>
                  <option value="PARTIAL">PARTIALLY PAID</option>
                  <option value="PAID">PAID</option>
                  <option value="OVERDUE">OVERDUE</option>
                  <option value="DRAFT">DRAFT</option>
                  <option value="VOID">VOID</option>
                </select>
              </div>

              {(editStatus === 'PARTIAL' || editAmountPaid > 0) && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Deposit / Amount Paid (ZAR)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editAmountPaid}
                    onChange={(e) => setEditAmountPaid(Number(e.target.value))}
                    placeholder="0.00"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-orange-500 text-emerald-700"
                  />
                </div>
              )}
            </div>

            {/* Line Items Editor */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-extrabold text-gray-900 uppercase tracking-wider">Itemized Scope & Line Items</h4>
                <button
                  type="button"
                  onClick={() =>
                    setEditItems([...editItems, { description: 'New Service Line Item', quantity: 1, unitPriceZar: 0, totalZar: 0 }])
                  }
                  className="text-xs font-bold text-orange-600 hover:text-orange-700 inline-flex items-center space-x-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Line Item</span>
                </button>
              </div>

              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-3 py-2 text-left font-bold text-gray-600">Item Description</th>
                      <th className="px-3 py-2 text-center font-bold text-gray-600 w-16">Qty</th>
                      <th className="px-3 py-2 text-right font-bold text-gray-600 w-32">Unit Price (ZAR)</th>
                      <th className="px-3 py-2 text-right font-bold text-gray-600 w-32">Amount (ZAR)</th>
                      <th className="px-2 py-2 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {editItems.map((item, idx) => {
                      const lineTot = (Number(item.quantity) || 1) * (Number(item.unitPriceZar) || 0);
                      return (
                        <tr key={idx}>
                          <td className="p-2">
                            <input
                              type="text"
                              value={item.description}
                              onChange={(e) => {
                                const copy = [...editItems];
                                copy[idx].description = e.target.value;
                                setEditItems(copy);
                              }}
                              className="w-full border border-gray-300 rounded-md px-2 py-1 text-xs focus:ring-1 focus:ring-orange-500"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => {
                                const copy = [...editItems];
                                copy[idx].quantity = Number(e.target.value);
                                copy[idx].totalZar = copy[idx].quantity * copy[idx].unitPriceZar;
                                setEditItems(copy);
                              }}
                              className="w-full border border-gray-300 rounded-md px-2 py-1 text-xs text-center focus:ring-1 focus:ring-orange-500"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              value={item.unitPriceZar}
                              onChange={(e) => {
                                const copy = [...editItems];
                                copy[idx].unitPriceZar = Number(e.target.value);
                                copy[idx].totalZar = copy[idx].quantity * copy[idx].unitPriceZar;
                                setEditItems(copy);
                              }}
                              className="w-full border border-gray-300 rounded-md px-2 py-1 text-xs text-right focus:ring-1 focus:ring-orange-500"
                            />
                          </td>
                          <td className="p-2 text-right font-bold text-gray-900">
                            {formatZAR(lineTot)}
                          </td>
                          <td className="p-2 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                const copy = editItems.filter((_, i) => i !== idx);
                                setEditItems(copy);
                              }}
                              className="text-rose-500 hover:text-rose-700 cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Real-time Subtotal */}
              <div className="flex justify-end pt-2">
                <div className="text-right">
                  <span className="text-xs text-gray-500 font-semibold">Updated Total Amount Due: </span>
                  <span className="text-base font-black text-gray-900 ml-2">
                    {formatZAR(
                      editItems.reduce(
                        (sum, i) => sum + (Number(i.quantity || 1) * Number(i.unitPriceZar || 0)),
                        0
                      )
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end space-x-3 border-t border-gray-100 pt-4">
              <button
                type="button"
                onClick={() => setEditingInvoice(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={loading}
                className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-lg text-xs shadow-xs cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Saving Changes...' : 'Save Invoice Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE NEW STANDALONE INVOICE MODAL */}
      {isCreatingNew && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-3xl w-full p-6 space-y-6 my-8">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-lg font-black text-gray-900">Create New Billing Invoice</h3>
                <p className="text-xs text-gray-500">Generate a custom invoice from scratch or select an existing client profile.</p>
              </div>
              <button onClick={() => setIsCreatingNew(false)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {initialClients.length > 0 && (
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Select Client Profile (Optional)</label>
                <select
                  onChange={(e) => handleSelectClientInCreate(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs bg-white focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">-- Choose Existing Client Profile --</option>
                  {initialClients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.company ? `(${c.company})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Client / Company Name *</label>
                <input
                  type="text"
                  required
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  placeholder="e.g. Apex Logistics (Pty) Ltd"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Client Email Address</label>
                <input
                  type="email"
                  value={newClientEmail}
                  onChange={(e) => setNewClientEmail(e.target.value)}
                  placeholder="billing@client.co.za"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Client Contact Phone</label>
                <input
                  type="text"
                  value={newClientPhone}
                  onChange={(e) => setNewClientPhone(e.target.value)}
                  placeholder="+27 82 000 0000"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-gray-700 mb-1">Physical / Billing Address (SA Invoice Requirement)</label>
                <input
                  type="text"
                  value={newClientAddress}
                  onChange={(e) => setNewClientAddress(e.target.value)}
                  placeholder="e.g. 12 Waterfront Way, Victoria & Alfred Waterfront, Cape Town, 8001"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Customer VAT Number</label>
                <input
                  type="text"
                  value={newClientVat}
                  onChange={(e) => setNewClientVat(e.target.value)}
                  placeholder="e.g. 4980289123 (or leave blank if non-VAT)"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-orange-500 font-mono"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-gray-700 mb-1">Project Description & Site</label>
                <input
                  type="text"
                  value={newProject}
                  onChange={(e) => setNewProject(e.target.value)}
                  placeholder="e.g. Paarden Eiland Industrial Scan"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Payment Terms</label>
                <select
                  value={newPaymentTerms}
                  onChange={(e) => setNewPaymentTerms(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs bg-white font-bold focus:ring-2 focus:ring-orange-500"
                >
                  <option value="30 Days">30 Days (Net 30)</option>
                  <option value="Due on Receipt">Due on Receipt (Net 0)</option>
                  <option value="7 Days">7 Days (Net 7)</option>
                  <option value="14 Days">14 Days (Net 14)</option>
                  <option value="60 Days">60 Days (Net 60)</option>
                  <option value="50% Deposit / Balance on Delivery">50% Deposit / Balance on Delivery</option>
                  <option value="COD (Cash on Delivery)">COD (Cash on Delivery)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Initial Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs bg-white font-bold focus:ring-2 focus:ring-orange-500"
                >
                  <option value="UNPAID">UNPAID</option>
                  <option value="PARTIAL">PARTIALLY PAID</option>
                  <option value="PAID">PAID</option>
                  <option value="DRAFT">DRAFT</option>
                </select>
              </div>

              {(newStatus === 'PARTIAL' || newAmountPaid > 0) && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Deposit Received (ZAR)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newAmountPaid}
                    onChange={(e) => setNewAmountPaid(Number(e.target.value))}
                    placeholder="0.00"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-orange-500 text-emerald-700"
                  />
                </div>
              )}
            </div>

            {/* Line Items */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-extrabold text-gray-900 uppercase tracking-wider">Invoice Scope Items</h4>
                <button
                  type="button"
                  onClick={() =>
                    setNewItems([...newItems, { description: 'Custom Service Scope Item', quantity: 1, unitPriceZar: 0, totalZar: 0 }])
                  }
                  className="text-xs font-bold text-orange-600 hover:text-orange-700 inline-flex items-center space-x-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Line Item</span>
                </button>
              </div>

              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-3 py-2 text-left font-bold text-gray-600">Item Description</th>
                      <th className="px-3 py-2 text-center font-bold text-gray-600 w-16">Qty</th>
                      <th className="px-3 py-2 text-right font-bold text-gray-600 w-32">Unit Price (ZAR)</th>
                      <th className="px-3 py-2 text-right font-bold text-gray-600 w-32">Amount (ZAR)</th>
                      <th className="px-2 py-2 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {newItems.map((item, idx) => (
                      <tr key={idx}>
                        <td className="p-2">
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => {
                              const copy = [...newItems];
                              copy[idx].description = e.target.value;
                              setNewItems(copy);
                            }}
                            className="w-full border border-gray-300 rounded-md px-2 py-1 text-xs focus:ring-1 focus:ring-orange-500"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => {
                              const copy = [...newItems];
                              copy[idx].quantity = Number(e.target.value);
                              copy[idx].totalZar = copy[idx].quantity * copy[idx].unitPriceZar;
                              setNewItems(copy);
                            }}
                            className="w-full border border-gray-300 rounded-md px-2 py-1 text-xs text-center focus:ring-1 focus:ring-orange-500"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            value={item.unitPriceZar}
                            onChange={(e) => {
                              const copy = [...newItems];
                              copy[idx].unitPriceZar = Number(e.target.value);
                              copy[idx].totalZar = copy[idx].quantity * copy[idx].unitPriceZar;
                              setNewItems(copy);
                            }}
                            className="w-full border border-gray-300 rounded-md px-2 py-1 text-xs text-right focus:ring-1 focus:ring-orange-500"
                          />
                        </td>
                        <td className="p-2 text-right font-bold text-gray-900">
                          {formatZAR((Number(item.quantity) || 1) * (Number(item.unitPriceZar) || 0))}
                        </td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => setNewItems(newItems.filter((_, i) => i !== idx))}
                            className="text-rose-500 hover:text-rose-700 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end space-x-3 border-t border-gray-100 pt-4">
              <button
                type="button"
                onClick={() => setIsCreatingNew(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateInvoice}
                disabled={loading}
                className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-lg text-xs shadow-xs cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Invoice Document'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QUICK RECORD PAYMENT MODAL */}
      {recordPaymentInvoice && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-md w-full p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl">
                  <DollarSign size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Record Payment Entry</h3>
                  <p className="text-xs text-gray-500">
                    INV-{recordPaymentInvoice.id.slice(0, 8).toUpperCase()} — {recordPaymentInvoice.clientName}
                  </p>
                </div>
              </div>
              <button onClick={() => setRecordPaymentInvoice(null)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <div className="bg-gray-50 p-4 rounded-xl space-y-2 text-xs">
              <div className="flex justify-between text-gray-600">
                <span>Total Invoice Amount:</span>
                <span className="font-bold text-gray-900">{formatZAR(recordPaymentInvoice.amount)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Previously Paid:</span>
                <span className="font-bold text-emerald-700">{formatZAR(recordPaymentInvoice.amountPaid || 0)}</span>
              </div>
              <div className="flex justify-between text-gray-900 border-t border-gray-200 pt-2 font-bold">
                <span>Current Outstanding Balance:</span>
                <span className="text-amber-800 font-black">
                  {formatZAR(Math.max(0, recordPaymentInvoice.amount - (recordPaymentInvoice.amountPaid || 0)))}
                </span>
              </div>
            </div>

            <form onSubmit={handleRecordPaymentSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">New Payment Received (ZAR)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={paymentAmountInput}
                  onChange={(e) => setPaymentAmountInput(Number(e.target.value))}
                  placeholder="0.00"
                  className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm font-bold focus:ring-2 focus:ring-emerald-500 text-emerald-800"
                />
                <p className="text-[11px] text-gray-500 mt-1">
                  Submitting a payment total matching or exceeding the balance will automatically update invoice status to <strong>PAID IN FULL</strong>.
                </p>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRecordPaymentInvoice(null)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {loading ? 'Recording...' : '💾 Save Payment Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DISPATCH EMAIL MODAL WITH CC & ATTACHMENTS */}
      {emailModalInvoice && (
        <SendEmailModal
          type="invoice"
          documentId={emailModalInvoice.id}
          defaultToEmail={emailModalInvoice.clientEmail || ''}
          defaultClientName={emailModalInvoice.contactName || emailModalInvoice.clientName}
          defaultProject={emailModalInvoice.project}
          onClose={() => setEmailModalInvoice(null)}
        />
      )}
    </div>
  );
}
