import React, { useEffect, useState } from 'react';
import { KPI_LIBRARY } from '@/lib/kpiDefinitions';
import { KPILibraryCard } from './KPILibraryCard';

interface KPIDrawerProps {
  open: boolean;
  onClose: () => void;
  selectedKpis: string[];
  onSelectionChange: (ids: string[]) => void;
}

const MAX_KPIS = 6;

const CATEGORIES = ['projects', 'financial', 'crew', 'equipment', 'materials'] as const;

export const KPIDrawer: React.FC<KPIDrawerProps> = ({
  open,
  onClose,
  selectedKpis,
  onSelectionChange,
}) => {
  const [mounted, setMounted] = useState(false);
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => setMounted(true));
    } else {
      setMounted(false);
    }
  }, [open]);

  if (!open) return null;

  const handleToggle = (id: string) => {
    if (selectedKpis.includes(id)) {
      onSelectionChange(selectedKpis.filter((k) => k !== id));
    } else if (selectedKpis.length < MAX_KPIS) {
      onSelectionChange([...selectedKpis, id]);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50 }}>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.4)',
          opacity: mounted ? 1 : 0,
          transition: prefersReducedMotion ? 'none' : 'opacity 0.2s ease',
        }}
      />

      {/* Drawer panel */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '380px',
          maxWidth: '90vw',
          background: 'var(--surface-card)',
          borderLeft: '1px solid var(--border-default)',
          display: 'flex',
          flexDirection: 'column',
          transform: mounted ? 'translateX(0)' : 'translateX(100%)',
          transition: prefersReducedMotion
            ? 'none'
            : 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          zIndex: 51,
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 20px 12px',
            borderBottom: '1px solid var(--border-default)',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '4px',
            }}
          >
            <div
              style={{
                fontSize: '16px',
                fontWeight: 700,
                color: 'var(--text-primary)',
              }}
            >
              Customize KPIs
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '18px',
                color: 'var(--text-tertiary)',
                minWidth: '44px',
                minHeight: '44px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '6px',
              }}
              aria-label="Close drawer"
            >
              ×
            </button>
          </div>
          <div
            style={{
              fontSize: '13px',
              color: 'var(--text-secondary)',
            }}
          >
            Choose up to {MAX_KPIS} metrics ({selectedKpis.length}/{MAX_KPIS} selected)
          </div>
        </div>

        {/* KPI Library */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 20px' }}>
          {CATEGORIES.map((category) => {
            const kpisInCategory = KPI_LIBRARY.filter((k) => k.category === category);
            if (kpisInCategory.length === 0) return null;
            return (
              <div key={category} style={{ marginBottom: '20px' }}>
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: 'var(--text-tertiary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    marginBottom: '8px',
                  }}
                >
                  {category}
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '8px',
                  }}
                >
                  {kpisInCategory.map((kpi) => {
                    const selected = selectedKpis.includes(kpi.id);
                    const disabled = !selected && selectedKpis.length >= MAX_KPIS;
                    return (
                      <KPILibraryCard
                        key={kpi.id}
                        kpi={kpi}
                        selected={selected}
                        disabled={disabled}
                        onToggle={() => handleToggle(kpi.id)}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default KPIDrawer;
