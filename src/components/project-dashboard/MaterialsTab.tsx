import React, { useMemo } from 'react';
import type { ZoneMaterialDetail } from '@/types';

interface Props {
  materials: ZoneMaterialDetail[];
  loading: boolean;
}

function fmt(n: number): string {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtShort(n: number): string {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

const CATEGORY_LABELS: Record<string, string> = {
  paver: 'Paver', stone: 'Stone', tile: 'Tile', brick: 'Brick', concrete: 'Concrete',
  sod: 'Sod', seed: 'Seed', mulch: 'Mulch', gravel: 'Gravel', sand: 'Sand',
  soil: 'Soil', edging: 'Edging', plant: 'Plant', shrub: 'Shrub', tree: 'Tree',
  lighting: 'Lighting', irrigation: 'Irrigation', lumber: 'Lumber', misc: 'Misc',
};

export const ProjectDashboardMaterials: React.FC<Props> = ({ materials, loading }) => {
  // Group by zone
  const zoneGroups = useMemo(() => {
    const groups: { zoneId: string; zoneName: string; items: ZoneMaterialDetail[] }[] = [];
    const zoneMap = new Map<string, ZoneMaterialDetail[]>();

    for (const m of materials) {
      if (!zoneMap.has(m.zoneId)) zoneMap.set(m.zoneId, []);
      zoneMap.get(m.zoneId)!.push(m);
    }

    for (const [zoneId, items] of zoneMap) {
      groups.push({ zoneId, zoneName: items[0].zoneName, items });
    }

    return groups;
  }, [materials]);

  const totalCost = useMemo(
    () => materials.reduce((sum, m) => sum + m.quantity * m.unitCost, 0),
    [materials]
  );

  const totalItems = materials.length;
  const uniqueCategories = useMemo(
    () => new Set(materials.map((m) => m.category)).size,
    [materials]
  );

  if (loading) {
    return (
      <div className="text-center py-[40px] text-[13px] text-[var(--text-3)]">
        Loading materials...
      </div>
    );
  }

  if (materials.length === 0) {
    return (
      <div
        className="rounded-[10px] border-2 border-dashed p-[40px] text-center"
        style={{ borderColor: 'var(--border)', color: 'var(--text-4)' }}
      >
        <p className="text-[14px] mb-[4px]">No materials assigned yet</p>
        <p className="text-[12px]">
          Add zones and materials to track costs here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-[16px]">
      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-[10px]">
        <div
          className="rounded-[8px] border p-[14px]"
          style={{ backgroundColor: 'var(--surface2)', borderColor: 'var(--border)' }}
        >
          <div className="text-[10px] font-[600] uppercase text-[var(--text-4)] mb-[4px]">Total Material Cost</div>
          <div className="text-[20px] font-[700] text-[var(--text)]">{fmtShort(totalCost)}</div>
        </div>
        <div
          className="rounded-[8px] border p-[14px]"
          style={{ backgroundColor: 'var(--surface2)', borderColor: 'var(--border)' }}
        >
          <div className="text-[10px] font-[600] uppercase text-[var(--text-4)] mb-[4px]">Materials</div>
          <div className="text-[20px] font-[700] text-[var(--text)]">{totalItems}</div>
          <div className="text-[11px] text-[var(--text-4)]">across {zoneGroups.length} zone{zoneGroups.length !== 1 ? 's' : ''}</div>
        </div>
        <div
          className="rounded-[8px] border p-[14px]"
          style={{ backgroundColor: 'var(--surface2)', borderColor: 'var(--border)' }}
        >
          <div className="text-[10px] font-[600] uppercase text-[var(--text-4)] mb-[4px]">Categories</div>
          <div className="text-[20px] font-[700] text-[var(--text)]">{uniqueCategories}</div>
        </div>
      </div>

      {/* Zone-grouped material list */}
      {zoneGroups.map((group) => {
        const zoneTotal = group.items.reduce((sum, m) => sum + m.quantity * m.unitCost, 0);
        return (
          <div
            key={group.zoneId}
            className="rounded-[10px] border"
            style={{ backgroundColor: 'var(--surface2)', borderColor: 'var(--border)' }}
          >
            {/* Zone header */}
            <div
              className="flex items-center justify-between px-[16px] py-[12px] border-b"
              style={{ borderColor: 'var(--border)' }}
            >
              <h3 className="text-[14px] font-[600] text-[var(--text)]">{group.zoneName}</h3>
              <span className="text-[13px] font-[600] text-[var(--text)]">{fmt(zoneTotal)}</span>
            </div>

            {/* Material rows */}
            <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {group.items.map((item) => {
                const subtotal = item.quantity * item.unitCost;
                return (
                  <div
                    key={`${item.zoneId}-${item.materialId}`}
                    className="flex items-center gap-[10px] px-[16px] py-[10px]"
                  >
                    {/* Category tag */}
                    <span
                      className="px-[6px] py-[2px] rounded-[4px] text-[10px] font-[500] shrink-0"
                      style={{ backgroundColor: 'rgba(45,106,79,0.1)', color: 'var(--green-l)' }}
                    >
                      {CATEGORY_LABELS[item.category] || item.category}
                    </span>

                    {/* Name */}
                    <span className="flex-1 text-[13px] text-[var(--text)] min-w-0 truncate">
                      {item.materialName}
                    </span>

                    {/* Quantity × Unit */}
                    <span className="text-[12px] text-[var(--text-3)] shrink-0">
                      {item.quantity} {item.unit}
                    </span>

                    {/* Unit cost */}
                    <span className="text-[12px] text-[var(--text-4)] shrink-0 w-[70px] text-right">
                      @ {fmt(item.unitCost)}
                    </span>

                    {/* Subtotal */}
                    <span className="text-[13px] font-[600] text-[var(--text)] shrink-0 w-[80px] text-right">
                      {fmt(subtotal)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};
