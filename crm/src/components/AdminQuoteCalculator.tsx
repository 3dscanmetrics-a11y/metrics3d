'use client';

import { useState, useMemo } from 'react';
import {
  Calculator,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Truck,
  Layers,
  Send,
  Building,
  Check,
  FileText,
  RotateCcw,
  Plus,
  Trash2,
  ListPlus,
} from 'lucide-react';
import {
  calculateEstimateRange,
  DEFAULT_PRICING,
  formatRange,
  calculateTravelCost,
} from '@/lib/pricing';
import { createAdminQuote, sendQuoteEmail } from '../app/actions';
import { ClientRecord } from './ClientManagement';

// Deliverables matching the public calculator 1-to-1
const PUBLIC_DELIVERABLES = [
  { id: 'raw', tag: 'Base', label: 'Raw Point Cloud (.E57 / .LAS)', add: 0.0 },
  { id: 'viewer', tag: '+10%', label: 'Web-based Viewer (TruView)', add: 0.1 },
  { id: 'cad', tag: '+50%', label: '2D CAD Drawings (.DWG)', add: 0.5 },
  { id: 'topo', tag: '+40%', label: 'Topographical Survey / Mesh', add: 0.4 },
  { id: 'bim', tag: 'LOD Dependent', label: '3D BIM Model (.RVT)', add: 1.2 },
];

const SITE_ENVIRONMENTS = [
  { label: 'Commercial / Retail / Residential (1.0x)', value: 'Commercial/Retail/Residential' },
  { label: 'Civil Infrastructure - Bridges, Roads, Dams (1.2x)', value: 'Civil Infrastructure' },
  { label: 'Industrial Facility / Processing Plant (1.5x)', value: 'Industrial Facility / Plant' },
  { label: 'Mining - Surface Plant & Pit (1.5x)', value: 'Mining (Surface)' },
  { label: 'Mining - Underground Workings (2.0x)', value: 'Mining (Underground)' },
];

const ACCESS_CONDITIONS = [
  { label: 'Standard business hours only (1.0x)', value: 'Standard business hours only' },
  { label: 'After-hours / Night / Weekend work required (1.15x)', value: 'After-hours / Weekend work required' },
  { label: 'High-security clearance & Escort required (1.20x)', value: 'High-security clearance / Escort required' },
  { label: 'Operational plant / SIMOPS (1.25x)', value: 'Operational plant/mine site (Simultaneous ops)' },
];

