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
