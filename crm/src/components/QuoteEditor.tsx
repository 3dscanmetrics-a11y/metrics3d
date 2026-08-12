'use client';

import { useMemo, useState } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import { calculateEstimateRange, DEFAULT_PRICING, formatZAR } from '@/lib/pricing';
import { rejectLead, saveLeadQuote, sendFormalQuote } from '../app/actions';

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

function parseDelivs(raw: string): string[] {
  try {
    const v = JSON.parse(raw || '[]');
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

export default function QuoteEditor({ lead }: { lead: LeadProps }) {
  const payload = lead.payload || {};
  const [area, setArea] = useState(Number(lead.area) || 0);
  const [complexity, setComplexity] = useState(lead.complexity || COMPLEXITY[0]);
  const [access, setAccess] = useState(String(payload.access || ACCESS[0]));
  const [accuracy, setAccuracy] = useState(String(payload.accuracy || 'Standard'));
  const [bimLevel, setBimLevel] = useState(String(payload.bimLevel || payload.lod || '300'));
  const [deliverables, setDeliverables] = useState<string[]>(
    parseDelivs(lead.deliverables).length
      ? parseDelivs(lead.deliverables)
      : Array.isArray(payload.deliverables)
        ? (payload.deliverables as string[])
        : []
  );
  const [firmAmount, setFirmAmount] = useState(
    Number(payload.firmAmount) || Number(lead.quoteTotal) || 0
  );
  const [pending, setPending] = useState<'save' | 'send' | 'reject' | null>(null);

  const range = useMemo(
    () =>
      calculateEstimateRange(DEFAULT_PRICING, {
        area,
        complexity,
        deliverables,
        access,
        accuracy,
        bimLevel,
      }),
    [area, complexity, deliverables, access, accuracy, bimLevel]
  );

  function toggleDeliv(id: string) {
    setDeliverables((prev) => (prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]));
  }

  function appendForm(fd: FormData) {
    fd.set('id', lead.id);
    fd.set('area', String(area));
    fd.set('complexity', complexity);
    fd.set('access', access);
    fd.set('accuracy', accuracy);
    fd.set('bimLevel', bimLevel);
    fd.set('deliverables', JSON.stringify(deliverables));
    fd.set('firmAmount', String(firmAmount || range.mid));
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="space-y-4">
        <label className="block text-xs font-medium text-gray-600">
          Area (sqm)
          <input
            type="number"
            className="mt-1 w-full border rounded-lg px-3 py-3 md:py-2 text-base md:text-sm bg-white"
            value={area}
            onChange={(e) => setArea(Number(e.target.value))}
          />
        </label>

        <label className="block text-xs font-medium text-gray-600">
          Site environment ×{range.breakdown.siteMult}
          <select
            className="mt-1 w-full border rounded-lg px-3 py-3 md:py-2 text-base md:text-sm bg-white"
            value={complexity}
            onChange={(e) => setComplexity(e.target.value)}
          >
            {COMPLEXITY.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>

        <label className="block text-xs font-medium text-gray-600">
          Access ×{range.breakdown.accessMult}
          <select
            className="mt-1 w-full border rounded-lg px-3 py-3 md:py-2 text-base md:text-sm bg-white"
            value={access}
            onChange={(e) => setAccess(e.target.value)}
          >
            {ACCESS.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>

        <label className="block text-xs font-medium text-gray-600">
          Accuracy ×{range.breakdown.accuracyMult}
          <select
            className="mt-1 w-full border rounded-lg px-3 py-3 md:py-2 text-base md:text-sm bg-white"
            value={accuracy}
            onChange={(e) => setAccuracy(e.target.value)}
          >
            {ACCURACY.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>

        <div>
          <p className="text-xs font-medium text-gray-600 mb-1">Deliverables</p>
          <div className="flex flex-wrap gap-2">
            {DELIVS.map((id) => (
              <label key={id} className="text-xs flex items-center gap-1 border rounded px-2 py-1 bg-white">
                <input type="checkbox" checked={deliverables.includes(id)} onChange={() => toggleDeliv(id)} />
                {id}
              </label>
            ))}
          </div>
        </div>

        {deliverables.includes('bim') && (
          <label className="block text-xs font-medium text-gray-600">
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
      </div>

      <div className="space-y-4">
        <div className="text-xs text-gray-500 space-y-1 p-4 bg-white rounded-lg border border-gray-100">
          <p className="font-semibold text-gray-700">Live indicative range</p>
          <p className="text-xl font-bold text-gray-900">{range.formatted}</p>
          <p>Mid {formatZAR(range.mid)} · Field {range.fieldDays}d · Process {range.processDays}d</p>
          <ul className="mt-2 space-y-0.5 border-t border-gray-100 pt-2">
            {range.breakdown.lines.map((line) => (
              <li key={line.label} className="flex justify-between gap-2">
                <span>{line.label}</span>
                <span className="tabular-nums">{formatZAR(line.amount)}</span>
              </li>
            ))}
          </ul>
        </div>

        <label className="block text-xs font-medium text-gray-600">
          Firm invoice amount (ZAR)
          <input
            type="number"
            step="0.01"
            className="mt-1 w-full border rounded-lg px-3 py-3 md:py-2 text-base md:text-sm font-semibold bg-white"
            value={firmAmount || range.mid}
            onChange={(e) => setFirmAmount(Number(e.target.value))}
          />
        </label>

        <div className="flex flex-col-reverse sm:flex-row gap-2">
          <button
            type="button"
            disabled={pending !== null}
            className="flex-1 bg-white border border-gray-200 text-gray-800 py-3 sm:py-2 rounded-lg text-sm min-h-12"
            onClick={async () => {
              setPending('save');
              const fd = new FormData();
              appendForm(fd);
              await saveLeadQuote(fd);
              setPending(null);
            }}
          >
            Save
          </button>
          <button
            type="button"
            disabled={pending !== null}
            className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-white py-3 sm:py-2 rounded-lg text-sm font-medium flex items-center justify-center min-h-12"
            onClick={async () => {
              setPending('send');
              const fd = new FormData();
              appendForm(fd);
              await sendFormalQuote(fd);
              setPending(null);
            }}
          >
            <CheckCircle className="w-4 h-4 mr-1" />
            {pending === 'send' ? 'Sending…' : 'Send quote & invoice'}
          </button>
          <button
            type="button"
            disabled={pending !== null}
            className="bg-white border border-gray-200 text-rose-500 p-3 sm:p-2 rounded-lg min-h-12 sm:min-h-0 flex items-center justify-center"
            aria-label="Reject"
            onClick={async () => {
              setPending('reject');
              await rejectLead(lead.id);
              setPending(null);
            }}
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
