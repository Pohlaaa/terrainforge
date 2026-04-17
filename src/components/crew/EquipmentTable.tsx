import React from 'react';
import { Badge } from '@/components/shared/Badge';
import { EQUIPMENT_TYPES } from '@/types';
import type { Equipment } from '@/types';

interface EquipmentTableProps {
  equipment: Equipment[];
  readOnly: boolean;
  onAddEquipment: () => void;
  onEditEquipment?: (id: string) => void;
  projects?: { id: string; name: string }[];
}

const STATUS_BADGE: Record<string, 'green' | 'amber' | 'blue' | 'red'> = {
  'available': 'green', 'in-use': 'blue', 'maintenance': 'amber', 'out-of-service': 'red',
};

export const EquipmentTable: React.FC<EquipmentTableProps> = ({ equipment, readOnly, onAddEquipment, onEditEquipment, projects = [] }) => (
  <div
    className="rounded-xl"
    style={{ background: 'var(--surface-card)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-card)' }}
  >
    <div className="flex items-center justify-between p-3">
      <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Equipment</h2>
      {!readOnly && (
        <button
          onClick={onAddEquipment}
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md cursor-pointer border-none transition-colors"
          style={{ background: 'var(--brand-primary)', color: 'var(--text-on-primary)' }}
        >
          + Add Equipment
        </button>
      )}
    </div>
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)] border-b border-[var(--border-default)]">Name</th>
            <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)] border-b border-[var(--border-default)]">Type</th>
            <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)] border-b border-[var(--border-default)]">Status</th>
            <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)] border-b border-[var(--border-default)] hidden md:table-cell">Hourly Cost</th>
            <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)] border-b border-[var(--border-default)] hidden lg:table-cell">Next Maintenance</th>
            <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)] border-b border-[var(--border-default)] hidden lg:table-cell">Assigned</th>
          </tr>
        </thead>
        <tbody>
          {equipment.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-3 py-8 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>
                No equipment yet. Add your first piece of equipment.
              </td>
            </tr>
          ) : (
            equipment.map(equip => {
              const typeLabel = EQUIPMENT_TYPES.find(t => t.value === equip.equipmentType)?.label || equip.type || '—';
              return (
                <tr
                  key={equip.id}
                  className="border-t transition-colors cursor-pointer"
                  style={{ borderColor: 'var(--border-default)' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-hover)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  onClick={() => onEditEquipment?.(equip.id)}
                >
                  <td className="px-3 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>{equip.name}</td>
                  <td className="px-3 py-3" style={{ color: 'var(--text-secondary)' }}>{typeLabel}</td>
                  <td className="px-3 py-3"><Badge variant={STATUS_BADGE[equip.status] || 'blue'}>{equip.status}</Badge></td>
                  <td className="px-3 py-3 hidden md:table-cell" style={{ color: 'var(--text-secondary)' }}>
                    {equip.hourlyCost ? `$${equip.hourlyCost}/hr` : '—'}
                  </td>
                  <td className="px-3 py-3 hidden lg:table-cell" style={{ color: 'var(--text-secondary)' }}>
                    {equip.nextService ? new Date(equip.nextService).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-3 py-3 hidden lg:table-cell" style={{ color: 'var(--text-secondary)' }}>
                    {equip.assignedProject ? (projects.find(p => p.id === equip.assignedProject)?.name || '—') : '—'}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  </div>
);
