import React, { useState, useMemo } from 'react';
import { useEquipmentStore } from '@/stores/equipmentStore';
import {
  EQUIPMENT_STATUS,
  EQUIP_CAPABILITIES,
  MAINTENANCE_TYPES,
  ALERT_THRESHOLDS,
} from '@/lib/constants';
import type { Equipment, MaintenanceEntry } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { TextArea } from '@/components/ui/Textarea';
import { Checkbox } from '@/components/ui/Checkbox';
import { Badge } from '@/components/shared/Badge';
import { Modal } from '@/components/shared/Modal';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { AlertBanner } from '@/components/shared/AlertBanner';

// ── Helpers ───────────────────────────────────────────────────────────────────

type AlertLevel = 'ok' | 'warn' | 'error';
type BadgeVariant = 'green' | 'amber' | 'blue' | 'red' | 'purple' | 'teal';

const STATUS_BADGE: Record<Equipment['status'], BadgeVariant> = {
  available: 'green',
  'in-use': 'blue',
  maintenance: 'amber',
  'out-of-service': 'red',
};

function dateAlert(dateStr: string, warnDays: number): { level: AlertLevel; daysLeft: number } {
  if (!dateStr) return { level: 'ok', daysLeft: 9999 };
  const daysLeft = Math.floor((new Date(dateStr).getTime() - Date.now()) / 86400000);
  if (daysLeft < 0) return { level: 'error', daysLeft };
  if (daysLeft <= warnDays) return { level: 'warn', daysLeft };
  return { level: 'ok', daysLeft };
}

function hoursAlert(hours: number, dueHours: number): AlertLevel {
  if (!dueHours) return 'ok';
  const remaining = dueHours - hours;
  if (remaining <= 0) return 'error';
  if (remaining <= ALERT_THRESHOLDS.EQUIPMENT_SERVICE_HOURS) return 'warn';
  return 'ok';
}

function alertBadgeVariant(level: AlertLevel): BadgeVariant {
  if (level === 'error') return 'red';
  if (level === 'warn') return 'amber';
  return 'green';
}

function fmtDate(d: string) {
  return d ? new Date(d).toLocaleDateString() : '—';
}

// ── Form types ────────────────────────────────────────────────────────────────

interface EquipForm {
  name: string;
  type: string;
  makeModel: string;
  year: string;
  serial: string;
  plate: string;
  status: string;
  location: string;
  operator: string;
  assignedProject: string;
  hours: string;
  serviceDueHours: string;
  lastService: string;
  nextService: string;
  maintNotes: string;
  value: string;
  dailyRate: string;
  insurance: string;
  insuranceExpiry: string;
  regExpiry: string;
  inspectionDue: string;
  notes: string;
  capabilities: string[];
}

const EMPTY_EQUIP_FORM: EquipForm = {
  name: '', type: '', makeModel: '', year: '', serial: '', plate: '',
  status: 'available', location: '', operator: '', assignedProject: '',
  hours: '0', serviceDueHours: '', lastService: '', nextService: '',
  maintNotes: '', value: '', dailyRate: '', insurance: '',
  insuranceExpiry: '', regExpiry: '', inspectionDue: '', notes: '',
  capabilities: [],
};

function equipToForm(e: Equipment): EquipForm {
  return {
    name: e.name,
    type: e.type,
    makeModel: e.makeModel,
    year: e.year !== null ? String(e.year) : '',
    serial: e.serial,
    plate: e.plate,
    status: e.status,
    location: e.location,
    operator: e.operator,
    assignedProject: e.assignedProject,
    hours: String(e.hours),
    serviceDueHours: e.serviceDueHours ? String(e.serviceDueHours) : '',
    lastService: e.lastService,
    nextService: e.nextService,
    maintNotes: e.maintNotes,
    value: e.value ? String(e.value) : '',
    dailyRate: e.dailyRate ? String(e.dailyRate) : '',
    insurance: e.insurance,
    insuranceExpiry: e.insuranceExpiry,
    regExpiry: e.regExpiry,
    inspectionDue: e.inspectionDue,
    notes: e.notes,
    capabilities: [...e.capabilities],
  };
}

