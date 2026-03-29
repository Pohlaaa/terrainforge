import React, { useState, useMemo } from 'react';
import { Pencil } from 'lucide-react';
import { useProjectStore } from '@/stores/projectStore';
import { useMaterialStore } from '@/stores/materialStore';
import { computeProjectCostRaw } from '@/lib/manifest';
import { CHECKLIST_ITEMS } from '@/lib/constants';
import type { Project, Zone } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { TextArea } from '@/components/ui/Textarea';
import { Badge } from '@/components/shared/Badge';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { Modal } from '@/components/shared/Modal';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { AlertBanner } from '@/components/shared/AlertBanner';

type BadgeVariant = 'green' | 'amber' | 'blue' | 'red' | 'purple' | 'teal';

function getProjectStatus(project: Project): { label: string; variant: BadgeVariant } {
  const checks = Object.values(project.checklist);
  const completed = checks.filter(Boolean).length;
  if (completed === checks.length) return { label: 'Complete', variant: 'green' };
  if (completed === 0) return { label: 'Planning', variant: 'blue' };
  return { label: 'In Progress', variant: 'amber' };
}

interface NewProjectForm {
  name: string;
  client: string;
  address: string;
  totalArea: string;
  startDate: string;
  targetDate: string;
  budget: string;
  notes: string;
}

const EMPTY_FORM: NewProjectForm = {
  name: '', client: '', address: '', totalArea: '',
  startDate: '', targetDate: '', budget: '', notes: '',
};

interface EditProjectForm {
  name: string;
  notes: string;
  startDate: string;
  targetDate: string;
  budget: string;
}

function isDateInPast(dateStr: string): boolean {
  if (!dateStr) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(dateStr) < today;
}

interface ZoneForm {
  name: string;
  area: string;
  perimeter: string;
  notes: string;
}

const EMPTY_ZONE_FORM: ZoneForm = { name: '', area: '', perimeter: '', notes: '' };

