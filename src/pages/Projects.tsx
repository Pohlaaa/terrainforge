import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Pencil } from 'lucide-react';
import { useProjectStore } from '@/stores/projectStore';
import { useMaterialStore } from '@/stores/materialStore';
import { useCrewStore } from '@/stores/crewStore';
import { computeProjectCostRaw } from '@/lib/manifest';
import { CHECKLIST_ITEMS } from '@/lib/constants';
import type { Project, Zone } from '@/types';
import { generateProjectFromDescription } from '@/services/anthropic';
import type { AIProjectSuggestion } from '@/services/anthropic';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { TextArea } from '@/components/ui/Textarea';
import { Badge } from '@/components/shared/Badge';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { Modal } from '@/components/shared/Modal';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { AlertBanner } from '@/components/shared/AlertBanner';
import { Skeleton } from '@/components/shared/Skeleton';
import { toast } from '@/hooks/useToast';
import { AddressInput } from '@/components/shared/AddressInput';
import type { AddressSuggestion } from '@/hooks/useAddressAutocomplete';
import { EmptyState, ProjectsIcon } from '@/components/shared/EmptyState';

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
  lat?: number;
  lng?: number;
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
    addZone, updateZone, deleteZone, projectMaterials, addProjectMaterial, removeProjectMaterial,
    projectCrew, addProjectCrew, removeProjectCrew } = useProjectStore();
  const { materials } = useMaterialStore();
  const { crew } = useCrewStore();

  const [initialLoad, setInitialLoad] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setInitialLoad(false), 600);
    return () => clearTimeout(t);
  }, []);

  // Detail view tab state
  const [detailTab, setDetailTab] = useState<'zones' | 'materials' | 'crew'>('zones');

  // Crew assignment state
  const [showCrewPanel, setShowCrewPanel] = useState(false);

  // Add material to project state
  const [showAddMaterialModal, setShowAddMaterialModal] = useState(false);
  const [matSearch, setMatSearch] = useState('');
  const [matQty, setMatQty] = useState('1');

  const [showNewModal, setShowNewModal] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [form, setForm] = useState<NewProjectForm>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Partial<NewProjectForm>>({});

  // AI project creation state
  const [aiDescription, setAiDescription] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiSkipped, setAiSkipped] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<AIProjectSuggestion | null>(null);

  // AI material selection state (tracks which suggested materials the user has staged for addition)
  const [addedMaterialIndices, setAddedMaterialIndices] = useState<Set<number>>(new Set());

  // Checklist form state for new project creation (always starts all-false)
  const EMPTY_CHECKLIST: Project['checklist'] = {
    permit: false, utility: false, deposit: false, design: false,
    access: false, materials: false, crew: false, equipment: false,
  };
  const [formChecklist, setFormChecklist] = useState<Project['checklist']>(EMPTY_CHECKLIST);

  // Zone builder state (for new project creation)
  const [newProjectZones, setNewProjectZones] = useState<Array<{name: string; area: string; color: string}>>([]);
  const ZONE_COLORS = ['#2D6A4F', '#2563EB', '#F59E0B', '#DC2626', '#7C3AED', '#0D9488'];

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

  // Close overflow menu when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    }
    if (openMenuId) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [openMenuId]);

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
    setAiDescription('');
    setAiLoading(false);
    setAiError('');
    setAiSkipped(false);
    setAiSuggestion(null);
    setAddedMaterialIndices(new Set());
    setFormChecklist(EMPTY_CHECKLIST);
    setNewProjectZones([]);
  }

  async function handleAiGenerate() {
    if (!aiDescription.trim()) return;
    setAiLoading(true);
    setAiError('');
    try {
      const suggestion = await generateProjectFromDescription(aiDescription.trim());
      if (!suggestion) {
        setAiError("Couldn't generate — please fill in manually");
        setAiSkipped(true);
        return;
      }
      setAiSuggestion(suggestion);
      // Pre-fill form fields
      setForm({
        name: suggestion.name || '',
        client: '',
        address: suggestion.address || '',
        totalArea: suggestion.totalAreaSqft > 0 ? String(suggestion.totalAreaSqft) : '',
        startDate: suggestion.startDate || '',
        targetDate: suggestion.targetDate || '',
        budget: suggestion.budget > 0 ? String(suggestion.budget) : '',
        notes: suggestion.notes || '',
      });
      setAiSkipped(true); // show the form now
    } catch {
      setAiError("Couldn't generate — please fill in manually");
      setAiSkipped(true);
    } finally {
      setAiLoading(false);
    }
  }

  async function handleCreate() {
    if (!validate()) return;
    const startDate = form.startDate || new Date().toISOString().split('T')[0];
    if (isDateInPast(startDate)) {
      const ok = window.confirm('This start date is in the past. Are you sure you want to backdate this project?');
      if (!ok) return;
    }
    const builtZones = newProjectZones
      .filter(z => z.name.trim())
      .map((z, i) => ({
        id: crypto.randomUUID(),
        name: z.name.trim(),
        area: parseFloat(z.area) || 0,
        perimeter: 0,
        sequence: i + 1,
        crew: '',
        dependencies: [] as string[],
        notes: '',
        materials: [] as import('@/types').ZoneMaterial[],
        equipment: [] as import('@/types').ZoneEquipment[],
        createdAt: new Date().toISOString(),
      }));
    const newProjectId = await addProject({
      name: form.name.trim(),
      client: form.client.trim(),
      address: form.address.trim(),
      lat: form.lat,
      lng: form.lng,
      totalArea: parseFloat(form.totalArea) || 0,
      startDate,
      targetDate: form.targetDate || '',
      budget: parseFloat(form.budget) || 0,
      notes: form.notes.trim(),
      checklist: formChecklist,
      zones: builtZones,
    });

    // Persist only the AI-suggested materials the user staged (clicked "+")
    if (newProjectId && aiSuggestion?.suggestedMaterials?.length && addedMaterialIndices.size > 0) {
      aiSuggestion.suggestedMaterials.forEach((m, idx) => {
        if (!addedMaterialIndices.has(idx)) return;
        addProjectMaterial(newProjectId, {
          materialId: '',
          name: m.name,
          quantity: m.estimatedQuantity,
          unit: m.unit,
          unitCost: 0,
        });
      });
    }

    toast.success('Project created');
    closeNewModal();
  }

  async function handleDelete() {
    if (!deleteId) return;
    if (activeProjectId === deleteId) setActiveProject(null);
    await deleteProject(deleteId);
    toast.info('Project deleted');
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
    const assignedMaterials = projectMaterials[selectedProject.id] ?? [];
    const materialTotal = assignedMaterials.reduce((sum, m) => sum + m.quantity * m.unitCost, 0);
    const filteredMaterials = materials.filter(m =>
      m.name.toLowerCase().includes(matSearch.toLowerCase())
    );
    const assignedCrew = projectCrew[selectedProject.id] ?? [];
    const assignedCrewIds = new Set(assignedCrew.map(e => e.crewMemberId));
    const availableCrew = crew.filter(c => !assignedCrewIds.has(c.id));

    return (
      <div>
        {/* Detail header */}
        <div className="flex items-center gap-[12px] mb-[20px] flex-wrap">
          <Button variant="ghost" size="sm" onClick={() => { setActiveProject(null); setDetailTab('zones'); }}>
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

        {/* Tab bar */}
        <div className="flex gap-0 mb-[16px] border-b border-[var(--border)]">
          {(['zones', 'materials', 'crew'] as const).map((tab) => {
            const label = tab === 'zones' ? `Zones (${selectedProject.zones.length})`
              : tab === 'materials' ? `Materials (${assignedMaterials.length})`
              : `Crew (${assignedCrew.length})`;
            return (
              <button
                key={tab}
                onClick={() => setDetailTab(tab)}
                className={`px-[16px] py-[10px] text-[13px] font-[600] border-b-[2px] transition-colors ${
                  detailTab === tab
                    ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                    : 'border-transparent text-[var(--text-3)] hover:text-[var(--text-2)]'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-[16px] items-start">
          {/* Left panel — Zones or Materials tab */}
          {detailTab === 'zones' ? (
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
          ) : detailTab === 'materials' ? (
          /* ── Materials tab ──────────────────────────────────────────────── */
          <div className="bg-[var(--surface2)] border border-[var(--border)] rounded-[10px] overflow-hidden">
            <div className="px-[16px] py-[12px] border-b border-[var(--border)] flex items-center justify-between">
              <div className="text-[12px] font-[700] text-[var(--text)]">
                Project Materials
                {assignedMaterials.length > 0 && (
                  <span className="ml-[8px] text-[11px] text-[var(--green-l)] font-[600]">
                    ${materialTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })} total
                  </span>
                )}
              </div>
              <Button variant="primary" size="sm" onClick={() => { setMatSearch(''); setMatQty('1'); setShowAddMaterialModal(true); }}>
                + Add Material
              </Button>
            </div>
            <div className="p-[14px]">
              {assignedMaterials.length === 0 ? (
                <div className="text-center py-[32px] text-[var(--text-3)]">
                  <div className="text-[28px] mb-[8px] opacity-30">📦</div>
                  <div className="text-[13px] mb-[12px]">No materials assigned yet</div>
                  <Button variant="primary" size="sm" onClick={() => { setMatSearch(''); setMatQty('1'); setShowAddMaterialModal(true); }}>
                    + Add Material
                  </Button>
                </div>
              ) : (
                <div className="space-y-[6px]">
                  {assignedMaterials.map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between bg-[var(--surface3)] border border-[var(--border)] rounded-[8px] px-[12px] py-[8px]">
                      <div className="min-w-0">
                        <div className="text-[13px] font-[600] text-[var(--text)] truncate">{entry.name}</div>
                        <div className="text-[11px] text-[var(--text-3)]">
                          {entry.quantity} {entry.unit} · ${entry.unitCost}/unit
                        </div>
                      </div>
                      <div className="flex items-center gap-[10px] flex-shrink-0">
                        <div className="text-[13px] font-[700] text-[var(--text)]">
                          ${(entry.quantity * entry.unitCost).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </div>
                        <button
                          onClick={() => removeProjectMaterial(selectedProject.id, entry.id)}
                          className="text-[var(--text-3)] hover:text-[var(--color-error)] transition-colors text-[14px] w-[24px] h-[24px] flex items-center justify-center"
                          aria-label="Remove material"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          ) : detailTab === 'crew' ? (
          /* ── Crew tab ───────────────────────────────────────────────────── */
          <div className="bg-[var(--surface2)] border border-[var(--border)] rounded-[10px] overflow-hidden">
            <div className="px-[16px] py-[12px] border-b border-[var(--border)] flex items-center justify-between">
              <div className="text-[12px] font-[700] text-[var(--text)]">
                Assigned Crew
              </div>
              <Button variant="primary" size="sm" onClick={() => setShowCrewPanel(true)}>
                + Assign Crew
              </Button>
            </div>
            <div className="p-[14px]">
              {assignedCrew.length === 0 ? (
                <div className="text-center py-[32px] text-[var(--text-3)]">
                  <div className="text-[28px] mb-[8px] opacity-30">👥</div>
                  <div className="text-[13px] mb-[12px]">No crew assigned yet</div>
                  <Button variant="primary" size="sm" onClick={() => setShowCrewPanel(true)}>
                    + Assign Crew
                  </Button>
                </div>
              ) : (
                <div className="space-y-[6px]">
                  {assignedCrew.map((entry) => {
                    const member = crew.find(c => c.id === entry.crewMemberId);
                    return (
                      <div key={entry.id} className="flex items-center justify-between bg-[var(--surface3)] border border-[var(--border)] rounded-[8px] px-[12px] py-[8px]">
                        <div className="flex items-center gap-[10px]">
                          <div className="w-[32px] h-[32px] rounded-full bg-[var(--color-primary-light)] flex items-center justify-center text-[13px] font-[700] text-[var(--color-primary)] flex-shrink-0">
                            {entry.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-[13px] font-[600] text-[var(--text)]">{entry.name}</div>
                            <div className="text-[11px] text-[var(--text-3)]">
                              {entry.roleOnProject || entry.role}
                              {member && member.skills.length > 0 && ` · ${member.skills.slice(0, 2).join(', ')}`}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => removeProjectCrew(selectedProject.id, entry.id)}
                          className="text-[var(--text-3)] hover:text-[var(--color-error)] transition-colors text-[14px] w-[24px] h-[24px] flex items-center justify-center"
                          aria-label="Remove crew member"
                        >
                          ✕
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          ) : null}

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

        {/* Add Material to Project modal */}
        <Modal
          isOpen={showAddMaterialModal}
          title="Add Material to Project"
          onClose={() => setShowAddMaterialModal(false)}
          maxWidth="480px"
        >
          <div className="flex flex-col gap-[12px]">
            <Input
              label="Search materials"
              value={matSearch}
              onChange={e => setMatSearch(e.target.value)}
              placeholder="Concrete Pavers, Sod..."
            />
            <div className="max-h-[240px] overflow-y-auto space-y-[4px]">
              {filteredMaterials.length === 0 && (
                <div className="text-center py-[16px] text-[12px] text-[var(--text-3)]">No materials found</div>
              )}
              {filteredMaterials.map((mat) => {
                const alreadyAdded = assignedMaterials.some(e => e.materialId === mat.id);
                return (
                  <div key={mat.id} className={`flex items-center justify-between px-[12px] py-[8px] rounded-[6px] border transition-colors ${alreadyAdded ? 'opacity-50 bg-[var(--surface3)] border-[var(--border)]' : 'bg-[var(--surface3)] border-[var(--border)] hover:border-[var(--color-primary)] cursor-pointer'}`}
                    onClick={() => {
                      if (alreadyAdded) return;
                      const qty = parseFloat(matQty) || 1;
                      addProjectMaterial(selectedProject.id, {
                        materialId: mat.id,
                        name: mat.name,
                        quantity: qty,
                        unit: mat.unit,
                        unitCost: mat.cost,
                      });
                      setMatSearch('');
                      setMatQty('1');
                      setShowAddMaterialModal(false);
                    }}
                  >
                    <div>
                      <div className="text-[12px] font-[600] text-[var(--text)]">{mat.name}</div>
                      <div className="text-[10px] text-[var(--text-3)]">{mat.category} · ${mat.cost}/{mat.unit}</div>
                    </div>
                    {alreadyAdded ? (
                      <span className="text-[10px] text-[var(--text-4)]">Added</span>
                    ) : (
                      <span className="text-[11px] font-[600] text-[var(--color-primary)]">+ Add</span>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-[8px]">
              <Input
                label="Quantity"
                type="number"
                min="0.1"
                step="0.1"
                value={matQty}
                onChange={e => setMatQty(e.target.value)}
              />
            </div>
          </div>
        </Modal>

        {/* Crew assignment modal */}
        <Modal
          isOpen={showCrewPanel}
          title="Assign Crew to Project"
          onClose={() => setShowCrewPanel(false)}
          maxWidth="480px"
        >
          <div className="flex flex-col gap-[10px]">
            {availableCrew.length === 0 && assignedCrew.length === 0 && (
              <div className="text-center py-[24px] text-[12px] text-[var(--text-3)]">No crew members in your roster</div>
            )}
            {availableCrew.length === 0 && assignedCrew.length > 0 && (
              <div className="text-[12px] text-[var(--text-3)] text-center py-[16px]">All crew members are already assigned</div>
            )}
            {availableCrew.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between bg-[var(--surface3)] border border-[var(--border)] rounded-[8px] px-[12px] py-[10px] hover:border-[var(--color-primary)] cursor-pointer transition-colors"
                onClick={() => {
                  addProjectCrew(selectedProject.id, {
                    crewMemberId: member.id,
                    name: member.name,
                    role: member.role,
                    roleOnProject: member.role,
                  });
                }}
              >
                <div className="flex items-center gap-[10px]">
                  <div className="w-[32px] h-[32px] rounded-full bg-[var(--color-primary-light)] flex items-center justify-center text-[13px] font-[700] text-[var(--color-primary)] flex-shrink-0">
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-[13px] font-[600] text-[var(--text)]">{member.name}</div>
                    <div className="text-[11px] text-[var(--text-3)]">
                      {member.role}
                      {member.skills.length > 0 && ` · ${member.skills.slice(0, 3).join(', ')}`}
                    </div>
                  </div>
                </div>
                <span className="text-[11px] font-[600] text-[var(--color-primary)] flex-shrink-0">+ Assign</span>
              </div>
            ))}
            {assignedCrew.length > 0 && (
              <div className="mt-[8px] pt-[8px] border-t border-[var(--border)]">
                <div className="text-[10px] font-[600] text-[var(--text-4)] uppercase tracking-[0.06em] mb-[6px]">Already assigned</div>
                {assignedCrew.map(entry => (
                  <div key={entry.id} className="flex items-center gap-[8px] px-[12px] py-[6px] text-[12px] text-[var(--text-3)]">
                    <span>{entry.name}</span>
                    <span className="text-[var(--text-4)]">· {entry.role}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Modal>

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

  if (isLoading || initialLoad) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[16px]">
        {[0,1,2,3,4,5].map(i => (
          <div key={i} style={{ background: 'var(--surface-card)', border: '1px solid var(--border-default)', borderRadius: '10px', padding: '16px' }}>
            <Skeleton width="60%" height="14px" className="mb-[10px]" />
            <Skeleton width="40%" height="10px" className="mb-[16px]" />
            <Skeleton height="6px" rounded="4px" className="mb-[8px]" />
            <div className="flex gap-[8px] mt-[12px]">
              <Skeleton width="60px" height="22px" rounded="20px" />
              <Skeleton width="70px" height="22px" rounded="20px" />
            </div>
          </div>
        ))}
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
        <EmptyState
          icon={<ProjectsIcon />}
          title="Your first project starts here"
          description="Track jobs, assign crews, and manage materials all in one place."
          actionLabel="New Project"
          onAction={() => setShowNewModal(true)}
        />
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
                className="bg-[var(--surface2)] border border-[var(--border)] rounded-[10px] overflow-hidden hover:shadow-md active:shadow-sm transition-shadow duration-200 flex flex-col cursor-pointer relative"
                style={{ boxShadow: 'var(--shadow-sm)' }}
                onClick={() => setActiveProject(project.id)}
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
                  <div className="flex items-center gap-[6px] flex-shrink-0">
                    <Badge variant={status.variant}>{status.label}</Badge>
                    {/* ··· overflow menu */}
                    <div
                      className="relative"
                      ref={openMenuId === project.id ? menuRef : undefined}
                      onClick={e => e.stopPropagation()}
                    >
                      <button
                        className="w-[28px] h-[28px] flex items-center justify-center rounded-[6px] text-[var(--text-3)] hover:text-[var(--text)] hover:bg-[var(--surface3)] transition-colors"
                        onClick={() => setOpenMenuId(openMenuId === project.id ? null : project.id)}
                        aria-label="Project actions"
                      >
                        ···
                      </button>
                      {openMenuId === project.id && (
                        <div
                          className="absolute right-0 top-full mt-[4px] z-10 bg-[var(--surface2)] border border-[var(--border)] rounded-[8px] shadow-md py-[4px] min-w-[120px]"
                          style={{ boxShadow: 'var(--shadow-md)' }}
                        >
                          <button
                            className="w-full text-left px-[12px] py-[8px] text-[12px] text-[var(--color-error)] hover:bg-[var(--surface3)] transition-colors"
                            onClick={() => { setDeleteId(project.id); setOpenMenuId(null); }}
                          >
                            Delete Project
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
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
              </div>
            );
          })}
        </div>
      )}

      {/* New Project Modal — redesigned with AI Quick Create + Zone Builder */}
      {showNewModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
          onClick={e => { if (e.target === e.currentTarget) closeNewModal(); }}
        >
          <div className="w-full max-w-[640px] max-h-[90vh] overflow-y-auto rounded-xl bg-[var(--surface-card)] shadow-[var(--shadow-panel)]">

            {/* Sticky header */}
            <div className="sticky top-0 z-10 px-6 py-4 border-b border-[var(--border-default)] bg-[var(--surface-card)] flex items-center justify-between">
              <span className="text-[20px] font-[600] text-[var(--text-primary)]">New Project</span>
              <button
                onClick={closeNewModal}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-tertiary)] hover:bg-[var(--surface-hover)] transition-colors"
              >
                ✕
              </button>
            </div>

            {/* AI Quick Create */}
            <div className="px-6 py-5 border-b border-[var(--border-light)] bg-[var(--surface-bg)]">
              <div className="text-[14px] font-[600] text-[var(--text-primary)] mb-2">Describe your project</div>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="flex-1 h-[44px] px-3 rounded-lg border border-[var(--border-default)] bg-[var(--surface-card)] text-[var(--text-primary)] text-[14px] outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
                  placeholder="e.g., 3000 sqft paver patio with retaining wall"
                  value={aiDescription}
                  onChange={e => setAiDescription(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAiGenerate(); }}
                />
                <Button
                  variant="primary"
                  className="h-[44px] px-5"
                  disabled={aiLoading || !aiDescription.trim()}
                  onClick={handleAiGenerate}
                >
                  {aiLoading ? <span className="animate-spin inline-block">⌛</span> : 'Create with AI'}
                </Button>
              </div>
              {aiError && <div className="mt-2 text-[12px] text-[var(--status-red)]">{aiError}</div>}
              <div className="flex flex-wrap gap-2 mt-3">
                {[
                  '2500 sqft backyard patio with firepit',
                  'Front yard sod replacement, 4000 sqft',
                  'Retaining wall with drainage, 80 linear ft',
                  'Commercial parking lot landscape, 10000 sqft',
                ].map(chip => (
                  <button
                    key={chip}
                    onClick={() => {
                      setAiDescription(chip);
                      handleAiGenerate();
                    }}
                    className="text-[12px] px-3 py-1.5 rounded-full bg-[var(--surface-hover)] text-[var(--text-secondary)] cursor-pointer hover:bg-[var(--brand-primary-bg)] hover:text-[var(--brand-primary)] transition-colors"
                  >
                    {chip}
                  </button>
                ))}
              </div>
              {aiSuggestion && (
                <div className="mt-3 flex items-center gap-2 text-[12px] text-[var(--brand-primary)] bg-[var(--brand-primary-bg)] px-3 py-2 rounded-lg">
                  ✦ AI filled in the form below — review and adjust before saving.
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="relative py-4 px-6">
              <div className="border-t border-[var(--border-default)]" />
              <span className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 px-3 bg-[var(--surface-card)] text-[12px] text-[var(--text-tertiary)]">
                or fill in manually
              </span>
            </div>

            {/* Manual form */}
            <div className="px-6 pb-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Input
                    label="Project name"
                    required
                    value={form.name}
                    error={formErrors.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g., Oak St Patio"
                  />
                </div>
                <Input
                  label="Client"
                  required
                  value={form.client}
                  error={formErrors.client}
                  onChange={e => setForm(f => ({ ...f, client: e.target.value }))}
                  placeholder="Client name"
                />
                <AddressInput
                  label="Address"
                  required
                  value={form.address}
                  error={formErrors.address}
                  onChange={(text) => setForm(f => ({ ...f, address: text, lat: undefined, lng: undefined }))}
                  onSelect={(s: AddressSuggestion) => setForm(f => ({ ...f, address: s.address, lat: s.lat, lng: s.lng }))}
                  placeholder="123 Main St"
                />
                <div className="relative">
                  <Input
                    label="Budget"
                    type="number"
                    required
                    value={form.budget}
                    error={formErrors.budget}
                    onChange={e => setForm(f => ({ ...f, budget: e.target.value }))}
                    placeholder="0"
                    className="pl-6"
                  />
                  <span className="absolute left-3 bottom-[9px] text-[13px] text-[var(--text-tertiary)]">$</span>
                </div>
                <Input
                  label="Total area (sqft)"
                  type="number"
                  value={form.totalArea}
                  onChange={e => setForm(f => ({ ...f, totalArea: e.target.value }))}
                  placeholder="0"
                />
                <Input
                  label="Start date"
                  type="date"
                  value={form.startDate}
                  onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                />
                <Input
                  label="Target date"
                  type="date"
                  value={form.targetDate}
                  error={formErrors.targetDate}
                  onChange={e => setForm(f => ({ ...f, targetDate: e.target.value }))}
                />
                <div className="sm:col-span-2">
                  <TextArea
                    label="Description"
                    rows={3}
                    value={form.notes}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="Project overview, special requirements, access notes..."
                  />
                </div>
              </div>

              {/* Suggested materials from AI */}
              {aiSuggestion && aiSuggestion.suggestedMaterials.length > 0 && (
                <div className="mt-4">
                  <div className="text-[11px] font-[600] text-[var(--text-tertiary)] uppercase tracking-[0.06em] mb-2">
                    AI Suggested Materials — click to add
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {aiSuggestion.suggestedMaterials.map((m, i) => {
                      const added = addedMaterialIndices.has(i);
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setAddedMaterialIndices(prev => {
                            const next = new Set(prev);
                            if (next.has(i)) next.delete(i); else next.add(i);
                            return next;
                          })}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '4px 10px',
                            borderRadius: '9999px',
                            fontSize: '12px',
                            fontWeight: 500,
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'background 0.15s, color 0.15s',
                            background: added ? 'var(--status-green-bg)' : 'var(--brand-primary-bg)',
                            color: added ? 'var(--status-green)' : 'var(--brand-primary)',
                          }}
                        >
                          {added ? (
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          ) : (
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                              <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                            </svg>
                          )}
                          {added ? 'Added' : `${m.name} · ${m.estimatedQuantity} ${m.unit}`}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Pre-project checklist */}
            <div className="px-6 py-5 border-t border-[var(--border-light)]">
              <div className="text-[11px] font-[600] text-[var(--text-tertiary)] uppercase tracking-[0.06em] mb-3">
                Pre-project Checklist
              </div>
              <div className="grid grid-cols-2 gap-2">
                {CHECKLIST_ITEMS.map(({ key, label }) => {
                  const k = key as keyof Project['checklist'];
                  const aiRecommended = Boolean(aiSuggestion?.checklistSuggestions?.[k]);
                  return (
                    <label
                      key={key}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '6px 8px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        background: aiRecommended ? 'var(--brand-primary-bg)' : 'transparent',
                        border: aiRecommended ? '1px solid var(--brand-primary)' : '1px solid transparent',
                        transition: 'background 0.1s',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={formChecklist[k]}
                        onChange={e => setFormChecklist(prev => ({ ...prev, [k]: e.target.checked }))}
                        style={{ accentColor: 'var(--brand-primary)', width: '14px', height: '14px', flexShrink: 0 }}
                      />
                      <span style={{ fontSize: '13px', color: 'var(--text-primary)', flex: 1 }}>{label}</span>
                      {aiRecommended && (
                        <span style={{
                          fontSize: '9px',
                          fontWeight: 700,
                          letterSpacing: '0.04em',
                          color: 'var(--brand-primary)',
                          background: 'var(--brand-primary-bg)',
                          border: '1px solid var(--brand-primary)',
                          borderRadius: '4px',
                          padding: '1px 4px',
                          lineHeight: 1.5,
                        }}>
                          ✦ AI
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Zone Builder */}
            <div className="px-6 py-5 border-t border-[var(--border-light)]">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[14px] font-[600] text-[var(--text-primary)]">Work Zones</span>
                <button
                  onClick={() => setNewProjectZones(prev => [...prev, { name: '', area: '', color: ZONE_COLORS[0] }])}
                  className="w-9 h-9 rounded-full border border-[var(--border-default)] bg-[var(--surface-card)] hover:bg-[var(--surface-hover)] flex items-center justify-center text-[18px] text-[var(--text-secondary)] transition-colors"
                >
                  +
                </button>
              </div>
              {newProjectZones.length === 0 ? (
                <div
                  className="rounded-lg border-2 border-dashed border-[var(--border-default)] flex flex-col items-center justify-center py-8 cursor-pointer hover:border-[var(--brand-primary)] transition-colors"
                  onClick={() => setNewProjectZones([{ name: '', area: '', color: ZONE_COLORS[0] }])}
                >
                  <span className="text-[24px] mb-2 opacity-40">+</span>
                  <span className="text-[13px] text-[var(--text-tertiary)]">Add zones to break the project into sections</span>
                </div>
              ) : (
                newProjectZones.map((z, i) => (
                  <div key={i} className="p-4 rounded-lg border border-[var(--border-default)] bg-[var(--surface-bg)] mb-3">
                    <div className="grid grid-cols-[1fr_100px_auto] gap-3 items-center">
                      <input
                        type="text"
                        placeholder="e.g., Front Patio"
                        value={z.name}
                        onChange={e => setNewProjectZones(prev => prev.map((zone, idx) => idx === i ? { ...zone, name: e.target.value } : zone))}
                        className="h-[36px] px-3 rounded-lg border border-[var(--border-default)] bg-[var(--surface-card)] text-[13px] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-[var(--brand-primary)]"
                      />
                      <input
                        type="number"
                        placeholder="sqft"
                        value={z.area}
                        onChange={e => setNewProjectZones(prev => prev.map((zone, idx) => idx === i ? { ...zone, area: e.target.value } : zone))}
                        className="h-[36px] px-3 rounded-lg border border-[var(--border-default)] bg-[var(--surface-card)] text-[13px] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-[var(--brand-primary)]"
                      />
                      <button
                        onClick={() => setNewProjectZones(prev => prev.filter((_, idx) => idx !== i))}
                        className="w-7 h-7 flex items-center justify-center rounded text-[var(--text-tertiary)] hover:bg-[var(--surface-hover)] transition-colors text-[12px]"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="flex gap-2 mt-2">
                      {ZONE_COLORS.map(c => (
                        <button
                          key={c}
                          onClick={() => setNewProjectZones(prev => prev.map((zone, idx) => idx === i ? { ...zone, color: c } : zone))}
                          className="w-5 h-5 rounded-full transition-all"
                          style={{
                            backgroundColor: c,
                            border: z.color === c ? `2px solid var(--text-primary)` : '2px solid transparent',
                          }}
                        />
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Sticky footer */}
            <div className="sticky bottom-0 px-6 py-4 border-t border-[var(--border-default)] bg-[var(--surface-card)] flex justify-between">
              <Button variant="ghost" className="h-[44px]" onClick={closeNewModal}>
                Cancel
              </Button>
              <Button variant="primary" className="h-[44px]" onClick={handleCreate}>
                Create Project
              </Button>
            </div>
          </div>
        </div>
      )}

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
