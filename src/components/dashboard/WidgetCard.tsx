import React, { useEffect, useState } from 'react';
import type { WidgetConfig } from '@/types';

interface WidgetCardProps {
  config: WidgetConfig;
  editMode: boolean;
  onToggleCollapse: () => void;
  onToggleVisibility: () => void;
  dragHandleProps: Record<string, unknown>;
  isDragging: boolean;
  style?: React.CSSProperties;
  children: React.ReactNode;
}

export const WidgetCard: React.FC<WidgetCardProps> = ({
  config,
  editMode,
  onToggleCollapse,
  onToggleVisibility,
  dragHandleProps,
  isDragging,
  style,
  children,
}) => {
  const [born, setBorn] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setBorn(false), 400);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className={`${born ? 'animate-card-birth' : ''}`}
      style={{
        background: 'var(--surface-card)',
        border: editMode
          ? '2px dashed var(--color-primary)'
          : '1px solid var(--border-default)',
        borderRadius: '10px',
        overflow: 'hidden',
        boxShadow: isDragging
          ? '0 12px 32px rgba(0,0,0,0.12), 0 4px 8px rgba(0,0,0,0.08)'
          : undefined,
        transform: isDragging ? 'scale(1.02)' : undefined,
        transition: isDragging ? 'box-shadow 0.2s ease' : undefined,
        zIndex: isDragging ? 100 : undefined,
        position: 'relative',
        ...style,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--border-default)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        {/* Drag handle */}
        <div
          {...dragHandleProps}
          style={{
            display: editMode ? 'flex' : 'none',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'grab',
            color: 'var(--text-tertiary)',
            fontSize: '14px',
            minWidth: '32px',
            minHeight: '44px',
            touchAction: 'none',
            userSelect: 'none',
          }}
          aria-label="Drag to reorder"
        >
          ⠿
        </div>

        {/* Title */}
        <div
          style={{
            flex: 1,
            fontSize: '12px',
            fontWeight: 700,
            color: 'var(--text-primary)',
          }}
        >
          {config.title}
        </div>

        {/* Collapse button */}
        <button
          onClick={onToggleCollapse}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-tertiary)',
            minWidth: '44px',
            minHeight: '44px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '4px',
            fontSize: '12px',
            transform: config.collapsed ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
          }}
          aria-label={config.collapsed ? 'Expand' : 'Collapse'}
        >
          ▾
        </button>

        {/* Remove button (edit mode only) */}
        {editMode && (
          <button
            onClick={onToggleVisibility}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-tertiary)',
              minWidth: '44px',
              minHeight: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '4px',
              fontSize: '14px',
            }}
            className="hover:text-[var(--status-error)]"
            aria-label="Remove widget"
          >
            ×
          </button>
        )}
      </div>

      {/* Content */}
      <div
        style={{
          maxHeight: config.collapsed ? 0 : '800px',
          overflow: 'hidden',
          transition: 'max-height 0.2s ease',
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default WidgetCard;
