import React, { useState, useMemo, useEffect } from 'react';
import { useProjectStore } from '@/stores/projectStore';
import { useMaterialStore } from '@/stores/materialStore';
import { Skeleton } from '@/components/shared/Skeleton';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  generateManifest,
  computeQty,
  getReservePct,
  computeProjectCostFormatted,
  computeProjectCostRaw,
} from '@/lib/manifest';
import type { ManifestItem } from '@/types';
import { AlertBanner } from '@/components/shared/AlertBanner';
import { pdf } from '@react-pdf/renderer';
import { ManifestPDF } from '@/components/pdf/ManifestPDF';
import { useCrewStore } from '@/stores/crewStore';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtQty(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

// ── Component ─────────────────────────────────────────────────────────────────

export const ManifestEngine: React.FC = () => {
  const { projects, activeProjectId, setActiveProject, isLoading, error } = useProjectStore();
  const { materials } = useMaterialStore();
  const { crew } = useCrewStore();

  // Track visit for setup checklist
  useEffect(() => {
    localStorage.setItem('tf-visited-manifest', 'true');
  }, []);

  const [initialLoad, setInitialLoad] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setInitialLoad(false), 600);
    return () => clearTimeout(t);
  }, []);

  const [view, setView] = useState<'zone' | 'consolidated'>('zone');
  const [exporting, setExporting] = useState(false);

  const project = useMemo(
    () => projects.find(p => p.id === activeProjectId) ?? null,
    [projects, activeProjectId]
  );

  // Per-zone manifest items — computed per zone so each line is attributable
  const zoneManifests = useMemo(() => {
    if (!project) return [];
    return project.zones.map(zone => {
      const items: ManifestItem[] = zone.materials.flatMap(zm => {
        const mat = materials.find(m => m.id === zm.materialId);
        if (!mat) return [];
        const qty = computeQty(mat, zone);
        const reservePct = getReservePct(mat);
        const reserveQty = qty * reservePct;
        const totalOrder = Math.ceil(qty + reserveQty);
        return [{
          materialId: mat.id,
          materialName: mat.name,
          zoneName: zone.name,
          zoneId: zone.id,
          qtyNeeded: qty,
          reserveQty,
          totalOrder,
          unitCost: mat.cost,
          subtotal: totalOrder * mat.cost,
          unit: mat.unit,
        }];
      });
      const missing = zone.materials.filter(zm => !materials.find(m => m.id === zm.materialId));
      const subtotal = items.reduce((s, i) => s + i.subtotal, 0);
      return { zone, items, missing, subtotal };
    });
  }, [project, materials]);

  // Consolidated manifest (one row per material across all zones)
  const consolidatedManifest = useMemo(
    () => (project ? generateManifest(project, materials) : []),
    [project, materials]
  );

  const totalCostRaw = useMemo(
    () => (project ? computeProjectCostRaw(project, materials) : 0),
    [project, materials]
  );

  const totalCostFormatted = useMemo(
    () => (project ? computeProjectCostFormatted(project, materials) : '—'),
    [project, materials]
  );

  const budgetDelta = project ? totalCostRaw - project.budget : 0;
  const budgetOver = budgetDelta > 0;

  // Build crew ID → name lookup for PDF export
  const crewLookup = useMemo(
    () => Object.fromEntries(crew.map(m => [m.id, m.name])),
    [crew]
  );

  async function handleExportManifest() {
    if (!project) return;
    setExporting(true);
    try {
      const blob = await pdf(
        <ManifestPDF
          project={project}
          zoneManifests={zoneManifests}
          consolidatedManifest={consolidatedManifest}
          totalCost={totalCostRaw}
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

  // ── Table header ────────────────────────────────────────────────────────────
  const TableHead = ({ showZone }: { showZone?: boolean }) => (
    <thead>
      <tr className="bg-[var(--green)] text-white">
        <th className="px-[14px] py-[10px] text-left text-[10px] font-[700] uppercase tracking-[0.05em]">
          Material
        </th>
        {showZone && (
          <th className="px-[14px] py-[10px] text-left text-[10px] font-[700] uppercase tracking-[0.05em]">
            Zone(s)
          </th>
        )}
        <th className="px-[14px] py-[10px] text-right text-[10px] font-[700] uppercase tracking-[0.05em]">
          Qty Needed
        </th>
        <th className="px-[14px] py-[10px] text-right text-[10px] font-[700] uppercase tracking-[0.05em]">
          Reserve
        </th>
        <th className="px-[14px] py-[10px] text-right text-[10px] font-[700] uppercase tracking-[0.05em]">
          Total Order
        </th>
        <th className="px-[14px] py-[10px] text-center text-[10px] font-[700] uppercase tracking-[0.05em]">
          Unit
        </th>
        <th className="px-[14px] py-[10px] text-right text-[10px] font-[700] uppercase tracking-[0.05em]">
          Unit Cost
        </th>
        <th className="px-[14px] py-[10px] text-right text-[10px] font-[700] uppercase tracking-[0.05em]">
          Subtotal
        </th>
      </tr>
    </thead>
  );

  const ManifestRow = ({ item, showZone }: { item: ManifestItem; showZone?: boolean }) => (
    <tr className="border-b border-[var(--border)] hover:bg-[rgba(45,106,79,.06)] transition-colors duration-150 odd:bg-[rgba(255,255,255,.02)]">
      <td className="px-[14px] py-[9px] text-[var(--text)] font-[500]">{item.materialName}</td>
      {showZone && (
        <td className="px-[14px] py-[9px] text-[11px] text-[var(--text-3)]">{item.zoneName}</td>
      )}
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
        ${fmt(item.unitCost)}
      </td>
      <td className="px-[14px] py-[9px] text-right font-mono font-[700] text-[var(--green-l)]">
        ${fmt(item.subtotal)}
      </td>
    </tr>
  );

  if (isLoading || initialLoad) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-[16px]">
        <div style={{ background: 'var(--surface-card)', border: '1px solid var(--border-default)', borderRadius: '10px', padding: '16px' }}>
          <Skeleton width="100px" height="12px" className="mb-[12px]" />
          {[0,1,2,3].map(i => <Skeleton key={i} height="40px" className="mb-[8px]" />)}
        </div>
        <div style={{ background: 'var(--surface-card)', border: '1px solid var(--border-default)', borderRadius: '10px', padding: '16px' }}>
          <Skeleton width="200px" height="14px" className="mb-[16px]" />
          {[0,1,2,3,4].map(i => (
            <div key={i} className="flex gap-[12px] py-[10px]" style={{ borderBottom: '1px solid var(--border-light)' }}>
              <Skeleton width="140px" height="12px" />
              <Skeleton width="60px" height="12px" />
              <Skeleton width="80px" height="12px" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Empty / no-project state ─────────────────────────────────────────────────
  if (!project) {
    return (
      <div>
        <PageHeader title="Manifest Engine" subtitle="Select a project to calculate material quantities, review costs, and export a PDF manifest." />
        {projects.length === 0 ? (
          <div className="text-center py-[64px] text-[var(--text-3)]">
            <div className="text-[40px] mb-[12px] opacity-30">📋</div>
            <div className="text-[16px] font-[600] text-[var(--text-2)] mb-[6px]">Generate your first manifest</div>
            <div className="text-[13px]">Create a project with zones and materials first, then come back to calculate exact quantities, costs, and order lists.</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[12px]">
            {projects.map(p => {
              const allMats = p.zones.flatMap(z => z.materials);
              const cost = computeProjectCostRaw(p, materials);
              return (
                <button
                  key={p.id}
                  onClick={() => setActiveProject(p.id)}
                  className="text-left p-[16px] rounded-[10px] border border-[var(--border)] bg-[var(--surface2)] cursor-pointer card-hover"
                >
                  <div className="font-[600] text-[14px] text-[var(--text)] mb-[2px]">{p.name}</div>
                  <div className="text-[12px] text-[var(--text-3)] mb-[8px]">{p.client}</div>
                  <div className="text-[11px] text-[var(--text-4)]">
                    {p.zones.length} zone{p.zones.length !== 1 ? 's' : ''} · {allMats.length} material{allMats.length !== 1 ? 's' : ''} · ${cost.toLocaleString()} est.
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── Loaded state ─────────────────────────────────────────────────────────────
  const totalZoneItems = zoneManifests.reduce((s, z) => s + z.items.length, 0);
  const totalMissingMats = zoneManifests.reduce((s, z) => s + z.missing.length, 0);
  // Zones that have at least one unresolved material
  const zonesWithMissingMats = zoneManifests
    .filter(z => z.missing.length > 0)
    .map(z => z.zone.name);

  return (
    <div>
      {error && (
        <div className="mb-[16px]">
          <AlertBanner alert={{ level: 'red', title: 'Load error', msg: error }} />
        </div>
      )}
      {/* ── Top bar: selector + view toggle ──────────────────────────────── */}
      <div className="flex items-end gap-[16px] mb-[20px] flex-wrap">
        <div className="flex-1 min-w-[260px]">
          <label className="block text-[11px] font-[700] text-[var(--text-3)] uppercase tracking-[0.05em] mb-[6px]">
            Project
          </label>
          <select
            className="bg-[var(--surface2)] border border-[var(--border)] rounded-[8px] text-[var(--text)] px-[14px] py-[10px] text-[13px] outline-none focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)] focus:ring-opacity-30 cursor-pointer w-full"
            value={activeProjectId ?? ''}
            onChange={e => setActiveProject(e.target.value || null)}
          >
            <option value="">— Choose a project —</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name} · {p.client}</option>
            ))}
          </select>
        </div>

        {/* View toggle */}
        <div className="flex border border-[var(--border)] rounded-[8px] overflow-hidden flex-shrink-0">
          {(['zone', 'consolidated'] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-[14px] py-[9px] text-[12px] font-[600] border-none cursor-pointer transition-colors duration-150 ${
                view === v
                  ? 'bg-[var(--green)] text-white'
                  : 'bg-[var(--surface2)] text-[var(--text-3)] hover:text-[var(--text)]'
              }`}
            >
              {v === 'zone' ? 'By Zone' : 'Consolidated'}
            </button>
          ))}
        </div>

        <button
          onClick={handleExportManifest}
          disabled={exporting || !project || project.zones.length === 0}
          className="px-[14px] py-[9px] text-[12px] font-[600] bg-[var(--green)] text-white rounded-[8px] border-none cursor-pointer hover:bg-[var(--green-d)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150 flex-shrink-0"
        >
          {exporting ? 'Generating…' : '⬇ Export PDF'}
        </button>
      </div>

      {/* ── Project header ────────────────────────────────────────────────── */}
      <div className="bg-[var(--surface2)] border border-[var(--border)] rounded-[10px] p-[16px] mb-[20px]">
        <div className="flex items-start justify-between gap-[16px] flex-wrap">
          <div>
            <h2 className="font-serif text-[20px] text-[var(--text)] mb-[2px]">{project.name}</h2>
            <div className="text-[12px] text-[var(--text-3)]">{project.client} · {project.address}</div>
          </div>
          <div className="flex gap-[24px] text-[12px] flex-shrink-0">
            <div>
              <div className="text-[9px] font-[700] text-[var(--text-4)] uppercase tracking-[0.05em] mb-[2px]">Total Area</div>
              <div className="text-[var(--text)] font-[600]">{project.totalArea.toLocaleString()} sq ft</div>
            </div>
            <div>
              <div className="text-[9px] font-[700] text-[var(--text-4)] uppercase tracking-[0.05em] mb-[2px]">Zones</div>
              <div className="text-[var(--text)] font-[600]">{project.zones.length}</div>
            </div>
            <div>
              <div className="text-[9px] font-[700] text-[var(--text-4)] uppercase tracking-[0.05em] mb-[2px]">Line Items</div>
              <div className="text-[var(--text)] font-[600]">{totalZoneItems}</div>
            </div>
            <div>
              <div className="text-[9px] font-[700] text-[var(--text-4)] uppercase tracking-[0.05em] mb-[2px]">Budget</div>
              <div className="text-[var(--text)] font-[600]">${project.budget.toLocaleString()}</div>
            </div>
          </div>
        </div>

        {totalMissingMats > 0 && (
          <div className="mt-[12px] pt-[12px] border-t border-[var(--border)] text-[12px] text-[var(--amber-l)]">
            ⚠ {totalMissingMats} material{totalMissingMats !== 1 ? 's' : ''} referenced in zone{zonesWithMissingMats.length !== 1 ? 's' : ''}{' '}
            <span className="font-[600]">{zonesWithMissingMats.join(', ')}</span>{' '}
            not found in the material library — add them to Material Library to include in cost calculations.
          </div>
        )}
      </div>

      {/* ── No zones state ────────────────────────────────────────────────── */}
      {project.zones.length === 0 && (
        <div className="text-center py-[48px] px-[24px] bg-[var(--surface2)] border border-[var(--border)] rounded-[10px] text-[var(--text-3)]">
          <div className="text-[32px] mb-[10px] opacity-30">🗺</div>
          <div className="text-[14px] font-[600] text-[var(--text-2)] mb-[6px]">No zones defined</div>
          <div className="text-[13px]">Add zones to this project in the Projects page to generate a manifest.</div>
        </div>
      )}

      {/* ── By Zone view ──────────────────────────────────────────────────── */}
      {view === 'zone' && project.zones.length > 0 && (
        <div className="flex flex-col gap-[16px]">
          {zoneManifests.map(({ zone, items, missing, subtotal }) => (
            <div
              key={zone.id}
              className="border border-[var(--border)] rounded-[10px] overflow-hidden"
            >
              {/* Zone header */}
              <div className="bg-[var(--surface2)] px-[16px] py-[12px] flex items-center justify-between border-b border-[var(--border)]">
                <div className="flex items-center gap-[12px]">
                  <div
                    className="w-[8px] h-[8px] rounded-full flex-shrink-0"
                    style={{ background: 'var(--green-l)' }}
                  />
                  <div>
                    <div className="text-[13px] font-[700] text-[var(--text)]">
                      Zone {zone.sequence}: {zone.name}
                    </div>
                    <div className="text-[11px] text-[var(--text-3)] mt-[1px]">
                      {zone.area.toLocaleString()} sq ft · {zone.perimeter} lnft perimeter
                      {zone.notes && ` · ${zone.notes}`}
                    </div>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-[9px] font-[700] text-[var(--text-4)] uppercase tracking-[0.05em] mb-[2px]">
                    Zone Cost
                  </div>
                  <div className="font-serif text-[18px] text-[var(--green-l)]">
                    {subtotal > 0 ? `$${subtotal.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '—'}
                  </div>
                </div>
              </div>

              {/* Zone material table */}
              {items.length === 0 && missing.length === 0 ? (
                <div className="px-[16px] py-[20px] text-center text-[12px] text-[var(--text-3)]">
                  No materials assigned to this zone
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-[13px]">
                    <TableHead />
                    <tbody>
                      {items.map(item => (
                        <ManifestRow key={item.materialId} item={item} />
                      ))}
                      {missing.map(zm => (
                        <tr key={zm.materialId} className="border-b border-[var(--border)] bg-[rgba(217,119,6,.05)]">
                          <td className="px-[14px] py-[9px] text-[var(--amber-l)] italic text-[12px]">
                            {zm.name} <span className="text-[var(--text-4)]">(not in library)</span>
                          </td>
                          {Array.from({ length: 7 }).map((_, i) => (
                            <td key={i} className="px-[14px] py-[9px] text-center text-[var(--text-4)]">—</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-[rgba(45,106,79,.08)] border-t border-[var(--border)]">
                        <td
                          colSpan={7}
                          className="px-[14px] py-[9px] text-[11px] font-[700] text-[var(--text-2)] uppercase tracking-[0.05em]"
                        >
                          Zone {zone.sequence} Subtotal
                        </td>
                        <td className="px-[14px] py-[9px] text-right font-mono font-[700] text-[var(--green-l)]">
                          ${fmt(subtotal)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Consolidated view ─────────────────────────────────────────────── */}
      {view === 'consolidated' && project.zones.length > 0 && (
        <div className="border border-[var(--border)] rounded-[10px] overflow-hidden">
          <div className="bg-[var(--surface2)] px-[16px] py-[12px] border-b border-[var(--border)]">
            <div className="text-[12px] font-[700] text-[var(--text)]">All Materials — Aggregated</div>
            <div className="text-[11px] text-[var(--text-3)] mt-[1px]">
              Combined quantities across all zones, ready for supplier ordering
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13px]">
              <TableHead showZone />
              <tbody>
                {consolidatedManifest.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-[14px] py-[24px] text-center text-[var(--text-3)]">
                      No materials to display — add materials to zones in the Projects page
                    </td>
                  </tr>
                ) : (
                  consolidatedManifest.map(item => (
                    <ManifestRow key={item.materialId} item={item} showZone />
                  ))
                )}
              </tbody>
              <tfoot>
                <tr className="bg-[rgba(45,106,79,.12)] border-t-[2px] border-[var(--green)]">
                  <td
                    colSpan={7}
                    className="px-[14px] py-[10px] text-[11px] font-[700] text-[var(--text)] uppercase tracking-[0.05em]"
                  >
                    Total Project Cost
                  </td>
                  <td className="px-[14px] py-[10px] text-right font-mono font-[700] text-[var(--green-l)]">
                    {totalCostFormatted}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ── Cost rollup card ──────────────────────────────────────────────── */}
      {project.zones.length > 0 && (
        <div className="mt-[20px] grid grid-cols-[1fr_1fr_1fr_auto] gap-[12px] bg-[var(--surface2)] border border-[var(--border)] rounded-[10px] p-[20px] items-center">
          <div>
            <div className="text-[9px] font-[700] text-[var(--text-4)] uppercase tracking-[0.06em] mb-[4px]">
              Estimated Material Cost
            </div>
            <div className="font-serif text-[28px] text-[var(--green-l)] leading-[1]">
              {totalCostFormatted}
            </div>
          </div>
          <div>
            <div className="text-[9px] font-[700] text-[var(--text-4)] uppercase tracking-[0.06em] mb-[4px]">
              Project Budget
            </div>
            <div className="font-serif text-[28px] text-[var(--text)] leading-[1]">
              ${project.budget.toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-[9px] font-[700] text-[var(--text-4)] uppercase tracking-[0.06em] mb-[4px]">
              {budgetOver ? 'Over Budget' : 'Under Budget'}
            </div>
            <div className={`font-serif text-[28px] leading-[1] ${budgetOver ? 'text-[var(--red-l)]' : 'text-[var(--text-2)]'}`}>
              {totalCostRaw > 0
                ? `${budgetOver ? '+' : '-'}$${Math.abs(budgetDelta).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
                : '—'}
            </div>
          </div>
          <div className="text-[11px] text-[var(--text-3)] text-right leading-relaxed max-w-[200px]">
            Includes reserve %<br />
            for all materials.<br />
            Labor not included.
          </div>
        </div>
      )}
    </div>
  );
};

export default ManifestEngine;
