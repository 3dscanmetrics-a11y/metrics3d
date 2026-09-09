'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, XCircle, FileText, Send, RotateCcw, User, MapPin, Calculator, ListPlus, Plus, Trash2, Save } from 'lucide-react';
import { calculateEstimateRange, DEFAULT_PRICING, formatZAR } from '@/lib/pricing';
import { rejectLead, saveLeadQuote, sendFormalQuote } from '../app/actions';
import SendEmailModal from './SendEmailModal';

const COMPLEXITY = [
  'Commercial/Retail/Residential',
  'Civil Infrastructure',
  'Industrial Facility / Plant',
  'Mining (Surface)',
  'Mining (Underground)',
];

const ACCESS = [
  'Standard business hours only',
  'After-hours / Weekend work required',
  'High-security clearance / Escort required',
  'Operational plant/mine site (Simultaneous ops)',
];

const ACCURACY = ['Standard', 'High Precision'];
const LOD = ['100', '200', '300', '400'];
const DELIVS = ['raw', 'viewer', 'cad', 'topo', 'bim'];

type LeadProps = {
  id: string;
  email: string;
  name: string;
  company: string;
  project: string;
  area: number;
  complexity: string;
  deliverables: string;
  quoteTotal: number;
  estimateFormatted?: string;
  estimateLow?: number;
  estimateHigh?: number;
  payload?: Record<string, unknown>;
};

