'use client';

import { useState, useMemo } from 'react';
import { Briefcase, ChevronDown, Clock, Ruler, Settings, Trash2 } from 'lucide-react';
import QuoteEditor from './QuoteEditor';
import { acceptQuoteAndGenerateInvoice, deleteLead } from '../app/actions';
import { AREA_BUCKETS, calculateEstimateRange, DEFAULT_PRICING } from '@/lib/pricing';

type Lead = {
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
  status: string;
  createdAt: string;
  fieldDays: number;
};

function deliverableList(raw: unknown) {
  let list: string[] = [];
  if (Array.isArray(raw)) {
    list = raw.map(String);
  } else if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw || '[]');
      if (Array.isArray(parsed)) {
        list = parsed.map(String);
      } else if (typeof parsed === 'object' && parsed !== null && Array.isArray((parsed as any).deliverables)) {
        list = (parsed as any).deliverables.map(String);
      }
    } catch {
      list = raw ? [String(raw)] : [];
    }
  } else if (typeof raw === 'object' && raw !== null && Array.isArray((raw as any).deliverables)) {
    list = (raw as any).deliverables.map(String);
  }

  if (list.length === 0) return 'Point Cloud Survey';

  return list
    .map((d: string) => {
      if (d === 'raw') return 'Raw Point Cloud (.E57)';
      if (d === 'viewer') return 'Web Viewer (TruView)';
      if (d === 'cad') return '2D CAD Floor Plans (.DWG)';
      if (d === 'topo') return 'Topographical Survey / Mesh';
      if (d === 'bim') return '3D Revit Model (.RVT)';
      return d;
    })
    .join(', ');
}

function parseDelivsArray(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw || '[]');
      if (Array.isArray(parsed)) return parsed.map(String);
      if (typeof parsed === 'object' && parsed !== null && Array.isArray((parsed as any).deliverables)) {
        return (parsed as any).deliverables.map(String);
      }
    } catch {}
  }
  return [];
}

