import React from 'react';
import type { Project, ManifestItem } from '@/types';

interface ManifestEngineProps {
  activeProject?: Project | null;
  onSelectProject?: () => void;
}

export const ManifestEngine: React.FC<ManifestEngineProps> = ({
  activeProject,
  onSelectProject,
}) => {
  // TODO: Connect to useProjectStore()

  if (!activeProject) {
    return (
      <div className="text-center py-[48px] px-[24px] text-[var(--text-3)]">
        <div className="text-[36px] mb-[12px] opacity-40">⊞</div>
        <div className="text-[16px] font-[600] text-[var(--text-2)] mb-[6px]">
          No project selected
        </div>
        <div className="text-[13px]">
          Select a project from the Projects tab to generate its manifest
        </div>
      </div>
    );
  }

  // TODO: Connect to useMaterialStore and use generateManifest() from @/lib/manifest
  const materials: ManifestItem[] = [];
  const totalCost = materials.reduce((sum: number, m: ManifestItem) => sum + (m.subtotal || 0), 0);

  return (
    <div>
      <div className="mb-[20px]">
        <h2 className="font-serif text-[20px] text-[var(--text)] mb-[4px]">
          {activeProject.name}
        </h2>
        <p className="text-[13px] text-[var(--text-3)]">
          Materials manifest for all zones
        </p>
      </div>

      <div className="overflow-x-auto border rounded-[10px] border-[var(--border)]">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="bg-[var(--green)] text-white">
              <th className="px-[14px] py-[10px] text-left text-[10px] font-[700] uppercase tracking-[0.05em]">
                Material
              </th>
              <th className="px-[14px] py-[10px] text-left text-[10px] font-[700] uppercase tracking-[0.05em]">
                Qty Needed
              </th>
              <th className="px-[14px] py-[10px] text-left text-[10px] font-[700] uppercase tracking-[0.05em]">
                Reserve
              </th>
              <th className="px-[14px] py-[10px] text-left text-[10px] font-[700] uppercase tracking-[0.05em]">
                Total Ordered
              </th>
              <th className="px-[14px] py-[10px] text-left text-[10px] font-[700] uppercase tracking-[0.05em]">
                Unit Cost
              </th>
              <th className="px-[14px] py-[10px] text-left text-[10px] font-[700] uppercase tracking-[0.05em]">
                Subtotal
              </th>
            </tr>
          </thead>
          <tbody>
            {materials.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-[14px] py-[20px] text-center text-[var(--text-3)]">
                  No materials in manifest
                </td>
              </tr>
            ) : (
              materials.map((material: ManifestItem, idx: number) => (
                <tr
                  key={idx}
                  className="border-b border-[var(--border)] hover:bg-[rgba(45,106,79,.06)] transition-colors duration-150 odd:bg-[rgba(255,255,255,.02)]"
                >
                  <td className="px-[14px] py-[10px] text-[var(--text)]">
                    {material.materialName}
                  </td>
                  <td className="px-[14px] py-[10px] text-[var(--text-2)]">
                    {material.qtyNeeded}
                  </td>
                  <td className="px-[14px] py-[10px] text-[var(--amber-l)] font-mono">
                    {material.reserveQty.toFixed(1)}
                  </td>
                  <td className="px-[14px] py-[10px] text-[var(--text-2)]">
                    {material.totalOrder}
                  </td>
                  <td className="px-[14px] py-[10px] text-[var(--green-l)] font-mono font-[600]">
                    ${material.unitCost.toFixed(2)}
                  </td>
                  <td className="px-[14px] py-[10px] text-[var(--green-l)] font-mono font-[600]">
                    ${material.subtotal.toFixed(2)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr className="bg-[rgba(45,106,79,.12)] border-t-[2px] border-[var(--green)]">
              <td colSpan={5} className="px-[14px] py-[10px] font-[700] text-[var(--text)]">
                TOTAL PROJECT COST
              </td>
              <td className="px-[14px] py-[10px] font-[700] text-[var(--text)] text-[var(--green-l)] font-mono">
                ${totalCost.toFixed(2)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="mt-[20px] p-[16px] bg-[var(--surface2)] border border-[var(--border)] rounded-[10px]">
        <p className="text-[12px] text-[var(--text-2)]">
          This manifest includes all materials required for project zones plus any
          reserve percentages. Use this for procurement and supplier ordering.
        </p>
      </div>
    </div>
  );
};

export default ManifestEngine;