export const Projects: React.FC = () => {
  const { projects, addProject, updateProject, deleteProject, toggleChecklist, setActiveProject, activeProjectId, isLoading, error,
    addZone, updateZone, deleteZone } = useProjectStore();
  const { materials } = useMaterialStore();

  const [showNewModal, setShowNewModal] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<NewProjectForm>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Partial<NewProjectForm>>({});

  // Edit project state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState<EditProjectForm>({ name: '', notes: '', startDate: '', targetDate: '', budget: '' });
  const [editFormErrors, setEditFormErrors] = useState<Partial<EditProjectForm>>({});

  // Zone CRUD state
  const [showZoneModal, setShowZoneModal] = useState(false);
  const [editingZoneId, setEditingZoneId] = useState<string | null>(null);
  const [zoneForm, setZoneForm] = useState<ZoneForm>(EMPTY_ZONE_FORM);
  const [zoneFormErrors, setZoneFormErrors] = useState<Partial<ZoneForm>>({});
  const [deleteZoneId, setDeleteZoneId] = useState<string | null>(null);

  const selectedProject = useMemo(
    () => projects.find(p => p.id === activeProjectId) ?? null,
    [projects, activeProjectId]
  );

  // Pre-compute manifest values for all projects once
  const projectValues = useMemo(
    () => Object.fromEntries(projects.map(p => [p.id, computeProjectCostRaw(p, materials)])),
    [projects, materials]
  );

  function validate(): boolean {
    const errors: Partial<NewProjectForm> = {};
    if (!form.name.trim()) errors.name = 'Required';
    if (!form.client.trim()) errors.client = 'Required';
    if (!form.address.trim()) errors.address = 'Required';
    const budgetVal = parseFloat(form.budget);
    if (!form.budget || isNaN(budgetVal) || budgetVal <= 0) errors.budget = 'Enter a budget greater than $0';
    if (form.startDate && form.targetDate && form.targetDate < form.startDate) {
      errors.targetDate = 'Target date must be after start date';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function closeNewModal() {
    setShowNewModal(false);
    setForm(EMPTY_FORM);
    setFormErrors({});
  }

  async function handleCreate() {
    if (!validate()) return;
    const startDate = form.startDate || new Date().toISOString().split('T')[0];
    if (isDateInPast(startDate)) {
      const ok = window.confirm('This start date is in the past. Are you sure you want to backdate this project?');
      if (!ok) return;
    }
    await addProject({
      name: form.name.trim(),
      client: form.client.trim(),
      address: form.address.trim(),
      totalArea: parseFloat(form.totalArea) || 0,
      startDate,
      targetDate: form.targetDate || '',
      budget: parseFloat(form.budget) || 0,
      notes: form.notes.trim(),
      checklist: {
        permit: false, utility: false, deposit: false, design: false,
        access: false, materials: false, crew: false, equipment: false,
      },
      zones: [],
    });
    closeNewModal();
  }

  async function handleDelete() {
    if (!deleteId) return;
    if (activeProjectId === deleteId) setActiveProject(null);
    await deleteProject(deleteId);
    setDeleteId(null);
  }

  // ── Edit project handlers ───────────────────────────────────────────────────
  function openEditProject(project: Project) {
    setEditForm({
      name: project.name,
      notes: project.notes,
      startDate: project.startDate,
      targetDate: project.targetDate,
      budget: String(project.budget),
    });
    setEditFormErrors({});
    setShowEditModal(true);
  }

  function closeEditModal() {
    setShowEditModal(false);
    setEditFormErrors({});
  }

  function validateEditForm(): boolean {
    const errors: Partial<EditProjectForm> = {};
    if (!editForm.name.trim()) errors.name = 'Required';
    const budgetVal = parseFloat(editForm.budget);
    if (!editForm.budget || isNaN(budgetVal) || budgetVal <= 0) errors.budget = 'Enter a budget greater than $0';
    if (editForm.startDate && editForm.targetDate && editForm.targetDate < editForm.startDate) {
      errors.targetDate = 'Target date must be after start date';
    }
    setEditFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleEditSave() {
    if (!selectedProject || !validateEditForm()) return;
    if (isDateInPast(editForm.startDate)) {
      const ok = window.confirm('This start date is in the past. Are you sure you want to backdate this project?');
      if (!ok) return;
    }
    await updateProject(selectedProject.id, {
      name: editForm.name.trim(),
      notes: editForm.notes.trim(),
      startDate: editForm.startDate,
      targetDate: editForm.targetDate,
      budget: parseFloat(editForm.budget) || 0,
    });
    closeEditModal();
  }

  // ── Zone handlers ──────────────────────────────────────────────────────────
  function openAddZone() {
    setEditingZoneId(null);
    setZoneForm(EMPTY_ZONE_FORM);
    setZoneFormErrors({});
    setShowZoneModal(true);
  }

  function openEditZone(zone: Zone) {
    setEditingZoneId(zone.id);
    setZoneForm({ name: zone.name, area: String(zone.area), perimeter: String(zone.perimeter), notes: zone.notes });
    setZoneFormErrors({});
    setShowZoneModal(true);
  }

  function closeZoneModal() {
    setShowZoneModal(false);
    setEditingZoneId(null);
    setZoneForm(EMPTY_ZONE_FORM);
    setZoneFormErrors({});
  }

  function validateZoneForm(): boolean {
    const errors: Partial<ZoneForm> = {};
    if (!zoneForm.name.trim()) errors.name = 'Required';
    if (zoneForm.area === '' || isNaN(Number(zoneForm.area)) || Number(zoneForm.area) < 0)
      errors.area = 'Enter a valid area';
    if (zoneForm.perimeter === '' || isNaN(Number(zoneForm.perimeter)) || Number(zoneForm.perimeter) < 0)
      errors.perimeter = 'Enter a valid perimeter';
    setZoneFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleZoneSave() {
    if (!selectedProject || !validateZoneForm()) return;
    if (editingZoneId) {
      await updateZone(selectedProject.id, editingZoneId, {
        name: zoneForm.name.trim(),
        area: Number(zoneForm.area),
        perimeter: Number(zoneForm.perimeter),
        notes: zoneForm.notes.trim(),
      });
    } else {
      await addZone(selectedProject.id, {
        name: zoneForm.name.trim(),
        area: Number(zoneForm.area),
        perimeter: Number(zoneForm.perimeter),
        sequence: selectedProject.zones.length + 1,
        crew: '',
        dependencies: [],
        notes: zoneForm.notes.trim(),
        materials: [],
        equipment: [],
      });
    }
    closeZoneModal();
  }

  async function handleZoneDelete() {
    if (!selectedProject || !deleteZoneId) return;
    await deleteZone(selectedProject.id, deleteZoneId);
    setDeleteZoneId(null);
  }

  // ── Detail view ────────────────────────────────────────────────────────────
  if (selectedProject) {
    const checkEntries = CHECKLIST_ITEMS.map(({ key, label }) => ({
      key: key as keyof Project['checklist'],
      label,
      checked: selectedProject.checklist[key as keyof Project['checklist']],
    }));
    const completedCount = checkEntries.filter(c => c.checked).length;
    const status = getProjectStatus(selectedProject);
    const value = projectValues[selectedProject.id] ?? 0;

    return (
      <div>
        {/* Detail header */}
        <div className="flex items-center gap-[12px] mb-[20px]">
          <Button variant="ghost" size="sm" onClick={() => setActiveProject(null)}>
            ← Back
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-[10px] flex-wrap">
              <h2 className="font-serif text-[22px] text-[var(--text)]">{selectedProject.name}</h2>
              <Badge variant={status.variant}>{status.label}</Badge>
            </div>
            <div className="text-[12px] text-[var(--text-3)] mt-[2px] truncate">{selectedProject.address}</div>
          </div>
          <Button variant="outline" size="sm" onClick={() => openEditProject(selectedProject)}>
            <Pencil size={13} className="mr-[4px]" /> Edit
          </Button>
          <Button variant="danger" size="sm" onClick={() => setDeleteId(selectedProject.id)}>
            Delete Project
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-[16px] items-start">
          {/* Zones panel */}
          <div className="bg-[var(--surface2)] border border-[var(--border)] rounded-[10px] overflow-hidden">
            <div className="px-[16px] py-[12px] border-b border-[var(--border)] flex items-center justify-between">
              <div className="text-[12px] font-[700] text-[var(--text)]">
                Zones ({selectedProject.zones.length})
              </div>
              <div className="flex items-center gap-[10px]">
                <span className="text-[11px] text-[var(--text-4)]">
                  {selectedProject.totalArea.toLocaleString()} sq ft total
                </span>
                <Button variant="primary" size="sm" onClick={openAddZone}>
                  + Add Zone
                </Button>
              </div>
            </div>
            <div className="p-[14px]">
              {selectedProject.zones.length === 0 ? (
                <div className="text-center py-[32px] text-[var(--text-3)]">
                  <div className="text-[28px] mb-[8px] opacity-30">⊞</div>
                  <div className="text-[13px] mb-[12px]">No zones yet — add a zone to start building your manifest</div>
                  <Button variant="primary" size="sm" onClick={openAddZone}>+ Add Zone</Button>
                </div>
              ) : (
                <div className="space-y-[8px]">
                  {selectedProject.zones.map((zone) => (
                    <div
                      key={zone.id}
                      className="bg-[var(--surface3)] border border-[var(--border)] rounded-[8px] px-[14px] py-[10px]"
                    >
                      <div className="flex items-center justify-between mb-[4px]">
                        <span className="text-[13px] font-[600] text-[var(--text)]">{zone.name}</span>
                        <div className="flex items-center gap-[6px]">
                          <span className="text-[10px] text-[var(--text-4)] font-[600] uppercase tracking-[0.05em]">
                            Seq {zone.sequence}
                          </span>
                          <Button variant="ghost" size="sm" onClick={() => openEditZone(zone)}>Edit</Button>
                          <Button variant="danger" size="sm" onClick={() => setDeleteZoneId(zone.id)}>Delete</Button>
                        </div>
                      </div>
                      <div className="flex gap-[16px] text-[11px] text-[var(--text-3)]">
                        <span>{zone.area.toLocaleString()} sq ft</span>
                        <span>{zone.perimeter.toLocaleString()} ft perimeter</span>
                        <span>{zone.materials.length} material{zone.materials.length !== 1 ? 's' : ''}</span>
                      </div>
                      {zone.notes && (
                        <div className="mt-[4px] text-[11px] text-[var(--text-4)] italic truncate">{zone.notes}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right column: info + checklist */}
          <div className="flex flex-col gap-[12px]">
            {/* Project info */}
            <div className="bg-[var(--surface2)] border border-[var(--border)] rounded-[10px] p-[16px]">
              <div className="text-[10px] font-[700] text-[var(--text-4)] uppercase tracking-[0.06em] mb-[12px]">
                Project Info
              </div>
              <div className="space-y-[10px] text-[12px]">
                <div className="flex justify-between">
                  <span className="text-[var(--text-3)]">Client</span>
                  <span className="text-[var(--text)] font-[600]">{selectedProject.client}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-3)]">Budget</span>
                  <span className="text-[var(--text)] font-[600]">
                    ${selectedProject.budget.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-3)]">Est. Value</span>
                  <span className="text-[var(--green-l)] font-[600]">
                    ${(value / 1000).toFixed(1)}k
                  </span>
                </div>
                <div className="h-px bg-[var(--border)]" />
                <div className="flex justify-between">
                  <span className="text-[var(--text-3)]">Start</span>
                  <span className="text-[var(--text)]">
                    {selectedProject.startDate
                      ? new Date(selectedProject.startDate).toLocaleDateString()
                      : '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-3)]">Target</span>
                  <span className="text-[var(--text)]">
                    {selectedProject.targetDate
                      ? new Date(selectedProject.targetDate).toLocaleDateString()
                      : '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Pre-project checklist */}
            <div className="bg-[var(--surface2)] border border-[var(--border)] rounded-[10px] overflow-hidden">
              <div className="px-[16px] py-[12px] border-b border-[var(--border)]">
                <div className="text-[12px] font-[700] text-[var(--text)] mb-[8px]">
                  Pre-project Checklist
                </div>
                <ProgressBar completed={completedCount} total={checkEntries.length} showPercentage />
              </div>
              <div className="p-[10px] space-y-[3px]">
                {checkEntries.map(({ key, label, checked }) => (
                  <button
                    key={key}
                    onClick={() => toggleChecklist(selectedProject.id, key)}
                    className={`w-full flex items-center gap-[10px] px-[10px] py-[8px] rounded-[6px] text-[12px] text-left transition-colors duration-150 cursor-pointer border-none ${
                      checked
                        ? 'bg-[rgba(45,106,79,.15)] text-[var(--green-l)]'
                        : 'bg-[var(--surface3)] text-[var(--text-2)] hover:bg-[rgba(255,255,255,.04)]'
                    }`}
                  >
                    <span
                      className={`w-[16px] h-[16px] rounded-[4px] border flex items-center justify-center flex-shrink-0 text-[10px] font-[700] ${
                        checked
                          ? 'bg-[var(--green-l)] border-[var(--green-l)] text-[var(--surface)]'
                          : 'border-[var(--border2)] bg-transparent'
                      }`}
                    >
                      {checked ? '✓' : ''}
                    </span>
                    <span className={checked ? 'line-through opacity-60' : ''}>{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <ConfirmDialog
          isOpen={deleteId !== null}
          title="Delete Project"
          message={`Are you sure you want to delete "${selectedProject.name}"? All zones will be removed and this cannot be undone.`}
          confirmText="Delete Project"
          confirmVariant="danger"
          onConfirm={handleDelete}
          onCancel={() => setDeleteId(null)}
        />

        {/* Zone create/edit modal */}
        <Modal
          isOpen={showZoneModal}
          title={editingZoneId ? 'Edit Zone' : 'Add Zone'}
          onClose={closeZoneModal}
          onConfirm={handleZoneSave}
          confirmText={editingZoneId ? 'Save Changes' : 'Add Zone'}
          maxWidth="480px"
        >
          <div className="flex flex-col gap-[14px]">
            <Input
              label="Zone Name"
              required
              value={zoneForm.name}
              error={zoneFormErrors.name}
              onChange={e => setZoneForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Patio, Garden Beds, Lawn..."
            />
            <div className="grid grid-cols-2 gap-[12px]">
              <Input
                label="Area (sq ft)"
                type="number"
                min="0"
                required
                value={zoneForm.area}
                error={zoneFormErrors.area}
                onChange={e => setZoneForm(f => ({ ...f, area: e.target.value }))}
                placeholder="800"
              />
              <Input
                label="Perimeter (ft)"
                type="number"
                min="0"
                required
                value={zoneForm.perimeter}
                error={zoneFormErrors.perimeter}
                onChange={e => setZoneForm(f => ({ ...f, perimeter: e.target.value }))}
                placeholder="120"
              />
            </div>
            <TextArea
              label="Notes"
              rows={3}
              value={zoneForm.notes}
              onChange={e => setZoneForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Zone description, special considerations..."
            />
          </div>
        </Modal>

        {/* Zone delete confirmation */}
        <ConfirmDialog
          isOpen={deleteZoneId !== null}
          title="Delete Zone"
          message={`Are you sure you want to delete this zone? Materials assigned to it will be removed from the manifest.`}
          confirmText="Delete Zone"
          confirmVariant="danger"
          onConfirm={handleZoneDelete}
          onCancel={() => setDeleteZoneId(null)}
        />

        {/* Edit Project Modal */}
        <Modal
          isOpen={showEditModal}
          title="Edit Project"
          onClose={closeEditModal}
          onConfirm={handleEditSave}
          confirmText="Save Changes"
          maxWidth="520px"
        >
          <div className="flex flex-col gap-[14px]">
            <Input
              label="Project Name"
              required
              value={editForm.name}
              error={editFormErrors.name}
              onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Henderson Backyard"
            />
            <div className="grid grid-cols-2 gap-[12px]">
              <Input
                label="Start Date"
                type="date"
                value={editForm.startDate}
                onChange={e => setEditForm(f => ({ ...f, startDate: e.target.value }))}
              />
              <Input
                label="Target Date"
                type="date"
                value={editForm.targetDate}
                error={editFormErrors.targetDate}
                onChange={e => setEditForm(f => ({ ...f, targetDate: e.target.value }))}
              />
            </div>
            <Input
              label="Budget ($)"
              type="number"
              required
              min="1"
              value={editForm.budget}
              error={editFormErrors.budget}
              onChange={e => setEditForm(f => ({ ...f, budget: e.target.value }))}
              placeholder="45000"
            />
            <TextArea
              label="Description / Notes"
              rows={3}
              value={editForm.notes}
              onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Project overview, special requirements..."
            />
          </div>
        </Modal>
      </div>
    );
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

  // ── List view ──────────────────────────────────────────────────────────────
  return (
    <div>
      {error && (
        <div className="mb-[16px]">
          <AlertBanner alert={{ level: 'red', title: 'Load error', msg: error }} />
        </div>
      )}
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-[20px]">
        <div className="text-[13px] text-[var(--text-3)]">
          {projects.length} project{projects.length !== 1 ? 's' : ''}
        </div>
        <Button variant="primary" onClick={() => setShowNewModal(true)}>
          + New Project
        </Button>
      </div>

      {/* Empty state */}
      {projects.length === 0 ? (
        <div className="flex items-center justify-center py-[80px] px-[24px]">
          <div className="text-center max-w-[400px]">
            <div className="text-[48px] mb-[16px] opacity-20">⊞</div>
            <div className="font-serif text-[22px] text-[var(--text)] mb-[10px]">
              No projects yet
            </div>
            <div className="text-[13px] text-[var(--text-3)] mb-[8px] leading-relaxed">
              Projects are the foundation of TerrainForge. Each project holds your zones, materials manifest, work orders, and crew assignments.
            </div>
            <div className="text-[12px] text-[var(--text-4)] mb-[28px]">
              Create your first project to start building a manifest.
            </div>
            <Button variant="primary" onClick={() => setShowNewModal(true)}>
              + Create Your First Project
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[16px]">
          {projects.map((project) => {
            const status = getProjectStatus(project);
            const checks = Object.values(project.checklist);
            const completedCount = checks.filter(Boolean).length;
            const value = projectValues[project.id] ?? 0;

            return (
              <div
                key={project.id}
                className="bg-[var(--surface2)] border border-[var(--border)] rounded-[10px] overflow-hidden hover:border-[var(--green-l)] transition-colors duration-200 flex flex-col"
              >
                {/* Card header */}
                <div className="px-[16px] py-[14px] border-b border-[var(--border)] flex items-start justify-between gap-[8px]">
                  <div className="min-w-0">
                    <h3 className="text-[14px] font-[700] text-[var(--text)] truncate">
                      {project.name}
                    </h3>
                    <p className="text-[11px] text-[var(--text-3)] mt-[2px] truncate">
                      {project.client} · {project.address}
                    </p>
                  </div>
                  <Badge variant={status.variant}>{status.label}</Badge>
                </div>

                {/* Card body */}
                <div className="px-[16px] py-[14px] flex-1 flex flex-col gap-[12px]">
                  {/* Value / Budget / Zones row */}
                  <div className="flex gap-[12px]">
                    <div className="flex-1">
                      <div className="text-[9px] font-[700] text-[var(--text-4)] uppercase tracking-[0.05em] mb-[3px]">
                        Est. Value
                      </div>
                      <div className="text-[16px] font-serif text-[var(--green-l)]">
                        ${(value / 1000).toFixed(1)}k
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="text-[9px] font-[700] text-[var(--text-4)] uppercase tracking-[0.05em] mb-[3px]">
                        Budget
                      </div>
                      <div className="text-[16px] font-serif text-[var(--text)]">
                        ${(project.budget / 1000).toFixed(1)}k
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="text-[9px] font-[700] text-[var(--text-4)] uppercase tracking-[0.05em] mb-[3px]">
                        Zones
                      </div>
                      <div className="text-[16px] font-serif text-[var(--text)]">
                        {project.zones.length}
                      </div>
                    </div>
                  </div>

                  {/* Checklist progress */}
                  <ProgressBar completed={completedCount} total={checks.length} showPercentage />

                  {/* Dates */}
                  <div className="flex gap-[12px] text-[11px]">
                    <div className="flex-1">
                      <div className="text-[9px] font-[700] text-[var(--text-4)] uppercase tracking-[0.04em] mb-[3px]">
                        Start
                      </div>
                      <div className="text-[var(--text-2)]">
                        {project.startDate
                          ? new Date(project.startDate).toLocaleDateString()
                          : '—'}
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="text-[9px] font-[700] text-[var(--text-4)] uppercase tracking-[0.04em] mb-[3px]">
                        Target
                      </div>
                      <div className="text-[var(--text-2)]">
                        {project.targetDate
                          ? new Date(project.targetDate).toLocaleDateString()
                          : '—'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card footer */}
                <div className="px-[16px] py-[12px] border-t border-[var(--border)] flex gap-[8px]">
                  <Button
                    variant="primary"
                    size="sm"
                    className="flex-1"
                    onClick={() => setActiveProject(project.id)}
                  >
                    View
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setDeleteId(project.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New Project Modal */}
      <Modal
        isOpen={showNewModal}
        title="New Project"
        onClose={closeNewModal}
        onConfirm={handleCreate}
        confirmText="Create Project"
        maxWidth="560px"
      >
        <div className="flex flex-col gap-[14px]">
          <div className="grid grid-cols-2 gap-[12px]">
            <Input
              label="Project Name"
              required
              value={form.name}
              error={formErrors.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Henderson Backyard"
            />
            <Input
              label="Client Name"
              required
              value={form.client}
              error={formErrors.client}
              onChange={e => setForm(f => ({ ...f, client: e.target.value }))}
              placeholder="Sarah Henderson"
            />
          </div>
          <Input
            label="Address"
            required
            value={form.address}
            error={formErrors.address}
            onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
            placeholder="1247 Maple Ridge Dr, Austin TX"
          />
          <div className="grid grid-cols-2 gap-[12px]">
            <Input
              label="Total Area (sq ft)"
              type="number"
              min="0"
              value={form.totalArea}
              onChange={e => setForm(f => ({ ...f, totalArea: e.target.value }))}
              placeholder="3200"
            />
            <Input
              label="Budget ($)"
              type="number"
              required
              min="1"
              value={form.budget}
              error={formErrors.budget}
              onChange={e => setForm(f => ({ ...f, budget: e.target.value }))}
              placeholder="45000"
            />
          </div>
          <div className="grid grid-cols-2 gap-[12px]">
            <Input
              label="Start Date"
              type="date"
              value={form.startDate}
              onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
            />
            <Input
              label="Target Date"
              type="date"
              value={form.targetDate}
              error={formErrors.targetDate}
              onChange={e => setForm(f => ({ ...f, targetDate: e.target.value }))}
            />
          </div>
          <TextArea
            label="Notes"
            rows={3}
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            placeholder="Project overview, special requirements, access notes..."
          />
        </div>
      </Modal>

      {/* Delete confirmation */}
      <ConfirmDialog
        isOpen={deleteId !== null}
        title="Delete Project"
        message="Are you sure you want to delete this project? All zones will be removed and this cannot be undone."
        confirmText="Delete Project"
        confirmVariant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
};

export default Projects;
