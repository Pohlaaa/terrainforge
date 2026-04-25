import React, { useState, useMemo, useEffect } from 'react';
import { Package, AlertTriangle, CheckCircle, ShoppingCart, Truck, Users } from 'lucide-react';
import { useMaterialStore } from '@/stores/materialStore';
import { useSupplierStore } from '@/stores/supplierStore';
import { Skeleton } from '@/components/shared/Skeleton';
import { toast } from '@/hooks/useToast';
import { MATERIAL_CATEGORIES, UNIT_TYPES } from '@/lib/constants';
import { getCategoryLabel, getCategoryReserve, getCategoryBadge as getCategoryBadgeClass } from '@/lib/categories';
import type { Material, MaterialCategory, Supplier } from '@/types';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/shared/Modal';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { inferModel } from '@/materials-engine/supplier-import';
import { AlertBanner } from '@/components/shared/AlertBanner';
import { KPICard } from '@/components/shared/KPICard';
import { HubHeader } from '@/components/shared/HubHeader';
import { useBillingGate } from '@/hooks/useBillingGate';
import { LowStockBanner } from '@/components/materials/LowStockBanner';
// MaterialQuickAddBar removed — replaced by toolbar buttons
import { MaterialTable } from '@/components/materials/MaterialTable';
import { CSVImportModal } from '@/components/materials/CSVImportModal';
import { MaterialFormModal } from '@/components/materials/MaterialFormModal';
import { SupplierTable } from '@/components/materials/SupplierTable';
import { SupplierFormModal } from '@/components/materials/SupplierFormModal';
import { ReorderPanel } from '@/components/materials/ReorderPanel';

// ── Types ─────────────────────────────────────────────────────────────────────

type BadgeVariant = 'green' | 'amber' | 'blue' | 'red' | 'purple' | 'teal';

function getCategoryBadge(category: string): BadgeVariant {
  const badgeClass = getCategoryBadgeClass(category);
  if (badgeClass === 'badge-green') return 'green';
  if (badgeClass === 'badge-blue') return 'blue';
  if (badgeClass === 'badge-amber') return 'amber';
  if (badgeClass === 'badge-teal') return 'teal';
  if (badgeClass === 'badge-purple') return 'purple';
  return 'blue';
}

function getReservePct(material: Material): number {
  if (material.reserveOverride !== null) return Math.round(material.reserveOverride * 100);
  const reserve = getCategoryReserve(material.category);
  return Math.round(reserve * 100);
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
  qtyOnHand: string;
  minStockLevel: string;
  storageLocation: string;
  lastRestocked: string;
  // Engine fields
  computationModel: string;
  purchaseUnit: string;
  wasteFactor: string;
  subcategory: string;
  supplierSku: string;
  // Sprint 7f — PBR texture URLs (mig 030). Rendered in PlanView3D when set.
  textureAlbedoUrl: string;
  textureNormalUrl: string;
  textureRoughnessUrl: string;
}

const EMPTY_FORM: MaterialForm = {
  name: '', category: 'paver', unit: 'sqft', cost: '',
  coverage: '', depthIn: '', reserveOverride: '', notes: '',
  qtyOnHand: '0', minStockLevel: '0', storageLocation: '', lastRestocked: '',
  computationModel: 'AREA_COVERAGE', purchaseUnit: 'each', wasteFactor: '5',
  subcategory: '', supplierSku: '',
  textureAlbedoUrl: '', textureNormalUrl: '', textureRoughnessUrl: '',
};

function materialToForm(m: Material): MaterialForm {
  return {
    name: m.name,
    category: m.category,
    unit: m.unit,
    cost: String(m.costPerPurchaseUnit ?? m.cost),
    coverage: m.coverage !== null ? String(m.coverage) : '',
    depthIn: m.depthIn !== null ? String(m.depthIn) : '',
    reserveOverride: m.reserveOverride !== null ? String(m.reserveOverride * 100) : '',
    notes: m.notes,
    qtyOnHand: String(m.qtyOnHand),
    minStockLevel: String(m.minStockLevel),
    storageLocation: m.storageLocation,
    lastRestocked: m.lastRestocked,
    computationModel: m.computationModel ?? 'AREA_COVERAGE',
    purchaseUnit: m.purchaseUnit ?? m.unit,
    wasteFactor: m.defaultWasteFactor != null ? String(m.defaultWasteFactor * 100) : '5',
    subcategory: m.subcategory ?? '',
    supplierSku: m.supplierSku ?? '',
    textureAlbedoUrl: m.textureAlbedoUrl ?? '',
    textureNormalUrl: m.textureNormalUrl ?? '',
    textureRoughnessUrl: m.textureRoughnessUrl ?? '',
  };
}

