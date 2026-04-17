import React, { useMemo, useState } from 'react';
import type { Project, ProjectMaterial, ManifestItem, Material, ProjectElement } from '@/types';
import { pdf } from '@react-pdf/renderer';
import { useMaterialStore } from '@/stores/materialStore';
import { useSupplierStore } from '@/stores/supplierStore';
import { useCrewStore } from '@/stores/crewStore';
import { generateManifest } from '@/lib/manifest';
import { getCategoryLabel } from '@/lib/categories';
import { calculateInventoryDecrements, isLowStock } from '@/lib/inventory';
import { ManifestPDF } from '@/components/pdf/ManifestPDF';
import { QuoteStatusPanel } from '@/components/materials/QuoteStatusPanel';
import { QuoteRequestModal } from '@/components/materials/QuoteRequestModal';
import { toast } from '@/hooks/useToast';

interface Props {
  project: Project | null;
  loading: boolean;
  elements?: ProjectElement[];
}

function fmt(n: number): string {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtShort(n: number): string {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtQty(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

export const ProjectDashboardMaterials: React.FC<Props> = ({ project, loading }) => {
  const { materials: libraryMaterials, adjustStock } = useMaterialStore();
  const { supplierPrices } = useSupplierStore();
  const { crew } = useCrewStore();
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [allocating, setAllocating] = useState(false);
  const [allocated, setAllocated] = useState(false);

  const projectMaterials = project?.materials ?? [];
  const hasProjectMaterials = projectMaterials.length > 0;

  // Generate manifest from project materials
  const manifest = useMemo<ManifestItem[]>(() => {
    if (!project || !hasProjectMaterials) return [];
    return generateManifest(project, libraryMaterials, supplierPrices);
  }, [project, libraryMaterials, supplierPrices, hasProjectMaterials]);

  const totalMaterialCost = useMemo(
    () => manifest.reduce((sum, item) => sum + item.subtotal, 0),
    [manifest]
  );

  const totalReserveQty = useMemo(
    () => manifest.reduce((sum, item) => sum + item.reserveQty, 0),
    [manifest]
  );

  const uniqueCategories = useMemo(
    () => new Set(projectMaterials.map((m) => m.category)).size,
    [projectMaterials]
  );

  const budget = project?.budget ?? 0;
  const budgetDelta = totalMaterialCost - budget;
  const budgetOver = budgetDelta > 0;

  // Build crew ID → name lookup for PDF export
  const crewLookup = useMemo(
    () => Object.fromEntries(crew.map(m => [m.id, m.name])),
    [crew]
  );

  // Check for low stock materials after allocation
  const lowStockMaterials = useMemo(() => {
    if (!allocated) return [];
    const decrements = calculateInventoryDecrements(projectMaterials, libraryMaterials);
    return decrements
      .map(d => {
        const libMat = libraryMaterials.find(m => m.id === d.materialId);
        return { ...d, minStockLevel: libMat?.minStockLevel ?? 0 };
      })
      .filter(d => d.newStock <= d.minStockLevel);
  }, [allocated, projectMaterials, libraryMaterials]);

  async function handleExportManifest() {
    if (!project) return;
    setExporting(true);
    try {
      const blob = await pdf(
        <ManifestPDF
          project={project}
          zoneManifests={[]}
          consolidatedManifest={manifest}
          totalCost={totalMaterialCost}
          crewLookup={crewLookup}
        />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-manifest.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  async function handleAllocateInventory() {
    if (!project) return;
    setAllocating(true);
    try {
      // Calculate what will be decremented
      const decrements = calculateInventoryDecrements(projectMaterials, libraryMaterials);

      if (decrements.length === 0) {
        toast.warning('No materials to allocate');
        return;
      }

      // Apply decrements to inventory
      for (const decrement of decrements) {
        await adjustStock(decrement.materialId, -decrement.decrement);
      }

      // Mark as allocated to prevent double-allocation
      setAllocated(true);
      toast.success(`Allocated ${decrements.length} materials from inventory`);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to allocate inventory';
      toast.error(errorMsg);
    } finally {
      setAllocating(false);
    }
  }

  if (loading) {
    return (
      <div className="text-center py-[40px] text-[13px] text-[var(--text-3)]">
        Loading materials...
      </div>
    );
  }

  if (!hasProjectMaterials) {
    return (
      <div className="space-y-[16px]">
        <div
          className="rounded-[10px] border-2 border-dashed p-[40px] text-center"
          style={{ borderColor: 'var(--border)', color: 'var(--text-4)' }}
        >
          <p className="text-[14px] mb-[4px]">No materials assigned yet</p>
          <p className="text-[12px]">
            Create a project through the wizard to get AI-suggested materials, or add them manually.
          </p>
        </div>

        {project?.id && (
          <div>
            <div className="text-[12px] font-[700] text-[var(--text)] uppercase tracking-[0.05em] mb-[10px]">
              Supplier Quotes
            </div>
            <QuoteStatusPanel projectId={project.id} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-[16px]">
      {/* ── Summary KPIs ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-[10px]">
        <div
          className="rounded-[8px] border p-[14px]"
          style={{ backgroundColor: 'var(--surface2)', borderColor: 'var(--border)' }}
        >
          <div className="text-[10px] font-[600] uppercase text-[var(--text-4)] mb-[4px]">Material Cost</div>
          <div className="text-[20px] font-[700] text-[var(--green-l)]">{fmtShort(totalMaterialCost)}</div>
          <div className="text-[10px] text-[var(--text-4)] mt-[2px]">incl. reserves</div>
        </div>
        <div
          className="rounded-[8px] border p-[14px]"
          style={{ backgroundColor: 'var(--surface2)', borderColor: 'var(--border)' }}
        >
          <div className="text-[10px] font-[600] uppercase text-[var(--text-4)] mb-[4px]">Line Items</div>
          <div className="text-[20px] font-[700] text-[var(--text)]">{projectMaterials.length}</div>
          <div className="text-[10px] text-[var(--text-4)] mt-[2px]">{uniqueCategories} categories</div>
        </div>
        <div
          className="rounded-[8px] border p-[14px]"
          style={{ backgroundColor: 'var(--surface2)', borderColor: 'var(--border)' }}
        >
          <div className="text-[10px] font-[600] uppercase text-[var(--text-4)] mb-[4px]">Reserve Buffer</div>
          <div className="text-[20px] font-[700] text-[var(--amber-l)]">+{fmtQty(totalReserveQty)}</div>
          <div className="text-[10px] text-[var(--text-4)] mt-[2px]">extra units</div>
        </div>
        <div
          className="rounded-[8px] border p-[14px]"
          style={{ backgroundColor: 'var(--surface2)', borderColor: 'var(--border)' }}
        >
          <div className="text-[10px] font-[600] uppercase text-[var(--text-4)] mb-[4px]">
            {budgetOver ? 'Over Budget' : 'Under Budget'}
          </div>
          <div className={`text-[20px] font-[700] ${budgetOver ? 'text-[var(--red-l)]' : 'text-[var(--text-2)]'}`}>
            {totalMaterialCost > 0
              ? `${budgetOver ? '+' : '-'}${fmtShort(Math.abs(budgetDelta))}`
              : '—'}
          </div>
          <div className="text-[10px] text-[var(--text-4)] mt-[2px]">vs {fmtShort(budget)} budget</div>
        </div>
      </div>

      {/* ── Manifest Table ───────────────────────────────────────────── */}
      <div
        className="rounded-[10px] border overflow-hidden"
        style={{ backgroundColor: 'var(--surface2)', borderColor: 'var(--border)' }}
      >
        <div
          className="flex items-center justify-between px-[16px] py-[12px] border-b"
          style={{ borderColor: 'var(--border)' }}
        >
          <div>
            <h3 className="text-[14px] font-[600] text-[var(--text)]">Material Manifest</h3>
            <p className="text-[11px] text-[var(--text-4)] mt-[1px]">Quantities with reserve % applied, ready for ordering</p>
          </div>
          <div className="flex items-center gap-[8px]">
            <button
              onClick={handleAllocateInventory}
              disabled={allocated || allocating || manifest.length === 0}
              className="px-[12px] py-[7px] text-[11px] font-[600] bg-[var(--amber-l)] text-white rounded-[6px] border-none cursor-pointer hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
            >
              {allocating ? 'Allocating…' : allocated ? 'Allocated ✓' : 'Allocate Inventory'}
            </button>
            <button
              onClick={handleExportManifest}
              disabled={exporting || manifest.length === 0}
              className="px-[12px] py-[7px] text-[11px] font-[600] bg-[var(--green)] text-white rounded-[6px] border-none cursor-pointer hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
            >
              {exporting ? 'Exporting…' : '⬇ Export PDF'}
            </button>
            <button
              onClick={() => setShowQuoteModal(true)}
              disabled={manifest.length === 0}
              className="px-[12px] py-[7px] text-[11px] font-[600] bg-[var(--brand-primary)] text-white rounded-[6px] border-none cursor-pointer hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
            >
              Request Quote
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="bg-[var(--green)] text-white">
                <th className="px-[14px] py-[10px] text-left text-[10px] font-[700] uppercase tracking-[0.05em]">Material</th>
                <th className="px-[14px] py-[10px] text-left text-[10px] font-[700] uppercase tracking-[0.05em]">Category</th>
                <th className="px-[14px] py-[10px] text-right text-[10px] font-[700] uppercase tracking-[0.05em]">Qty Needed</th>
                <th className="px-[14px] py-[10px] text-right text-[10px] font-[700] uppercase tracking-[0.05em]">Reserve</th>
                <th className="px-[14px] py-[10px] text-right text-[10px] font-[700] uppercase tracking-[0.05em]">Order Qty</th>
                <th className="px-[14px] py-[10px] text-center text-[10px] font-[700] uppercase tracking-[0.05em]">Unit</th>
                <th className="px-[14px] py-[10px] text-right text-[10px] font-[700] uppercase tracking-[0.05em]">Unit Cost</th>
                <th className="px-[14px] py-[10px] text-right text-[10px] font-[700] uppercase tracking-[0.05em]">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {manifest.map((item) => (
                <tr
                  key={item.materialId}
                  className="border-b border-[var(--border)] hover:bg-[rgba(45,106,79,.06)] transition-colors duration-150 odd:bg-[rgba(255,255,255,.02)]"
                >
                  <td className="px-[14px] py-[9px] text-[var(--text)] font-[500]">
                    {item.materialName}
                    {item.supplierName && (
                      <span className="ml-[6px] text-[10px] text-[var(--text-4)]">
                        via {item.supplierName}
                      </span>
                    )}
                  </td>
                  <td className="px-[14px] py-[9px]">
                    <span
                      className="px-[6px] py-[2px] rounded-[4px] text-[10px] font-[500]"
                      style={{ backgroundColor: 'rgba(45,106,79,0.1)', color: 'var(--green-l)' }}
                    >
                      {getCategoryLabel(item.category)}
                    </span>
                  </td>
                  <td className="px-[14px] py-[9px] text-right font-mono text-[var(--text-2)]">
                    {fmtQty(item.qtyNeeded)}
                  </td>
                  <td className="px-[14px] py-[9px] text-right font-mono text-[var(--amber-l)]">
                    +{fmtQty(item.reserveQty)}
                  </td>
                  <td className="px-[14px] py-[9px] text-right font-mono font-[600] text-[var(--text)]">
                    {item.totalOrder}
                  </td>
                  <td className="px-[14px] py-[9px] text-center text-[11px] text-[var(--text-3)] font-mono">
                    {item.unit}
                  </td>
                  <td className="px-[14px] py-[9px] text-right font-mono text-[var(--green-l)]">
                    {fmt(item.unitCost)}
                  </td>
                  <td className="px-[14px] py-[9px] text-right font-mono font-[700] text-[var(--green-l)]">
                    {fmt(item.subtotal)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-[rgba(45,106,79,.12)] border-t-[2px] border-[var(--green)]">
                <td
                  colSpan={7}
                  className="px-[14px] py-[10px] text-[11px] font-[700] text-[var(--text)] uppercase tracking-[0.05em]"
                >
                  Total Material Cost
                </td>
                <td className="px-[14px] py-[10px] text-right font-mono font-[700] text-[var(--green-l)]">
                  {fmt(totalMaterialCost)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ── Low Stock Warning ────────────────────────────────────────── */}
      {allocated && lowStockMaterials.length > 0 && (
        <div
          className="rounded-[10px] border-l-[4px] p-[14px]"
          style={{
            backgroundColor: 'rgba(217, 119, 6, 0.05)',
            borderColor: 'var(--amber-l)',
          }}
        >
          <div className="flex items-start gap-[8px]">
            <div className="text-[18px] mt-[2px]">⚠️</div>
            <div>
              <div className="text-[13px] font-[600] text-[var(--text)] mb-[6px]">
                Low Stock Warning
              </div>
              <div className="text-[12px] text-[var(--text-2)] space-y-[4px]">
                {lowStockMaterials.map(m => (
                  <div key={m.materialId}>
                    <span className="font-[500]">{m.name}</span> is now at {m.newStock} units
                    {m.minStockLevel > 0 && (
                      <span className="text-[var(--text-4)]"> (min: {m.minStockLevel})</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Quote Requests ───────────────────────────────────────────── */}
      {project?.id && (
        <div>
          <div className="text-[12px] font-[700] text-[var(--text)] uppercase tracking-[0.05em] mb-[10px]">
            Quote Requests
          </div>
          <QuoteStatusPanel projectId={project.id} />
        </div>
      )}

      {/* ── Quote Request Modal ──────────────────────────────────────── */}
      {project?.id && (
        <QuoteRequestModal
          isOpen={showQuoteModal}
          projectId={project.id}
          manifestItems={manifest}
          onClose={() => setShowQuoteModal(false)}
        />
      )}
    </div>
  );
};