export default function LeadCard({ lead, defaultOpen = false }: { lead: Lead; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const [deleting, setDeleting] = useState(false);

  async function handleDeleteLead(e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete lead '${lead.project || lead.name}'? This action cannot be undone.`)) return;
    setDeleting(true);
    try {
      await deleteLead(lead.id);
    } catch (err: any) {
      alert(err.message || 'Failed to delete lead');
      setDeleting(false);
    }
  }

  const payload = lead.payload || {};
  const isAreaUnknown = Boolean(payload.areaUnknown);
  const bucketKey = Number(payload.areaBucket || lead.area);
  const areaBucketInfo = isAreaUnknown ? AREA_BUCKETS[bucketKey] : null;

  const calc = useMemo(() => {
    const p = lead.payload || {};
    const delivs = parseDelivsArray(lead.deliverables).length
      ? parseDelivsArray(lead.deliverables)
      : Array.isArray(p.deliverables)
      ? (p.deliverables as string[])
      : ['raw'];

    return calculateEstimateRange(DEFAULT_PRICING, {
      area: Number(lead.area) || 0,
      complexity: lead.complexity || 'Commercial/Retail/Residential',
      deliverables: delivs,
      access: String(p.access || 'Standard business hours only'),
      accuracy: String(p.accuracy || 'Standard'),
      bimLevel: String(p.bimLevel || p.lod || '300'),
      systems: p.systems as string[] | string | undefined,
      areaUnknown: Boolean(p.areaUnknown),
      areaBucket: p.areaBucket ? Number(p.areaBucket) : Number(lead.area) || undefined,
    });
  }, [lead]);

  const displayRange = useMemo(() => {
    const publicEst = typeof payload.publicEstimate === 'string' ? payload.publicEstimate.trim() : '';
    if (publicEst) return publicEst;
    if (lead.estimateFormatted && lead.estimateFormatted.includes('–')) return lead.estimateFormatted;
    return calc.formatted;
  }, [payload.publicEstimate, lead.estimateFormatted, calc.formatted]);

  const effectiveFieldDays = lead.fieldDays && lead.fieldDays > 0 ? lead.fieldDays : calc.fieldDays;

  const statusClass =
    lead.status === 'PENDING'
      ? 'bg-amber-100 text-amber-800'
      : lead.status === 'APPROVED' || lead.status === 'SENT'
        ? 'bg-emerald-100 text-emerald-800'
        : 'bg-rose-100 text-rose-800';

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden transition-all hover:shadow-md">
      <div className="w-full text-left px-3 sm:px-5 py-3 sm:py-4 flex items-center gap-3 sm:gap-4 hover:bg-gray-50">
        <button
          type="button"
          className="flex items-center gap-3 flex-1 min-w-0 text-left cursor-pointer"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <ChevronDown
            className={`w-5 h-5 shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
          />
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium shrink-0 ${statusClass}`}>
            {lead.status}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-gray-900 truncate">{lead.project || 'Unknown Project'}</p>
            <p className="text-sm text-gray-500 truncate">
              {lead.name}
              {lead.company ? ` · ${lead.company}` : ''}
            </p>
          </div>
          <div className="text-right shrink-0 max-w-[42%] sm:max-w-none">
            <p className="text-xs sm:text-sm font-semibold text-gray-900 leading-snug">{displayRange}</p>
            <p className="text-[10px] sm:text-xs text-gray-400 hidden sm:block">{new Date(lead.createdAt).toLocaleString()}</p>
          </div>
        </button>

        <button
          type="button"
          onClick={handleDeleteLead}
          disabled={deleting}
          className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0 border border-transparent hover:border-rose-200"
          title="Delete Lead / Quote"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {open ? (
        <div className="border-t border-gray-100">
          <div className="flex flex-col md:flex-row">
            <div className="p-4 md:p-6 border-b md:border-b-0 md:border-r border-gray-100 flex-1">
              <div className="space-y-2 text-sm text-gray-600">
                <p>
                  <span className="font-semibold text-gray-900">Client:</span> {lead.name} ({lead.company})
                </p>
                <p>
                  <span className="font-semibold text-gray-900">Email:</span> {lead.email}
                </p>
                {Boolean(payload.location || payload.site_location) && (
                  <p>
                    <span className="font-semibold text-gray-900">Location:</span> {String(payload.location || payload.site_location)}
                  </p>
                )}
              </div>
            </div>

            <div className="bg-gray-50 p-4 md:p-6 md:w-96">
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center">
                <Settings className="w-4 h-4 mr-1 text-orange-600" /> Website Scoping Parameters
              </h4>
              <ul className="space-y-3 text-sm">
                <li className="flex justify-between items-start gap-2">
                  <span className="text-gray-500 flex items-center shrink-0">
                    <Ruler className="w-4 h-4 mr-2" /> Area
                  </span>
                  <div className="text-right">
                    <span className="font-medium text-gray-900">
                      {isAreaUnknown && areaBucketInfo
                        ? `${areaBucketInfo.min.toLocaleString('en-ZA')} – ${areaBucketInfo.max.toLocaleString('en-ZA')} sqm`
                        : `${lead.area} sqm`}
                    </span>
                    {isAreaUnknown && (
                      <div className="text-[11px] text-amber-700 font-semibold">
                        Unknown size bucket (Mid: {lead.area} sqm)
                      </div>
                    )}
                  </div>
                </li>
                <li className="flex justify-between">
                  <span className="text-gray-500 flex items-center">
                    <Settings className="w-4 h-4 mr-2" /> Complexity
                  </span>
                  <span className="font-medium text-gray-900">{lead.complexity}</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-gray-500 flex items-center">
                    <Briefcase className="w-4 h-4 mr-2" /> Deliverables
                  </span>
                  <span className="font-medium text-gray-900 truncate ml-4">{deliverableList(lead.deliverables)}</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-gray-500 flex items-center">
                    <Clock className="w-4 h-4 mr-2" /> Est. Field Time
                  </span>
                  <span className="font-medium text-gray-900">{effectiveFieldDays} Days</span>
                </li>
              </ul>
              <div className="mt-6 p-4 bg-white rounded-lg border border-orange-200 shadow-xs">
                <p className="text-xs text-orange-600 font-bold uppercase tracking-wider">Website Submitted Quote</p>
                <p className="text-xl font-bold text-gray-900 mt-1">{displayRange}</p>
              </div>
            </div>
          </div>
          {lead.status === 'PENDING' ? (
            <div className="border-t border-gray-100 bg-gray-50 p-4 md:p-6">
              <QuoteEditor
                lead={{
                  id: lead.id,
                  email: lead.email,
                  name: lead.name,
                  company: lead.company,
                  project: lead.project,
                  area: lead.area,
                  complexity: lead.complexity,
                  deliverables: lead.deliverables,
                  quoteTotal: lead.quoteTotal,
                  estimateFormatted: lead.estimateFormatted,
                  estimateLow: lead.estimateLow,
                  estimateHigh: lead.estimateHigh,
                  payload: lead.payload,
                }}
              />
            </div>
          ) : null}

          {lead.status === 'SENT' || lead.status === 'sent' ? (
            <div className="border-t border-gray-100 bg-emerald-50/50 p-4 md:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-emerald-900">Formal Quote Sent</p>
                <p className="text-xs text-emerald-700">Awaiting client acceptance. Click below when the client approves this quote.</p>
              </div>
              <button
                type="button"
                onClick={async () => {
                  await acceptQuoteAndGenerateInvoice(lead.id);
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-lg transition-colors shadow-sm cursor-pointer shrink-0"
              >
                Client Accepted — Convert to Invoice
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
