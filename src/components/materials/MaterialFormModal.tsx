import React from 'react';
import { Modal } from '@/components/shared/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { TextArea } from '@/components/ui/Textarea';
import { SupplierPriceSection } from '@/components/materials/SupplierPriceSection';

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
  // Sprint 7f — PBR texture URLs (mig 030)
  textureAlbedoUrl: string;
  textureNormalUrl: string;
  textureRoughnessUrl: string;
}

interface SelectOption {
  value: string;
  label: string;
}

interface MaterialFormModalProps {
  showMaterialModal: boolean;
  editingId: string | null;
  form: MaterialForm;
  formErrors: Partial<MaterialForm>;
  setField: <K extends keyof MaterialForm>(key: K, value: MaterialForm[K]) => void;
  onSave: () => void;
  onClose: () => void;
  categoryOptions: SelectOption[];
  unitOptions: SelectOption[];
}

export const MaterialFormModal: React.FC<MaterialFormModalProps> = ({
  showMaterialModal,
  editingId,
  form,
  formErrors,
  setField,
  onSave,
  onClose,
  categoryOptions,
  unitOptions,
}) => {
  return (
    <Modal
      isOpen={showMaterialModal}
      title={editingId ? 'Edit Material' : 'Add Material'}
      onClose={onClose}
      onConfirm={onSave}
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
                options={categoryOptions}
                onChange={e => setField('category', e.target.value)}
              />
              <Select
                label="Unit"
                required
                value={form.unit}
                options={unitOptions}
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
                onFocus={(e) => e.currentTarget.select()}
                value={form.depthIn}
                onChange={e => setField('depthIn', e.target.value)}
                placeholder={form.category === 'gravel' || form.category === 'sand' ? '6 (min)' : form.category === 'concrete' ? '4 (min)' : form.category === 'soil' ? '3 (min)' : '3'}
                hint={form.category === 'gravel' || form.category === 'sand' ? 'Base materials enforce 6″ minimum at compute time' : form.category === 'concrete' ? 'Concrete slab enforces 4″ minimum' : form.category === 'soil' ? 'Topsoil enforces 3″ minimum' : undefined}
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


        {/* Computation Engine */}
        <div>
          <div className="text-[10px] font-[700] text-[var(--text-4)] uppercase tracking-[0.06em] mb-[10px]">
            Computation Engine
          </div>
          <div className="grid grid-cols-3 gap-[10px]">
            <Select
              label="Computation Model"
              value={form.computationModel}
              options={[
                { value: 'AREA_COVERAGE', label: 'Area Coverage (bulk)' },
                { value: 'UNIT_COVERAGE', label: 'Unit Coverage (pavers, sod)' },
                { value: 'LINEAR', label: 'Linear (edging, wire)' },
                { value: 'POINT_SPACING', label: 'Point Spacing (plants)' },
                { value: 'LINEAR_DEPTH', label: 'Linear Depth (wall block)' },
                { value: 'SUBSTRATE', label: 'Substrate (fabric, rolls)' },
              ]}
              onChange={e => setField('computationModel', e.target.value)}
            />
            <Select
              label="Purchase Unit"
              value={form.purchaseUnit}
              options={[
                { value: 'each', label: 'Each' },
                { value: 'bag', label: 'Bag' },
                { value: 'cubic_yard', label: 'Cubic Yard' },
                { value: 'ton', label: 'Ton' },
                { value: 'sqft', label: 'Sq Ft' },
                { value: 'roll', label: 'Roll' },
                { value: 'pallet', label: 'Pallet' },
                { value: 'bundle', label: 'Bundle' },
                { value: 'flat', label: 'Flat' },
                { value: 'lnft', label: 'Linear Ft' },
              ]}
              onChange={e => setField('purchaseUnit', e.target.value)}
            />
            <Input
              label="Waste Factor (%)"
              type="number" min="0" max="50" step="1"
              value={form.wasteFactor}
              onChange={e => setField('wasteFactor', e.target.value)}
              placeholder="5"
              hint="Applied before rounding"
            />
          </div>
          <div className="grid grid-cols-2 gap-[10px] mt-[10px]">
            <Input
              label="Subcategory"
              value={form.subcategory}
              onChange={e => setField('subcategory', e.target.value)}
              placeholder="e.g., Mulch, Pavers, Shrubs"
            />
            <Input
              label="Supplier SKU"
              value={form.supplierSku}
              onChange={e => setField('supplierSku', e.target.value)}
              placeholder="e.g., BEL-CAM-001"
            />
          </div>
        </div>

        {/* 3D textures (Sprint 7f) — optional URLs consumed by PlanView3D */}
        <div>
          <div className="text-[10px] font-[700] text-[var(--text-4)] uppercase tracking-[0.06em] mb-[10px]">
            3D Textures (optional)
          </div>
          <div className="text-[11px] text-[var(--text-4)] mb-[10px]">
            Paste an image URL to give this material a realistic surface in the client-facing 3D view.
            Leave blank to use the default flat color. Images should tile cleanly (e.g., 512×512 seamless textures).
          </div>
          <div className="grid grid-cols-1 gap-[10px]">
            <Input
              label="Albedo (base color) URL"
              value={form.textureAlbedoUrl}
              onChange={e => setField('textureAlbedoUrl', e.target.value)}
              placeholder="https://..."
              hint="Required for textured rendering. PNG or JPG."
            />
            <Input
              label="Normal map URL"
              value={form.textureNormalUrl}
              onChange={e => setField('textureNormalUrl', e.target.value)}
              placeholder="https://..."
              hint="Optional. Adds surface bumps/detail."
            />
            <Input
              label="Roughness map URL"
              value={form.textureRoughnessUrl}
              onChange={e => setField('textureRoughnessUrl', e.target.value)}
              placeholder="https://..."
              hint="Optional. Controls specular variation per pixel."
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

        {/* Supplier Pricing — only shown when editing an existing material */}
        {editingId && (
          <SupplierPriceSection
            materialId={editingId}
            materialName={form.name}
          />
        )}
      </div>
    </Modal>
  );
};
