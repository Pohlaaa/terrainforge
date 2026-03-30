import React, { useState, useMemo, useEffect } from 'react';
import { useMaterialStore } from '@/stores/materialStore';
import { Skeleton } from '@/components/shared/Skeleton';
import { toast } from '@/hooks/useToast';
import { RESERVE, CAT_LABELS, MATERIAL_CATEGORIES, UNIT_TYPES } from '@/lib/constants';
import type { Material, MaterialCategory } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { TextArea } from '@/components/ui/Textarea';
import { Badge } from '@/components/shared/Badge';
import { TabPanel } from '@/components/shared/TabPanel';
import { Modal } from '@/components/shared/Modal';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { SearchFilter } from '@/components/shared/SearchFilter';
import { AlertBanner } from '@/components/shared/AlertBanner';
import { EmptyState, MaterialsIcon } from '@/components/shared/EmptyState';

// ── Types ─────────────────────────────────────────────────────────────────────

type BadgeVariant = 'green' | 'amber' | 'blue' | 'red' | 'purple' | 'teal';

function getCategoryBadge(category: string): BadgeVariant {
  if (['sod', 'seed', 'plant', 'shrub', 'tree', 'soil', 'mulch'].includes(category)) return 'green';
  if (['paver', 'stone', 'tile', 'brick', 'concrete', 'irrigation'].includes(category)) return 'blue';
  if (['gravel', 'sand', 'lumber', 'lighting'].includes(category)) return 'amber';
  if (category === 'edging') return 'teal';
  if (category === 'misc') return 'purple';
  return 'blue';
}

function getReservePct(material: Material): number {
  if (material.reserveOverride !== null) return Math.round(material.reserveOverride * 100);
  const cat = material.category as MaterialCategory;
  return Math.round((RESERVE[cat] ?? 0.10) * 100);
}

function isLowStock(material: Material): boolean {
  return material.qtyOnHand <= material.minStockLevel;
}

interface MaterialForm {
  name: string;
  category: string;
  unit: string;
  cost: string;
  coverage: string;
  depthIn: string;
  reserveOverride: string;
  notes: string;
  supplier_name: string;
  supplier_sku: string;
  supplier_phone: string;
  supplier_contact: string;
  lead_time_days: string;
  price_update_date: string;
  supplier_notes: string;
  qtyOnHand: string;
  minStockLevel: string;
  storageLocation: string;
  lastRestocked: string;
}

const EMPTY_FORM: MaterialForm = {
  name: '', category: 'paver', unit: 'sqft', cost: '',
  coverage: '', depthIn: '', reserveOverride: '', notes: '',
  supplier_name: '', supplier_sku: '', supplier_phone: '', supplier_contact: '',
  lead_time_days: '', price_update_date: '', supplier_notes: '',
  qtyOnHand: '0', minStockLevel: '0', storageLocation: '', lastRestocked: '',
};

function materialToForm(m: Material): MaterialForm {
  return {
    name: m.name,
    category: m.category,
    unit: m.unit,
    cost: String(m.cost),
    coverage: m.coverage !== null ? String(m.coverage) : '',
    depthIn: m.depthIn !== null ? String(m.depthIn) : '',
    reserveOverride: m.reserveOverride !== null ? String(m.reserveOverride * 100) : '',
    notes: m.notes,
    supplier_name: m.supplier_name,
    supplier_sku: m.supplier_sku,
    supplier_phone: m.supplier_phone,
    supplier_contact: m.supplier_contact,
    lead_time_days: m.lead_time_days !== null ? String(m.lead_time_days) : '',
    price_update_date: m.price_update_date,
    supplier_notes: m.supplier_notes,
    qtyOnHand: String(m.qtyOnHand),
    minStockLevel: String(m.minStockLevel),
    storageLocation: m.storageLocation,
    lastRestocked: m.lastRestocked,
  };
}

