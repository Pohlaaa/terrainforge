import React, { useState, useMemo } from 'react';
import { useMaterialStore } from '@/stores/materialStore';
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
    } else {
      await addMaterial(data);
    }
    closeMaterialModal();
  }

  async function handleDelete() {
    if (!deleteMaterialId) return;
    await deleteMaterial(deleteMaterialId);
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
    { id: 'library', label: 'Material Library' },
    { id: 'inventory', label: `Inventory On Hand${lowStockCount > 0 ? ` (${lowStockCount} low)` : ''}` },
    { id: 'suppliers', label: 'Suppliers' },
  ];

  const adjustingMaterial = adjustMaterialId ? materials.find(m => m.id === adjustMaterialId) : null;
  const deletingMaterial = deleteMaterialId ? materials.find(m => m.id === deleteMaterialId) : null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-[64px]">
        <div className="text-center">
          <div className="animate-spin inline-block text-[28px] mb-[10px]">⌛</div>
          <div className="text-[13px] text-[var(--text-3)]">Loading...</div>
        </div>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div>
      {error && (
        <div className="mb-[16px]">
          <AlertBanner alert={{ level: 'red', title: 'Load error', msg: error }} />
        </div>
      )}
      <TabPanel tabs={tabs} defaultTab="library">

        {/* ── Library Tab ──────────────────────────────────────────────────── */}
        <div>
          <div className="flex gap-[8px] mb-[16px] items-center flex-wrap">
            <Button variant="primary" onClick={openAddModal}>+ Add Material</Button>
            <div className="ml-auto">
              <SearchFilter
                searchValue={searchTerm}
                onSearchChange={setSearchTerm}
                filterValue={filterCategory}
                onFilterChange={setFilterCategory}
                placeholder="Search materials..."
                filterOptions={FILTER_OPTIONS}
                filterLabel="All Categories"
              />
            </div>
          </div>

          <div className="text-[12px] text-[var(--text-3)] mb-[10px]">
            {filteredMaterials.length} of {materials.length} materials
          </div>

          <div className="overflow-x-auto border rounded-[10px] border-[var(--border)]">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="bg-[var(--green)] text-white">
                  {['Material Name', 'Category', 'Unit', 'Unit Cost', 'Reserve %', 'Coverage', 'Supplier', 'SKU', ''].map((h, i) => (
                    <th
                      key={i}
                      className={`px-[14px] py-[10px] text-[10px] font-[700] uppercase tracking-[0.05em] ${i === 8 ? 'text-right' : 'text-left'}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredMaterials.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-[14px] py-[24px] text-center text-[var(--text-3)]">
                      {searchTerm || filterCategory ? 'No materials match your filter' : 'No materials yet — click + Add Material'}
                    </td>
                  </tr>
                ) : (
                  filteredMaterials.map((material) => (
                    <tr
                      key={material.id}
                      className="border-b border-[var(--border)] hover:bg-[rgba(45,106,79,.06)] transition-colors duration-150 odd:bg-[rgba(255,255,255,.02)]"
                    >
                      <td className="px-[14px] py-[10px] text-[var(--text)] font-[500]">
                        {material.name}
                      </td>
                      <td className="px-[14px] py-[10px]">
                        <Badge variant={getCategoryBadge(material.category)}>
                          {CAT_LABELS[material.category as MaterialCategory] ?? material.category}
                        </Badge>
                      </td>
                      <td className="px-[14px] py-[10px] text-[var(--text-2)]">{material.unit}</td>
                      <td className="px-[14px] py-[10px] text-[var(--green-l)] font-mono font-[600]">
                        ${material.cost.toFixed(2)}
                      </td>
                      <td className="px-[14px] py-[10px] text-[var(--amber-l)] font-mono">
                        {getReservePct(material)}%
                      </td>
                      <td className="px-[14px] py-[10px] text-[var(--text-2)]">
                        {material.coverage ? `${material.coverage} ${material.unit}` : '—'}
                      </td>
                      <td className="px-[14px] py-[10px] text-[var(--text-2)]">
                        {material.supplier_name || '—'}
                      </td>
                      <td className="px-[14px] py-[10px] font-mono text-[11px] text-[var(--text-3)]">
                        {material.supplier_sku || '—'}
                      </td>
                      <td className="px-[14px] py-[10px] text-right whitespace-nowrap space-x-[4px]">
                        <Button variant="ghost" size="xs" onClick={() => openEditModal(material)}>
                          Edit
                        </Button>
                        <Button variant="danger" size="xs" onClick={() => setDeleteMaterialId(material.id)}>
                          Delete
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Inventory Tab ─────────────────────────────────────────────────── */}
        <div>
          {/* Summary cards */}
          <div className="grid grid-cols-4 gap-[12px] mb-[20px]">
            {[
              { label: 'Total Items', value: materials.length },
              { label: 'Low Stock', value: lowStockCount, warn: lowStockCount > 0 },
              {
                label: 'Total On Hand',
                value: materials.reduce((s, m) => s + m.qtyOnHand, 0).toLocaleString(),
              },
              {
                label: 'Reorder Value',
                value: `$${materials
                  .filter(isLowStock)
                  .reduce((s, m) => s + m.cost * (m.minStockLevel * 2), 0)
                  .toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
              },
            ].map((stat, idx) => (
              <div key={idx} className="bg-[var(--surface2)] border border-[var(--border)] rounded-[10px] p-[16px]">
                <div className="text-[10px] text-[var(--text-3)] font-[700] uppercase tracking-[0.06em] mb-[6px]">
                  {stat.label}
                </div>
                <div className={`font-serif text-[28px] leading-[1] ${'warn' in stat && stat.warn ? 'text-[var(--red-l)]' : 'text-[var(--text)]'}`}>
                  {stat.value}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between mb-[12px]">
            <SearchFilter
              searchValue={invSearch}
              onSearchChange={setInvSearch}
              filterValue={invFilter}
              onFilterChange={setInvFilter}
              placeholder="Search inventory..."
              filterOptions={FILTER_OPTIONS}
              filterLabel="All Categories"
            />
          </div>

          <div className="overflow-x-auto border rounded-[10px] border-[var(--border)]">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="bg-[var(--green)] text-white">
                  {['Material', 'Category', 'Unit', 'On Hand', 'Min Stock', 'Status', 'Storage Location', 'Last Restocked', ''].map((h, i) => (
                    <th
                      key={i}
                      className={`px-[14px] py-[10px] text-[10px] font-[700] uppercase tracking-[0.05em] ${i === 8 ? 'text-right' : 'text-left'}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredInventory.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-[14px] py-[20px] text-center text-[var(--text-3)]">
                      No inventory data
                    </td>
                  </tr>
                ) : (
                  filteredInventory.map((material) => {
                    const low = isLowStock(material);
                    return (
                      <tr
                        key={material.id}
                        className={`border-b border-[var(--border)] hover:bg-[rgba(45,106,79,.06)] transition-colors duration-150 odd:bg-[rgba(255,255,255,.02)] ${low ? 'bg-[rgba(220,38,38,.04)]' : ''}`}
                      >
                        <td className="px-[14px] py-[10px] text-[var(--text)] font-[500]">
                          {material.name}
                        </td>
                        <td className="px-[14px] py-[10px]">
                          <Badge variant={getCategoryBadge(material.category)}>
                            {CAT_LABELS[material.category as MaterialCategory] ?? material.category}
                          </Badge>
                        </td>
                        <td className="px-[14px] py-[10px] text-[var(--text-2)]">{material.unit}</td>
                        <td className={`px-[14px] py-[10px] font-mono font-[600] ${low ? 'text-[var(--red-l)]' : 'text-[var(--text)]'}`}>
                          {material.qtyOnHand.toLocaleString()}
                        </td>
                        <td className="px-[14px] py-[10px] text-[var(--text-2)] font-mono">
                          {material.minStockLevel.toLocaleString()}
                        </td>
                        <td className="px-[14px] py-[10px]">
                          {low
                            ? <Badge variant="red">Low Stock</Badge>
                            : <Badge variant="green">OK</Badge>}
                        </td>
                        <td className="px-[14px] py-[10px] text-[var(--text-2)] text-[12px]">
                          {material.storageLocation || '—'}
                        </td>
                        <td className="px-[14px] py-[10px] text-[var(--text-2)] text-[12px]">
                          {material.lastRestocked
                            ? new Date(material.lastRestocked).toLocaleDateString()
                            : '—'}
                        </td>
                        <td className="px-[14px] py-[10px] text-right">
                          <Button variant="ghost" size="xs" onClick={() => openAdjustModal(material.id)}>
                            Adjust
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Suppliers Tab ─────────────────────────────────────────────────── */}
        <div>
          {supplierMap.size === 0 ? (
            <div className="text-center py-[48px] text-[var(--text-3)]">
              <div className="text-[14px]">No suppliers yet</div>
              <div className="text-[12px] mt-[8px]">Add supplier details when editing a material</div>
            </div>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-[14px]">
              {Array.from(supplierMap.entries()).map(([name, info]) => (
                <div
                  key={name}
                  className="bg-[var(--surface2)] border border-[var(--border)] rounded-[10px] p-[16px]"
                >
                  <h3 className="text-[14px] font-[700] text-[var(--text)] mb-[12px]">{name}</h3>
                  <div className="space-y-[8px] text-[12px] text-[var(--text-2)]">
                    {info.contact && (
                      <div>
                        <div className="text-[10px] text-[var(--text-4)] uppercase font-[700] mb-[2px]">Contact</div>
                        {info.contact}
                      </div>
                    )}
                    {info.phone && (
                      <div>
                        <div className="text-[10px] text-[var(--text-4)] uppercase font-[700] mb-[2px]">Phone</div>
                        {info.phone}
                      </div>
                    )}
                    {info.notes && (
                      <div>
                        <div className="text-[10px] text-[var(--text-4)] uppercase font-[700] mb-[2px]">Notes</div>
                        <span className="text-[var(--text-3)]">{info.notes}</span>
                      </div>
                    )}
                  </div>
                  <div className="text-[10px] text-[var(--text-4)] mt-[12px] pt-[10px] border-t border-[var(--border)]">
                    Supplies {info.materials.length} material{info.materials.length !== 1 ? 's' : ''}:{' '}
                    <span className="text-[var(--text-3)]">{info.materials.slice(0, 3).join(', ')}
                    {info.materials.length > 3 ? ` +${info.materials.length - 3} more` : ''}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </TabPanel>

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
