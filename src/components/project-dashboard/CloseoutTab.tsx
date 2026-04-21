import React, { useState, useMemo } from 'react';
import type { Project, ProjectMaterial, ProjectPermit } from '@/types';
import { useProjectStore } from '@/stores/projectStore';
import { Button } from '@/components/ui/Button';
import { toast } from '@/hooks/useToast';
import { getCategoryLabel, getCategoryBadge } from '@/lib/categories';

interface Props {
  project: Project;
  permits?: ProjectPermit[];
  onPermitCreate?: () => void;
  onPermitUpdate?: (permitId: string, updates: Partial<ProjectPermit>) => void;
  onProjectUpdated: () => void;
}

export const CloseoutTab: React.FC<Props> = ({ project, permits = [], onPermitCreate, onPermitUpdate, onProjectUpdated }) => {
  const { updateProject } = useProjectStore();
  const [actualUsages, setActualUsages] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    if (project.materials) {
      project.materials.forEach((mat) => {
        initial[mat.id] = mat.actualUsage ?? mat.quantity;
      });
    }
    return initial;
  });
  const [completing, setCompleting] = useState(false);

  // Get materials with estimated quantity from manifest
  const materials = project.materials ?? [];

  // Calculate variance and waste %
  const details = useMemo(() => {
    return materials.map((mat) => {
      const estimated = mat.quantity;
      const actual = actualUsages[mat.id] ?? estimated;
      const variance = actual - estimated;
      const wasteQty = Math.max(0, estimated - actual);
      const wastePct = estimated > 0 ? (wasteQty / estimated) * 100 : 0;
      const total = mat.unitCost * (actual ?? 0);

      return {
        material: mat,
        estimated,
        actual,
        variance,
        wasteQty,
        wastePct,
        total,
      };
    });
  }, [materials, actualUsages]);

  // Summary: overall waste %
  const summary = useMemo(() => {
    const totalEstimated = details.reduce((s, d) => s + d.estimated, 0);
    const totalActual = details.reduce((s, d) => s + d.actual, 0);
    const totalWasted = Math.max(0, totalEstimated - totalActual);
    const overallWastePct = totalEstimated > 0 ? (totalWasted / totalEstimated) * 100 : 0;
    const totalEstimatedValue = details.reduce((s, d) => s + (d.estimated * d.material.unitCost), 0);
    const totalActualValue = details.reduce((s, d) => s + d.total, 0);

    return {
      totalEstimated,
      totalActual,
      totalWasted,
      overallWastePct,
      totalEstimatedValue,
      totalActualValue,
      wastedValue: totalEstimatedValue - totalActualValue,
    };
  }, [details]);

  // Handle input change
  const handleActualChange = (materialId: string, value: string) => {
    const num = parseFloat(value) || 0;
    setActualUsages((prev) => ({ ...prev, [materialId]: Math.max(0, num) }));
  };

  // Complete project handler
  const handleCompleteProject = async () => {
    if (completing) return;
    setCompleting(true);

    try {
      // Update each material's actualUsage in the JSONB
      const updatedMaterials = materials.map((mat) => ({
        ...mat,
        actualUsage: actualUsages[mat.id] ?? mat.quantity,
      }));

      // Call updateProject with status and completedAt
      await updateProject(project.id, {
        materials: updatedMaterials,
        status: 'completed',
        completedAt: new Date().toISOString(),
      });

      toast.success('Project marked as completed with usage data recorded');
      onProjectUpdated();
    } catch (err) {
      toast.error('Failed to complete project');
      console.error('Complete project error:', err);
    } finally {
      setCompleting(false);
    }
  };

  // F-043 fix: removed the early return that hid the Complete button when no
  // materials were present. Contractor should be able to mark a small/materials-
  // free project complete. Material-usage table is still gated (below) to only
  // render when materials exist.
  const hasMaterials = materials.length > 0;

  const badgeClass = (category: string) => {
    const badge = getCategoryBadge(category);
    const classMap: Record<string, string> = {
      'badge-blue': 'bg-[#e3f2fd] text-[#0d47a1]',
      'badge-green': 'bg-[#e8f5e9] text-[#1b5e20]',
      'badge-amber': 'bg-[#fff3e0] text-[#e65100]',
      'badge-teal': 'bg-[#e0f2f1] text-[#004d40]',
      'badge-purple': 'bg-[#f3e5f5] text-[#4a148c]',
    };
    return classMap[badge] || classMap['badge-purple'];
  };

  return (
    <div className="space-y-[24px]">
      {/* Header */}
      <div>
        <h2 className="text-[16px] font-[600] text-[var(--text)] mb-[8px]">
          Project Closeout & Usage Tracking
        </h2>
        <p className="text-[12px] text-[var(--text-3)]">
          Record actual material usage to refine reserve percentages for future projects.
        </p>
      </div>

      {/* Compliance & Permits */}
      {permits.length > 0 && (
        <div className="rounded-[10px] border p-[16px]" style={{ backgroundColor: 'var(--surface2)', borderColor: 'var(--border)' }}>
          <div className="text-[12px] font-[700] uppercase text-[var(--text-3)] mb-[12px]">Permits & Compliance</div>
          <div className="space-y-[4px]">
            {permits.map(p => (
              <div key={p.id} className="flex items-center gap-[8px] text-[12px]">
                <span className="px-[6px] py-[1px] rounded-[4px] text-[10px] font-[500]" style={{
                  backgroundColor: p.status === 'approved' ? 'rgba(22,163,74,0.12)' : p.status === 'needed' ? 'rgba(212,164,76,0.12)' : 'var(--surface3)',
                  color: p.status === 'approved' ? 'var(--status-green)' : p.status === 'needed' ? 'var(--status-amber)' : 'var(--text-4)',
                }}>{p.status}</span>
                <span className="text-[var(--text)] font-[500] flex-1">{p.permitType.replace(/_/g, ' ')}</span>
                {p.fee != null && <span className="text-[var(--text-4)]">${p.fee}</span>}
                {p.jurisdiction && <span className="text-[var(--text-4)]">{p.jurisdiction}</span>}
                {onPermitUpdate && (
                  <select
                    className="bg-transparent border border-[var(--border)] rounded-[4px] px-[4px] py-[2px] text-[11px] cursor-pointer"
                    style={{ color: 'var(--text-3)' }}
                    value={p.status}
                    onChange={(e) => onPermitUpdate(p.id, { status: e.target.value as ProjectPermit['status'] })}
                  >
                    <option value="needed">Needed</option>
                    <option value="applied">Applied</option>
                    <option value="approved">Approved</option>
                    <option value="denied">Denied</option>
                    <option value="not_required">Not Required</option>
                  </select>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Materials Table — only if materials exist */}
      {!hasMaterials && (
        <div className="rounded-[10px] border-2 border-dashed p-[24px] text-center" style={{ borderColor: 'var(--border)' }}>
          <p className="text-[13px] text-[var(--text-3)] mb-[4px]">
            No materials on this project.
          </p>
          <p className="text-[11px] text-[var(--text-4)]">
            You can still mark the project complete below. Add materials later for usage tracking on future jobs.
          </p>
        </div>
      )}
      {hasMaterials && (
      <>
      <div className="overflow-x-auto border rounded-[8px]" style={{ borderColor: 'var(--border)' }}>
        <table className="w-full text-[12px]">
          <thead>
            <tr style={{ backgroundColor: 'var(--surface2)', borderBottom: '1px solid var(--border)' }}>
              <th className="text-left px-[12px] py-[10px] font-[600] text-[var(--text-2)]">Material</th>
              <th className="text-left px-[12px] py-[10px] font-[600] text-[var(--text-2)]">Category</th>
              <th className="text-right px-[12px] py-[10px] font-[600] text-[var(--text-2)]">Est. Qty</th>
              <th className="text-right px-[12px] py-[10px] font-[600] text-[var(--text-2)]">Actual Qty</th>
              <th className="text-right px-[12px] py-[10px] font-[600] text-[var(--text-2)]">Variance</th>
              <th className="text-right px-[12px] py-[10px] font-[600] text-[var(--text-2)]">Waste %</th>
              <th className="text-right px-[12px] py-[10px] font-[600] text-[var(--text-2)]">Value</th>
            </tr>
          </thead>
          <tbody>
            {details.map((d) => {
              const varianceColor = d.variance > 0 ? 'var(--status-amber)' : d.variance < 0 ? 'var(--green-l)' : 'var(--text-3)';
              const wasteColor = d.wastePct > 15 ? 'var(--status-red)' : d.wastePct > 8 ? 'var(--status-amber)' : 'var(--status-green)';
              return (
                <tr
                  key={d.material.id}
                  style={{ borderBottom: '1px solid var(--border)' }}
                >
                  <td className="px-[12px] py-[10px] text-[var(--text)]">
                    {d.material.name}
                  </td>
                  <td className="px-[12px] py-[10px]">
                    <span
                      className={`inline-block px-[8px] py-[2px] rounded-[4px] text-[11px] font-[500] ${badgeClass(
                        d.material.category,
                      )}`}
                    >
                      {getCategoryLabel(d.material.category)}
                    </span>
                  </td>
                  <td className="px-[12px] py-[10px] text-right text-[var(--text-2)]">
                    {d.estimated.toFixed(2)} {d.material.unit}
                  </td>
                  <td className="px-[12px] py-[10px] text-right">
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={d.actual}
                      onChange={(e) => handleActualChange(d.material.id, e.target.value)}
                      className="w-[80px] bg-transparent border rounded-[4px] px-[6px] py-[4px] text-[var(--text)] text-right focus:outline-none focus:border-[var(--green)]"
                      style={{ borderColor: 'var(--border)' }}
                      disabled={completing}
                    />
                    <span className="text-[var(--text-3)] ml-[4px]">{d.material.unit}</span>
                  </td>
                  <td className="px-[12px] py-[10px] text-right" style={{ color: varianceColor }}>
                    {d.variance > 0 ? '+' : ''}{d.variance.toFixed(2)}
                  </td>
                  <td className="px-[12px] py-[10px] text-right" style={{ color: wasteColor }}>
                    {d.wastePct.toFixed(1)}%
                  </td>
                  <td className="px-[12px] py-[10px] text-right text-[var(--text-2)]">
                    ${d.total.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary Card */}
      <div
        className="p-[16px] rounded-[8px] border"
        style={{ backgroundColor: 'var(--surface2)', borderColor: 'var(--border)' }}
      >
        <h3 className="text-[13px] font-[600] text-[var(--text)] mb-[12px]">
          Project Summary
        </h3>
        <div className="grid grid-cols-2 gap-[16px] md:grid-cols-4">
          <div>
            <p className="text-[11px] text-[var(--text-3)] mb-[4px]">Total Estimated</p>
            <p className="text-[16px] font-[600] text-[var(--text)]">
              {summary.totalEstimated.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-[var(--text-3)] mb-[4px]">Total Actual</p>
            <p className="text-[16px] font-[600] text-[var(--text)]">
              {summary.totalActual.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-[var(--text-3)] mb-[4px]">Total Wasted</p>
            <p className="text-[16px] font-[600]" style={{ color: 'var(--status-amber)' }}>
              {summary.totalWasted.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-[var(--text-3)] mb-[4px]">Overall Waste %</p>
            <p
              className="text-[16px] font-[600]"
              style={{
                color:
                  summary.overallWastePct > 15
                    ? 'var(--status-red)'
                    : summary.overallWastePct > 8
                      ? 'var(--status-amber)'
                      : 'var(--status-green)',
              }}
            >
              {summary.overallWastePct.toFixed(1)}%
            </p>
          </div>
        </div>
        <div className="mt-[12px] pt-[12px] border-t" style={{ borderColor: 'var(--border)' }}>
          <div className="flex justify-between items-center">
            <div>
              <p className="text-[11px] text-[var(--text-3)] mb-[4px]">Estimated Value</p>
              <p className="text-[14px] font-[600] text-[var(--text)]">
                ${summary.totalEstimatedValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </p>
            </div>
            <div className="text-center">
              <p className="text-[11px] text-[var(--text-3)] mb-[4px]">Value Saved</p>
              <p
                className="text-[14px] font-[600]"
                style={{
                  color: summary.wastedValue > 0 ? 'var(--status-green)' : 'var(--status-red)',
                }}
              >
                ${Math.abs(summary.wastedValue).toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-[var(--text-3)] mb-[4px]">Actual Value</p>
              <p className="text-[14px] font-[600] text-[var(--text)]">
                ${summary.totalActualValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </p>
            </div>
          </div>
        </div>
      </div>
      </>
      )}

      {/* Completion Button — always rendered regardless of material count */}
      <div className="flex justify-end gap-[12px] pt-[12px]">
        <Button
          variant="primary"
          size="md"
          onClick={handleCompleteProject}
          disabled={completing}
        >
          {completing ? 'Completing...' : 'Complete Project'}
        </Button>
      </div>
    </div>
  );
};
