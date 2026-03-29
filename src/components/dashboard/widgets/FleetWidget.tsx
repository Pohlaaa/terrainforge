import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { AppState } from '@/types';

interface FleetWidgetProps {
  appState: AppState;
}

export const FleetWidget: React.FC<FleetWidgetProps> = ({ appState }) => {
  const { equipment } = appState;
  const navigate = useNavigate();

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
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          padding: '6px 14px 0',
        }}
      >
        <button
          onClick={() => navigate('/equipment')}
          style={{
            background: 'transparent',
            border: 'none',
            fontSize: '13px',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            padding: 0,
            transition: 'color 0.15s ease',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--brand-primary)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'; }}
        >
          View All →
        </button>
      </div>
      <div className="px-[14px] py-[12px]">
        <div className="grid grid-cols-3 gap-[8px] text-center text-[11px] mb-[10px]">
          <div>
            <div className="font-[700] text-[18px]" style={{ color: 'var(--color-primary)' }}>
              {statByStatus.available}
            </div>
            <div className="text-[var(--text-tertiary)] text-[9px] uppercase font-[700]">Available</div>
          </div>
          <div>
            <div className="text-[#60A5FA] font-[700] text-[18px]">{statByStatus.inUse}</div>
            <div className="text-[var(--text-tertiary)] text-[9px] uppercase font-[700]">In Use</div>
          </div>
          <div>
            <div className="text-[#FCD34D] font-[700] text-[18px]">{statByStatus.maintenance}</div>
            <div className="text-[var(--text-tertiary)] text-[9px] uppercase font-[700]">Service</div>
          </div>
        </div>
      </div>
      <div className="px-[14px] pb-[10px] max-h-[100px] overflow-y-auto">
        {equipmentRows.length === 0 ? (
          <div className="text-[12px] text-[var(--text-tertiary)]">No equipment</div>
        ) : (
          <div className="space-y-[2px]">
            {equipmentRows.map((equip) => (
              <div
                key={equip.id}
                onClick={() => navigate('/equipment')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '11px',
                  padding: '5px 8px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'background 0.12s ease',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'var(--surface-hover)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
              >
                <span style={{ color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                  {equip.name}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span
                    className={`text-[10px] px-[6px] py-[1px] rounded-[3px] font-[600] ${
                      equip.status === 'available'
                        ? 'text-white'
                        : equip.status === 'in-use'
                        ? 'bg-[#60A5FA] text-white'
                        : 'bg-[#FCD34D] text-[#1a1a1a]'
                    }`}
                    style={equip.status === 'available' ? { background: 'var(--color-primary)' } : undefined}
                  >
                    {equip.status.charAt(0).toUpperCase() + equip.status.slice(1)}
                  </span>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ color: 'var(--text-tertiary)', flexShrink: 0 }}>
                    <path d="M4 2.5l3.5 3.5L4 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FleetWidget;
