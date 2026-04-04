import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/shared/Modal';
import { Input } from '@/components/ui/Input';
import { TextArea } from '@/components/ui/Textarea';
import { MATERIAL_CATEGORIES, getCategoryLabel } from '@/lib/categories';
import type { Supplier, MaterialCategory } from '@/types';

interface SupplierForm {
  name: string;
  contactName: string;
  phone: string;
  email: string;
  address: string;
  website: string;
  categories: MaterialCategory[];
  notes: string;
  isActive: boolean;
}

const EMPTY_FORM: SupplierForm = {
  name: '',
  contactName: '',
  phone: '',
  email: '',
  address: '',
  website: '',
  categories: [],
  notes: '',
  isActive: true,
};

function supplierToForm(s: Supplier): SupplierForm {
  return {
    name: s.name,
    contactName: s.contactName,
    phone: s.phone,
    email: s.email,
    address: s.address,
    website: s.website,
    categories: s.categories,
    notes: s.notes,
    isActive: s.isActive,
  };
}

interface SupplierFormModalProps {
  isOpen: boolean;
  supplier: Supplier | null; // null = add mode
  onSave: (data: Partial<Supplier>) => void;
  onClose: () => void;
}

export const SupplierFormModal: React.FC<SupplierFormModalProps> = ({
  isOpen,
  supplier,
  onSave,
  onClose,
}) => {
  const [form, setForm] = useState<SupplierForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof SupplierForm, string>>>({});

  useEffect(() => {
    if (isOpen) {
      setForm(supplier ? supplierToForm(supplier) : EMPTY_FORM);
      setErrors({});
    }
  }, [isOpen, supplier]);

  function setField<K extends keyof SupplierForm>(key: K, value: SupplierForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function toggleCategory(cat: MaterialCategory) {
    setForm((f) => ({
      ...f,
      categories: f.categories.includes(cat)
        ? f.categories.filter((c) => c !== cat)
        : [...f.categories, cat],
    }));
  }

  function validate(): boolean {
    const errs: Partial<Record<keyof SupplierForm, string>> = {};
    if (!form.name.trim()) errs.name = 'Required';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Invalid email';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSave() {
    if (!validate()) return;
    onSave({
      name: form.name.trim(),
      contactName: form.contactName.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      address: form.address.trim(),
      website: form.website.trim(),
      categories: form.categories,
      notes: form.notes.trim(),
      isActive: form.isActive,
    });
  }

  return (
    <Modal
      isOpen={isOpen}
      title={supplier ? 'Edit Supplier' : 'Add Supplier'}
      onClose={onClose}
      onConfirm={handleSave}
      confirmText={supplier ? 'Save Changes' : 'Add Supplier'}
      maxWidth="640px"
    >
      <div className="flex flex-col gap-[18px]">
        {/* Company info */}
        <div>
          <div className="text-[10px] font-[700] text-[var(--text-4)] uppercase tracking-[0.06em] mb-[10px]">
            Company Info
          </div>
          <div className="flex flex-col gap-[10px]">
            <Input
              label="Supplier Name"
              required
              value={form.name}
              error={errors.name}
              onChange={(e) => setField('name', e.target.value)}
              placeholder="ABC Landscape Supply"
            />
            <div className="grid grid-cols-2 gap-[10px]">
              <Input
                label="Contact Person"
                value={form.contactName}
                onChange={(e) => setField('contactName', e.target.value)}
                placeholder="John Smith"
              />
              <Input
                label="Phone"
                value={form.phone}
                onChange={(e) => setField('phone', e.target.value)}
                placeholder="(555) 123-4567"
              />
            </div>
            <div className="grid grid-cols-2 gap-[10px]">
              <Input
                label="Email"
                type="email"
                value={form.email}
                error={errors.email}
                onChange={(e) => setField('email', e.target.value)}
                placeholder="sales@supplier.com"
              />
              <Input
                label="Website"
                value={form.website}
                onChange={(e) => setField('website', e.target.value)}
                placeholder="https://supplier.com"
              />
            </div>
            <Input
              label="Address"
              value={form.address}
              onChange={(e) => setField('address', e.target.value)}
              placeholder="123 Main St, City, ST 12345"
            />
          </div>
        </div>

        {/* Material categories */}
        <div>
          <div className="text-[10px] font-[700] text-[var(--text-4)] uppercase tracking-[0.06em] mb-[10px]">
            Material Categories Supplied
          </div>
          <div className="flex flex-wrap gap-2">
            {MATERIAL_CATEGORIES.map((cat) => {
              const selected = form.categories.includes(cat);
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => toggleCategory(cat)}
                  className={`px-3 py-1.5 rounded-full text-[12px] font-[500] cursor-pointer transition-colors border ${
                    selected
                      ? 'bg-[var(--brand-primary)] text-white border-[var(--brand-primary)]'
                      : 'bg-[var(--surface-card)] text-[var(--text-secondary)] border-[var(--border-default)] hover:bg-[var(--surface-hover)]'
                  }`}
                >
                  {getCategoryLabel(cat)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Status + Notes */}
        <div>
          <div className="text-[10px] font-[700] text-[var(--text-4)] uppercase tracking-[0.06em] mb-[10px]">
            Additional
          </div>
          <div className="flex flex-col gap-[10px]">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setField('isActive', e.target.checked)}
                className="w-4 h-4 rounded border-[var(--border-default)] accent-[var(--brand-primary)]"
              />
              <span className="text-[13px] text-[var(--text-primary)]">Active supplier</span>
            </label>
            <TextArea
              label="Notes"
              rows={2}
              value={form.notes}
              onChange={(e) => setField('notes', e.target.value)}
              placeholder="Payment terms, delivery schedule, account number..."
            />
          </div>
        </div>
      </div>
    </Modal>
  );
};