function formToMaterial(f: MaterialForm): Omit<Material, 'id'> {
  const costVal = parseFloat(f.cost) || 0;
  return {
    name: f.name.trim(),
    category: f.category,
    unit: f.purchaseUnit || f.unit,
    cost: costVal,
    coverage: f.coverage ? parseFloat(f.coverage) : null,
    depthIn: f.depthIn ? parseFloat(f.depthIn) : null,
    reserveOverride: f.reserveOverride ? parseFloat(f.reserveOverride) / 100 : null,
    notes: f.notes.trim(),
    qtyOnHand: parseInt(f.qtyOnHand) || 0,
    minStockLevel: parseInt(f.minStockLevel) || 0,
    storageLocation: f.storageLocation.trim(),
    lastRestocked: f.lastRestocked || new Date().toISOString().split('T')[0],
    // Engine fields
    computationModel: f.computationModel as Material['computationModel'],
    purchaseUnit: f.purchaseUnit,
    costPerPurchaseUnit: costVal,
    defaultWasteFactor: f.wasteFactor ? parseFloat(f.wasteFactor) / 100 : 0.05,
    subcategory: f.subcategory.trim() || undefined,
    supplierSku: f.supplierSku.trim() || undefined,
    textureAlbedoUrl: f.textureAlbedoUrl.trim() || null,
    textureNormalUrl: f.textureNormalUrl.trim() || null,
    textureRoughnessUrl: f.textureRoughnessUrl.trim() || null,
    isActive: true,
  };
}

// ── Category select options ───────────────────────────────────────────────────

const CATEGORY_OPTIONS = MATERIAL_CATEGORIES.map((cat) => ({
  value: cat,
  label: getCategoryLabel(cat),
}));

const FILTER_OPTIONS = CATEGORY_OPTIONS; // same list, reused for filter

const UNIT_OPTIONS = UNIT_TYPES.map(u => ({ value: u.id, label: u.label }));

// ── Component ─────────────────────────────────────────────────────────────────

