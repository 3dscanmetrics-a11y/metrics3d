'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  UserPlus,
  Building,
  Mail,
  Phone,
  FileText,
  CheckCircle2,
  AlertCircle,
  Edit2,
  Trash2,
  Search,
  Globe,
  DollarSign,
  MapPin,
  X,
  Copy,
  Briefcase,
  Hash,
} from 'lucide-react';
import { createClient, updateClient, deleteClient } from '../app/actions';

export interface ClientRecord {
  id: string;
  name: string;
  company?: string;
  accountNumber?: string;
  clientType?: string;
  email: string;
  phone?: string;
  mobile?: string;
  website?: string;
  registrationNumber?: string;
  vatNumber?: string;
  taxNumber?: string;
  currency?: string;
  paymentTerms?: string;
  discountPercent?: number;
  billingStreet?: string;
  billingCity?: string;
  billingState?: string;
  billingPostalCode?: string;
  billingCountry?: string;
  postalStreet?: string;
  postalCity?: string;
  postalState?: string;
  postalPostalCode?: string;
  postalCountry?: string;
  industry?: string;
  notes?: string;
  created_at?: string;
}

export default function ClientManagement({ initialClients }: { initialClients: ClientRecord[] }) {
  const router = useRouter();
  const [clients, setClients] = useState<ClientRecord[]>(initialClients);

  useEffect(() => {
    setClients(initialClients);
  }, [initialClients]);

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');

  // Modal State
  const [modalMode, setModalMode] = useState<'ADD' | 'EDIT' | null>(null);
  const [editingClient, setEditingClient] = useState<ClientRecord | null>(null);
  const [activeTab, setActiveTab] = useState<'CONTACT' | 'TAX' | 'ADDRESS' | 'NOTES'>('CONTACT');

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<ClientRecord>>({
    clientType: 'Company',
    currency: 'ZAR',
    paymentTerms: '30 Days',
    discountPercent: 0,
    billingCountry: 'South Africa',
    postalCountry: 'South Africa',
  });

  const filteredClients = useMemo(() => {
    return clients.filter((c) => {
      const matchesSearch =
        (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (c.company || '').toLowerCase().includes(search.toLowerCase()) ||
        (c.email || '').toLowerCase().includes(search.toLowerCase()) ||
        (c.accountNumber || '').toLowerCase().includes(search.toLowerCase()) ||
        (c.vatNumber || '').toLowerCase().includes(search.toLowerCase());

      const matchesType = typeFilter === 'ALL' || c.clientType === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [clients, search, typeFilter]);

  function handleOpenAdd() {
    setEditingClient(null);
    setFormData({
      name: '',
      company: '',
      accountNumber: `CLI-${Math.floor(1000 + Math.random() * 9000)}`,
      clientType: 'Company',
      email: '',
      phone: '',
      mobile: '',
      website: '',
      registrationNumber: '',
      vatNumber: '',
      currency: 'ZAR',
      paymentTerms: '30 Days',
      discountPercent: 0,
      billingStreet: '',
      billingCity: '',
      billingState: '',
      billingPostalCode: '',
      billingCountry: 'South Africa',
      postalStreet: '',
      postalCity: '',
      postalState: '',
      postalPostalCode: '',
      postalCountry: 'South Africa',
      industry: 'Architecture & Construction',
      notes: '',
    });
    setActiveTab('CONTACT');
    setModalMode('ADD');
  }

  function handleOpenEdit(client: ClientRecord) {
    setEditingClient(client);
    setFormData({ ...client });
    setActiveTab('CONTACT');
    setModalMode('EDIT');
  }

  function handleCopyBillingToPostal() {
    setFormData((prev) => ({
      ...prev,
      postalStreet: prev.billingStreet || '',
      postalCity: prev.billingCity || '',
      postalState: prev.billingState || '',
      postalPostalCode: prev.billingPostalCode || '',
      postalCountry: prev.billingCountry || 'South Africa',
    }));
  }

  async function handleFormSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const data = new FormData(e.currentTarget);
    if (editingClient?.id) {
      data.append('id', editingClient.id);
    }

    try {
      if (modalMode === 'EDIT') {
        await updateClient(data);
        setMessage(`Client '${formData.name}' updated successfully!`);
      } else {
        await createClient(data);
        setMessage(`New client '${formData.name}' created successfully!`);
      }
      setModalMode(null);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to save client details');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Are you sure you want to delete client '${name}'? This cannot be undone.`)) return;
    setLoading(true);
    try {
      await deleteClient(id);
      setMessage(`Client '${name}' deleted successfully.`);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to delete client');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center space-x-2">
            <Building className="w-6 h-6 text-orange-600" />
            <span>Client Directory</span>
          </h2>
          <p className="text-xs text-gray-500">
            Comprehensive account management, dual billing/postal addresses, and VAT tax details.
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center justify-center space-x-2 bg-orange-600 hover:bg-orange-700 text-white font-medium px-4 py-2.5 rounded-xl transition-colors shadow-sm text-sm cursor-pointer"
        >
          <UserPlus size={18} />
          <span>Add New Client</span>
        </button>
      </div>

      {message && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center space-x-3 text-sm text-emerald-800">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-3 text-sm text-red-800">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by name, company, VAT, or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center space-x-3 w-full md:w-auto">
          <label className="text-xs font-semibold text-gray-600 shrink-0">Client Type:</label>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-xs bg-white text-gray-900 focus:ring-2 focus:ring-orange-500"
          >
            <option value="ALL">All Client Types</option>
            <option value="Company">Company</option>
            <option value="Individual">Individual</option>
            <option value="Contractor">Contractor</option>
            <option value="Government">Government / Public Sector</option>
          </select>
        </div>
      </div>

      {/* Clients Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-xs">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3.5 text-left font-bold text-gray-500 uppercase tracking-wider">Account & Contact</th>
              <th className="px-6 py-3.5 text-left font-bold text-gray-500 uppercase tracking-wider">Type & Industry</th>
              <th className="px-6 py-3.5 text-left font-bold text-gray-500 uppercase tracking-wider">Tax & Terms</th>
              <th className="px-6 py-3.5 text-left font-bold text-gray-500 uppercase tracking-wider">Billing Location</th>
              <th className="px-6 py-3.5 text-right font-bold text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredClients.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-gray-500">
                  No clients match your search criteria. Click <strong>"Add New Client"</strong> to create a record.
                </td>
              </tr>
            ) : (
              filteredClients.map((client) => (
                <tr key={client.id} className="hover:bg-gray-50/80 transition-colors">
                  
                  {/* Account & Contact */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-3">
                      <div className="p-2.5 bg-orange-100/60 rounded-xl text-orange-700 font-bold shrink-0">
                        <Building size={18} />
                      </div>
                      <div>
                        <div className="font-bold text-gray-900 text-sm flex items-center space-x-1.5">
                          <span>{client.name}</span>
                          {client.accountNumber && (
                            <span className="bg-gray-100 text-gray-600 font-mono text-[10px] px-1.5 py-0.5 rounded">
                              {client.accountNumber}
                            </span>
                          )}
                        </div>
                        {client.company && <div className="text-xs text-gray-500 font-medium">{client.company}</div>}
                        <div className="flex items-center space-x-3 mt-1 text-[11px] text-gray-500">
                          <span className="flex items-center space-x-1">
                            <Mail size={12} className="text-gray-400" />
                            <span>{client.email}</span>
                          </span>
                          {(client.phone || client.mobile) && (
                            <span className="flex items-center space-x-1">
                              <Phone size={12} className="text-gray-400" />
                              <span>{client.mobile || client.phone}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Type & Industry */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                      {client.clientType || 'Company'}
                    </span>
                    {client.industry && (
                      <div className="text-[11px] text-gray-600 mt-1 flex items-center space-x-1">
                        <Briefcase size={12} className="text-gray-400" />
                        <span>{client.industry}</span>
                      </div>
                    )}
                  </td>

                  {/* Tax & Terms */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-gray-900 font-medium">
                      VAT: <span className="font-mono text-gray-700">{client.vatNumber || client.taxNumber || 'N/A'}</span>
                    </div>
                    <div className="text-[11px] text-gray-500 mt-0.5">
                      Terms: <span className="font-semibold text-gray-700">{client.paymentTerms || '30 Days'}</span> ({client.currency || 'ZAR'})
                    </div>
                  </td>

                  {/* Billing Location */}
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                    {client.billingCity || client.billingCountry ? (
                      <div className="flex items-center space-x-1 text-xs">
                        <MapPin size={13} className="text-orange-600 shrink-0" />
                        <span>
                          {[client.billingCity, client.billingState, client.billingCountry].filter(Boolean).join(', ')}
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs">No address set</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4 whitespace-nowrap text-right text-xs">
                    <div className="flex items-center justify-end space-x-2">
                      <a
                        href={`/api/clients/${client.id}/statement/pdf`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 transition-colors cursor-pointer"
                        title="Generate Client Statement of Account PDF"
                      >
                        <FileText size={14} className="mr-1 text-amber-600" />
                        <span>Statement</span>
                      </a>
                      <button
                        onClick={() => handleOpenEdit(client)}
                        className="p-1.5 bg-gray-100 hover:bg-orange-100 text-gray-700 hover:text-orange-700 rounded-lg transition-colors cursor-pointer"
                        title="Edit Client Profile"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(client.id, client.name)}
                        className="p-1.5 bg-gray-100 hover:bg-red-100 text-gray-700 hover:text-red-700 rounded-lg transition-colors cursor-pointer"
                        title="Delete Client"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* COMPREHENSIVE TABBED ADD / EDIT CLIENT MODAL */}
      {modalMode && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-orange-100 text-orange-600 rounded-xl">
                  <Building size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">
                    {modalMode === 'EDIT' ? `Edit Client Profile — ${editingClient?.name}` : 'Create New Client Record'}
                  </h3>
                  <p className="text-xs text-gray-500">Client contact details, dual address & financial metadata.</p>
                </div>
              </div>
              <button
                onClick={() => setModalMode(null)}
                className="p-1 text-gray-400 hover:text-gray-700 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Nav Tabs */}
            <div className="flex border-b border-gray-200 bg-gray-50 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('CONTACT')}
                className={`px-5 py-3 border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'CONTACT'
                    ? 'border-orange-600 text-orange-600 bg-white font-bold'
                    : 'border-transparent text-gray-500 hover:text-gray-900'
                }`}
              >
                1. Core Contact Details
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('TAX')}
                className={`px-5 py-3 border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'TAX'
                    ? 'border-orange-600 text-orange-600 bg-white font-bold'
                    : 'border-transparent text-gray-500 hover:text-gray-900'
                }`}
              >
                2. Tax & Financial (Xero)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('ADDRESS')}
                className={`px-5 py-3 border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'ADDRESS'
                    ? 'border-orange-600 text-orange-600 bg-white font-bold'
                    : 'border-transparent text-gray-500 hover:text-gray-900'
                }`}
              >
                3. Billing & Postal Addresses
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('NOTES')}
                className={`px-5 py-3 border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'NOTES'
                    ? 'border-orange-600 text-orange-600 bg-white font-bold'
                    : 'border-transparent text-gray-500 hover:text-gray-900'
                }`}
              >
                4. Scoping Notes
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              
              {/* TAB 1: CORE CONTACT DETAILS */}
              <div className={activeTab === 'CONTACT' ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : 'hidden'}>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Primary Contact Person *</label>
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Sarah Jenkins"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Company / Trading Name</label>
                  <input
                    type="text"
                    name="company"
                    value={formData.company || ''}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    placeholder="e.g. LP Architects (Pty) Ltd"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Account Reference Code</label>
                  <input
                    type="text"
                    name="accountNumber"
                    value={formData.accountNumber || ''}
                    onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                    placeholder="e.g. CLI-2026-001"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs font-mono focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Client Classification</label>
                  <select
                    name="clientType"
                    value={formData.clientType || 'Company'}
                    onChange={(e) => setFormData({ ...formData, clientType: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs bg-white focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="Company">Company / Corporate Entity</option>
                    <option value="Individual">Individual Client</option>
                    <option value="Contractor">Sub-Contractor / Partner</option>
                    <option value="Government">Government / State Department</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Primary Billing Email *</label>
                  <input
                    type="email"
                    name="email"
                    required
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="sarah@lparch.co.za"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Industry Sector</label>
                  <input
                    type="text"
                    name="industry"
                    value={formData.industry || ''}
                    onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                    placeholder="e.g. Architecture & Building Surveying"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Office Landline Phone</label>
                  <input
                    type="text"
                    name="phone"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="011 442 6260"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Direct Mobile / Cell</label>
                  <input
                    type="text"
                    name="mobile"
                    value={formData.mobile || ''}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    placeholder="+27 82 123 4567"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Company Website</label>
                  <input
                    type="url"
                    name="website"
                    value={formData.website || ''}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    placeholder="https://www.lparch.co.za"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              {/* TAB 2: TAX & FINANCIAL DETAILS (XERO STANDARD) */}
              <div className={activeTab === 'TAX' ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : 'hidden'}>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">VAT Registration Number</label>
                  <input
                    type="text"
                    name="vatNumber"
                    value={formData.vatNumber || ''}
                    onChange={(e) => setFormData({ ...formData, vatNumber: e.target.value })}
                    placeholder="e.g. 4120283941"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs font-mono focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Company Registration Number</label>
                  <input
                    type="text"
                    name="registrationNumber"
                    value={formData.registrationNumber || ''}
                    onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
                    placeholder="e.g. 2018/643721/07"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs font-mono focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Default Billing Currency</label>
                  <select
                    name="currency"
                    value={formData.currency || 'ZAR'}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs bg-white focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="ZAR">ZAR - South African Rand (R)</option>
                    <option value="USD">USD - US Dollar ($)</option>
                    <option value="EUR">EUR - Euro (€)</option>
                    <option value="GBP">GBP - British Pound (£)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Payment Terms</label>
                  <select
                    name="paymentTerms"
                    value={formData.paymentTerms || '30 Days'}
                    onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs bg-white focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="Due on Receipt">Due on Receipt</option>
                    <option value="7 Days">7 Days</option>
                    <option value="14 Days">14 Days</option>
                    <option value="30 Days">30 Days (Standard)</option>
                    <option value="60 Days">60 Days</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Default Discount Rate (%)</label>
                  <input
                    type="number"
                    name="discountPercent"
                    step="0.5"
                    min="0"
                    max="100"
                    value={formData.discountPercent || 0}
                    onChange={(e) => setFormData({ ...formData, discountPercent: Number(e.target.value) })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              {/* TAB 3: DUAL ADDRESSES (XERO STANDARD) */}
              <div className={activeTab === 'ADDRESS' ? 'space-y-6' : 'hidden'}>
                {/* Billing Address Section */}
                <div>
                  <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2 flex items-center space-x-1">
                    <MapPin className="w-3.5 h-3.5 text-orange-600" />
                    <span>Billing Address</span>
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="md:col-span-2">
                      <input
                        type="text"
                        name="billingStreet"
                        value={formData.billingStreet || ''}
                        onChange={(e) => setFormData({ ...formData, billingStreet: e.target.value })}
                        placeholder="Street Address (e.g. 80 Corlett Drive)"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        name="billingCity"
                        value={formData.billingCity || ''}
                        onChange={(e) => setFormData({ ...formData, billingCity: e.target.value })}
                        placeholder="City / Suburb (e.g. Melrose North)"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        name="billingState"
                        value={formData.billingState || ''}
                        onChange={(e) => setFormData({ ...formData, billingState: e.target.value })}
                        placeholder="Province / State (e.g. Gauteng)"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        name="billingPostalCode"
                        value={formData.billingPostalCode || ''}
                        onChange={(e) => setFormData({ ...formData, billingPostalCode: e.target.value })}
                        placeholder="Postal Code (e.g. 2196)"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        name="billingCountry"
                        value={formData.billingCountry || 'South Africa'}
                        onChange={(e) => setFormData({ ...formData, billingCountry: e.target.value })}
                        placeholder="Country"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Postal Address Section */}
                <div className="pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center space-x-1">
                      <MapPin className="w-3.5 h-3.5 text-gray-400" />
                      <span>Postal / Site Delivery Address</span>
                    </h4>
                    <button
                      type="button"
                      onClick={handleCopyBillingToPostal}
                      className="text-xs font-semibold text-orange-600 hover:text-orange-700 flex items-center space-x-1 bg-orange-50 px-2.5 py-1 rounded-lg border border-orange-200 cursor-pointer"
                    >
                      <Copy size={12} />
                      <span>Same as Billing Address</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="md:col-span-2">
                      <input
                        type="text"
                        name="postalStreet"
                        value={formData.postalStreet || ''}
                        onChange={(e) => setFormData({ ...formData, postalStreet: e.target.value })}
                        placeholder="Street Address or P.O. Box"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        name="postalCity"
                        value={formData.postalCity || ''}
                        onChange={(e) => setFormData({ ...formData, postalCity: e.target.value })}
                        placeholder="City"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        name="postalState"
                        value={formData.postalState || ''}
                        onChange={(e) => setFormData({ ...formData, postalState: e.target.value })}
                        placeholder="Province / State"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        name="postalPostalCode"
                        value={formData.postalPostalCode || ''}
                        onChange={(e) => setFormData({ ...formData, postalPostalCode: e.target.value })}
                        placeholder="Postal Code"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        name="postalCountry"
                        value={formData.postalCountry || 'South Africa'}
                        onChange={(e) => setFormData({ ...formData, postalCountry: e.target.value })}
                        placeholder="Country"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* TAB 4: SCOPING NOTES */}
              <div className={activeTab === 'NOTES' ? 'block space-y-4' : 'hidden'}>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Internal Account Notes & Preferences</label>
                  <textarea
                    name="notes"
                    rows={6}
                    value={formData.notes || ''}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Enter internal client notes, site safety induction requirements, preferred CAD format versions, or payment history context..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-gray-100 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-lg transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {loading ? 'Saving...' : modalMode === 'EDIT' ? 'Save Client Changes' : 'Create Client Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
