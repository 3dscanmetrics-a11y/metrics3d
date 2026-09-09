'use client';

import { useState } from 'react';
import { Mail, Paperclip, X, Send, FileText, CheckCircle2, AlertCircle, Trash2, Plus } from 'lucide-react';
import { sendCustomQuoteEmail, sendCustomInvoiceEmail } from '../app/actions';

export interface SendEmailModalProps {
  type: 'quote' | 'invoice';
  documentId: string;
  defaultToEmail: string;
  defaultClientName: string;
  defaultProject: string;
  onClose: () => void;
  onSuccess?: () => void;
}

interface AttachedFile {
  name: string;
  size: number;
  contentBase64: string;
}

export default function SendEmailModal({
  type,
  documentId,
  defaultToEmail,
  defaultClientName,
  defaultProject,
  onClose,
  onSuccess,
}: SendEmailModalProps) {
  const [toEmail, setToEmail] = useState(defaultToEmail || '');
  const [ccEmail, setCcEmail] = useState('');
  const [subject, setSubject] = useState(
    type === 'quote'
      ? `Formal Quotation: ${defaultProject || '3D Laser Scanning Project'}`
      : `Invoice: ${defaultProject || '3D Laser Scanning Project'}`
  );
  const [message, setMessage] = useState(
    type === 'quote'
      ? `Hi ${defaultClientName || 'there'},\n\nPlease find attached your formal scoping quote for ${defaultProject || 'the project'}.\n\nOur engineering team looks forward to assisting you.\n\nBest regards,\n3D Scan Metrics Team`
      : `Dear ${defaultClientName || 'Valued Client'},\n\nPlease find attached your invoice for ${defaultProject || 'the project'}.\n\nPayment terms and banking details are provided in the attached PDF.\n\nKind regards,\nAccounts Department\n3D Scan Metrics`
  );

  const [additionalFiles, setAdditionalFiles] = useState<AttachedFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Handle File Upload
  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || e.target.files.length === 0) return;
    const files = Array.from(e.target.files);

    files.forEach((file) => {
      if (file.size > 10 * 1024 * 1024) {
        setError(`File ${file.name} exceeds maximum 10MB limit.`);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        setAdditionalFiles((prev) => [
          ...prev,
          { name: file.name, size: file.size, contentBase64: base64 },
        ]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  }

  // Remove File
  function handleRemoveFile(index: number) {
    setAdditionalFiles((prev) => prev.filter((_, i) => i !== index));
  }

  // Submit Send
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!toEmail) {
      setError('Please provide a recipient email address.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const fd = new FormData();
      fd.set('id', documentId);
      fd.set('to', toEmail);
      fd.set('cc', ccEmail);
      fd.set('subject', subject);
      fd.set('message', message);
      fd.set(
        'additionalFiles',
        JSON.stringify(
          additionalFiles.map((f) => ({ filename: f.name, contentBase64: f.contentBase64 }))
        )
      );

      if (type === 'quote') {
        await sendCustomQuoteEmail(fd);
      } else {
        await sendCustomInvoiceEmail(fd);
      }

      setSuccessMsg(
        `${type === 'quote' ? 'Quotation' : 'Invoice'} email dispatched successfully to ${toEmail}${
          ccEmail ? ` (CC: ${ccEmail})` : ''
        }!`
      );
      if (onSuccess) onSuccess();
      setTimeout(() => {
        onClose();
      }, 1800);
    } catch (err: any) {
      setError(err.message || 'Failed to dispatch email');
    } finally {
      setLoading(false);
    }
  }

  const primaryDocName =
    type === 'quote'
      ? `Formal_Quote_${(defaultProject || '3DScan').replace(/\s+/g, '_')}.pdf`
      : `Invoice_${(defaultProject || '3DScanMetrics').replace(/\s+/g, '_')}.pdf`;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-2xl w-full p-6 space-y-5 my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-orange-50 text-orange-600 rounded-xl border border-orange-100">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-gray-900">
                Send {type === 'quote' ? 'Formal Quotation' : 'Invoice'} via Email
              </h3>
              <p className="text-xs text-gray-500">
                Add CC recipients, custom cover note, and supplementary attachments.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback */}
        {successMsg && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-800 flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Recipient & CC inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Recipient Email (To) *
              </label>
              <input
                type="email"
                required
                value={toEmail}
                onChange={(e) => setToEmail(e.target.value)}
                placeholder="client@company.co.za"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-orange-500 bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center justify-between">
                <span>CC Email Address(es)</span>
                <span className="text-[10px] text-gray-400 font-normal">Comma-separated</span>
              </label>
              <input
                type="text"
                value={ccEmail}
                onChange={(e) => setCcEmail(e.target.value)}
                placeholder="accounts@client.co.za, manager@client.co.za"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-orange-500 bg-white"
              />
            </div>
          </div>

          {/* Subject Line */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Email Subject Line</label>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-orange-500 bg-white"
            />
          </div>

          {/* Cover Message Body */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Cover Email Body / Note</label>
            <textarea
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-3 text-xs focus:ring-2 focus:ring-orange-500 bg-white font-sans"
            />
          </div>

          {/* Attachments Section */}
          <div className="space-y-2 pt-1 border-t border-gray-100">
            <label className="block text-xs font-bold text-gray-700">Email Attachments</label>

            {/* Primary Generated PDF Badge */}
            <div className="p-2.5 bg-orange-50/70 border border-orange-200/80 rounded-xl flex items-center justify-between text-xs text-orange-900 font-semibold">
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-orange-600 shrink-0" />
                <span className="truncate">{primaryDocName}</span>
              </div>
              <span className="text-[10px] bg-orange-200/60 text-orange-800 font-bold px-2 py-0.5 rounded-md">
                Generated PDF
              </span>
            </div>

            {/* Additional Uploaded Files List */}
            {additionalFiles.map((file, idx) => (
              <div
                key={idx}
                className="p-2.5 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between text-xs text-gray-800"
              >
                <div className="flex items-center space-x-2 truncate">
                  <Paperclip className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                  <span className="truncate font-medium">{file.name}</span>
                  <span className="text-[10px] text-gray-400">
                    ({Math.round(file.size / 1024)} KB)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveFile(idx)}
                  className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}

            {/* Additional File Uploader Button */}
            <div>
              <label className="inline-flex items-center space-x-1.5 bg-white hover:bg-gray-50 text-gray-700 font-bold px-3 py-1.5 rounded-lg border border-gray-300 text-xs transition-colors cursor-pointer shadow-2xs">
                <Paperclip className="w-3.5 h-3.5 text-orange-600" />
                <span>Attach Additional Documents...</span>
                <input
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
              <span className="text-[10px] text-gray-400 block mt-1">
                Supports additional CAD files, site plans, scope specifications, images, or PDFs up to 10MB each.
              </span>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end space-x-3 border-t border-gray-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg text-xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-lg text-xs transition-colors shadow-xs flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{loading ? 'Dispatching Email...' : 'Dispatch Email & Attachments'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