function formToEquip(f: EquipForm): Omit<Equipment, 'id'> {
  return {
    name: f.name.trim(),
    type: f.type.trim(),
    makeModel: f.makeModel.trim(),
    year: f.year ? parseInt(f.year) : null,
    serial: f.serial.trim(),
    plate: f.plate.trim(),
    status: f.status as Equipment['status'],
    location: f.location.trim(),
    operator: f.operator.trim(),
    assignedProject: f.assignedProject.trim(),
    hours: parseFloat(f.hours) || 0,
    serviceDueHours: parseFloat(f.serviceDueHours) || 0,
    lastService: f.lastService,
    nextService: f.nextService,
    maintNotes: f.maintNotes.trim(),
    value: parseFloat(f.value) || 0,
    dailyRate: parseFloat(f.dailyRate) || 0,
    insurance: f.insurance.trim(),
    insuranceExpiry: f.insuranceExpiry,
    regExpiry: f.regExpiry,
    inspectionDue: f.inspectionDue,
    notes: f.notes.trim(),
    capabilities: f.capabilities,
    maintenanceLog: [],
  };
}

interface MaintForm {
  date: string;
  type: string;
  hours: string;
  notes: string;
  cost: string;
  by: string;
  nextDue: string;
}

const today = new Date().toISOString().split('T')[0];
const EMPTY_MAINT_FORM: MaintForm = {
  date: today, type: 'inspection', hours: '', notes: '', cost: '', by: '', nextDue: '',
};

// ── Select options ────────────────────────────────────────────────────────────

const STATUS_OPTIONS = EQUIPMENT_STATUS.map(s => ({ value: s.id, label: s.label }));
const MAINT_TYPE_OPTIONS = MAINTENANCE_TYPES.map(t => ({
  value: t,
  label: t.charAt(0).toUpperCase() + t.slice(1).replace(/-/g, ' '),
}));

// ── Component ─────────────────────────────────────────────────────────────────

