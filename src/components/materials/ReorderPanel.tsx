import React, { useState, useMemo } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useMaterialStore } from '@/stores/materialStore';
import { useSupplierStore } from '@/stores/supplierStore';
import { QuoteRequestModal } from './QuoteRequestModal';
import { generateReorderSuggestions, suggestionsToManifestItems } from '@/lib/reorder';

/**
 * ReorderPanel displays materials below minimum stock and allows users to
 * generate pre-filled RFQ suggestions with one click.
 */
export const ReorderPanel: React.FC = () => {
  const { materials } = useMaterialStore();
  const { suppliers } = useSupplierStore();
  const [showQuoteModal, setShowQuoteModal] = useState(false);

  // Generate reorder suggestions (memoized)
  const suggestions = useMemo(
    () => generateReorderSuggestions(materials, suppliers),
    [materials, suppliers]
  );

  // If no suggestions, show nothing
  if (suggestions.length === 0) return null;

  // Convert suggestions to manifest items for the quote modal
  const manifestItems = useMemo(
    () => suggestionsToManifestItems(suggestions),
    [suggestions]
  );

  return (
    <>
      {/* Reorder Alert Panel */}
      <div
        className="mb-4 rounded-lg border-l-4 p-4"
        style={{
          backgroundColor: 'color-mix(in srgb, var(--status-amber) 8%, transparent)',
          borderColor: 'var(--status-amber)',
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex gap-3 items-start flex-1">
            <AlertTriangle
              size={18}
              className="flex-shrink-0 mt-0.5"
              style={{ color: 'var(--status-amber)' }}
            />
            <div>
              <h3 className="text-[14px] font-[600] text-[var(--text-primary)]">
                Reorder Needed
                {' '}
                <span
                  className="inline-block ml-2 px-2 py-1 rounded-full text-[11px] font-[600]"
                  style={{
                    backgroundColor: 'var(--status-amber)',
                    color: 'white',
                  }}
                >
                  {suggestions.length}
                </span>
              </h3>
              <p className="text-[13px] text-[var(--text-secondary)] mt-1">
                {suggestions.length === 1
                  ? '1 material is below minimum stock'
                  : `${suggestions.length} materials are below minimum stock`}
              </p>

              {/* Item List */}
              <div className="mt-3 flex flex-col gap-2">
                {suggestions.map((s) => (
                  <div key={s.material.id} className="text-[12px] text-[var(--text-secondary)]">
                    <div className="flex items-center justify-between">
                      <span className="font-[500]">{s.material.name}</span>
                      <span className="text-[var(--text-tertiary)]">
                        {s.currentStock} {s.material.unit} / min {s.minLevel}
                      </span>
                    </div>
                    <div className="text-[11px] text-[var(--text-tertiary)] mt-0.5">
                      Suggest ordering {s.suggestedOrderQty} {s.material.unit}
                      {s.topSupplier && ` from ${s.topSupplier.name}`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={() => setShowQuoteModal(true)}
            className="flex-shrink-0 px-4 py-2 rounded-lg text-[13px] font-[600] transition-opacity hover:opacity-90 whitespace-nowrap"
            style={{
              backgroundColor: 'var(--status-amber)',
              color: 'white',
            }}
          >
            Create RFQs
          </button>
        </div>
      </div>

      {/* Quote Request Modal */}
      <QuoteRequestModal
        isOpen={showQuoteModal}
        projectId="" // Empty projectId for inventory-level reorder (not project-specific)
        manifestItems={manifestItems}
        onClose={() => setShowQuoteModal(false)}
      />
    </>
  );
};