export const MaterialLibrary: React.FC = () => {
  const { materials, addMaterial, bulkImportMaterials, updateMaterial, deleteMaterial, adjustStock, isLoading, error } = useMaterialStore();
  const {
    suppliers, fetchSuppliers, addSupplier, updateSupplier, deleteSupplier,
    isLoading: suppliersLoading,
  } = useSupplierStore();
  const { readOnly } = useBillingGate();

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
  // CSV import state
  const [showImportModal, setShowImportModal] = useState(false);
  const [csvPreview, setCsvPreview] = useState<Array<{ name: string; category: string; unit: string; cost: string }>>([]);
  const [csvError, setCsvError] = useState('');
  const [importSuccess, setImportSuccess] = useState('');
  const csvInputRef = React.useRef<HTMLInputElement>(null);

  // Tab state
  const [activeTab, setActiveTab] = useState<'inventory' | 'suppliers' | 'library'>('inventory');

  // Supplier UI state
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [deleteSupplierTarget, setDeleteSupplierTarget] = useState<string | null>(null);
  const [supplierSearch, setSupplierSearch] = useState('');

  // Load suppliers when tab switches to suppliers
  useEffect(() => {
    if (activeTab === 'suppliers' && suppliers.length === 0) {
      fetchSuppliers();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Filtered suppliers
  const filteredSuppliers = useMemo(() => {
    if (!supplierSearch) return suppliers;
    const q = supplierSearch.toLowerCase();
    return suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.contactName.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.categories.some((c) => c.toLowerCase().includes(q))
    );
  }, [suppliers, supplierSearch]);

  // Supplier handlers
  function openAddSupplier() {
    setEditingSupplier(null);
    setShowSupplierModal(true);
  }

  function openEditSupplier(supplier: Supplier) {
    setEditingSupplier(supplier);
    setShowSupplierModal(true);
  }

  async function handleSaveSupplier(data: Partial<Supplier>) {
    if (editingSupplier) {
      await updateSupplier(editingSupplier.id, data);
      toast.success('Supplier updated');
    } else {
      await addSupplier(data);
      toast.success('Supplier added');
    }
    setShowSupplierModal(false);
    setEditingSupplier(null);
  }

  async function handleDeleteSupplier() {
    if (!deleteSupplierTarget) return;
    await deleteSupplier(deleteSupplierTarget);
    toast.info('Supplier deleted');
    setDeleteSupplierTarget(null);
  }

  const deletingSupplier = deleteSupplierTarget ? suppliers.find((s) => s.id === deleteSupplierTarget) : null;

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
      setCsvPreview(rows);
    };
    reader.readAsText(file);
  }

  async function handleImportConfirm() {
    // F-045: batched bulk import via store action. Replaces the old
    // sequential for-await loop which silently failed past ~50 rows
    // on slow / rate-limited connections.
    if (csvPreview.length === 0) return;

    setCsvError('');
    setImportSuccess(`Importing 0 / ${csvPreview.length}…`);

    const payloads: Array<Omit<Material, 'id'>> = csvPreview.map((row) => {
      const inferred = inferModel(row.name);
      const cost = parseFloat(row.cost) || 0;
      return {
        name: row.name,
        category: row.category || inferred.category,
        unit: row.unit || inferred.purchaseUnit,
        cost,
        reserveOverride: null, coverage: null, depthIn: null,
        notes: '', qtyOnHand: 0, minStockLevel: 0,
        storageLocation: '', lastRestocked: '',
        computationModel: inferred.model,
        purchaseUnit: row.unit || inferred.purchaseUnit,
        costPerPurchaseUnit: cost,
        defaultWasteFactor: 0.05,
        subcategory: inferred.subcategory,
        isActive: true,
      } as Omit<Material, 'id'>;
    });

    const result = await bulkImportMaterials(payloads, (p) => {
      setImportSuccess(`Importing ${p.imported} / ${p.total}…`);
    });

    const { imported, failed } = result;
    setImportSuccess(
      `Imported ${imported} material${imported !== 1 ? 's' : ''}${failed > 0 ? ` (${failed} failed)` : ''}`,
    );
    if (failed > 0) {
      setCsvError(`${failed} row${failed !== 1 ? 's' : ''} failed to import`);
    }
    setCsvPreview([]);
    if (csvInputRef.current) csvInputRef.current.value = '';
  }

  // Derived data
  const filteredMaterials = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return materials.filter((m) => {
      const matchSearch = !q || m.name.toLowerCase().includes(q);
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

  // Note: Supplier information is now managed separately from materials

  const lowStockCount = useMemo(() => materials.filter(isLowStock).length, [materials]);
  const lowStockItems = useMemo(() => materials.filter(isLowStock), [materials]);
  const inventoryValue = useMemo(() =>
    materials.reduce((sum, m) => sum + (m.qtyOnHand * m.cost), 0), [materials]);
  const totalItems = materials.length;

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
      const matchSearch = !search || m.name.toLowerCase().includes(search.toLowerCase());
      const status = getStockStatus(m);
      const matchStock = stockFilter === 'all' || status === stockFilter;
      return matchCat && matchSearch && matchStock;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [materials, activeCategory, search, stockFilter, activeCatDef]);


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
    <div className="h-full flex flex-col gap-4">
      <HubHeader />

      {/* KPI Cards
          F-CW-22/23: Hide stock-tracking KPIs until the org actually tracks
          on-hand inventory. Otherwise "Low Stock: 127 / Total: 127" and
          "In Stock: $0" are decorative noise on a brand-new account. */}
      {(() => {
        const tracksInventory = materials.some(m => m.qtyOnHand > 0)
        return (
          <div className={`grid gap-4 ${tracksInventory ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-2'}`}>
            <KPICard
              label="Total Materials"
              value={totalItems}
              icon={<Package size={20} />}
              iconVariant="teal"
            />
            {tracksInventory && (
              <KPICard
                label="Low Stock"
                value={lowStockCount}
                icon={<AlertTriangle size={20} />}
                iconVariant="red"
              />
            )}
            {tracksInventory && (
              <KPICard
                label="In Stock"
                value={`$${inventoryValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                icon={<CheckCircle size={20} />}
                iconVariant="green"
              />
            )}
            <KPICard
              label="Categories"
              value={new Set(materials.map(m => m.category)).size}
              icon={<ShoppingCart size={20} />}
              iconVariant="blue"
            />
          </div>
        )
      })()}

      {/* Tab bar */}
      <div className="flex gap-0 border-b border-[var(--border-default)]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`px-5 py-3 text-[13px] font-[500] cursor-pointer transition-colors relative ${
              activeTab === tab.id
                ? 'text-[var(--brand-primary)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[var(--brand-primary)] rounded-t-full" />
            )}
          </button>
        ))}
      </div>

      {/* Low Stock Alert Banner — only on inventory tab */}
      {activeTab === 'inventory' && <LowStockBanner lowStockItems={lowStockItems} />}

      {/* Reorder Panel — only on inventory tab */}
      {activeTab === 'inventory' && <ReorderPanel />}

      {error && (
        <div>
          <AlertBanner alert={{ level: 'red', title: 'Load error', msg: error }} />
        </div>
      )}

      {/* ══════════════ Suppliers Tab ══════════════ */}
      {activeTab === 'suppliers' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Supplier search + add bar */}
          <div className="px-4 py-3 flex items-center gap-3 border-b border-[var(--border-light)]">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[14px]">🔍</span>
              <input
                type="text"
                placeholder="Search suppliers..."
                value={supplierSearch}
                onChange={(e) => setSupplierSearch(e.target.value)}
                className="w-full h-[40px] pl-9 pr-3 rounded-lg border border-[var(--border-default)] bg-[var(--surface-card)] text-[13px] text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
              />
            </div>
            {!readOnly && (
              <button
                onClick={openAddSupplier}
                className="h-[40px] px-4 rounded-lg bg-[var(--brand-primary)] text-white text-[13px] font-[500] hover:opacity-90 transition-opacity flex items-center gap-2 whitespace-nowrap"
              >
                + Add Supplier
              </button>
            )}
          </div>

          {/* Supplier KPI row */}
          <div className="px-4 py-3 flex gap-4">
            <div className="flex items-center gap-2 text-[13px]">
              <Truck size={16} className="text-[var(--brand-primary)]" />
              <span className="text-[var(--text-secondary)]">
                <span className="font-[600] text-[var(--text-primary)]">{suppliers.length}</span> suppliers
              </span>
            </div>
            <div className="flex items-center gap-2 text-[13px]">
              <Users size={16} className="text-[var(--status-green)]" />
              <span className="text-[var(--text-secondary)]">
                <span className="font-[600] text-[var(--text-primary)]">{suppliers.filter((s) => s.isActive).length}</span> active
              </span>
            </div>
          </div>

          {/* Supplier table */}
          <div className="flex-1 overflow-x-auto">
            {suppliersLoading ? (
              <div className="p-4">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-[12px] items-center py-[10px]" style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <Skeleton width="140px" height="12px" />
                    <Skeleton width="100px" height="12px" />
                    <Skeleton width="80px" height="12px" />
                    <Skeleton width="120px" height="12px" />
                  </div>
                ))}
              </div>
            ) : (
              <SupplierTable
                suppliers={filteredSuppliers}
                onEdit={openEditSupplier}
                onAdd={openAddSupplier}
                onDelete={(id) => setDeleteSupplierTarget(id)}
              />
            )}
          </div>

          {/* Supplier modals */}
          <SupplierFormModal
            isOpen={showSupplierModal}
            supplier={editingSupplier}
            onSave={handleSaveSupplier}
            onClose={() => { setShowSupplierModal(false); setEditingSupplier(null); }}
          />

          <ConfirmDialog
            isOpen={deleteSupplierTarget !== null}
            title="Delete Supplier"
            message={`Are you sure you want to delete "${deletingSupplier?.name ?? 'this supplier'}"? This will also remove all pricing records for this supplier.`}
            confirmText="Delete Supplier"
            confirmVariant="danger"
            onConfirm={handleDeleteSupplier}
            onCancel={() => setDeleteSupplierTarget(null)}
          />
        </div>
      )}

      {/* ══════════════ Inventory / Library Tab ══════════════ */}
      {(activeTab === 'inventory' || activeTab === 'library') && (
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

          {/* Search, filter, and action bar */}
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
            {!readOnly && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setCsvPreview([]); setCsvError(''); setImportSuccess(''); setShowImportModal(true); }}
                  className="h-[40px] px-4 rounded-lg border border-[var(--border-default)] bg-[var(--surface-card)] text-[var(--text-secondary)] text-[13px] font-[500] hover:bg-[var(--surface-hover)] transition-colors flex items-center gap-2 whitespace-nowrap"
                >
                  ↑ CSV Import
                </button>
                <button
                  onClick={openAddModal}
                  className="h-[40px] px-4 rounded-lg bg-[var(--brand-primary)] text-white text-[13px] font-[500] hover:opacity-90 transition-opacity flex items-center gap-2 whitespace-nowrap"
                >
                  + Add Material
                </button>
              </div>
            )}
          </div>

          {/* Material table */}
          <div className="flex-1 overflow-x-auto">
            <MaterialTable
              displayMaterials={displayMaterials}
              allMaterialsCount={materials.length}
              activeCategory={activeCategory}
              activeCatLabel={activeCatDef.label}
              openEditModal={openEditModal}
              openAddModal={openAddModal}
            />
          </div>
        </div>
      </div>


      )}

      {/* ── CSV Import Modal ──────────────────────────────────────────────────── */}
      <CSVImportModal
        showImportModal={showImportModal}
        onClose={() => setShowImportModal(false)}
        csvPreview={csvPreview}
        csvError={csvError}
        importSuccess={importSuccess}
        handleCsvFile={handleCsvFile}
        handleImportConfirm={handleImportConfirm}
        csvInputRef={csvInputRef}
      />

      {/* ── Add / Edit Material Modal ─────────────────────────────────────────── */}
      <MaterialFormModal
        showMaterialModal={showMaterialModal}
        editingId={editingId}
        form={form}
        formErrors={formErrors}
        setField={setField}
        onSave={handleSave}
        onClose={closeMaterialModal}
        categoryOptions={CATEGORY_OPTIONS}
        unitOptions={UNIT_OPTIONS}
      />

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