function formToMaterial(f: MaterialForm): Omit<Material, 'id'> {
  return {
    name: f.name.trim(),
    category: f.category,
    unit: f.unit,
    cost: parseFloat(f.cost) || 0,
    coverage: f.coverage ? parseFloat(f.coverage) : null,
    depthIn: f.depthIn ? parseFloat(f.depthIn) : null,
    reserveOverride: f.reserveOverride ? parseFloat(f.reserveOverride) / 100 : null,
    notes: f.notes.trim(),
    supplier_name: f.supplier_name.trim(),
    supplier_sku: f.supplier_sku.trim(),
    supplier_phone: f.supplier_phone.trim(),
    supplier_contact: f.supplier_contact.trim(),
    lead_time_days: f.lead_time_days ? parseInt(f.lead_time_days) : null,
    price_update_date: f.price_update_date || new Date().toISOString().split('T')[0],
    supplier_notes: f.supplier_notes.trim(),
    qtyOnHand: parseInt(f.qtyOnHand) || 0,
    minStockLevel: parseInt(f.minStockLevel) || 0,
    storageLocation: f.storageLocation.trim(),
    lastRestocked: f.lastRestocked || new Date().toISOString().split('T')[0],
  };
}

// ── Category select options ───────────────────────────────────────────────────

const CATEGORY_OPTIONS = MATERIAL_CATEGORIES.map((cat) => ({
  value: cat,
  label: CAT_LABELS[cat],
}));

const FILTER_OPTIONS = CATEGORY_OPTIONS; // same list, reused for filter

const UNIT_OPTIONS = UNIT_TYPES.map(u => ({ value: u.id, label: u.label }));

// ── Component ─────────────────────────────────────────────────────────────────

