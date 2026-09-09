'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import AdminQuoteCalculator from './AdminQuoteCalculator';
import { ClientRecord } from './ClientManagement';

export default function CreateQuotationModal({ clients }: { clients: ClientRecord[] }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center space-x-1.5 transition-all shadow-sm cursor-pointer"
      >
        <Plus className="w-4 h-4" />
        <span>Create New Quotation</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 md:p-6 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gray-900 text-white px-6 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-2">
                <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                <h3 className="text-base font-bold tracking-tight">Create Custom Formal Quotation</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1">
              <AdminQuoteCalculator clients={clients} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
