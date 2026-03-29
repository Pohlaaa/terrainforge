import React from 'react';
import type { AppState } from '@/types';

interface FleetWidgetProps {
  appState: AppState;
}

export const FleetWidget: React.FC<FleetWidgetProps> = ({ appState }) => {
  const { equipment } = appState;

  const statByStatus = {
    available: equipment.filter((e) => e.status === 'available').length,
    inUse: equipment.filter((e) => e.status === 'in-use').length,
    maintenance: equipment.filter((e) => e.status === 'maintenance').length,
  };

  const equipmentRows = equipment.slice(0, 5).map((e) => ({
    id: e.id,
    name: e.name,
    status: e.status,
  }));

  return (
    <div>
      <div className="px-[14px] py-[12px]">
        <div className="grid grid-cols-3 gap-[8px] text-center text-[11px] mb-[10px]">
          <div>
            <div
              className="font-[700] text-[18px]"
              style={{ color: 'var(--color-primary)' }}
            >
              {statByStatus.available}
            </div>
            <div className="text-[var(--text-tertiary)] text-[9px] uppercase font-[700]">
              Available
            </div>
          </div>
          <div>
            <div className="text-[#60A5FA] font-[700] text-[18px]">{statByStatus.inUse}</div>
            <div className="text-[var(--text-tertiary)] text-[9px] uppercase font-[700]">
              In Use
            </div>
          </div>
          <div>
            <div className="text-[#FCD34D] font-[700] text-[18px]">
              {statByStatus.maintenance}
            </div>
            <div className="text-[var(--text-tertiary)] text-[9px] uppercase font-[700]">
              Service
            </div>
          </div>
        </div>
      </div>
      <div className="px-[14px] pb-[10px] max-h-[100px] overflow-y-auto">
        {equipmentRows.length === 0 ? (
          <div className="text-[12px] text-[var(--text-tertiary)]">No equipment</div>
        ) : (
          <div className="space-y-[4px]">
            {equipmentRows.map((equip) => (
              <div key={equip.id} className="flex items-center justify-between text-[11px]">
                <span className="text-[var(--text-secondary)] truncate">{equip.name}</span>
                <span
                  className={`text-[10px] px-[6px] py-[1px] rounded-[3px] font-[600] ${
                    equip.status === 'available'
                      ? 'text-white'
                      : equip.status === 'in-use'
                      ? 'bg-[#60A5FA] text-white'
                      : 'bg-[#FCD34D] text-[#1a1a1a]'
                  }`}
                  style={
                    equip.status === 'available'
                      ? { background: 'var(--color-primary)' }
                      : undefined
                  }
                >
                  {equip.status.charAt(0).toUpperCase() + equip.status.slice(1)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FleetWidget;