export const EquipmentManager: React.FC = () => {
  const { equipment, addEquipment, updateEquipment, deleteEquipment, addMaintenanceEntry, isLoading, error } =
    useEquipmentStore();

  // Equipment add/edit modal
  const [showEquipModal, setShowEquipModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [equipForm, setEquipForm] = useState<EquipForm>(EMPTY_EQUIP_FORM);
  const [equipErrors, setEquipErrors] = useState<Partial<EquipForm>>({});

  // Maintenance modal
  const [maintEquip, setMaintEquip] = useState<Equipment | null>(null);
  const [maintMode, setMaintMode] = useState<'log' | 'add'>('log');
  const [maintForm, setMaintForm] = useState<MaintForm>(EMPTY_MAINT_FORM);

  // Delete
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const types = useMemo(
    () => Array.from(new Set(equipment.map(e => e.type))).sort(),
    [equipment]
  );

  const filtered = useMemo(() => {
    return equipment.filter(e => {
      const matchStatus = !statusFilter || e.status === statusFilter;
      const matchType = !typeFilter || e.type === typeFilter;
      return matchStatus && matchType;
    });
  }, [equipment, statusFilter, typeFilter]);

  const stats = useMemo(() => ({
    available: equipment.filter(e => e.status === 'available').length,
    inUse: equipment.filter(e => e.status === 'in-use').length,
    maintenance: equipment.filter(e => e.status === 'maintenance').length,
    outOfService: equipment.filter(e => e.status === 'out-of-service').length,
  }), [equipment]);

  const deletingEquip = deleteId ? equipment.find(e => e.id === deleteId) : null;

  // ── Equipment modal handlers ──────────────────────────────────────────────

  function openAdd() {
    setEditingId(null);
    setEquipForm(EMPTY_EQUIP_FORM);
    setEquipErrors({});
    setShowEquipModal(true);
  }

  function openEdit(equip: Equipment) {
    setEditingId(equip.id);
    setEquipForm(equipToForm(equip));
    setEquipErrors({});
    setShowEquipModal(true);
  }

  function closeEquipModal() {
    setShowEquipModal(false);
    setEditingId(null);
    setEquipForm(EMPTY_EQUIP_FORM);
    setEquipErrors({});
  }

  function validateEquip(): boolean {
    const errors: Partial<EquipForm> = {};
    if (!equipForm.name.trim()) errors.name = 'Required';
    if (!equipForm.type.trim()) errors.type = 'Required';
    setEquipErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSaveEquip() {
    if (!validateEquip()) return;
    if (editingId) {
      // Preserve the maintenance log when editing
      const existing = equipment.find(e => e.id === editingId);
      const data = formToEquip(equipForm);
      await updateEquipment(editingId, { ...data, maintenanceLog: existing?.maintenanceLog ?? [] });
    } else {
      await addEquipment(formToEquip(equipForm));
    }
    closeEquipModal();
  }

  function toggleCapability(cap: string) {
    setEquipForm(f => ({
      ...f,
      capabilities: f.capabilities.includes(cap)
        ? f.capabilities.filter(c => c !== cap)
        : [...f.capabilities, cap],
    }));
  }

  // ── Maintenance modal handlers ────────────────────────────────────────────

  function openMaintLog(equip: Equipment) {
    setMaintEquip(equip);
    setMaintMode('log');
    setMaintForm(EMPTY_MAINT_FORM);
  }

  function closeMaintModal() {
    setMaintEquip(null);
    setMaintMode('log');
    setMaintForm(EMPTY_MAINT_FORM);
  }

  async function handleMaintConfirm() {
    if (maintMode === 'log') {
      setMaintMode('add');
      return;
    }
    // Save entry
    if (!maintEquip) return;
    const entry: Omit<MaintenanceEntry, 'id'> = {
      date: maintForm.date,
      type: maintForm.type,
      hours: parseFloat(maintForm.hours) || 0,
      notes: maintForm.notes.trim(),
      cost: parseFloat(maintForm.cost) || 0,
      by: maintForm.by.trim(),
      nextDue: maintForm.nextDue,
    };
    await addMaintenanceEntry(maintEquip.id, entry);
    // Update the local maintEquip reference so the log refreshes in the modal
    const updated = equipment.find(e => e.id === maintEquip.id);
    if (updated) setMaintEquip(updated);
    setMaintMode('log');
    setMaintForm(EMPTY_MAINT_FORM);
  }

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

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div>
      {error && (
        <div className="mb-[16px]">
          <AlertBanner alert={{ level: 'red', title: 'Load error', msg: error }} />
        </div>
      )}
      {/* ── Callout banner ───────────────────────────────────────────────── */}
      <div className="border border-[#FB923C] bg-gradient-to-br from-[rgba(251,146,60,.1)] to-[rgba(10,15,10,.9)] rounded-[10px] px-[20px] py-[16px] mb-[16px]">
        <div className="text-[9px] font-[700] uppercase tracking-[0.12em] text-[#FB923C] mb-[6px]">
          Equipment Manager
        </div>
        <div className="text-[13px] text-[var(--text-2)] leading-[1.7]">
          Track every piece of equipment — status, assignments, maintenance history,
          and certifications. When you start a project the AI will recommend which
          machines to deploy based on zone types and availability.
        </div>
      </div>

      {/* ── Stats bar ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-[12px] mb-[16px]">
        {[
          { label: 'Available', value: stats.available, color: 'text-[var(--green-l)]' },
          { label: 'In Use', value: stats.inUse, color: 'text-[var(--blue-l)]' },
          { label: 'Maintenance', value: stats.maintenance, color: 'text-[var(--amber-l)]' },
          { label: 'Out of Service', value: stats.outOfService, color: 'text-[var(--red-l)]' },
        ].map((stat, idx) => (
          <div key={idx} className="bg-[var(--surface2)] border border-[var(--border)] rounded-[10px] p-[12px]">
            <div className="text-[10px] font-[700] text-[var(--text-4)] uppercase tracking-[0.06em] mb-[6px]">
              {stat.label}
            </div>
            <div className={`font-serif text-[24px] ${stat.color}`}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <div className="flex gap-[8px] mb-[16px] items-center flex-wrap">
        <Button variant="primary" onClick={openAdd}>+ Add Equipment</Button>
        <Button variant="outline" disabled title="AI equipment recommendations coming soon">⚡ Recommend for Active Project</Button>
        <div className="ml-auto flex gap-[8px]">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-[10px] py-[7px] text-[12px] bg-[var(--surface2)] border border-[var(--border)] rounded-[6px] text-[var(--text)] cursor-pointer outline-none focus:border-[var(--green-l)]"
          >
            <option value="">All Status</option>
            {EQUIPMENT_STATUS.map(s => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="px-[10px] py-[7px] text-[12px] bg-[var(--surface2)] border border-[var(--border)] rounded-[6px] text-[var(--text)] cursor-pointer outline-none focus:border-[var(--green-l)]"
          >
            <option value="">All Types</option>
            {types.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Empty state ───────────────────────────────────────────────────── */}
      {filtered.length === 0 && (
        <div className="text-center py-[48px] px-[24px] text-[var(--text-3)]">
          <div className="text-[40px] mb-[12px] opacity-30">🚜</div>
          <div className="text-[16px] font-[600] text-[var(--text-2)] mb-[6px]">
            {equipment.length === 0 ? 'No equipment yet' : 'No equipment matches your filters'}
          </div>
          <div className="text-[13px]">
            {equipment.length === 0
              ? 'Add your first piece of equipment to get started'
              : 'Try clearing the filters'}
          </div>
        </div>
      )}

      {/* ── Equipment grid ───────────────────────────────────────────────── */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[14px]">
          {filtered.map(equip => {
            const svcHrsAlert = hoursAlert(equip.hours, equip.serviceDueHours);
            const nextSvcAlert = dateAlert(equip.nextService, ALERT_THRESHOLDS.EQUIPMENT_SERVICE_DAYS);
            const insAlert = dateAlert(equip.insuranceExpiry, ALERT_THRESHOLDS.CERT_EXPIRY_DAYS);
            const regAlert = dateAlert(equip.regExpiry, ALERT_THRESHOLDS.CERT_EXPIRY_DAYS);
            const inspAlert = dateAlert(equip.inspectionDue, ALERT_THRESHOLDS.CERT_EXPIRY_DAYS);

            const hasRedAlert = [svcHrsAlert, nextSvcAlert.level, insAlert.level, regAlert.level, inspAlert.level]
              .some(l => l === 'error');
            const hasAmberAlert = !hasRedAlert && [svcHrsAlert, nextSvcAlert.level, insAlert.level, regAlert.level, inspAlert.level]
              .some(l => l === 'warn');

            return (
              <div
                key={equip.id}
                className={`bg-[var(--surface2)] border rounded-[10px] overflow-hidden flex flex-col transition-colors duration-200 ${
                  hasRedAlert
                    ? 'border-[var(--red-l)]'
                    : hasAmberAlert
                    ? 'border-[var(--amber-l)]'
                    : 'border-[var(--border)]'
                }`}
              >
                {/* Card header */}
                <div className="px-[16px] py-[13px] border-b border-[var(--border)] flex items-start justify-between gap-[10px]">
                  <div className="min-w-0">
                    <h3 className="text-[14px] font-[700] text-[var(--text)] truncate">{equip.name}</h3>
                    <p className="text-[11px] text-[var(--text-3)] mt-[1px]">
                      {equip.type}{equip.makeModel ? ` · ${equip.makeModel}` : ''}
                      {equip.year ? ` (${equip.year})` : ''}
                    </p>
                  </div>
                  <Badge variant={STATUS_BADGE[equip.status]}>{equip.status}</Badge>
                </div>

                {/* Card body */}
                <div className="px-[16px] py-[13px] flex-1 flex flex-col gap-[10px]">
                  {/* Hours bar */}
                  {equip.serviceDueHours > 0 && (
                    <div>
                      <div className="flex items-center justify-between text-[10px] mb-[4px]">
                        <span className="text-[var(--text-4)] font-[700] uppercase tracking-[0.05em]">Hours</span>
                        <span className={`font-mono ${svcHrsAlert === 'error' ? 'text-[var(--red-l)]' : svcHrsAlert === 'warn' ? 'text-[var(--amber-l)]' : 'text-[var(--text-3)]'}`}>
                          {equip.hours.toLocaleString()} / {equip.serviceDueHours.toLocaleString()} hrs
                        </span>
                      </div>
                      <div className="h-[4px] bg-[var(--surface3)] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${svcHrsAlert === 'error' ? 'bg-[var(--red-l)]' : svcHrsAlert === 'warn' ? 'bg-[var(--amber-l)]' : 'bg-[var(--green-l)]'}`}
                          style={{ width: `${Math.min((equip.hours / equip.serviceDueHours) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Alert badges row */}
                  {(nextSvcAlert.level !== 'ok' || insAlert.level !== 'ok' || regAlert.level !== 'ok' || inspAlert.level !== 'ok' || svcHrsAlert !== 'ok') && (
                    <div className="flex flex-wrap gap-[4px]">
                      {svcHrsAlert !== 'ok' && (
                        <Badge variant={alertBadgeVariant(svcHrsAlert)}>
                          {svcHrsAlert === 'error' ? 'Service overdue' : 'Service soon'}
                        </Badge>
                      )}
                      {nextSvcAlert.level !== 'ok' && (
                        <Badge variant={alertBadgeVariant(nextSvcAlert.level)}>
                          {nextSvcAlert.level === 'error' ? 'Service past due' : `Svc in ${nextSvcAlert.daysLeft}d`}
                        </Badge>
                      )}
                      {insAlert.level !== 'ok' && (
                        <Badge variant={alertBadgeVariant(insAlert.level)}>
                          {insAlert.level === 'error' ? 'Insurance expired' : `Ins. in ${insAlert.daysLeft}d`}
                        </Badge>
                      )}
                      {regAlert.level !== 'ok' && (
                        <Badge variant={alertBadgeVariant(regAlert.level)}>
                          {regAlert.level === 'error' ? 'Reg. expired' : `Reg. in ${regAlert.daysLeft}d`}
                        </Badge>
                      )}
                      {inspAlert.level !== 'ok' && (
                        <Badge variant={alertBadgeVariant(inspAlert.level)}>
                          {inspAlert.level === 'error' ? 'Inspection overdue' : `Insp. in ${inspAlert.daysLeft}d`}
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Key details */}
                  <div className="text-[11px] space-y-[4px]">
                    {equip.location && (
                      <div className="flex justify-between">
                        <span className="text-[var(--text-4)] font-[700]">Location</span>
                        <span className="text-[var(--text-2)]">{equip.location}</span>
                      </div>
                    )}
                    {equip.lastService && (
                      <div className="flex justify-between">
                        <span className="text-[var(--text-4)] font-[700]">Last Service</span>
                        <span className="text-[var(--text-2)]">{fmtDate(equip.lastService)}</span>
                      </div>
                    )}
                    {equip.nextService && (
                      <div className="flex justify-between">
                        <span className="text-[var(--text-4)] font-[700]">Next Service</span>
                        <span className={nextSvcAlert.level !== 'ok' ? 'text-[var(--amber-l)]' : 'text-[var(--text-2)]'}>
                          {fmtDate(equip.nextService)}
                        </span>
                      </div>
                    )}
                    {equip.assignedProject && (
                      <div className="flex justify-between">
                        <span className="text-[var(--text-4)] font-[700]">Assigned</span>
                        <span className="text-[var(--blue-l)]">{equip.assignedProject}</span>
                      </div>
                    )}
                  </div>

                  {/* Capabilities */}
                  {equip.capabilities.length > 0 && (
                    <div className="flex flex-wrap gap-[4px]">
                      {equip.capabilities.map(cap => {
                        const capLabel = EQUIP_CAPABILITIES.find(c => c.id === cap)?.label ?? cap;
                        return <Badge key={cap} variant="teal">{capLabel}</Badge>;
                      })}
                    </div>
                  )}

                  {/* Maint log count */}
                  {equip.maintenanceLog.length > 0 && (
                    <div className="text-[10px] text-[var(--text-4)]">
                      {equip.maintenanceLog.length} maintenance record{equip.maintenanceLog.length !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>

                {/* Card actions */}
                <div className="px-[16px] py-[10px] border-t border-[var(--border)] flex gap-[6px]">
                  <Button variant="ghost" size="xs" className="flex-1" onClick={() => openEdit(equip)}>Edit</Button>
                  <Button variant="ghost" size="xs" className="flex-1" onClick={() => openMaintLog(equip)}>
                    Maintenance
                  </Button>
                  <Button variant="danger" size="xs" className="flex-1" onClick={() => setDeleteId(equip.id)}>Delete</Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Add / Edit Equipment Modal ────────────────────────────────────── */}
      <Modal
        isOpen={showEquipModal}
        title={editingId ? 'Edit Equipment' : 'Add Equipment'}
        onClose={closeEquipModal}
        onConfirm={handleSaveEquip}
        confirmText={editingId ? 'Save Changes' : 'Add Equipment'}
        maxWidth="700px"
      >
        <div className="flex flex-col gap-[18px]">
          {/* Identity */}
          <div>
            <div className="text-[10px] font-[700] text-[var(--text-4)] uppercase tracking-[0.06em] mb-[10px]">Identity</div>
            <div className="flex flex-col gap-[10px]">
              <div className="grid grid-cols-2 gap-[10px]">
                <Input
                  label="Equipment Name"
                  required
                  value={equipForm.name}
                  error={equipErrors.name}
                  onChange={e => setEquipForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="CAT 303.5 Mini Excavator"
                />
                <Input
                  label="Type"
                  required
                  list="equip-types"
                  value={equipForm.type}
                  error={equipErrors.type}
                  onChange={e => setEquipForm(f => ({ ...f, type: e.target.value }))}
                  placeholder="mini-excavator"
                />
                <datalist id="equip-types">
                  {['mini-excavator', 'skid-steer', 'excavator', 'tractor', 'dump-truck',
                    'trailer', 'compactor', 'concrete-saw', 'auger', 'trencher',
                    'sprayer', 'zero-turn'].map(t => <option key={t} value={t} />)}
                </datalist>
              </div>
              <div className="grid grid-cols-3 gap-[10px]">
                <Input
                  label="Make / Model"
                  value={equipForm.makeModel}
                  onChange={e => setEquipForm(f => ({ ...f, makeModel: e.target.value }))}
                  placeholder="Caterpillar 303.5"
                />
                <Input
                  label="Year"
                  type="number"
                  min="1990"
                  max="2030"
                  value={equipForm.year}
                  onChange={e => setEquipForm(f => ({ ...f, year: e.target.value }))}
                  placeholder="2021"
                />
                <Input
                  label="Serial #"
                  value={equipForm.serial}
                  onChange={e => setEquipForm(f => ({ ...f, serial: e.target.value }))}
                  placeholder="CAT-2021-0334"
                />
              </div>
              <div className="grid grid-cols-2 gap-[10px]">
                <Input
                  label="Plate / Tag"
                  value={equipForm.plate}
                  onChange={e => setEquipForm(f => ({ ...f, plate: e.target.value }))}
                />
                <Select
                  label="Status"
                  value={equipForm.status}
                  options={STATUS_OPTIONS}
                  onChange={e => setEquipForm(f => ({ ...f, status: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-[10px]">
                <Input
                  label="Location"
                  value={equipForm.location}
                  onChange={e => setEquipForm(f => ({ ...f, location: e.target.value }))}
                  placeholder="Yard A, Bay 1"
                />
                <Input
                  label="Assigned Project"
                  value={equipForm.assignedProject}
                  onChange={e => setEquipForm(f => ({ ...f, assignedProject: e.target.value }))}
                  placeholder="Leave blank if unassigned"
                />
              </div>
            </div>
          </div>

          {/* Service */}
          <div>
            <div className="text-[10px] font-[700] text-[var(--text-4)] uppercase tracking-[0.06em] mb-[10px]">Service</div>
            <div className="flex flex-col gap-[10px]">
              <div className="grid grid-cols-2 gap-[10px]">
                <Input label="Current Hours" type="number" min="0" value={equipForm.hours}
                  onChange={e => setEquipForm(f => ({ ...f, hours: e.target.value }))} />
                <Input label="Service Due At (hrs)" type="number" min="0" value={equipForm.serviceDueHours}
                  onChange={e => setEquipForm(f => ({ ...f, serviceDueHours: e.target.value }))}
                  placeholder="e.g. 2000" />
              </div>
              <div className="grid grid-cols-2 gap-[10px]">
                <Input label="Last Service Date" type="date" value={equipForm.lastService}
                  onChange={e => setEquipForm(f => ({ ...f, lastService: e.target.value }))} />
                <Input label="Next Service Date" type="date" value={equipForm.nextService}
                  onChange={e => setEquipForm(f => ({ ...f, nextService: e.target.value }))} />
              </div>
              <TextArea label="Maintenance Notes" rows={2} value={equipForm.maintNotes}
                onChange={e => setEquipForm(f => ({ ...f, maintNotes: e.target.value }))} />
            </div>
          </div>

          {/* Compliance */}
          <div>
            <div className="text-[10px] font-[700] text-[var(--text-4)] uppercase tracking-[0.06em] mb-[10px]">Compliance & Insurance</div>
            <div className="flex flex-col gap-[10px]">
              <div className="grid grid-cols-2 gap-[10px]">
                <Input label="Insurance Provider" value={equipForm.insurance}
                  onChange={e => setEquipForm(f => ({ ...f, insurance: e.target.value }))} />
                <Input label="Insurance Expiry" type="date" value={equipForm.insuranceExpiry}
                  onChange={e => setEquipForm(f => ({ ...f, insuranceExpiry: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-[10px]">
                <Input label="Registration Expiry" type="date" value={equipForm.regExpiry}
                  onChange={e => setEquipForm(f => ({ ...f, regExpiry: e.target.value }))} />
                <Input label="Inspection Due" type="date" value={equipForm.inspectionDue}
                  onChange={e => setEquipForm(f => ({ ...f, inspectionDue: e.target.value }))} />
              </div>
            </div>
          </div>

          {/* Financial */}
          <div>
            <div className="text-[10px] font-[700] text-[var(--text-4)] uppercase tracking-[0.06em] mb-[10px]">Financial</div>
            <div className="grid grid-cols-2 gap-[10px]">
              <Input label="Asset Value ($)" type="number" min="0" value={equipForm.value}
                onChange={e => setEquipForm(f => ({ ...f, value: e.target.value }))} />
              <Input label="Daily Rate ($)" type="number" min="0" value={equipForm.dailyRate}
                onChange={e => setEquipForm(f => ({ ...f, dailyRate: e.target.value }))} />
            </div>
          </div>

          {/* Capabilities */}
          <div>
            <div className="text-[10px] font-[700] text-[var(--text-4)] uppercase tracking-[0.06em] mb-[10px]">Capabilities</div>
            <div className="grid grid-cols-2 gap-[6px]">
              {EQUIP_CAPABILITIES.map(cap => (
                <Checkbox
                  key={cap.id}
                  label={cap.label}
                  checked={equipForm.capabilities.includes(cap.id)}
                  onChange={() => toggleCapability(cap.id)}
                />
              ))}
            </div>
          </div>

          {/* Notes */}
          <TextArea label="Notes" rows={2} value={equipForm.notes}
            onChange={e => setEquipForm(f => ({ ...f, notes: e.target.value }))}
            placeholder="Usage notes, operator preferences, special requirements..." />
        </div>
      </Modal>

      {/* ── Maintenance Log Modal ─────────────────────────────────────────── */}
      <Modal
        isOpen={maintEquip !== null}
        title={
          maintMode === 'log'
            ? `Maintenance Log — ${maintEquip?.name}`
            : `Add Entry — ${maintEquip?.name}`
        }
        onClose={closeMaintModal}
        onConfirm={handleMaintConfirm}
        confirmText={maintMode === 'log' ? '+ Add Entry' : 'Save Entry'}
        cancelText={maintMode === 'add' ? 'Back to Log' : 'Close'}
        maxWidth="560px"
      >
        {maintMode === 'log' ? (
          /* Log view */
          <div>
            {!maintEquip?.maintenanceLog?.length ? (
              <div className="text-[12px] text-[var(--text-3)] py-[12px] text-center">
                No maintenance records yet — click "+ Add Entry" to log the first one.
              </div>
            ) : (
              <div className="flex flex-col gap-[10px]">
                {[...maintEquip.maintenanceLog]
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map((record: MaintenanceEntry) => (
                    <div key={record.id} className="border-l-[3px] border-[var(--green-l)] px-[12px] py-[8px] bg-[var(--surface3)] rounded-r-[6px]">
                      <div className="flex items-center justify-between mb-[4px]">
                        <div className="text-[12px] font-[700] text-[var(--text)]">
                          {fmtDate(record.date)} · {record.type}
                        </div>
                        <div className="text-[12px] text-[var(--green-l)] font-mono">${record.cost.toFixed(2)}</div>
                      </div>
                      {record.notes && (
                        <p className="text-[11px] text-[var(--text-2)] mb-[4px]">{record.notes}</p>
                      )}
                      <div className="flex gap-[12px] text-[10px] text-[var(--text-4)]">
                        {record.by && <span>By: {record.by}</span>}
                        {record.hours > 0 && <span>{record.hours.toLocaleString()} hrs</span>}
                        {record.nextDue && <span>Next due: {fmtDate(record.nextDue)}</span>}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        ) : (
          /* Add entry form */
          <div className="flex flex-col gap-[12px]">
            <div className="grid grid-cols-2 gap-[10px]">
              <Input label="Date" type="date" value={maintForm.date}
                onChange={e => setMaintForm(f => ({ ...f, date: e.target.value }))} />
              <Select label="Type" value={maintForm.type} options={MAINT_TYPE_OPTIONS}
                onChange={e => setMaintForm(f => ({ ...f, type: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-[10px]">
              <Input label="Hours at Service" type="number" min="0" value={maintForm.hours}
                onChange={e => setMaintForm(f => ({ ...f, hours: e.target.value }))}
                placeholder={equipForm.hours} />
              <Input label="Cost ($)" type="number" min="0" step="0.01" value={maintForm.cost}
                onChange={e => setMaintForm(f => ({ ...f, cost: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-[10px]">
              <Input label="Performed By" value={maintForm.by}
                onChange={e => setMaintForm(f => ({ ...f, by: e.target.value }))}
                placeholder="Mike Reeves" />
              <Input label="Next Due Date" type="date" value={maintForm.nextDue}
                onChange={e => setMaintForm(f => ({ ...f, nextDue: e.target.value }))} />
            </div>
            <TextArea label="Notes" rows={3} value={maintForm.notes}
              onChange={e => setMaintForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Work performed, parts replaced, observations..." />
          </div>
        )}
      </Modal>

      {/* ── Delete confirmation ───────────────────────────────────────────── */}
      <ConfirmDialog
        isOpen={deleteId !== null}
        title="Remove Equipment"
        message={`Are you sure you want to remove "${deletingEquip?.name ?? 'this equipment'}"? All maintenance records will also be deleted.`}
        confirmText="Remove Equipment"
        confirmVariant="danger"
        onConfirm={async () => { await deleteEquipment(deleteId!); setDeleteId(null); }}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
};

export default EquipmentManager;
