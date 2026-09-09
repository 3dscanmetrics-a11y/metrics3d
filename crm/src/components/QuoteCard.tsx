'use client';

import { useState } from 'react';
import { Briefcase, CheckCircle2, ChevronDown, Clock, FileText, Mail, Ruler, Send, ArrowRight, Edit } from 'lucide-react';
import { acceptQuoteAndGenerateInvoice, sendQuoteEmail } from '../app/actions';
import SendEmailModal from './SendEmailModal';
import QuoteEditor from './QuoteEditor';

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
  processDays?: number;
  bimLevel?: string;
};

function formatZAR(val: number) {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(val || 0);
}

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

export default function QuoteCard({ lead, defaultOpen = false }: { lead: Lead; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const [isEditing, setIsEditing] = useState(false);
  const [converting, setConverting] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleConvertInvoice() {
    if (!confirm(`Convert quote for '${lead.project || lead.name}' to a formal invoice?`)) return;
    setConverting(true);
    try {
      await acceptQuoteAndGenerateInvoice(lead.id);
      setMessage('Quote accepted! Formal invoice generated in Accounts Receivable.');
    } catch (err: any) {
      alert(err.message || 'Failed to convert quote to invoice');
    } finally {
      setConverting(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden transition-all hover:border-gray-300">
      
      {/* Summary Card Header */}
      <div
        onClick={() => setOpen(!open)}
        className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer bg-white hover:bg-gray-50/50"
      >
        <div className="flex items-center space-x-3.5">
          <div className="p-3 bg-orange-100/70 text-orange-700 rounded-xl shrink-0">
            <FileText size={20} />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-bold text-gray-900 text-sm">{lead.project || '3D Scanning Project'}</h3>
              <span className="bg-orange-100 text-orange-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-orange-200">
                Formal Quote Sent
              </span>
            </div>
            <div className="text-xs text-gray-500 font-medium mt-0.5">
              Client: <span className="text-gray-900 font-semibold">{lead.name || 'Valued Client'}</span>
              {lead.company ? ` (${lead.company})` : ''} • {lead.email}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between md:justify-end space-x-4">
          <div className="text-right">
            <div className="text-xs text-gray-500">Quoted Amount</div>
            <div className="text-base font-bold text-orange-600">{formatZAR(lead.quoteTotal)}</div>
          </div>
          <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {/* Expanded Quote Details */}
      {open && (
        <div className="border-t border-gray-100 p-5 bg-gray-50/50 space-y-4">
          
          {message && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-semibold text-emerald-800 flex items-center space-x-2">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <span>{message}</span>
            </div>
          )}

          {/* Key Specs Pill Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="bg-white p-3 rounded-lg border border-gray-200">
              <div className="text-gray-500 text-[10px] uppercase font-bold flex items-center space-x-1 mb-1">
                <Ruler size={12} className="text-orange-600" />
                <span>Site Area</span>
              </div>
              <div className="font-bold text-gray-900">{lead.area} m²</div>
            </div>

            <div className="bg-white p-3 rounded-lg border border-gray-200">
              <div className="text-gray-500 text-[10px] uppercase font-bold flex items-center space-x-1 mb-1">
                <Briefcase size={12} className="text-orange-600" />
                <span>Complexity</span>
              </div>
              <div className="font-bold text-gray-900 truncate">{lead.complexity || 'Commercial'}</div>
            </div>

            <div className="bg-white p-3 rounded-lg border border-gray-200">
              <div className="text-gray-500 text-[10px] uppercase font-bold flex items-center space-x-1 mb-1">
                <Clock size={12} className="text-orange-600" />
                <span>Timeframe</span>
              </div>
              <div className="font-bold text-gray-900">
                {lead.fieldDays || 1} Days Field / {lead.processDays || 1} Days CAD
              </div>
            </div>

            <div className="bg-white p-3 rounded-lg border border-gray-200">
              <div className="text-gray-500 text-[10px] uppercase font-bold flex items-center space-x-1 mb-1">
                <FileText size={12} className="text-orange-600" />
                <span>Deliverables</span>
              </div>
              <div className="font-bold text-gray-900 truncate">{deliverableList(lead.deliverables)}</div>
            </div>
          </div>

          {/* Actions Bar */}
          <div className="pt-3 border-t border-gray-200 flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <button
                type="button"
                onClick={() => setIsEditing(!isEditing)}
                className={`inline-flex items-center justify-center space-x-1.5 font-bold px-3.5 py-2 rounded-lg text-xs transition-colors shadow-2xs cursor-pointer ${
                  isEditing
                    ? 'bg-orange-600 text-white'
                    : 'bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200'
                }`}
              >
                <Edit size={14} />
                <span>{isEditing ? 'Close Editor' : '✏️ Edit Quote Details'}</span>
              </button>

              <a
                href={`/api/quotes/${lead.id}/pdf?t=${Date.now()}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center space-x-1.5 bg-white hover:bg-gray-100 text-gray-900 font-bold px-3.5 py-2 rounded-lg border border-gray-300 text-xs transition-colors shadow-2xs"
              >
                <span>📄 Review PDF Quote</span>
              </a>

              <button
                type="button"
                onClick={() => setShowEmailModal(true)}
                className="inline-flex items-center justify-center space-x-1.5 bg-white hover:bg-gray-100 text-gray-700 font-semibold px-3.5 py-2 rounded-lg border border-gray-300 text-xs transition-colors shadow-2xs cursor-pointer"
              >
                <Mail size={14} />
                <span>Send / Resend Email...</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleConvertInvoice}
              disabled={converting}
              className="w-full md:w-auto inline-flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-lg text-xs transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
            >
              <span>{converting ? 'Converting...' : 'Client Accepted — Convert to Invoice'}</span>
              <ArrowRight size={14} />
            </button>
          </div>

          {/* Interactive Formal Quote Editor Container */}
          {isEditing && (
            <div className="mt-4 pt-4 border-t border-gray-200 bg-white p-4 sm:p-6 rounded-xl border shadow-sm animate-in fade-in duration-200">
              <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center space-x-2">
                <Edit className="w-4 h-4 text-orange-600" />
                <span>Edit Formal Quotation Parameters & Contact Info</span>
              </h4>
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
                onSaveSuccess={() => setIsEditing(false)}
              />
            </div>
          )}
        </div>
      )}

      {showEmailModal && (
        <SendEmailModal
          type="quote"
          documentId={lead.id}
          defaultToEmail={lead.email}
          defaultClientName={lead.name}
          defaultProject={lead.project}
          onClose={() => setShowEmailModal(false)}
          onSuccess={() => {
            setMessage('Formal PDF Quote email dispatched with custom settings!');
          }}
        />
      )}
    </div>
  );
}
