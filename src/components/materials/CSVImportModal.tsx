import React from 'react';
import { Modal } from '@/components/shared/Modal';

interface CSVRow {
  name: string;
  category: string;
  unit: string;
  cost: string;
}

interface CSVImportModalProps {
  showImportModal: boolean;
  onClose: () => void;
  csvPreview: CSVRow[];
  csvError: string;
  importSuccess: string;
  handleCsvFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleImportConfirm: () => void;
  csvInputRef: React.RefObject<HTMLInputElement>;
}

export const CSVImportModal: React.FC<CSVImportModalProps> = ({
  showImportModal,
  onClose,
  csvPreview,
  csvError,
  importSuccess,
  handleCsvFile,
  handleImportConfirm,
  csvInputRef,
}) => {
  return (
    <Modal
      isOpen={showImportModal}
      title="Import Materials from CSV"
      onClose={onClose}
      onConfirm={csvPreview.length > 0 ? handleImportConfirm : undefined}
      confirmText={`Import ${csvPreview.length} Row${csvPreview.length !== 1 ? 's' : ''}`}
      maxWidth="560px"
    >
      <div className="flex flex-col gap-[12px]">
        <div className="text-[12px] text-[var(--text-2)]">
          Upload a CSV with columns: <code className="bg-[var(--surface3)] px-[4px] rounded text-[11px]">name, category, unit, unit_cost</code>
        </div>
        <input
          ref={csvInputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={handleCsvFile}
          className="text-[12px] text-[var(--text-2)]"
        />
        {csvError && <div className="text-[12px] text-[var(--color-error)]">{csvError}</div>}
        {importSuccess && <div className="text-[12px] text-[var(--color-success)]">{importSuccess}</div>}
        {csvPreview.length > 0 && (
          <div>
            <div className="text-[11px] font-[600] text-[var(--text-3)] uppercase tracking-[0.06em] mb-[6px]">
              Preview ({csvPreview.length} rows)
            </div>
            <div className="max-h-[200px] overflow-y-auto border border-[var(--border)] rounded-[8px]">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="bg-[var(--surface3)] text-[var(--text-3)] text-left">
                    <th className="px-[8px] py-[6px]">Name</th>
                    <th className="px-[8px] py-[6px]">Category</th>
                    <th className="px-[8px] py-[6px]">Unit</th>
                    <th className="px-[8px] py-[6px]">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {csvPreview.map((row, i) => (
                    <tr key={i} className="border-t border-[var(--border)]">
                      <td className="px-[8px] py-[5px] text-[var(--text)]">{row.name}</td>
                      <td className="px-[8px] py-[5px] text-[var(--text-3)]">{row.category}</td>
                      <td className="px-[8px] py-[5px] text-[var(--text-3)]">{row.unit}</td>
                      <td className="px-[8px] py-[5px] text-[var(--text-3)]">${row.cost}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
