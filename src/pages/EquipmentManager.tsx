import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/shared/Badge';
import { Modal } from '@/components/shared/Modal';
import type { Equipment, MaintenanceEntry } from '@/types';

interface EquipmentManagerProps {
  equipment?: Equipment[];
  onAddEquipment?: () => void;
  onEditEquipment?: (equipmentId: string) => void;
  onDeleteEquipment?: (equipmentId: string) => void;
  onViewMaintenance?: (equipmentId: string) => void;
  onRecommend?: () => void;
}

export const EquipmentManager: React.FC<EquipmentManagerProps> = ({
  equipment = [],
  onAddEquipment,
  onEditEquipment,
  onDeleteEquipment,
  onViewMaintenance,
  onRecommend,
}) => {
  // TODO: Connect to useEquipmentStore()
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [selectedMaintenance, setSelectedMaintenance] = useState<Equipment | null>(null);

  const statuses = ['available', 'in-use', 'maintenance', 'out-of-service'] as const;
  const types = Array.from(new Set(equipment.map((e) => e.type)));

  const filteredEquipment = equipment.filter((e) => {
    const matchesStatus = !statusFilter || e.status === statusFilter;
    const matchesType = !typeFilter || e.type === typeFilter;
    return matchesStatus && matchesType;
  });

  const statusColors: Record<'available' | 'in-use' | 'maintenance' | 'out-of-service', 'green' | 'blue' | 'amber' | 'red'> = {
    available: 'green',
    'in-use': 'blue',
    maintenance: 'amber',
    'out-of-service': 'red',
  };

  const stats = {
    available: equipment.filter((e) => e.status === 'available').length,
    inUse: equipment.filter((e) => e.status === 'in-use').length,
    maintenance: equipment.filter((e) => e.status === 'maintenance').length,
    outOfService: equipment.filter((e) => e.status === 'out-of-service').length,
  };

  return (
    <div>
      {/* Callout banner */}
      <div className="border border-[#FB923C] bg-gradient-to-br from-[rgba(251,146,60,.1)] to-[rgba(10,15,10,.9)] rounded-[10px] px-[20px] py-[16px] mb-[16px]">
        <div className="text-[9px] font-[700] uppercase tracking-[0.12em] text-[#FB923C] mb-[6px]">
          Equipment Manager
        </div>
        <div className="text-[13px] text-[var(--text-2)] leading-[1.7]">
          Track every piece of equipment — status, assignments, maintenance history,
          and certifications. When you start a project the AI will recommend which
          machines to deploy based on zone types and availability.
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-[12px] mb-[16px]">
        {[
          { label: 'Available', value: stats.available, color: 'green' },
          { label: 'In Use', value: stats.inUse, color: 'blue' },
          { label: 'Maintenance', value: stats.maintenance, color: 'amber' },
          { label: 'Out of Service', value: stats.outOfService, color: 'red' },
        ].map((stat, idx) => (
          <div key={idx} className="bg-[var(--surface2)] border border-[var(--border)] rounded-[10px] p-[12px]">
            <div className="text-[10px] font-[700] text-[var(--text-4)] uppercase tracking-[0.06em] mb-[6px]">
              {stat.label}
            </div>
            <div className="font-serif text-[24px] text-[var(--text)]">
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Filter and action buttons */}
      <div className="flex gap-[8px] mb-[16px] items-center flex-wrap">
        <Button variant="primary" onClick={onAddEquipment}>
          + Add Equipment
        </Button>
        <Button variant="outline" onClick={onRecommend}>
          ⚡ Recommend for Active Project
        </Button>
        <div className="ml-auto flex gap-[8px] items-center">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-[10px] py-[6px] text-[12px] bg-[var(--surface2)] border border-[var(--border)] rounded-[6px] text-[var(--text)] cursor-pointer outline-none focus:border-[var(--green-l)]"
          >
            <option value="">All Status</option>
            {statuses.map((status) => (
              <option key={status} value={status}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </option>
            ))}
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-[10px] py-[6px] text-[12px] bg-[var(--surface2)] border border-[var(--border)] rounded-[6px] text-[var(--text)] cursor-pointer outline-none focus:border-[var(--green-l)]"
          >
            <option value="">All Types</option>
            {types.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Equipment grid */}
      {filteredEquipment.length === 0 ? (
        <div className="text-center py-[48px] px-[24px] text-[var(--text-3)]">
          <div className="text-[36px] mb-[12px] opacity-40">🚜</div>
          <div className="text-[16px] font-[600] text-[var(--text-2)] mb-[6px]">
            No equipment found
          </div>
          <div className="text-[13px]">
            {equipment.length === 0
              ? 'Add equipment to get started'
              : 'Adjust filters to find equipment'}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-[16px]">
          {filteredEquipment.map((equip) => (
            <div
              key={equip.id}
              className="bg-[var(--surface2)] border border-[var(--border)] rounded-[10px] overflow-hidden"
            >
              {/* Card header */}
              <div className="px-[16px] py-[14px] border-b border-[var(--border)]">
                <div className="flex items-start justify-between gap-[8px]">
                  <div className="flex-1">
                    <h3 className="text-[15px] font-[700] text-[var(--text)]">
                      {equip.name}
                    </h3>
                    <p className="text-[11px] text-[var(--text-3)] mt-[2px]">
                      {equip.type}
                    </p>
                  </div>
                  <Badge variant={statusColors[equip.status]}>
                    {equip.status}
                  </Badge>
                </div>
              </div>

              {/* Card body */}
              <div className="px-[16px] py-[14px]">
                {/* Model and serial */}
                {(equip.makeModel || equip.serial) && (
                  <div className="mb-[12px] text-[11px]">
                    {equip.makeModel && (
                      <div className="text-[var(--text-2)]">
                        <span className="text-[var(--text-4)] font-[700]">Model: </span>
                        {equip.makeModel}
                      </div>
                    )}
                    {equip.serial && (
                      <div className="text-[var(--text-2)]">
                        <span className="text-[var(--text-4)] font-[700]">Serial: </span>
                        <span className="font-mono">{equip.serial}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Service and inspection dates */}
                {(equip.lastService || equip.nextService) && (
                  <div className="mb-[12px] text-[11px]">
                    {equip.lastService && (
                      <div className="text-[var(--text-2)]">
                        <span className="text-[var(--text-4)] font-[700]">Last Service: </span>
                        {new Date(equip.lastService).toLocaleDateString()}
                      </div>
                    )}
                    {equip.nextService && (
                      <div className="text-[var(--text-2)]">
                        <span className="text-[var(--text-4)] font-[700]">
                          Next Service:{' '}
                        </span>
                        {new Date(equip.nextService).toLocaleDateString()}
                      </div>
                    )}
                    {equip.inspectionDue && (
                      <div className="text-[var(--amber-l)]">
                        <span className="text-[var(--text-4)] font-[700]">
                          Inspection Due:{' '}
                        </span>
                        {new Date(equip.inspectionDue).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                )}

                {/* Assignment */}
                {equip.assignedProject && (
                  <div className="mb-[12px] bg-[var(--surface3)] px-[8px] py-[6px] rounded-[6px] text-[11px]">
                    <span className="text-[var(--text-4)] font-[700]">Assigned to: </span>
                    <span className="text-[var(--text-2)]">{equip.assignedProject}</span>
                  </div>
                )}

                {/* Maintenance log count */}
                {equip.maintenanceLog && equip.maintenanceLog.length > 0 && (
                  <div className="text-[11px] text-[var(--text-3)] mb-[12px]">
                    {equip.maintenanceLog.length} maintenance record(s)
                  </div>
                )}

                {/* Divider */}
                <div className="h-px bg-[var(--border)] my-[12px]"></div>

                {/* Actions */}
                <div className="flex gap-[6px] text-[11px]">
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => onEditEquipment?.(equip.id)}
                    className="flex-1"
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => setSelectedMaintenance(equip)}
                    className="flex-1"
                  >
                    Maintenance
                  </Button>
                  <Button
                    variant="danger"
                    size="xs"
                    onClick={() => onDeleteEquipment?.(equip.id)}
                    className="flex-1"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Maintenance Log Modal */}
      <Modal
        isOpen={!!selectedMaintenance}
        title={`Maintenance Log — ${selectedMaintenance?.name}`}
        onClose={() => setSelectedMaintenance(null)}
      >
        <div>
          {selectedMaintenance?.maintenanceLog &&
          selectedMaintenance.maintenanceLog.length > 0 ? (
            <div className="space-y-[12px]">
              {selectedMaintenance.maintenanceLog.map((record: MaintenanceEntry) => (
                <div
                  key={record.id}
                  className="border-l-[3px] border-[var(--green-l)] px-[12px] py-[8px]"
                >
                  <div className="flex items-center justify-between mb-[4px]">
                    <div className="text-[12px] font-[700] text-[var(--text)]">
                      {new Date(record.date).toLocaleDateString()}
                    </div>
                    <div className="text-[12px] text-[var(--green-l)] font-mono">
                      ${record.cost.toFixed(2)}
                    </div>
                  </div>
                  <p className="text-[12px] text-[var(--text-2)] mb-[4px]">
                    {record.type}
                  </p>
                  <p className="text-[11px] text-[var(--text-4)]">
                    By: {record.by}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-[12px] text-[var(--text-3)]">
              No maintenance records yet
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default EquipmentManager;
