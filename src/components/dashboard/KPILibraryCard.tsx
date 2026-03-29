import React from 'react';
import type { KPIDefinition } from '@/types';

interface KPILibraryCardProps {
  kpi: KPIDefinition;
  selected: boolean;
  disabled: boolean;
  onToggle: () => void;
}

export const KPILibraryCard: React.FC<KPILibraryCardProps> = ({
  kpi,
  selected,
  disabled,
  onToggle,
}) => {
  return (
    <button
      onClick={disabled ? undefined : onToggle}
      style={{
        borderRadius: '8px',
        padding: '12px',
        minHeight: '44px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        background: selected ? 'var(--surface-selected)' : 'var(--surface-bg)',
        border: selected
          ? '1px solid var(--color-primary)'
          : '1px solid var(--border-default)',
        position: 'relative',
        textAlign: 'left',
        width: '100%',
        transition: 'background 0.15s ease, border-color 0.15s ease',
      }}
      className={!disabled && !selected ? 'hover:bg-[var(--surface-hover)]' : ''}
      aria-pressed={selected}
      aria-disabled={disabled}
    >
      {selected && (
        <span
          style={{
            position: 'absolute',
            top: '6px',
            right: '6px',
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: 'var(--color-primary)',
          }}
        />
      )}
      <div style={{ fontSize: '16px', marginBottom: '4px' }}>{kpi.icon}</div>
      <div
        style={{
          fontSize: '12px',
          fontWeight: 600,
          color: 'var(--text-primary)',
          lineHeight: 1.2,
        }}
      >
        {kpi.label}
      </div>
      <div
        style={{
          fontSize: '10px',
          color: 'var(--text-tertiary)',
          fontStyle: 'italic',
          marginTop: '2px',
        }}
      >
        {kpi.category}
      </div>
    </button>
  );
};

export default KPILibraryCard;
