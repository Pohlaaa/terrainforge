import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { TabPanel } from '@/components/shared/TabPanel';
import { DataTable } from '@/components/shared/DataTable';
import { Badge } from '@/components/shared/Badge';
import type { Material, InventoryItem, Supplier } from '@/types';

interface MaterialLibraryProps {
  materials?: Material[];
  inventory?: InventoryItem[];
  suppliers?: Supplier[];
  onAddMaterial?: () => void;
  onEditMaterial?: (materialId: string) => void;
  onDeleteMaterial?: (materialId: string) => void;
  onAdjustInventory?: (itemId: string) => void;
}

export const MaterialLibrary: React.FC<MaterialLibraryProps> = ({
  materials = [],
  inventory = [],
  suppliers = [],
  onAddMaterial,
  onEditMaterial,
  onDeleteMaterial,
  onAdjustInventory,
}) => {
  // TODO: Connect to useMaterialStore()
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  const categoryOptions = [
    { value: 'paver', label: 'Paver / Hardscape' },
    { value: 'stone', label: 'Stone / Rock' },
    { value: 'brick', label: 'Brick' },
    { value: 'concrete', label: 'Concrete' },
    { value: 'sod', label: 'Sod' },
    { value: 'seed', label: 'Seed' },
    { value: 'mulch', label: 'Mulch' },
    { value: 'gravel', label: 'Gravel / Aggregate' },
    { value: 'sand', label: 'Sand' },
    { value: 'soil', label: 'Soil / Amendment' },
    { value: 'edging', label: 'Edging' },
    { value: 'plant', label: 'Plant / Perennial' },
    { value: 'shrub', label: 'Shrub' },
    { value: 'tree', label: 'Tree' },
    { value: 'lighting', label: 'Lighting' },
    { value: 'irrigation', label: 'Irrigation' },
    { value: 'lumber', label: 'Lumber / Timber' },
    { value: 'misc', label: 'Misc / Supplies' },
  ];

  const filteredMaterials = materials.filter((m) => {
    const matchesSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !filterCategory || m.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const tabs = [
    { id: 'library', label: '📦 Material Library', icon: '' },
    { id: 'inventory', label: '🏪 Inventory On Hand', icon: '' },
    { id: 'suppliers', label: '🤝 Suppliers', icon: '' },
  ];

  return (
    <div>
      <TabPanel tabs={tabs} defaultTab="library">
        {/* Library Tab */}
        <div>
          <div className="flex gap-[8px] mb-[16px] items-center flex-wrap">
            <Button variant="primary" onClick={onAddMaterial}>
              + Add Material
            </Button>
            <Button variant="outline">Load Default Library</Button>
            <div className="ml-auto flex gap-[8px] items-center">
              <Input
                placeholder="Search materials..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-[180px]"
              />
              <Select
                options={[{ value: '', label: 'All Categories' }, ...categoryOptions]}
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
              />
            </div>
          </div>

          <div className="overflow-x-auto border rounded-[10px] border-[var(--border)]">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="bg-[var(--green)] text-white">
                  <th className="px-[14px] py-[10px] text-left text-[10px] font-[700] uppercase tracking-[0.05em]">
                    Material Name
                  </th>
                  <th className="px-[14px] py-[10px] text-left text-[10px] font-[700] uppercase tracking-[0.05em]">
                    Category
                  </th>
                  <th className="px-[14px] py-[10px] text-left text-[10px] font-[700] uppercase tracking-[0.05em]">
                    Unit
                  </th>
                  <th className="px-[14px] py-[10px] text-left text-[10px] font-[700] uppercase tracking-[0.05em]">
                    Unit Cost
                  </th>
                  <th className="px-[14px] py-[10px] text-left text-[10px] font-[700] uppercase tracking-[0.05em]">
                    Reserve %
                  </th>
                  <th className="px-[14px] py-[10px] text-left text-[10px] font-[700] uppercase tracking-[0.05em]">
                    Coverage
                  </th>
                  <th className="px-[14px] py-[10px] text-left text-[10px] font-[700] uppercase tracking-[0.05em]">
                    Supplier
                  </th>
                  <th className="px-[14px] py-[10px] text-left text-[10px] font-[700] uppercase tracking-[0.05em]">
                    SKU
                  </th>
                  <th className="px-[14px] py-[10px] text-right text-[10px] font-[700] uppercase tracking-[0.05em]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredMaterials.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-[14px] py-[20px] text-center text-[var(--text-3)]">
                      No materials found
                    </td>
                  </tr>
                ) : (
                  filteredMaterials.map((material) => (
                    <tr
                      key={material.id}
                      className="border-b border-[var(--border)] hover:bg-[rgba(45,106,79,.06)] transition-colors duration-150 odd:bg-[rgba(255,255,255,.02)]"
                    >
                      <td className="px-[14px] py-[10px] text-[var(--text)]">
                        {material.name}
                      </td>
                      <td className="px-[14px] py-[10px] text-[var(--text-2)]">
                        {material.category}
                      </td>
                      <td className="px-[14px] py-[10px] text-[var(--text-2)]">
                        {material.unit}
                      </td>
                      <td className="px-[14px] py-[10px] text-[var(--green-l)] font-mono font-[600]">
                        ${material.cost.toFixed(2)}
                      </td>
                      <td className="px-[14px] py-[10px] text-[var(--amber-l)] font-mono">
                        {material.reserveOverride || 10}%
                      </td>
                      <td className="px-[14px] py-[10px] text-[var(--text-2)]">
                        {material.coverage || '—'}
                      </td>
                      <td className="px-[14px] py-[10px] text-[var(--text-2)]">
                        {material.supplier_name}
                      </td>
                      <td className="px-[14px] py-[10px] font-mono text-[12px] text-[var(--text-2)]">
                        {material.supplier_sku}
                      </td>
                      <td className="px-[14px] py-[10px] text-right whitespace-nowrap space-x-[4px]">
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => onEditMaterial?.(material.id)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="danger"
                          size="xs"
                          onClick={() => onDeleteMaterial?.(material.id)}
                        >
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

        {/* Inventory Tab */}
        <div>
          {/* Summary cards */}
          <div className="grid grid-cols-4 gap-[12px] mb-[20px]">
            {[
              { label: 'Total Items', value: inventory.length },
              { label: 'Low Stock', value: inventory.filter(i => i.qtyOnHand < 10).length },
              { label: 'Total Allocated', value: inventory.reduce((sum, i) => sum + i?.minStockLevel, 0) },
              { label: 'Total Available', value: inventory.reduce((sum, i) => sum + i.qtyOnHand, 0) },
            ].map((stat, idx) => (
              <div key={idx} className="bg-[var(--surface2)] border border-[var(--border)] rounded-[10px] p-[16px]">
                <div className="text-[10px] text-[var(--text-3)] font-[700] uppercase tracking-[0.06em] mb-[6px]">
                  {stat.label}
                </div>
                <div className="font-serif text-[28px] text-[var(--text)] leading-[1]">
                  {stat.value}
                </div>
              </div>
            ))}
          </div>

          {/* Inventory table */}
          <div className="overflow-x-auto border rounded-[10px] border-[var(--border)]">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="bg-[var(--green)] text-white">
                  <th className="px-[14px] py-[10px] text-left text-[10px] font-[700] uppercase tracking-[0.05em]">
                    Material
                  </th>
                  <th className="px-[14px] py-[10px] text-left text-[10px] font-[700] uppercase tracking-[0.05em]">
                    Category
                  </th>
                  <th className="px-[14px] py-[10px] text-left text-[10px] font-[700] uppercase tracking-[0.05em]">
                    Unit
                  </th>
                  <th className="px-[14px] py-[10px] text-left text-[10px] font-[700] uppercase tracking-[0.05em]">
                    On Hand
                  </th>
                  <th className="px-[14px] py-[10px] text-left text-[10px] font-[700] uppercase tracking-[0.05em]">
                    Allocated
                  </th>
                  <th className="px-[14px] py-[10px] text-left text-[10px] font-[700] uppercase tracking-[0.05em]">
                    Available
                  </th>
                  <th className="px-[14px] py-[10px] text-left text-[10px] font-[700] uppercase tracking-[0.05em]">
                    Reorder At
                  </th>
                  <th className="px-[14px] py-[10px] text-left text-[10px] font-[700] uppercase tracking-[0.05em]">
                    Storage Location
                  </th>
                  <th className="px-[14px] py-[10px] text-left text-[10px] font-[700] uppercase tracking-[0.05em]">
                    Last Restocked
                  </th>
                  <th className="px-[14px] py-[10px] text-right text-[10px] font-[700] uppercase tracking-[0.05em]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {inventory.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-[14px] py-[20px] text-center text-[var(--text-3)]">
                      No inventory data
                    </td>
                  </tr>
                ) : (
                  inventory.map((item) => (
                    <tr
                      key={item.id}
                      className={`border-b border-[var(--border)] hover:bg-[rgba(45,106,79,.06)] transition-colors duration-150 odd:bg-[rgba(255,255,255,.02)] ${
                        item.qtyOnHand < 10 ? 'bg-[rgba(220,38,38,.05)]' : ''
                      }`}
                    >
                      <td className="px-[14px] py-[10px] text-[var(--text)]">
                        {/* TODO: Look up material name from materials array */}
                        Material {item.materialId}
                      </td>
                      <td className="px-[14px] py-[10px] text-[var(--text-2)]">—</td>
                      <td className="px-[14px] py-[10px] text-[var(--text-2)]">—</td>
                      <td className="px-[14px] py-[10px] text-[var(--text)]">
                        {item.qtyOnHand}
                      </td>
                      <td className="px-[14px] py-[10px] text-[var(--text-2)]">
                        {item?.minStockLevel}
                      </td>
                      <td className="px-[14px] py-[10px] text-[var(--text)]">
                        {item.qtyOnHand}
                      </td>
                      <td className="px-[14px] py-[10px] text-[var(--text-2)]">
                        {item.minStockLevel}
                      </td>
                      <td className="px-[14px] py-[10px] text-[var(--text-2)]">
                        —
                      </td>
                      <td className="px-[14px] py-[10px] text-[var(--text-2)] text-[12px]">
                        {new Date(item.lastRestocked).toLocaleDateString()}
                      </td>
                      <td className="px-[14px] py-[10px] text-right whitespace-nowrap">
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => onAdjustInventory?.(item.id)}
                        >
                          Adjust
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Suppliers Tab */}
        <div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-[14px]">
            {suppliers.length === 0 ? (
              <div className="col-span-full text-center py-[48px] text-[var(--text-3)]">
                <div className="text-[14px]">No suppliers added yet</div>
                <div className="text-[12px] mt-[8px]">
                  Edit a material and add supplier details
                </div>
              </div>
            ) : (
              suppliers.map((supplier) => (
                <div
                  key={supplier.id}
                  className="bg-[var(--surface2)] border border-[var(--border)] rounded-[10px] p-[16px]"
                >
                  <h3 className="text-[14px] font-[700] text-[var(--text)] mb-[12px]">
                    {supplier.name}
                  </h3>
                  <div className="space-y-[8px] text-[12px] text-[var(--text-2)]">
                    <div>
                      <div className="text-[10px] text-[var(--text-4)] uppercase font-[700] mb-[2px]">
                        Contact
                      </div>
                      {supplier.contact}
                    </div>
                    <div>
                      <div className="text-[10px] text-[var(--text-4)] uppercase font-[700] mb-[2px]">
                        Email
                      </div>
                      {supplier.contact}
                    </div>
                    <div>
                      <div className="text-[10px] text-[var(--text-4)] uppercase font-[700] mb-[2px]">
                        Phone
                      </div>
                      {supplier.phone}
                    </div>
                    <div>
                      <div className="text-[10px] text-[var(--text-4)] uppercase font-[700] mb-[2px]">
                        Address
                      </div>
                      {supplier.contact}
                    </div>
                    {false && (
                      <div>
                        <div className="text-[10px] text-[var(--text-4)] uppercase font-[700] mb-[2px]">
                          Website
                        </div>
                        <a
                          href={""}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[var(--blue-l)] hover:underline"
                        >
                          {""}
                        </a>
                      </div>
                    )}
                  </div>
                  <div className="text-[10px] text-[var(--text-4)] mt-[12px] pt-[12px] border-t border-[var(--border)]">
                    Supplies {[].length} material(s)
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </TabPanel>
    </div>
  );
};

export default MaterialLibrary;
