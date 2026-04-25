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
          {/* F-CW-29: surface the optional engine columns + offer a template
              download so power users can ship manifest-engine-ready imports. */}
          Required columns: <code className="bg-[var(--surface3)] px-[4px] rounded text-[11px]">name, category, unit, unit_cost</code>
          <br />
          Optional engine columns: <code className="bg-[var(--surface3)] px-[4px] rounded text-[11px]">coverage, depth_in, default_waste_factor, purchase_unit, qty_per_purchase_unit, cost_per_purchase_unit, subcategory, supplier_sku, computation_model</code>
          <br />
          <a
            href={'data:text/csv;charset=utf-8,' + encodeURIComponent(
              'name,category,unit,unit_cost,coverage,depth_in,default_waste_factor,purchase_unit,qty_per_purchase_unit,cost_per_purchase_unit,subcategory,supplier_sku,computation_model\n' +
              'Concrete Pavers 12x12,paver,sqft,4.50,1,3,5%,each,1,4.50,paver,SKU-123,UNIT_COVERAGE\n' +
              'Topsoil 3in,soil,cubic_yard,40,,3,5%,cubic_yard,1,40,soil,,AREA_COVERAGE\n'
            )}
            download="terrainforge-materials-template.csv"
            className="underline mt-[4px] inline-block"
            style={{ color: 'var(--green-l)' }}
          >
            Download CSV template
          </a>
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
