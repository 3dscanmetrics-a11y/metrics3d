'use client';

import { useState } from 'react';
import { Upload, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ReceiptUploader() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append('receipt', file);

    try {
      const res = await fetch('/api/webhooks/extract-receipt', {
        method: 'POST',
        body: formData,
      });

      const data = (await res.json()) as any;
      if (res.ok && data.success) {
        setResult(data.extracted);
        router.refresh();
      } else {
        setError(data.error || 'Failed to extract receipt');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred uploading the receipt');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
            <Sparkles size={18} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 text-sm">AI Receipt OCR Scanner</h3>
            <p className="text-xs text-gray-500">Upload receipt images to auto-extract vendor, ZAR amount, and category using Gemini AI.</p>
          </div>
        </div>
      </div>

      <label className="flex items-center justify-center border-2 border-dashed border-gray-300 hover:border-orange-500 rounded-lg p-4 cursor-pointer transition-colors bg-gray-50 hover:bg-orange-50/30">
        <input type="file" accept="image/*,.pdf" onChange={handleFileChange} className="hidden" disabled={loading} />
        <div className="flex items-center space-x-3 text-sm text-gray-600">
          <Upload className={`w-5 h-5 ${loading ? 'animate-bounce text-orange-500' : 'text-gray-400'}`} />
          <span>{loading ? 'AI Extracting Vendor & ZAR Amount...' : 'Click or drop receipt to scan with AI'}</span>
        </div>
      </label>

      {result && (
        <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center space-x-3 text-xs text-emerald-800">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <div>
            <span className="font-bold">Extracted:</span> {result.vendor} — R{result.amountZar} ({result.category})
          </div>
        </div>
      )}

      {error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-3 text-xs text-red-800">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