export const MaterialLibrary: React.FC = () => {
  const { materials, addMaterial, updateMaterial, deleteMaterial, adjustStock, isLoading, error } = useMaterialStore();

  const [initialLoad, setInitialLoad] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setInitialLoad(false), 600);
    return () => clearTimeout(t);
  }, []);

  // UI state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteMaterialId, setDeleteMaterialId] = useState<string | null>(null);
  const [adjustMaterialId, setAdjustMaterialId] = useState<string | null>(null);
  const [adjustDelta, setAdjustDelta] = useState('');
  const [form, setForm] = useState<MaterialForm>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Partial<MaterialForm>>({});

  // Inventory search state (separate from library)
  const [invSearch, setInvSearch] = useState('');
  const [invFilter, setInvFilter] = useState('');

  // New UI state — category sidebar, search, stock filter, quick-add
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'in' | 'low' | 'out'>('all');
  const [quickName, setQuickName] = useState('');
  const [quickCategory, setQuickCategory] = useState('paver');
  const [quickUnit, setQuickUnit] = useState('sqft');
  const [quickCost, setQuickCost] = useState('');
  const [quickQty, setQuickQty] = useState('');

  // CSV import state
  const [showImportModal, setShowImportModal] = useState(false);
  const [csvPreview, setCsvPreview] = useState<Array<{ name: string; category: string; unit: string; cost: string }>>([]);
  const [csvError, setCsvError] = useState('');
  const [importSuccess, setImportSuccess] = useState('');
  const csvInputRef = React.useRef<HTMLInputElement>(null);

  function parseCSV(text: string) {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim().toLowerCase());
    return lines.slice(1).map(line => {
      const vals = line.match(/(".*?"|[^,]+|(?<=,)(?=,)|^(?=,)|(?<=,)$)/g) ?? line.split(',');
      const clean = vals.map(v => v.replace(/^"|"$/g, '').trim());
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => { obj[h] = clean[i] ?? ''; });
      return { name: obj['name'] ?? '', category: obj['category'] ?? 'misc', unit: obj['unit'] ?? 'each', cost: obj['unit_cost'] ?? obj['cost'] ?? '0' };
    }).filter(r => r.name);
  }

  function handleCsvFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvError('');
    setImportSuccess('');
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const rows = parseCSV(text);
      if (rows.length === 0) { setCsvError('No valid rows found. Columns needed: name, category, unit, unit_cost'); return; }
      setCsvPreview(rows.slice(0, 50));
    };
    reader.readAsText(file);
  }

  async function handleImportConfirm() {
    let count = 0;
    for (const row of csvPreview) {
      await addMaterial({
        name: row.name, category: row.category, unit: row.unit,
        cost: parseFloat(row.cost) || 0, reserveOverride: null, coverage: null,
        depthIn: null, notes: '', supplier_name: '', supplier_sku: '', supplier_phone: '',
        supplier_contact: '', lead_time_days: null,
        price_update_date: new Date().toISOString().split('T')[0],
        supplier_notes: '', qtyOnHand: 0, minStockLevel: 0,
        storageLocation: '', lastRestocked: '',
      });
      count++;
    }
    setImportSuccess(`Imported ${count} material${count !== 1 ? 's' : ''}`);
    setCsvPreview([]);
    if (csvInputRef.current) csvInputRef.current.value = '';
  }

  // Derived data
  const filteredMaterials = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return materials.filter((m) => {
      const matchSearch = !q || m.name.toLowerCase().includes(q) || m.supplier_name.toLowerCase().includes(q);
      const matchCat = !filterCategory || m.category === filterCategory;
      return matchSearch && matchCat;
    });
  }, [materials, searchTerm, filterCategory]);

  const filteredInventory = useMemo(() => {
    const q = invSearch.toLowerCase();
    return materials.filter((m) => {
      const matchSearch = !q || m.name.toLowerCase().includes(q);
      const matchCat = !invFilter || m.category === invFilter;
      return matchSearch && matchCat;
    });
  }, [materials, invSearch, invFilter]);

  // Unique suppliers derived from materials
  const supplierMap = useMemo(() => {
    const map = new Map<string, { contact: string; phone: string; notes: string; materials: string[] }>();
    for (const m of materials) {
      if (!m.supplier_name) continue;
      const existing = map.get(m.supplier_name);
      if (existing) {
        existing.materials.push(m.name);
      } else {
        map.set(m.supplier_name, {
          contact: m.supplier_contact,
          phone: m.supplier_phone,
          notes: m.supplier_notes,
          materials: [m.name],
        });
      }
    }
    return map;
  }, [materials]);

  const lowStockCount = useMemo(() => materials.filter(isLowStock).length, [materials]);

  function getStockStatus(m: Material): 'in' | 'low' | 'out' {
    if (m.qtyOnHand <= 0) return 'out'
    if (m.qtyOnHand <= m.minStockLevel) return 'low'
    return 'in'
  }

  // Category sidebar data
  const SIDEBAR_CATS = [
    { id: 'all', emoji: '📦', label: 'All Materials', match: (_: string) => true },
    { id: 'paver', emoji: '🧱', label: 'Pavers', match: (c: string) => c === 'paver' },
    { id: 'stone', emoji: '🪨', label: 'Stone', match: (c: string) => c === 'stone' },
    { id: 'sod', emoji: '🌿', label: 'Sod', match: (c: string) => c === 'sod' },
    { id: 'mulch', emoji: '🪵', label: 'Mulch', match: (c: string) => c === 'mulch' },
    { id: 'edging', emoji: '🧹', label: 'Edging', match: (c: string) => c === 'edging' },
    { id: 'plants', emoji: '🌱', label: 'Plants', match: (c: string) => ['plant', 'shrub', 'tree'].includes(c) },
    { id: 'lighting', emoji: '💡', label: 'Lighting', match: (c: string) => c === 'lighting' },
    { id: 'irrigation', emoji: '💧', label: 'Irrigation', match: (c: string) => c === 'irrigation' },
    { id: 'other', emoji: '📦', label: 'Other', match: (c: string) => ['tile', 'brick', 'concrete', 'gravel', 'sand', 'soil', 'seed', 'lumber', 'misc'].includes(c) },
  ];

  const activeCatDef = SIDEBAR_CATS.find(c => c.id === activeCategory) ?? SIDEBAR_CATS[0];

  const displayMaterials = useMemo(() => {
    return materials.filter(m => {
      const matchCat = activeCatDef.match(m.category);
      const matchSearch = !search || m.name.toLowerCase().includes(search.toLowerCase()) || (m.supplier_name ?? '').toLowerCase().includes(search.toLowerCase());
      const status = getStockStatus(m);
      const matchStock = stockFilter === 'all' || status === stockFilter;
      return matchCat && matchSearch && matchStock;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [materials, activeCategory, search, stockFilter, activeCatDef]);

  async function handleQuickAdd() {
    if (!quickName.trim()) return;
    await addMaterial({
      name: quickName.trim(), category: quickCategory, unit: quickUnit,
      cost: parseFloat(quickCost) || 0, qtyOnHand: parseInt(quickQty) || 0,
      minStockLevel: 0, reserveOverride: null, coverage: null, depthIn: null,
      notes: '', supplier_name: '', supplier_sku: '', supplier_phone: '',
      supplier_contact: '', lead_time_days: null, price_update_date: '',
      supplier_notes: '', storageLocation: '', lastRestocked: '',
    });
    const name = quickName.trim();
    setQuickName(''); setQuickCost(''); setQuickQty('');
    toast.success(`${name} added to library`);
  }

  // ── Handlers ────────────────────────────────────────────────────────────────

  function openAddModal() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setShowMaterialModal(true);
  }

  function openEditModal(material: Material) {
    setEditingId(material.id);
    setForm(materialToForm(material));
    setFormErrors({});
    setShowMaterialModal(true);
  }

  function closeMaterialModal() {
    setShowMaterialModal(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
  }

  function validate(): boolean {
    const errors: Partial<MaterialForm> = {};
    if (!form.name.trim()) errors.name = 'Required';
    if (!form.cost || isNaN(parseFloat(form.cost))) errors.cost = 'Enter a valid number';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    const data = formToMaterial(form);
    if (editingId) {
      await updateMaterial(editingId, data);
      toast.success('Material updated');
    } else {
      await addMaterial(data);
      toast.success('Material added');
    }
    closeMaterialModal();
  }

  async function handleDelete() {
    if (!deleteMaterialId) return;
    await deleteMaterial(deleteMaterialId);
    toast.info('Material deleted');
    setDeleteMaterialId(null);
  }

  function openAdjustModal(materialId: string) {
    setAdjustMaterialId(materialId);
    setAdjustDelta('');
  }

  async function handleAdjust() {
    if (!adjustMaterialId || !adjustDelta) return;
    const delta = parseInt(adjustDelta);
    if (isNaN(delta)) return;
    await adjustStock(adjustMaterialId, delta);
    setAdjustMaterialId(null);
    setAdjustDelta('');
  }

  // ── Field update helper ──────────────────────────────────────────────────────
  function setField<K extends keyof MaterialForm>(key: K, value: MaterialForm[K]) {
    setForm(f => ({ ...f, [key]: value }));
  }

  // ── Tabs ─────────────────────────────────────────────────────────────────────
  const tabs = [
    { id: 'inventory', label: `Inventory On Hand${lowStockCount > 0 ? ` (${lowStockCount} low)` : ''}` },
    { id: 'suppliers', label: 'Suppliers' },
    { id: 'library', label: 'Material Library' },
  ];

  const adjustingMaterial = adjustMaterialId ? materials.find(m => m.id === adjustMaterialId) : null;
  const deletingMaterial = deleteMaterialId ? materials.find(m => m.id === deleteMaterialId) : null;

  if (isLoading || initialLoad) {
    return (
      <div style={{ background: 'var(--surface-card)', border: '1px solid var(--border-default)', borderRadius: '10px', padding: '16px' }}>
        <Skeleton width="180px" height="14px" className="mb-[16px]" />
        {[0,1,2,3,4,5,6].map(i => (
          <div key={i} className="flex gap-[12px] items-center py-[10px]" style={{ borderBottom: '1px solid var(--border-light)' }}>
            <Skeleton width="140px" height="12px" />
            <Skeleton width="60px" height="12px" />
            <Skeleton width="50px" height="12px" />
            <Skeleton width="80px" height="22px" rounded="20px" />
          </div>
        ))}
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col">
      {error && (
        <div className="mb-[16px]">
          <AlertBanner alert={{ level: 'red', title: 'Load error', msg: error }} />
        </div>
      )}

      {/* Legacy inline toast removed — toasts now rendered by ToastContainer in AppLayout */}

      <div className="flex gap-0 flex-1 overflow-hidden">
        {/* Category sidebar — hidden on phone */}
        <aside className="hidden md:block w-[200px] border-r border-[var(--border-default)] bg-[var(--surface-card)] overflow-y-auto flex-shrink-0">
          {SIDEBAR_CATS.map(cat => {
            const count = cat.id === 'all' ? materials.length : materials.filter(m => cat.match(m.category)).length;
            return (
              <div
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center justify-between px-4 py-3 cursor-pointer transition-colors text-[14px] ${
                  activeCategory === cat.id
                    ? 'text-[var(--brand-primary)] bg-[var(--surface-selected)] font-[500]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'
                }`}
              >
                <span className="flex items-center gap-2.5">{cat.emoji} {cat.label}</span>
                <span className="text-[11px] font-[500] px-2 py-0.5 rounded-full bg-[var(--surface-hover)] text-[var(--text-tertiary)]">
                  {count}
                </span>
              </div>
            );
          })}
        </aside>

        {/* Main content */}
        <div className="flex-1 overflow-y-auto flex flex-col">
          {/* Mobile category chip bar */}
          <div className="md:hidden overflow-x-auto flex gap-2 px-4 py-3 border-b border-[var(--border-default)]">
            {SIDEBAR_CATS.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3 py-1.5 rounded-full text-[12px] whitespace-nowrap transition-colors ${
                  activeCategory === cat.id
                    ? 'bg-[var(--brand-primary)] text-white'
                    : 'bg-[var(--surface-hover)] text-[var(--text-secondary)]'
                }`}
              >
                {cat.emoji} {cat.label}
              </button>
            ))}
          </div>

          {/* Quick-add bar */}
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
                {CATEGORY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <select
                value={quickUnit}
                onChange={e => setQuickUnit(e.target.value)}
                className="w-[90px] h-[40px] px-2 rounded-lg border border-[var(--border-default)] bg-[var(--surface-card)] text-[13px] text-[var(--text-primary)] outline-none"
              >
                {UNIT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
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
              <Button variant="primary" className="h-[40px]" onClick={handleQuickAdd} disabled={!quickName.trim()}>
                Add
              </Button>
              <Button variant="secondary" size="sm" className="h-[40px]" onClick={() => { setCsvPreview([]); setCsvError(''); setImportSuccess(''); setShowImportModal(true); }}>
                ↑ CSV
              </Button>
            </div>
          </div>

          {/* Search and stock filter bar */}
          <div className="px-4 py-3 flex items-center gap-3 border-b border-[var(--border-light)]">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[14px]">🔍</span>
              <input
                type="text"
                placeholder="Search materials..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full h-[40px] pl-9 pr-3 rounded-lg border border-[var(--border-default)] bg-[var(--surface-card)] text-[13px] text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
              />
            </div>
            <div className="flex gap-1 bg-[var(--surface-hover)] p-1 rounded-lg">
              {(['all', 'in', 'low', 'out'] as const).map(sf => {
                const label = sf === 'all' ? 'All' : sf === 'in' ? 'In Stock' : sf === 'low' ? 'Low Stock' : 'Out of Stock';
                return (
                  <button
                    key={sf}
                    onClick={() => setStockFilter(sf)}
                    className={`px-3 py-1.5 rounded-md text-[12px] font-[500] cursor-pointer transition-colors ${
                      stockFilter === sf
                        ? 'bg-[var(--surface-card)] text-[var(--text-primary)] shadow-[var(--shadow-sm)]'
                        : 'text-[var(--text-secondary)]'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Material table */}
          <div className="flex-1 overflow-x-auto">
            {displayMaterials.length === 0 ? (
              materials.length === 0 ? (
                <EmptyState
                  icon={<MaterialsIcon />}
                  title="Stock your material library"
                  description="Add materials to track inventory and costs across projects."
                  actionLabel="Add Material"
                  onAction={openAddModal}
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="text-[14px] text-[var(--text-secondary)] mb-2">
                    No {activeCategory === 'all' ? '' : activeCatDef.label + ' '}materials match your filters
                  </div>
                </div>
              )
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--border-default)] text-[11px] font-[600] uppercase tracking-[0.05em] text-[var(--text-tertiary)]">
                    <th className="text-left px-4 py-3">Name</th>
                    <th className="text-left px-4 py-3">Category</th>
                    <th className="text-right px-4 py-3">Unit</th>
                    <th className="text-right px-4 py-3">Cost</th>
                    <th className="text-right px-4 py-3">On Hand</th>
                    <th className="text-left px-4 py-3">Status</th>
                    <th className="text-left px-4 py-3">Supplier</th>
                    <th className="text-right px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {displayMaterials.map(material => {
                    const status = getStockStatus(material);
                    return (
                      <tr key={material.id} className="border-b border-[var(--border-light)] hover:bg-[var(--surface-hover)] cursor-pointer transition-colors">
                        <td className="px-4 py-3 text-[14px] font-[500] text-[var(--text-primary)]">{material.name}</td>
                        <td className="px-4 py-3">
                          <span className="text-[12px] px-2.5 py-1 rounded-full bg-[var(--surface-hover)] text-[var(--text-secondary)] font-[500] capitalize">
                            {CAT_LABELS[material.category as MaterialCategory] ?? material.category}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-[14px] text-[var(--text-secondary)]">{material.unit}</td>
                        <td className="px-4 py-3 text-right text-[14px] font-[500] text-[var(--text-primary)]">${material.cost.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right text-[14px] text-[var(--text-primary)]">{material.qtyOnHand}</td>
                        <td className="px-4 py-3">
                          {status === 'in' && (
                            <span className="inline-flex items-center gap-1.5 text-[12px] font-[500] px-2.5 py-1 rounded-full bg-[var(--status-green-bg)] text-[var(--status-green)]">● In Stock</span>
                          )}
                          {status === 'low' && (
                            <span className="inline-flex items-center gap-1.5 text-[12px] font-[500] px-2.5 py-1 rounded-full bg-[var(--status-amber-bg)] text-[var(--status-amber)]">● Low Stock</span>
                          )}
                          {status === 'out' && (
                            <span className="inline-flex items-center gap-1.5 text-[12px] font-[500] px-2.5 py-1 rounded-full bg-[var(--status-red-bg)] text-[var(--status-red)]">● Out</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-[13px] text-[var(--text-secondary)]">{material.supplier_name || '—'}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex gap-1 justify-end">
                            <button
                              onClick={() => openEditModal(material)}
                              className="w-8 h-8 rounded-lg hover:bg-[var(--surface-hover)] flex items-center justify-center transition-colors"
                              title="Edit"
                            >✏️</button>
                            <button
                              onClick={() => toast.info('Material ordering coming in Phase 2')}
                              className="w-8 h-8 rounded-lg hover:bg-[var(--surface-hover)] flex items-center justify-center transition-colors"
                              title="Order"
                            >📦</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>


      {/* ── CSV Import Modal ──────────────────────────────────────────────────── */}
      <Modal
        isOpen={showImportModal}
        title="Import Materials from CSV"
        onClose={() => setShowImportModal(false)}
        onConfirm={csvPreview.length > 0 ? handleImportConfirm : undefined}
        confirmText={`Import ${csvPreview.length} Row${csvPreview.length !== 1 ? 's' : ''}`}
        maxWidth="560px"
      >
        <div className="flex flex-col gap-[12px]">
          <div className="text-[12px] text-[var(--text-2)]">
            Upload a CSV with columns: <code className="bg-[var(--surface3)] px-[4px] rounded text-[11px]">name, category, unit, unit_cost</code>
          </div>
          <input
            ref={csvInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleCsvFile}
            className="text-[12px] text-[var(--text-2)]"
          />
          {csvError && <div className="text-[12px] text-[var(--color-error)]">{csvError}</div>}
          {importSuccess && <div className="text-[12px] text-[var(--color-success)]">{importSuccess}</div>}
          {csvPreview.length > 0 && (
            <div>
              <div className="text-[11px] font-[600] text-[var(--text-3)] uppercase tracking-[0.06em] mb-[6px]">
                Preview ({csvPreview.length} rows)
              </div>
              <div className="max-h-[200px] overflow-y-auto border border-[var(--border)] rounded-[8px]">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="bg-[var(--surface3)] text-[var(--text-3)] text-left">
                      <th className="px-[8px] py-[6px]">Name</th>
                      <th className="px-[8px] py-[6px]">Category</th>
                      <th className="px-[8px] py-[6px]">Unit</th>
                      <th className="px-[8px] py-[6px]">Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {csvPreview.map((row, i) => (
                      <tr key={i} className="border-t border-[var(--border)]">
                        <td className="px-[8px] py-[5px] text-[var(--text)]">{row.name}</td>
                        <td className="px-[8px] py-[5px] text-[var(--text-3)]">{row.category}</td>
                        <td className="px-[8px] py-[5px] text-[var(--text-3)]">{row.unit}</td>
                        <td className="px-[8px] py-[5px] text-[var(--text-3)]">${row.cost}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* ── Add / Edit Material Modal ─────────────────────────────────────────── */}
      <Modal
        isOpen={showMaterialModal}
        title={editingId ? 'Edit Material' : 'Add Material'}
        onClose={closeMaterialModal}
        onConfirm={handleSave}
        confirmText={editingId ? 'Save Changes' : 'Add Material'}
        maxWidth="680px"
      >
        <div className="flex flex-col gap-[18px]">
          {/* Core fields */}
          <div>
            <div className="text-[10px] font-[700] text-[var(--text-4)] uppercase tracking-[0.06em] mb-[10px]">
              Material Details
            </div>
            <div className="flex flex-col gap-[10px]">
              <Input
                label="Material Name"
                required
                value={form.name}
                error={formErrors.name}
                onChange={e => setField('name', e.target.value)}
                placeholder="Concrete Pavers 12×12"
              />
              <div className="grid grid-cols-3 gap-[10px]">
                <Select
                  label="Category"
                  required
                  value={form.category}
                  options={CATEGORY_OPTIONS}
                  onChange={e => setField('category', e.target.value)}
                />
                <Select
                  label="Unit"
                  required
                  value={form.unit}
                  options={UNIT_OPTIONS}
                  onChange={e => setField('unit', e.target.value)}
                />
                <Input
                  label="Unit Cost ($)"
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.cost}
                  error={formErrors.cost}
                  onChange={e => setField('cost', e.target.value)}
                  placeholder="4.50"
                />
              </div>
              <div className="grid grid-cols-3 gap-[10px]">
                <Input
                  label="Coverage (per unit)"
                  type="number"
                  min="0"
                  value={form.coverage}
                  onChange={e => setField('coverage', e.target.value)}
                  placeholder="1"
                  hint="sqft, lnft, etc."
                />
                <Input
                  label="Depth (inches)"
                  type="number"
                  min="0"
                  step="0.5"
                  value={form.depthIn}
                  onChange={e => setField('depthIn', e.target.value)}
                  placeholder="3"
                />
                <Input
                  label="Reserve Override (%)"
                  type="number"
                  min="0"
                  max="50"
                  value={form.reserveOverride}
                  onChange={e => setField('reserveOverride', e.target.value)}
                  placeholder="10"
                  hint="Leave blank for default"
                />
              </div>
              <TextArea
                label="Notes"
                rows={2}
                value={form.notes}
                onChange={e => setField('notes', e.target.value)}
                placeholder="Material specs, usage notes..."
              />
            </div>
          </div>

          {/* Supplier fields */}
          <div>
            <div className="text-[10px] font-[700] text-[var(--text-4)] uppercase tracking-[0.06em] mb-[10px]">
              Supplier Info
            </div>
            <div className="flex flex-col gap-[10px]">
              <div className="grid grid-cols-2 gap-[10px]">
                <Input
                  label="Supplier Name"
                  value={form.supplier_name}
                  onChange={e => setField('supplier_name', e.target.value)}
                  placeholder="SRS Distribution"
                />
                <Input
                  label="Contact Person"
                  value={form.supplier_contact}
                  onChange={e => setField('supplier_contact', e.target.value)}
                  placeholder="Mike Johnson"
                />
              </div>
              <div className="grid grid-cols-3 gap-[10px]">
                <Input
                  label="Phone"
                  type="tel"
                  value={form.supplier_phone}
                  onChange={e => setField('supplier_phone', e.target.value)}
                  placeholder="(512) 555-0101"
                />
                <Input
                  label="SKU / Part #"
                  value={form.supplier_sku}
                  onChange={e => setField('supplier_sku', e.target.value)}
                  placeholder="CP-1212-GRY"
                />
                <Input
                  label="Lead Time (days)"
                  type="number"
                  min="0"
                  value={form.lead_time_days}
                  onChange={e => setField('lead_time_days', e.target.value)}
                  placeholder="3"
                />
              </div>
              <Input
                label="Price Updated"
                type="date"
                value={form.price_update_date}
                onChange={e => setField('price_update_date', e.target.value)}
              />
              <TextArea
                label="Supplier Notes"
                rows={2}
                value={form.supplier_notes}
                onChange={e => setField('supplier_notes', e.target.value)}
                placeholder="Volume discounts, delivery terms, seasonal availability..."
              />
            </div>
          </div>

          {/* Inventory fields */}
          <div>
            <div className="text-[10px] font-[700] text-[var(--text-4)] uppercase tracking-[0.06em] mb-[10px]">
              Inventory
            </div>
            <div className="grid grid-cols-2 gap-[10px]">
              <Input
                label="Qty On Hand"
                type="number"
                min="0"
                value={form.qtyOnHand}
                onChange={e => setField('qtyOnHand', e.target.value)}
              />
              <Input
                label="Min Stock Level"
                type="number"
                min="0"
                value={form.minStockLevel}
                onChange={e => setField('minStockLevel', e.target.value)}
                hint="Alert threshold for reorder"
              />
              <Input
                label="Storage Location"
                value={form.storageLocation}
                onChange={e => setField('storageLocation', e.target.value)}
                placeholder="Warehouse A, Rack 12"
              />
              <Input
                label="Last Restocked"
                type="date"
                value={form.lastRestocked}
                onChange={e => setField('lastRestocked', e.target.value)}
              />
            </div>
          </div>
        </div>
      </Modal>

      {/* ── Adjust Stock Modal ────────────────────────────────────────────────── */}
      {adjustingMaterial && (
        <Modal
          isOpen={true}
          title={`Adjust Stock — ${adjustingMaterial.name}`}
          onClose={() => { setAdjustMaterialId(null); setAdjustDelta(''); }}
          onConfirm={handleAdjust}
          confirmText="Apply Adjustment"
          maxWidth="360px"
        >
          <div className="flex flex-col gap-[14px]">
            <div className="flex items-center justify-between text-[13px] text-[var(--text-2)] bg-[var(--surface3)] rounded-[8px] px-[14px] py-[10px]">
              <span>Current stock</span>
              <span className="font-mono font-[600] text-[var(--text)]">
                {adjustingMaterial.qtyOnHand.toLocaleString()} {adjustingMaterial.unit}
              </span>
            </div>
            <Input
              label="Adjustment (+add / −remove)"
              type="number"
              value={adjustDelta}
              onChange={e => setAdjustDelta(e.target.value)}
              placeholder="e.g. 500 or -100"
              hint="Enter a positive number to add stock, negative to remove"
            />
            {adjustDelta && !isNaN(parseInt(adjustDelta)) && (
              <div className="text-[12px] text-[var(--text-3)] bg-[var(--surface3)] rounded-[8px] px-[14px] py-[8px]">
                New total:{' '}
                <span className="font-mono font-[600] text-[var(--text)]">
                  {(adjustingMaterial.qtyOnHand + parseInt(adjustDelta)).toLocaleString()} {adjustingMaterial.unit}
                </span>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* ── Delete Confirmation ───────────────────────────────────────────────── */}
      <ConfirmDialog
        isOpen={deleteMaterialId !== null}
        title="Delete Material"
        message={`Are you sure you want to delete "${deletingMaterial?.name ?? 'this material'}"? Any manifests using it will need to be updated.`}
        confirmText="Delete Material"
        confirmVariant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteMaterialId(null)}
      />
    </div>
  );
};

export default MaterialLibrary;