type CustomBoqItem = {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

function normalizeDeliverableKey(d: string): string {
  const l = String(d || '').toLowerCase().trim();
  if (l === 'raw' || l.includes('raw') || l.includes('cloud')) return 'raw';
  if (l === 'viewer' || l.includes('viewer') || l.includes('truview')) return 'viewer';
  if (l === 'cad' || l.includes('cad') || l.includes('2d') || l.includes('drawing') || l.includes('floor plan')) return 'cad';
  if (l === 'topo' || l.includes('topo') || l.includes('mesh') || l.includes('survey')) return 'topo';
  if (l === 'bim' || l.includes('bim') || l.includes('rvt') || l.includes('revit') || l.includes('3d model')) return 'bim';
  return l;
}

function parseDelivs(raw: unknown): string[] {
  let list: string[] = [];
  if (Array.isArray(raw)) {
    list = raw.map(String);
  } else if (typeof raw === 'string') {
    try {
      const v = JSON.parse(raw || '[]');
      list = Array.isArray(v) ? v.map(String) : [];
    } catch {
      list = raw ? [raw] : [];
    }
  }
  return Array.from(new Set(list.map(normalizeDeliverableKey)));
}

function normalizeComplexity(c: string): string {
  if (!c) return COMPLEXITY[0];
  if (c.toLowerCase().includes('civil')) return 'Civil Infrastructure';
  if (c.toLowerCase().includes('industrial') || c.toLowerCase().includes('plant')) return 'Industrial Facility / Plant';
  if (c.toLowerCase().includes('mining') && c.toLowerCase().includes('underground')) return 'Mining (Underground)';
  if (c.toLowerCase().includes('mining')) return 'Mining (Surface)';
  return 'Commercial/Retail/Residential';
}

export default function QuoteEditor({ lead, onSaveSuccess }: { lead: LeadProps; onSaveSuccess?: () => void }) {
  const router = useRouter();
  const payload = lead.payload || {};
  const [mode, setMode] = useState<'calculator' | 'custom'>((payload.mode as 'calculator' | 'custom') || 'calculator');
  const [name, setName] = useState(lead.name || '');
  const [email, setEmail] = useState(lead.email || '');
  const [company, setCompany] = useState(lead.company || '');
  const [phone, setPhone] = useState(String(payload.phone || ''));
  const [travelAccommodationCost, setTravelAccommodationCost] = useState(
    Number(payload.travelAccommodationCost) || Number(payload.travelCost) || 0
  );

  // Custom BoQ Line Items
  const [customItems, setCustomItems] = useState<CustomBoqItem[]>(
    Array.isArray(payload.customItems) && payload.customItems.length > 0
      ? (payload.customItems as CustomBoqItem[])
      : [
          { id: '1', description: `3D Laser Scanning & Fieldwork Surveying: ${lead.project || 'Site Scan'}`, quantity: 1, unitPrice: Number(lead.quoteTotal || 15000), total: Number(lead.quoteTotal || 15000) }
        ]
  );

  const [area, setArea] = useState(Number(lead.area) || 0);
  const [complexity, setComplexity] = useState(normalizeComplexity(lead.complexity));
  const [access, setAccess] = useState(String(payload.access || ACCESS[0]));
  const [accuracy, setAccuracy] = useState(String(payload.accuracy || 'Standard'));
  const [bimLevel, setBimLevel] = useState(String(payload.bimLevel || payload.lod || '300'));
  
  const parsedDelivs = useMemo(() => {
    const fromLead = parseDelivs(lead.deliverables);
    if (fromLead.length > 0) return fromLead;
    const fromPayload = parseDelivs(payload.deliverables);
    if (fromPayload.length > 0) return fromPayload;
    return ['raw'];
  }, [lead.deliverables, payload.deliverables]);

  const [deliverables, setDeliverables] = useState<string[]>(parsedDelivs);
  
  const [isManualFirmAmount, setIsManualFirmAmount] = useState<boolean>(
    Boolean(payload.isManualFirmAmount)
  );
  const [manualFirmAmount, setManualFirmAmount] = useState<number | null>(
    payload.isManualFirmAmount ? Number(payload.firmAmount || lead.quoteTotal) : null
  );

  const [pending, setPending] = useState<'save' | 'pdf' | 'send' | 'reject' | null>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const range = useMemo(
    () =>
      calculateEstimateRange(DEFAULT_PRICING, {
        area,
        complexity,
        deliverables,
        access,
        accuracy,
        bimLevel,
        travelAccommodationCost,
      }),
    [area, complexity, deliverables, access, accuracy, bimLevel, travelAccommodationCost]
  );

  // Dynamic calculation of effective firm amount:
  // Automatically tracks range.mid unless user manually inputs a custom figure
  const effectiveCalculatorFirmAmount = isManualFirmAmount && manualFirmAmount !== null
    ? manualFirmAmount
    : range.mid;

  const customTotal = useMemo(
    () => customItems.reduce((acc, item) => acc + (Number(item.total) || 0), 0),
    [customItems]
  );

  const effectiveTotal = mode === 'custom' ? customTotal : effectiveCalculatorFirmAmount;

  function addCustomItem() {
    setCustomItems((prev) => [
      ...prev,
      { id: String(Date.now()), description: '', quantity: 1, unitPrice: 0, total: 0 },
    ]);
  }

  function updateCustomItem(id: string, field: keyof CustomBoqItem, value: any) {
    setCustomItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        if (field === 'quantity' || field === 'unitPrice') {
          const qty = Number(field === 'quantity' ? value : updated.quantity) || 0;
          const price = Number(field === 'unitPrice' ? value : updated.unitPrice) || 0;
          updated.total = Math.round(qty * price * 100) / 100;
        }
        return updated;
      })
    );
  }

  function removeCustomItem(id: string) {
    setCustomItems((prev) => prev.filter((item) => item.id !== id));
  }

  // Scaled line items matching exact PDF output
  const itemizedLines = useMemo(() => {
    const rawLines = range.breakdown.lines;
    const targetTotal = effectiveCalculatorFirmAmount;
    const sumRaw = rawLines.reduce((acc, l) => acc + (l.amount || 0), 0);

    if (sumRaw <= 0 || Math.abs(targetTotal - sumRaw) <= 0.01) {
      return rawLines;
    }

    const scale = targetTotal / sumRaw;
    let runningSum = 0;
    const nonZeroCount = rawLines.filter((l) => l.amount > 0).length;
    let processedCount = 0;

    return rawLines.map((line) => {
      if (line.amount === 0) return line;
      processedCount++;
      let scaledAmount = Math.round(line.amount * scale * 100) / 100;
      runningSum += scaledAmount;
      if (processedCount === nonZeroCount) {
        const diff = Math.round((targetTotal - runningSum) * 100) / 100;
        scaledAmount = Math.round((scaledAmount + diff) * 100) / 100;
      }
      return { ...line, amount: scaledAmount };
    });
  }, [range, effectiveCalculatorFirmAmount]);

  const isCustomPrice = mode === 'calculator' && isManualFirmAmount;

  function toggleDeliv(id: string) {
    setDeliverables((prev) => (prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]));
  }

  function appendForm(fd: FormData) {
    fd.set('id', lead.id);
    fd.set('mode', mode);
    fd.set('customItems', JSON.stringify(mode === 'custom' ? customItems : []));
    fd.set('name', name);
    fd.set('email', email);
    fd.set('company', company);
    fd.set('phone', phone);
    fd.set('travelAccommodationCost', String(travelAccommodationCost));
    fd.set('travelCost', String(travelAccommodationCost));
    fd.set('area', String(area));
    fd.set('complexity', complexity);
    fd.set('access', access);
    fd.set('accuracy', accuracy);
    fd.set('bimLevel', bimLevel);
    fd.set('deliverables', JSON.stringify(deliverables));
    fd.set('isManualFirmAmount', String(isManualFirmAmount));
    fd.set('firmAmount', String(effectiveTotal));
  }

  async function handleReviewPdf() {
    setPending('pdf');
    setError(null);
    setMessage(null);
    try {
      const fd = new FormData();
      appendForm(fd);
      await saveLeadQuote(fd);
      window.open(`/api/quotes/${lead.id}/pdf?t=${Date.now()}`, '_blank');
      setMessage('Opening PDF quote preview in a new tab for review...');
    } catch (err: any) {
      setError(err.message || 'Failed to prepare PDF preview');
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="space-y-4">
      {message && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-semibold text-emerald-800 flex items-center space-x-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs font-semibold text-rose-800 flex items-center space-x-2">
          <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* EDITABLE CLIENT CONTACT INFO BLOCK & MODE TOGGLE */}
      <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
            <User className="w-3.5 h-3.5 text-orange-600" />
            <span>Edit Client Contact Profile</span>
          </h5>

          {/* QUOTATION MODE SWITCHER TOGGLE */}
          <div className="flex items-center p-1 bg-gray-200/80 rounded-xl text-xs font-bold w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setMode('calculator')}
              className={`flex-1 sm:flex-none py-1.5 px-3 rounded-lg transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                mode === 'calculator' ? 'bg-white text-orange-600 shadow-2xs font-extrabold' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>⚡ Calculator Engine</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('custom')}
              className={`flex-1 sm:flex-none py-1.5 px-3 rounded-lg transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                mode === 'custom' ? 'bg-slate-900 text-white shadow-2xs font-extrabold' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <ListPlus className="w-3.5 h-3.5" />
              <span>📋 Custom BoQ Items</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-gray-700 mb-1">Contact Name</label>
            <input
              type="text"
              className="w-full border rounded-lg px-2.5 py-1.5 text-xs bg-white focus:ring-2 focus:ring-orange-500"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full Name"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-gray-700 mb-1">Email Address</label>
            <input
              type="email"
              className="w-full border rounded-lg px-2.5 py-1.5 text-xs bg-white focus:ring-2 focus:ring-orange-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email Address"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-gray-700 mb-1">Company Name</label>
            <input
              type="text"
              className="w-full border rounded-lg px-2.5 py-1.5 text-xs bg-white focus:ring-2 focus:ring-orange-500"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Company Name"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-gray-700 mb-1">Phone Number</label>
            <input
              type="text"
              className="w-full border rounded-lg px-2.5 py-1.5 text-xs bg-white focus:ring-2 focus:ring-orange-500"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone Number"
            />
          </div>
        </div>
      </div>

      {mode === 'calculator' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600">
              Area (sqm)
              <input
                type="number"
                className="mt-1 w-full border rounded-lg px-3 py-3 md:py-2 text-base md:text-sm bg-white"
                value={area}
                onChange={(e) => setArea(Number(e.target.value))}
              />
            </label>

            <label className="block text-xs font-medium text-gray-600 mt-3">
              Complexity
              <select
                className="mt-1 w-full border rounded-lg px-3 py-3 md:py-2 text-base md:text-sm bg-white"
                value={complexity}
                onChange={(e) => setComplexity(e.target.value)}
              >
                {COMPLEXITY.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-xs font-medium text-gray-600 mt-3">
              Site Access
              <select
                className="mt-1 w-full border rounded-lg px-3 py-3 md:py-2 text-base md:text-sm bg-white"
                value={access}
                onChange={(e) => setAccess(e.target.value)}
              >
                {ACCESS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-xs font-medium text-gray-600 mt-3">
              Accuracy
              <select
                className="mt-1 w-full border rounded-lg px-3 py-3 md:py-2 text-base md:text-sm bg-white"
                value={accuracy}
                onChange={(e) => setAccuracy(e.target.value)}
              >
                {ACCURACY.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-xs font-medium text-gray-600 mt-3">
              Travel & Accommodation Cost (ZAR)
              <span className="text-[11px] text-gray-400 font-normal ml-1">(Bundled travel & site lodging surcharge, 0 for local)</span>
              <input
                type="number"
                step="100"
                className="mt-1 w-full border rounded-lg px-3 py-3 md:py-2 text-base md:text-sm bg-white font-bold text-gray-900 focus:ring-2 focus:ring-orange-500"
                value={travelAccommodationCost}
                onChange={(e) => setTravelAccommodationCost(Number(e.target.value))}
                placeholder="0"
              />
            </label>
          </div>

          <div>
            <p className="text-xs font-medium text-gray-600 mb-1">Deliverables</p>
            <div className="flex flex-wrap gap-2">
              {DELIVS.map((id) => (
                <label key={id} className="text-xs flex items-center gap-1 border rounded px-2 py-1 bg-white cursor-pointer">
                  <input type="checkbox" checked={deliverables.includes(id)} onChange={() => toggleDeliv(id)} />
                  {id}
                </label>
              ))}
            </div>

            {deliverables.includes('bim') && (
              <label className="block text-xs font-medium text-gray-600 mt-3">
                BIM LOD ×{range.breakdown.lodMult}
                <select
                  className="mt-1 w-full border rounded-lg px-3 py-3 md:py-2 text-base md:text-sm bg-white"
                  value={bimLevel}
                  onChange={(e) => setBimLevel(e.target.value)}
                >
                  {LOD.map((c) => (
                    <option key={c} value={c}>
                      LOD {c}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <div className="mt-4 text-xs text-gray-500 space-y-1 p-4 bg-white rounded-lg border border-gray-100 shadow-xs">
              <p className="font-bold text-orange-600 uppercase tracking-wider text-[11px]">Live Re-calculated Scope Range</p>
              <p className="text-xl font-bold text-gray-900">{range.formatted}</p>
              <p>Calculated Mid: {formatZAR(range.mid)} · Field {range.fieldDays}d · Process {range.processDays}d</p>
            </div>

            <div className="mt-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-medium text-gray-600">
                  Firm Invoice Amount (ZAR)
                  {!isManualFirmAmount && (
                    <span className="text-[11px] text-emerald-600 font-semibold ml-1.5">(Auto-populating Baseline Midpoint)</span>
                  )}
                </label>
                {isManualFirmAmount && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsManualFirmAmount(false);
                      setManualFirmAmount(null);
                    }}
                    className="text-xs text-orange-600 hover:text-orange-700 font-bold flex items-center space-x-1 cursor-pointer transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Revert to Auto Baseline ({formatZAR(range.mid)})</span>
                  </button>
                )}
              </div>
              <input
                type="number"
                step="0.01"
                className="mt-1 w-full border rounded-lg px-3 py-3 md:py-2 text-base md:text-sm font-semibold bg-white focus:ring-2 focus:ring-orange-500"
                value={effectiveCalculatorFirmAmount}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setIsManualFirmAmount(true);
                  setManualFirmAmount(val);
                }}
              />
            </div>
          </div>
        </div>
      ) : (
        /* CUSTOM BILL OF QUANTITIES (BOQ) EDITOR */
        <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
              <ListPlus className="w-4 h-4 text-orange-600" />
              <span>Custom Bill of Quantities (BoQ) Editor</span>
            </h4>
            <button
              type="button"
              onClick={addCustomItem}
              className="text-xs text-orange-600 hover:text-orange-700 font-bold flex items-center space-x-1 cursor-pointer bg-orange-50 border border-orange-200 px-2.5 py-1 rounded-lg transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Line Item</span>
            </button>
          </div>

          <div className="space-y-3">
            {customItems.map((item, index) => (
              <div key={item.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 relative">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500">Line Item #{index + 1}</span>
                  {customItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeCustomItem(item.id)}
                      className="text-rose-500 hover:text-rose-700 p-1 rounded transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-gray-600 mb-0.5">Item Scope Description</label>
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => updateCustomItem(item.id, 'description', e.target.value)}
                    placeholder="e.g. Ground Floor MEP 3D Scan & Revit Modeling"
                    className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs bg-white focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-600 mb-0.5">Qty</label>
                    <input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) => updateCustomItem(item.id, 'quantity', Number(e.target.value))}
                      className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs bg-white font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-600 mb-0.5">Unit Price (ZAR)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(e) => updateCustomItem(item.id, 'unitPrice', Number(e.target.value))}
                      className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs bg-white font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-600 mb-0.5">Line Total</label>
                    <div className="border border-slate-200 bg-slate-100 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 truncate">
                      {formatZAR(item.total)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* LIVE ITEMIZED SCOPE BREAKDOWN TABLE */}
      <div className="mt-4 border border-gray-200 rounded-xl overflow-hidden bg-white shadow-2xs">
        <div className="bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between text-xs font-bold">
          <span>{mode === 'custom' ? 'Rendered BoQ PDF Table' : 'Itemised Technical Scope Breakdown (Live Rendered PDF Table)'}</span>
          {mode === 'calculator' && isCustomPrice && (
            <span className="text-[11px] font-normal text-orange-400">
              ⚡ Scaled to match set Grand Total ({formatZAR(effectiveCalculatorFirmAmount)})
            </span>
          )}
        </div>
        <div className="divide-y divide-gray-100 text-xs">
          {mode === 'custom' ? (
            customItems.map((line, idx) => (
              <div key={idx} className="px-4 py-2 flex items-center justify-between">
                <span className="text-gray-700 font-medium">{line.quantity}× {line.description || 'Custom Scope Item'}</span>
                <span className="font-bold text-gray-900">{formatZAR(line.total)}</span>
              </div>
            ))
          ) : (
            itemizedLines.map((line, idx) => (
              <div key={idx} className={`px-4 py-2 flex items-center justify-between ${idx % 2 === 1 ? 'bg-slate-50/50' : ''}`}>
                <span className="text-gray-700 font-medium">{line.label}</span>
                <span className="font-bold text-gray-900">{line.amount === 0 ? 'R0.00' : formatZAR(line.amount)}</span>
              </div>
            ))
          )}
        </div>
        <div className="bg-orange-600 text-white px-4 py-2.5 flex items-center justify-between font-bold text-sm">
          <span>Grand Total Quote Amount</span>
          <span>{formatZAR(effectiveTotal)}</span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 pt-2">
        <button
          type="button"
          disabled={pending !== null}
          onClick={handleReviewPdf}
          className="flex-1 bg-white border border-gray-300 hover:bg-gray-50 text-gray-900 font-bold py-2.5 rounded-lg text-xs flex items-center justify-center transition-colors shadow-xs cursor-pointer disabled:opacity-50"
        >
          <FileText className="w-4 h-4 mr-1.5 text-orange-600" />
          <span>{pending === 'pdf' ? 'Preparing PDF...' : '📄 Review PDF Document'}</span>
        </button>

        <button
          type="button"
          disabled={pending !== null}
          className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-lg text-xs flex items-center justify-center transition-colors shadow-xs cursor-pointer disabled:opacity-50"
          onClick={async () => {
            setPending('save');
            setError(null);
            setMessage(null);
            try {
              const fd = new FormData();
              appendForm(fd);
              await saveLeadQuote(fd);
              setMessage('Quote parameters and amounts saved successfully!');
              router.refresh();
              if (onSaveSuccess) onSaveSuccess();
            } catch (err: any) {
              setError(err.message || 'Failed to save quote changes');
            } finally {
              setPending(null);
            }
          }}
        >
          <Save className="w-4 h-4 mr-1.5" />
          <span>{pending === 'save' ? 'Saving Changes...' : '💾 Save Quote Changes'}</span>
        </button>

        <button
          type="button"
          disabled={pending !== null}
          className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-bold py-2.5 rounded-lg text-xs flex items-center justify-center transition-colors shadow-xs cursor-pointer disabled:opacity-50"
          onClick={async () => {
            setPending('send');
            setError(null);
            setMessage(null);
            try {
              const fd = new FormData();
              appendForm(fd);
              await saveLeadQuote(fd);
              setShowEmailModal(true);
            } catch (err: any) {
              setError(err.message || 'Failed to save quote');
            } finally {
              setPending(null);
            }
          }}
        >
          <Send className="w-4 h-4 mr-1.5" />
          <span>{pending === 'send' ? 'Saving...' : 'Confirm & Send Email...'}</span>
        </button>

        <button
          type="button"
          disabled={pending !== null}
          className="bg-white border border-gray-300 hover:bg-red-50 text-rose-600 p-2.5 rounded-lg transition-colors cursor-pointer flex items-center justify-center"
          aria-label="Reject"
          onClick={async () => {
            if (!confirm('Are you sure you want to reject this lead?')) return;
            setPending('reject');
            setError(null);
            setMessage(null);
            try {
              await rejectLead(lead.id);
              setMessage('Lead rejected.');
            } catch (err: any) {
              setError(err.message || 'Failed to reject lead');
            } finally {
              setPending(null);
            }
          }}
        >
          <XCircle className="w-5 h-5" />
        </button>
      </div>

      {showEmailModal && (
        <SendEmailModal
          type="quote"
          documentId={lead.id}
          defaultToEmail={email}
          defaultClientName={name}
          defaultProject={lead.project}
          onClose={() => setShowEmailModal(false)}
          onSuccess={() => {
            setMessage('Formal Quote sent to client! Moved to Formal Quotations tab.');
          }}
        />
      )}
    </div>
  );
}