type CustomBoqItem = {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

export default function AdminQuoteCalculator({ clients }: { clients: ClientRecord[] }) {
  const [mode, setMode] = useState<'calculator' | 'custom'>('calculator');
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [project, setProject] = useState('');

  // Custom BoQ Line Items
  const [customItems, setCustomItems] = useState<CustomBoqItem[]>([
    { id: '1', description: '3D Laser Scanning Site Fieldwork Surveying', quantity: 1, unitPrice: 15000, total: 15000 },
    { id: '2', description: '2D Architectural & Structural Floor Plans (.DWG)', quantity: 1, unitPrice: 8500, total: 8500 },
    { id: '3', description: '3D Revit BIM Model Creation (LOD 300)', quantity: 1, unitPrice: 12500, total: 12500 },
  ]);

  // Scoping Parameters matching Public Calculator 1-to-1
  const [areaUnknown, setAreaUnknown] = useState<boolean>(false);
  const [area, setArea] = useState<number>(1500);
  const [areaBucket, setAreaBucket] = useState<number>(1000);
  const [complexity, setComplexity] = useState('Commercial/Retail/Residential');
  const [access, setAccess] = useState('Standard business hours only');
  const [accuracy, setAccuracy] = useState('Standard');
  const [bimLevel, setBimLevel] = useState('300');
  const [systems, setSystems] = useState<string[]>(['architectural']);
  const [travelAccommodationCost, setTravelAccommodationCost] = useState<number>(0);
  const [selectedDelivs, setSelectedDelivs] = useState<Set<string>>(new Set(['raw', 'cad', 'bim']));
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [createdLeadId, setCreatedLeadId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Convert Set to Array of deliverable IDs ('raw', 'viewer', 'cad', 'topo', 'bim')
  const deliverablesArray = useMemo(() => Array.from(selectedDelivs), [selectedDelivs]);

  // Live real-time pricing calculation matching public pricing engine 1-to-1
  const range = useMemo(
    () =>
      calculateEstimateRange(DEFAULT_PRICING, {
        area: areaUnknown ? undefined : area,
        areaUnknown,
        areaBucket: areaUnknown ? areaBucket : undefined,
        complexity,
        deliverables: deliverablesArray,
        access,
        accuracy,
        bimLevel,
        systems,
        travelAccommodationCost,
      }),
    [area, areaUnknown, areaBucket, complexity, deliverablesArray, access, accuracy, bimLevel, systems, travelAccommodationCost]
  );

  const [isManualFirmAmount, setIsManualFirmAmount] = useState<boolean>(false);
  const [manualFirmAmount, setManualFirmAmount] = useState<number | null>(null);

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

  function handleClientSelect(clientId: string) {
    setSelectedClient(clientId);
    const found = clients.find((c) => c.id === clientId);
    if (found) {
      setName(found.name);
      setCompany(found.company || '');
      setEmail(found.email);
    }
  }

  function toggleDeliverable(id: string) {
    setSelectedDelivs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size > 1) {
          next.delete(id);
        }
      } else {
        next.add(id);
      }
      return next;
    });
  }

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

  const formatZAR = (val: number) =>
    new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(val || 0);

  function appendFormData(): FormData {
    const formData = new FormData();
    formData.append('mode', mode);
    formData.append('customItems', JSON.stringify(mode === 'custom' ? customItems : []));
    formData.append('name', name);
    formData.append('company', company);
    formData.append('email', email);
    formData.append('project', project || '3D Laser Scanning Scoping Project');
    formData.append('area', String(areaUnknown ? range.area : area));
    formData.append('areaUnknown', String(areaUnknown));
    formData.append('complexity', complexity);
    formData.append('access', access);
    formData.append('accuracy', accuracy);
    formData.append('bimLevel', bimLevel);
    formData.append('systems', JSON.stringify(systems));
    formData.append('travelAccommodationCost', String(travelAccommodationCost));
    formData.append('travelCost', String(travelAccommodationCost));
    formData.append('deliverables', JSON.stringify(deliverablesArray));
    formData.append('isManualFirmAmount', String(isManualFirmAmount));
    formData.append('firmAmount', String(effectiveTotal));
    formData.append('notes', notes);
    return formData;
  }

  async function handleReviewPdf() {
    if (!name || !email) {
      setError('Please provide Client Contact Name and Email Address before previewing the PDF.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid Client Email Address (e.g. client@domain.co.za).');
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const formData = appendFormData();
      const res = await createAdminQuote(formData);
      if (res?.success && res.leadId) {
        setCreatedLeadId(res.leadId);
        window.open(`/api/quotes/${res.leadId}/pdf?t=${Date.now()}`, '_blank');
        setMessage('Opening rendered PDF quote in a new tab for review...');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to prepare PDF preview');
    } finally {
      setLoading(false);
    }
  }

  async function handleSendEmailDirect() {
    if (!name || !email) {
      setError('Please provide Client Contact Name and Email Address before sending the quote.');
      return;
    }
    setSendingEmail(true);
    setError(null);
    setMessage(null);

    try {
      const formData = appendFormData();
      const res = await createAdminQuote(formData);
      if (res?.success && res.leadId) {
        setCreatedLeadId(res.leadId);
        await sendQuoteEmail(res.leadId);
        setMessage('Formal Quote emailed to client successfully! Moved to Formal Quotations pipeline.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send formal quote email');
    } finally {
      setSendingEmail(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm mb-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5 pb-4 border-b border-gray-100">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-orange-100 text-orange-600 rounded-xl">
            <Calculator size={22} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Admin Technical Scoping & Pricing Calculator</h3>
            <p className="text-xs text-gray-500">
              Populate quotes using our Scoping Calculator Engine or Custom Client Bill of Quantities (BoQ).
            </p>
          </div>
        </div>

        {/* QUOTATION MODE SWITCHER TOGGLE */}
        <div className="flex items-center p-1 bg-gray-100 rounded-xl text-xs font-bold w-full sm:w-auto shrink-0">
          <button
            type="button"
            onClick={() => setMode('calculator')}
            className={`flex-1 sm:flex-none py-2 px-3.5 rounded-lg transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
              mode === 'calculator' ? 'bg-white text-orange-600 shadow-2xs font-extrabold' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>⚡ Calculator Engine</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('custom')}
            className={`flex-1 sm:flex-none py-2 px-3.5 rounded-lg transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
              mode === 'custom' ? 'bg-slate-900 text-white shadow-2xs font-extrabold' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <ListPlus className="w-3.5 h-3.5" />
            <span>📋 Custom Bill of Quantities (BoQ)</span>
          </button>
        </div>
      </div>

      {message && (
        <div className="mb-4 p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between text-sm text-emerald-800">
          <div className="flex items-center space-x-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{message}</span>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 p-4 bg-rose-50 border border-rose-200 rounded-lg flex items-center justify-between text-sm text-rose-800">
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        </div>
      )}

      <form onSubmit={(e) => e.preventDefault()} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Client Details & Project Info */}
        <div className="space-y-4 lg:col-span-1">
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">1. Client & Project Info</h4>

          {clients.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center space-x-1">
                <Building className="w-3.5 h-3.5 text-orange-500" />
                <span>Select Existing Client</span>
              </label>
              <select
                value={selectedClient}
                onChange={(e) => handleClientSelect(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs bg-white focus:ring-2 focus:ring-orange-500"
              >
                <option value="">-- Choose Existing Client Profile --</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.company ? `(${c.company})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Contact Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Jane Doe"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Company Name</label>
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="e.g., Mining & Infra ZA"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Client Email Address *</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@client.co.za"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Project Description / Site Location</label>
            <input
              type="text"
              value={project}
              onChange={(e) => setProject(e.target.value)}
              placeholder="e.g., Secunda Plant 3D Scan"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center justify-between">
              <span>Travel & Accommodation Cost</span>
              <span className="text-[10px] text-gray-500 font-normal">Direct ZAR Input</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-xs text-gray-500 font-bold">R</span>
              <input
                type="number"
                step="100"
                value={travelAccommodationCost}
                onChange={(e) => setTravelAccommodationCost(Number(e.target.value))}
                placeholder="0"
                className="w-full border border-gray-300 rounded-lg pl-7 pr-3 py-2 text-xs font-bold text-gray-900 focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <p className="text-[10px] text-gray-400 mt-1">
              {travelAccommodationCost === 0
                ? '✓ Local Gauteng / JHB site (R0.00 Travel & Accommodation)'
                : `+${formatZAR(travelAccommodationCost)} bundled travel & site accommodation surcharge`}
            </p>
          </div>
        </div>

        {/* Middle Column: Calculator Parameters OR Custom BoQ Editor */}
        <div className="space-y-4 lg:col-span-1">
          {mode === 'calculator' ? (
            <>
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">2. Technical Scope Parameters</h4>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-semibold text-gray-700">Site Footprint (Square Meters)</label>
                  <label className="text-[11px] text-orange-600 font-semibold cursor-pointer flex items-center space-x-1">
                    <input
                      type="checkbox"
                      checked={areaUnknown}
                      onChange={(e) => setAreaUnknown(e.target.checked)}
                      className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                    />
                    <span>Estimate by Category</span>
                  </label>
                </div>
                {!areaUnknown && (
                  <input
                    type="number"
                    value={area}
                    onChange={(e) => setArea(Number(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs font-bold text-gray-900 focus:ring-2 focus:ring-orange-500 mb-2"
                  />
                )}
                {areaUnknown ? (
                  <select
                    value={areaBucket}
                    onChange={(e) => setAreaBucket(Number(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs bg-white focus:ring-2 focus:ring-orange-500"
                  >
                    <option value={100}>Small Commercial / Retail (10 – 150 m²)</option>
                    <option value={300}>Medium Commercial / Retail (150 – 600 m²)</option>
                    <option value={1000}>Large Commercial / Industrial (600 – 2,500 m²)</option>
                    <option value={5000}>Industrial Plant / Mining Site (2,500 – 15,000 m²)</option>
                  </select>
                ) : (
                  <input
                    type="range"
                    min={100}
                    max={50000}
                    step={100}
                    value={area}
                    onChange={(e) => setArea(Number(e.target.value))}
                    className="w-full accent-orange-600 cursor-pointer"
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Site / Environment Complexity</label>
                <select
                  value={complexity}
                  onChange={(e) => setComplexity(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs bg-white focus:ring-2 focus:ring-orange-500"
                >
                  {SITE_ENVIRONMENTS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Access & Working Conditions</label>
                <select
                  value={access}
                  onChange={(e) => setAccess(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs bg-white focus:ring-2 focus:ring-orange-500"
                >
                  {ACCESS_CONDITIONS.map((a) => (
                    <option key={a.value} value={a.value}>
                      {a.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Survey Accuracy Requirements</label>
                <select
                  value={accuracy}
                  onChange={(e) => setAccuracy(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs bg-white"
                >
                  <option value="Standard">Standard Accuracy (±5mm) — 1.0x</option>
                  <option value="High Precision">High Precision / Deformation (±2mm) — 1.25x</option>
                </select>
              </div>

              {/* Technical Deliverables */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">Technical Deliverables</label>
                <div className="space-y-2">
                  {PUBLIC_DELIVERABLES.map((d) => {
                    const isSelected = selectedDelivs.has(d.id);
                    return (
                      <div
                        key={d.id}
                        onClick={() => toggleDeliverable(d.id)}
                        className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all flex items-center justify-between ${
                          isSelected
                            ? 'border-orange-500 bg-orange-50/50 text-gray-900 font-semibold'
                            : 'border-gray-200 bg-gray-50/50 text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <div
                            className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                              isSelected ? 'bg-orange-600 border-orange-600 text-white' : 'border-gray-300 bg-white'
                            }`}
                          >
                            {isSelected && <Check size={12} />}
                          </div>
                          <span>{d.label}</span>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            isSelected ? 'bg-orange-100 text-orange-800' : 'bg-gray-200 text-gray-600'
                          }`}
                        >
                          {d.tag}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* BIM LOD Level & Disciplines Selection */}
              {selectedDelivs.has('bim') && (
                <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg animate-in fade-in duration-200 space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-orange-900 mb-1 flex items-center justify-between">
                      <span>BIM Level of Detail (LOD Level)</span>
                      <span className="text-[10px] bg-orange-200 text-orange-900 px-2 py-0.5 rounded font-mono">
                        {bimLevel === '100' ? '×0.60' : bimLevel === '200' ? '×0.80' : bimLevel === '300' ? '×1.00' : '×1.35'}
                      </span>
                    </label>
                    <select
                      value={bimLevel}
                      onChange={(e) => setBimLevel(e.target.value)}
                      className="w-full border border-orange-300 rounded-lg px-3 py-2 text-xs bg-white font-medium text-gray-900 focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="100">LOD 100 — Conceptual / Massing (×0.60)</option>
                      <option value="200">LOD 200 — Generic Systems & Enclosure (×0.80)</option>
                      <option value="300">LOD 300 — Specific Assemblies / As-Built Standard (×1.00)</option>
                      <option value="400">LOD 400 — Fabrication & Detailed MEP Piping (×1.35)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-orange-900 mb-1.5">Elements / Disciplines to Model (Hybrid Site Setup)</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { id: 'architectural', label: 'Architectural (Base)', tag: 'Included' },
                        { id: 'structural', label: 'Structural Steelwork', tag: '+25%' },
                        { id: 'mep', label: 'MEP Services', tag: '+45%' },
                        { id: 'site', label: 'Site / Civil Terrain', tag: '+15%' },
                      ].map((sys) => {
                        const checked = systems.includes(sys.id);
                        return (
                          <button
                            type="button"
                            key={sys.id}
                            onClick={() => {
                              setSystems((prev) =>
                                prev.includes(sys.id)
                                  ? prev.filter((s) => s !== sys.id)
                                  : [...prev, sys.id]
                              );
                            }}
                            className={`p-2 rounded border text-left text-[11px] flex flex-col justify-between transition-all ${
                              checked
                                ? 'bg-orange-600 text-white border-orange-600 font-semibold shadow-sm'
                                : 'bg-white text-gray-700 border-orange-200 hover:bg-orange-100/50'
                            }`}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span>{sys.label}</span>
                              <span className={`text-[9px] px-1 rounded font-bold ${checked ? 'bg-orange-700 text-orange-100' : 'bg-orange-100 text-orange-800'}`}>
                                {sys.tag}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* CUSTOM BILL OF QUANTITIES (BOQ) EDITOR */
            <div className="space-y-3 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center space-x-1">
                  <ListPlus className="w-3.5 h-3.5 text-slate-800" />
                  <span>Custom Bill of Quantities (BoQ)</span>
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

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Scoping Notes / Special Instructions</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Client requires scaffolding access for ceiling scans."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>

        {/* Right Column: Live ZAR Price Output & Scaled Itemised Scope Table */}
        <div className="space-y-4 lg:col-span-1 border-t lg:border-t-0 lg:border-l border-gray-100 lg:pl-6 pt-4 lg:pt-0 flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
              3. {mode === 'custom' ? 'Custom BoQ Price Summary' : 'Pricing & Line-Item Breakdown'}
            </h4>

            {mode === 'calculator' ? (
              <div className="bg-gray-900 text-white rounded-xl p-4 mb-4 shadow-md">
                <div className="text-xs text-gray-400 mb-1">Calculated Estimate Range (ZAR)</div>
                <div className="text-2xl font-bold text-orange-400 mb-2">
                  {formatRange(range.low, range.high)}
                </div>
                <div className="space-y-1 text-xs text-gray-300 border-t border-gray-800 pt-2">
                  <div className="flex justify-between">
                    <span>Fieldwork Time:</span>
                    <span className="font-bold text-white">{range.fieldDays} Days</span>
                  </div>
                  <div className="flex justify-between">
                    <span>CAD/BIM Processing:</span>
                    <span className="font-bold text-white">{range.processDays} Days</span>
                  </div>
                  <div className="flex justify-between text-amber-300">
                    <span>Travel & Accommodation:</span>
                    <span>{travelAccommodationCost === 0 ? 'Included (R0.00)' : `+${formatZAR(travelAccommodationCost)}`}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-900 text-white rounded-xl p-4 mb-4 shadow-md">
                <div className="text-xs text-slate-400 mb-1">Custom Bill of Quantities Subtotal</div>
                <div className="text-3xl font-extrabold text-emerald-400 mb-1">
                  {formatZAR(customTotal)}
                </div>
                <div className="text-[11px] text-slate-300">
                  {customItems.length} Custom Line Item{customItems.length === 1 ? '' : 's'} Configured
                </div>
              </div>
            )}

            {/* LIVE TABLE PREVIEW (CALCULATOR OR CUSTOM BOQ) */}
            <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-2xs mb-4">
              <div className="bg-slate-900 text-white px-3 py-2 flex items-center justify-between text-[11px] font-bold">
                <span>{mode === 'custom' ? 'Rendered BoQ PDF Table' : 'PDF Itemised Scope Breakdown'}</span>
                {mode === 'calculator' && isCustomPrice && (
                  <span className="text-[10px] text-orange-400">Scaled ({formatZAR(effectiveCalculatorFirmAmount)})</span>
                )}
              </div>
              <div className="divide-y divide-gray-100 text-[11px]">
                {mode === 'custom' ? (
                  customItems.map((line, idx) => (
                    <div key={idx} className="px-3 py-1.5 flex items-center justify-between">
                      <span className="text-gray-700 font-medium truncate pr-2">
                        {line.quantity}× {line.description || 'Custom Line Item'}
                      </span>
                      <span className="font-bold text-gray-900">{formatZAR(line.total)}</span>
                    </div>
                  ))
                ) : (
                  itemizedLines.map((line, idx) => (
                    <div key={idx} className="px-3 py-1.5 flex items-center justify-between">
                      <span className="text-gray-600 truncate pr-2">{line.label}</span>
                      <span className="font-bold text-gray-900">{line.amount === 0 ? 'R0.00' : formatZAR(line.amount)}</span>
                    </div>
                  ))
                )}
              </div>
              <div className="bg-orange-600 text-white px-3 py-2 flex items-center justify-between font-bold text-xs">
                <span>Grand Total Quote Amount</span>
                <span>{formatZAR(effectiveTotal)}</span>
              </div>
            </div>

            {mode === 'calculator' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-gray-700">
                    Firm Quote Amount (ZAR)
                    {!isManualFirmAmount && (
                      <span className="text-[10px] text-emerald-600 font-semibold ml-1.5">(Auto Baseline Midpoint)</span>
                    )}
                  </label>
                  {isManualFirmAmount && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsManualFirmAmount(false);
                        setManualFirmAmount(null);
                      }}
                      className="text-[11px] text-orange-600 hover:text-orange-700 font-bold cursor-pointer transition-colors"
                    >
                      🔄 Revert to Auto ({formatZAR(range.mid)})
                    </button>
                  )}
                </div>
                <input
                  type="number"
                  step="0.01"
                  value={effectiveCalculatorFirmAmount}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setIsManualFirmAmount(true);
                    setManualFirmAmount(val);
                  }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-base font-bold text-gray-900 focus:ring-2 focus:ring-orange-500"
                />
                <span className="text-[11px] text-gray-500 mt-1 block">Baseline Midpoint: {formatZAR(range.mid)}</span>
              </div>
            )}
          </div>

          {/* 2-STEP ACTION BUTTONS MATCHING WEBSITE LEADS 1-TO-1 */}
          <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t border-gray-100">
            <button
              type="button"
              disabled={loading || sendingEmail}
              onClick={handleReviewPdf}
              className="flex-1 bg-white border border-gray-300 hover:bg-gray-50 text-gray-900 font-bold py-3 px-3 rounded-xl text-xs flex items-center justify-center transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
            >
              <FileText className="w-4 h-4 mr-1.5 text-orange-600" />
              <span>{loading ? 'Preparing PDF...' : '📄 Review PDF Document'}</span>
            </button>

            <button
              type="button"
              disabled={loading || sendingEmail}
              onClick={handleSendEmailDirect}
              className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-3 rounded-xl text-xs flex items-center justify-center transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
            >
              <Send className="w-4 h-4 mr-1.5" />
              <span>{sendingEmail ? 'Sending...' : 'Confirm & Send Email'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
