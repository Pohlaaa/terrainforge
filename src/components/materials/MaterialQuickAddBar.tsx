import React from 'react';
import { Button } from '@/components/ui/Button';

interface CategoryOption {
  value: string;
  label: string;
}

interface UnitOption {
  value: string;
  label: string;
}

interface MaterialQuickAddBarProps {
  quickName: string;
  setQuickName: (v: string) => void;
  quickCategory: string;
  setQuickCategory: (v: string) => void;
  quickUnit: string;
  setQuickUnit: (v: string) => void;
  quickCost: string;
  setQuickCost: (v: string) => void;
  quickQty: string;
  setQuickQty: (v: string) => void;
  handleQuickAdd: () => void;
  onOpenImport: () => void;
  readOnly: boolean;
  categoryOptions: CategoryOption[];
  unitOptions: UnitOption[];
}

export const MaterialQuickAddBar: React.FC<MaterialQuickAddBarProps> = ({
  quickName, setQuickName,
  quickCategory, setQuickCategory,
  quickUnit, setQuickUnit,
  quickCost, setQuickCost,
  quickQty, setQuickQty,
  handleQuickAdd, onOpenImport,
  readOnly,
  categoryOptions, unitOptions,
}) => {
  return (
    <div className="px-4 py-3 border-b border-[var(--border-default)] bg-[var(--surface-bg)]">
      <div className="flex flex-wrap gap-2 items-end">
        <input
          type="text"
          placeholder="Material name"
          value={quickName}
          onChange={e => setQuickName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleQuickAdd(); }}
          className="flex-1 min-w-[180px] h-[40px] px-3 rounded-lg border border-[var(--border-default)] bg-[var(--surface-card)] text-[13px] text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
        />
        <select
          value={quickCategory}
          onChange={e => setQuickCategory(e.target.value)}
          className="w-[130px] h-[40px] px-2 rounded-lg border border-[var(--border-default)] bg-[var(--surface-card)] text-[13px] text-[var(--text-primary)] outline-none"
        >
          {categoryOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select
          value={quickUnit}
          onChange={e => setQuickUnit(e.target.value)}
          className="w-[90px] h-[40px] px-2 rounded-lg border border-[var(--border-default)] bg-[var(--surface-card)] text-[13px] text-[var(--text-primary)] outline-none"
        >
          {unitOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <div className="relative">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[12px] text-[var(--text-tertiary)]">$</span>
          <input
            type="number"
            placeholder="Cost"
            value={quickCost}
            onChange={e => setQuickCost(e.target.value)}
            className="w-[90px] h-[40px] pl-6 pr-2 rounded-lg border border-[var(--border-default)] bg-[var(--surface-card)] text-[13px] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-[var(--brand-primary)]"
          />
        </div>
        <input
          type="number"
          placeholder="Qty"
          value={quickQty}
          onChange={e => setQuickQty(e.target.value)}
          className="w-[80px] h-[40px] px-3 rounded-lg border border-[var(--border-default)] bg-[var(--surface-card)] text-[13px] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-[var(--brand-primary)]"
        />
        <Button variant="primary" className="h-[40px]" onClick={handleQuickAdd} disabled={!quickName.trim() || readOnly}>
          {readOnly ? 'Subscribe to edit' : 'Add'}
        </Button>
        <Button variant="secondary" size="sm" className="h-[40px]" onClick={onOpenImport}>
          ↑ CSV
        </Button>
      </div>
    </div>
  );
};
