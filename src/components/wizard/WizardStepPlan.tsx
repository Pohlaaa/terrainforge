/**
 * Step 3: "The Plan" — AI-generated recommendations for crew, equipment, tasks,
 * and a materials review panel.
 *
 * 3D-in-Wizard (Phase A): the legacy separate Materials step was folded into
 * Step 2's per-element sidebar (where contractors assign materials per element)
 * and this step (where they review the cumulative project materials list,
 * adjust quantities, and confirm library auto-add behavior).
 */
import React, { useState, useMemo } from 'react';
import { SuggestionPanel } from '@/components/shared/SuggestionPanel';
import type { SuggestionItem } from '@/components/shared/SuggestionPanel';
import type { WizardData, WizardTask } from '@/pages/ProjectWizard';
import type { AIRecommendationSet, CrewMember, Equipment } from '@/types';
import { useCrewStore } from '@/stores/crewStore';
import { useEquipmentStore } from '@/stores/equipmentStore';
import { getCategoryLabel, normalizeCategory } from '@/lib/categories';
import { getElementTypesForMaterial, ELEMENT_TYPE_LABELS } from '@/lib/elements';

interface Props {
  data: WizardData;
  onChange: (updates: Partial<WizardData>) => void;
  recommendations: AIRecommendationSet | null;
  aiLoading: boolean;
  orgCrew: CrewMember[];
  orgEquipment: Equipment[];
  // Separate accept/dismiss state per domain
  taskAccepted: Set<string>;
  taskDismissed: Set<string>;
  crewAccepted: Set<string>;
  crewDismissed: Set<string>;
  equipAccepted: Set<string>;
  equipDismissed: Set<string>;
  onAccept: (domain: string, id: string) => void;
  onDismiss: (domain: string, id: string) => void;
  onAcceptAll: (domain: string, ids: string[]) => void;
  onDismissAll: (domain: string, ids: string[]) => void;
}

const PHASES: Record<string, string> = {
  demo_prep: 'Demo / Prep', rough_grade: 'Rough Grade', hardscape: 'Hardscape',
  softscape: 'Softscape', irrigation: 'Irrigation', lighting: 'Lighting',
  cleanup_punchlist: 'Cleanup / Punchlist', custom: 'Custom',
};

const inputClass =
  'bg-[var(--surface)] border border-[var(--border)] rounded-[6px] px-[8px] py-[4px] text-[12px] text-[var(--text)] focus:outline-none focus:border-[var(--green)]';

function fmt(n: number): string {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export const WizardStepPlan: React.FC<Props> = ({
  data, onChange, recommendations, aiLoading, orgCrew, orgEquipment,
  taskAccepted, taskDismissed, crewAccepted, crewDismissed,
  equipAccepted, equipDismissed,
  onAccept, onDismiss, onAcceptAll, onDismissAll,
}) => {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    materials: true, crew: true, equipment: true, tasks: false,
  });

  // ── Materials review (3D-in-Wizard) ──
  // Read-only view of the project-level materialSelections accumulated from
  // Step 2's per-element sidebar. Lets the contractor adjust qty/cost in one
  // place, see element assignments, and remove anything they don't want.
  const totalMaterialsCost = useMemo(
    () => data.materialSelections.reduce((s, m) => s + m.quantity * m.unitCost, 0),
    [data.materialSelections],
  );
  const updateMatQuantity = (tempId: string, qty: number) => {
    onChange({
      materialSelections: data.materialSelections.map((m) =>
        m.tempId === tempId ? { ...m, quantity: qty } : m,
      ),
    });
  };
  const removeMaterial = (tempId: string) => {
    onChange({ materialSelections: data.materialSelections.filter((m) => m.tempId !== tempId) });
  };
  const elementAssignmentsFor = (mat: typeof data.materialSelections[number]) => {
    const category = normalizeCategory(mat.category);
    const targetTypes = getElementTypesForMaterial(category, mat.materialName);
    if (!data.elements.length || targetTypes.length === 0) return [];
    return data.elements
      .filter((el) => targetTypes.includes(el.elementType))
      .map((el) => el.name || ELEMENT_TYPE_LABELS[el.elementType]);
  };
  const [editing, setEditing] = useState<Record<string, boolean>>({
    tasks: false, crew: false, equipment: false, materials: false,
  });

  // New crew/equipment inline creation
  const crewStoreRef = useCrewStore();
  const equipStoreRef = useEquipmentStore();
  const [showNewCrew, setShowNewCrew] = useState(false);
  const [newCrewName, setNewCrewName] = useState('');
  const [newCrewRole, setNewCrewRole] = useState('installer');
  const [newCrewPhone, setNewCrewPhone] = useState('');
  const [showNewEquip, setShowNewEquip] = useState(false);
  const [newEquipName, setNewEquipName] = useState('');
  const [newEquipType, setNewEquipType] = useState('other');
  const [newEquipRate, setNewEquipRate] = useState('');

  const toggle = (section: string) => setExpanded(prev => ({ ...prev, [section]: !prev[section] }));
  const toggleEdit = (section: string) => setEditing(prev => ({ ...prev, [section]: !prev[section] }));

  // ── Task Suggestions ──
  const taskSuggestions: SuggestionItem[] = useMemo(() =>
    (recommendations?.tasks || []).map((t, i) => ({
      id: `task-${i}`,
      title: t.name,
      subtitle: PHASES[t.phase] || t.phase,
      reason: t.description || '',
      metadata: { 'Man hrs': t.estimatedHours ?? '?', Phase: PHASES[t.phase] || t.phase },
    })), [recommendations?.tasks]
  );

  const handleAcceptTask = (id: string) => {
    onAccept('tasks', id);
    const idx = parseInt(id.replace('task-', ''));
    const rec = recommendations?.tasks[idx];
    if (!rec || data.tasks.some(t => t.name === rec.name)) return;
    onChange({
      tasks: [...data.tasks, {
        tempId: crypto.randomUUID(), name: rec.name, description: rec.description || null,
        phase: rec.phase, sequenceNumber: data.tasks.length, estimatedHours: rec.estimatedHours, aiGenerated: true,
      }],
    });
  };

  // Manual task add
  const addTask = () => {
    onChange({
      tasks: [...data.tasks, {
        tempId: crypto.randomUUID(), name: '', description: null,
        phase: 'custom', sequenceNumber: data.tasks.length, estimatedHours: null,
      }],
    });
  };

  const updateTask = (tempId: string, updates: Partial<WizardTask>) => {
    onChange({ tasks: data.tasks.map(t => t.tempId === tempId ? { ...t, ...updates } : t) });
  };

  const removeTask = (tempId: string) => {
    onChange({ tasks: data.tasks.filter(t => t.tempId !== tempId).map((t, i) => ({ ...t, sequenceNumber: i })) });
  };

  // ── Crew Suggestions ──
  const crewSuggestions: SuggestionItem[] = useMemo(() =>
    (recommendations?.crew || []).map((c, i) => ({
      id: `crew-${i}`,
      title: c.crewMemberName,
      subtitle: c.role,
      reason: c.reason,
      warning: !c.isAvailable ? c.availabilityNote : undefined,
      metadata: { Role: c.role },
    })), [recommendations?.crew]
  );

  const handleAcceptCrew = (id: string) => {
    onAccept('crew', id);
    const idx = parseInt(id.replace('crew-', ''));
    const rec = recommendations?.crew[idx];
    if (!rec || data.crewSelections.some(c => c.crewMemberId === rec.crewMemberId)) return;
    onChange({
      crewSelections: [...data.crewSelections, { crewMemberId: rec.crewMemberId, name: rec.crewMemberName, role: rec.role }],
      crewSize: (data.crewSelections.length + 1),
    });
  };

  // Manual crew add
  const availableCrew = orgCrew.filter(c => !data.crewSelections.some(s => s.crewMemberId === c.id));

  const addCrewMember = (memberId: string) => {
    const member = orgCrew.find(c => c.id === memberId);
    if (!member) return;
    onChange({
      crewSelections: [...data.crewSelections, { crewMemberId: member.id, name: member.name, role: member.role }],
      crewSize: (data.crewSelections.length + 1),
    });
  };

  const removeCrew = (memberId: string) => {
    const filtered = data.crewSelections.filter(c => c.crewMemberId !== memberId);
    onChange({ crewSelections: filtered, crewSize: filtered.length });
  };

  // ── Equipment Suggestions ──
  const equipSuggestions: SuggestionItem[] = useMemo(() =>
    (recommendations?.equipment || []).map((e, i) => ({
      id: `equip-${i}`,
      title: e.equipmentName,
      subtitle: e.type,
      reason: e.reason,
      warning: !e.isAvailable ? e.availabilityNote : undefined,
      metadata: { 'Days': e.estimatedDays, 'Rate': `$${e.dailyRate}/day` },
    })), [recommendations?.equipment]
  );

  const handleAcceptEquip = (id: string) => {
    onAccept('equipment', id);
    const idx = parseInt(id.replace('equip-', ''));
    const rec = recommendations?.equipment[idx];
    if (!rec || data.equipmentSelections.some(e => e.equipmentId === rec.equipmentId)) return;
    onChange({
      equipmentSelections: [...data.equipmentSelections, {
        equipmentId: rec.equipmentId, name: rec.equipmentName, dailyRate: rec.dailyRate, durationDays: rec.estimatedDays,
      }],
    });
  };

  const removeEquipment = (equipId: string) => {
    onChange({ equipmentSelections: data.equipmentSelections.filter(e => e.equipmentId !== equipId) });
  };

  const totalManHours = data.tasks.reduce((s, t) => s + (t.estimatedHours ?? 0), 0);
  const totalEquipCost = data.equipmentSelections.reduce((s, e) => s + e.dailyRate * e.durationDays, 0);

  // Section header component
  const SectionHead = ({ title, count, onClick, open, highlight }: { title: string; count: number; onClick: () => void; open: boolean; highlight?: boolean }) => (
    <button type="button" onClick={onClick}
      className="w-full flex items-center justify-between rounded-[8px] px-[14px] py-[10px] cursor-pointer border-none transition-colors"
      style={{
        backgroundColor: highlight && !open ? 'rgba(212,164,76,0.1)' : 'var(--surface2)',
        color: 'var(--text)',
        border: highlight && !open ? '1px solid rgba(212,164,76,0.3)' : 'none',
      }}
    >
      <div className="flex items-center gap-[8px]">
        <span className="text-[14px] font-[600]">{title}</span>
        {count > 0 && <span className="text-[11px] px-[6px] py-[1px] rounded-[4px] font-[500]" style={{ backgroundColor: 'rgba(45,106,79,0.15)', color: 'var(--green-l)' }}>{count}</span>}
      </div>
      <span className="text-[var(--text-4)] text-[14px]">{open ? '▾' : '▸'}</span>
    </button>
  );

  return (
    <div className="space-y-[16px]">
      <div>
        <h3 className="text-[16px] font-[600] text-[var(--text)] mb-[4px]">The Plan</h3>
        <p className="text-[12px] text-[var(--text-4)]">
          AI has built a plan based on your job description and measurements. Review each section — accept, edit, or add your own.
        </p>
      </div>

      {/* CREW */}
      <div>
        <SectionHead title="Crew" count={data.crewSelections.length} onClick={() => toggle('crew')} open={expanded.crew} />
        {expanded.crew && (
          <div className="mt-[8px] space-y-[8px]">
            <SuggestionPanel
              title="AI Crew Recommendations"
              items={crewSuggestions}
              onAccept={handleAcceptCrew}
              onDismiss={(id) => onDismiss('crew', id)}
              onAcceptAll={() => {
                const ids = crewSuggestions.filter(s => !crewAccepted.has(s.id) && !crewDismissed.has(s.id)).map(s => s.id);
                onAcceptAll('crew', ids);
                const newCrew = ids.map(id => {
                  const idx = parseInt(id.replace('crew-', ''));
                  return recommendations?.crew[idx];
                }).filter(r => r && !data.crewSelections.some(c => c.crewMemberId === r.crewMemberId));
                if (newCrew.length > 0) {
                  const additions = newCrew.map(r => ({ crewMemberId: r!.crewMemberId, name: r!.crewMemberName, role: r!.role }));
                  onChange({ crewSelections: [...data.crewSelections, ...additions], crewSize: data.crewSelections.length + additions.length });
                }
              }}
              onDismissAll={() => { const ids = crewSuggestions.filter(s => !crewAccepted.has(s.id) && !crewDismissed.has(s.id)).map(s => s.id); onDismissAll('crew', ids); }}
              acceptedIds={crewAccepted}
              dismissedIds={crewDismissed}
              isLoading={aiLoading}
              emptyMessage="No crew recommendations — add crew members to your org first."
              onRemoveAccepted={(id) => {
                const idx = parseInt(id.replace('crew-', ''));
                const rec = recommendations?.crew[idx];
                if (rec) { removeCrew(rec.crewMemberId); onDismiss('crew', id); }
              }}
            />
            {/* Add existing or new crew member */}
            <div className="flex gap-[6px]">
              {availableCrew.length > 0 && (
                <select className={`${inputClass} flex-1`} value="" onChange={(e) => { if (e.target.value) addCrewMember(e.target.value); }}>
                  <option value="">+ Add from roster...</option>
                  {availableCrew.map(c => <option key={c.id} value={c.id}>{c.name} — {c.role}</option>)}
                </select>
              )}
              <button type="button" onClick={() => setShowNewCrew(true)}
                className="px-[10px] py-[8px] rounded-[6px] text-[11px] font-[500] cursor-pointer border whitespace-nowrap"
                style={{ borderColor: 'var(--border)', color: 'var(--green-l)', backgroundColor: 'var(--surface2)' }}>
                + New crew member
              </button>
            </div>
            {showNewCrew && (
              <div className="rounded-[8px] border p-[10px] space-y-[6px]" style={{ borderColor: 'var(--green)', backgroundColor: 'rgba(45,106,79,0.04)' }}>
                <div className="grid grid-cols-3 gap-[6px]">
                  <input className={inputClass} placeholder="Name" value={newCrewName} onChange={(e) => setNewCrewName(e.target.value)} />
                  <select className={inputClass} value={newCrewRole} onChange={(e) => setNewCrewRole(e.target.value)}>
                    <option value="owner">Owner/Operator</option>
                    <option value="foreman">Foreman</option>
                    <option value="lead">Lead</option>
                    <option value="installer">Installer</option>
                    <option value="laborer">Laborer</option>
                    <option value="specialist">Specialist</option>
                    <option value="apprentice">Apprentice</option>
                  </select>
                  <input className={inputClass} placeholder="Phone (xxx-xxx-xxxx)" maxLength={12} value={newCrewPhone} onChange={(e) => setNewCrewPhone(e.target.value)} />
                </div>
                <div className="flex gap-[6px]">
                  <button type="button" onClick={async () => {
                    if (!newCrewName.trim()) return;
                    // F-044 fix: capture the returned member directly instead of
                    // rescanning the stale closure's crew list (which would always
                    // return undefined immediately after the await).
                    const created = await crewStoreRef.addCrewMember({ name: newCrewName.trim(), role: newCrewRole as CrewMember['role'], skills: [], availability: { mon: true, tue: true, wed: true, thu: true, fri: true, sat: false, sun: false }, maxProjects: 5, notes: '', bookedDates: [], certs: [], phone: newCrewPhone.trim() });
                    if (created) {
                      // Can't call addCrewMember(created.id) — that helper
                      // reads the stale `orgCrew` closure which hasn't
                      // re-rendered yet after the Zustand update. Assign
                      // from the returned member directly instead.
                      onChange({
                        crewSelections: [...data.crewSelections, { crewMemberId: created.id, name: created.name, role: created.role }],
                        crewSize: (data.crewSelections.length + 1),
                      });
                      setNewCrewName(''); setNewCrewPhone(''); setShowNewCrew(false);
                    }
                    // If created is null the store already surfaced a toast;
                    // keep the form open so the user can retry or cancel.
                  }} className="px-[10px] py-[5px] rounded-[6px] text-[11px] font-[500] cursor-pointer border-none" style={{ backgroundColor: 'var(--green)', color: '#fff' }}>Save & Add</button>
                  <button type="button" onClick={() => setShowNewCrew(false)} className="px-[10px] py-[5px] rounded-[6px] text-[11px] cursor-pointer bg-transparent border-none" style={{ color: 'var(--text-3)' }}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* EQUIPMENT */}
      <div>
        <SectionHead title="Equipment" count={data.equipmentSelections.length} onClick={() => toggle('equipment')} open={expanded.equipment} />
        {expanded.equipment && (
          <div className="mt-[8px] space-y-[8px]">
            <SuggestionPanel
              title="AI Equipment Recommendations"
              items={equipSuggestions}
              onAccept={handleAcceptEquip}
              onDismiss={(id) => onDismiss('equipment', id)}
              onAcceptAll={() => {
                const ids = equipSuggestions.filter(s => !equipAccepted.has(s.id) && !equipDismissed.has(s.id)).map(s => s.id);
                onAcceptAll('equipment', ids);
                const newEquip = ids.map(id => {
                  const idx = parseInt(id.replace('equip-', ''));
                  return recommendations?.equipment[idx];
                }).filter(r => r && !data.equipmentSelections.some(e => e.equipmentId === r.equipmentId));
                if (newEquip.length > 0) {
                  const additions = newEquip.map(r => ({ equipmentId: r!.equipmentId, name: r!.equipmentName, dailyRate: r!.dailyRate, durationDays: r!.estimatedDays }));
                  onChange({ equipmentSelections: [...data.equipmentSelections, ...additions] });
                }
              }}
              onDismissAll={() => { const ids = equipSuggestions.filter(s => !equipAccepted.has(s.id) && !equipDismissed.has(s.id)).map(s => s.id); onDismissAll('equipment', ids); }}
              acceptedIds={equipAccepted}
              dismissedIds={equipDismissed}
              isLoading={aiLoading}
              emptyMessage="No equipment recommendations."
              onRemoveAccepted={(id) => {
                const idx = parseInt(id.replace('equip-', ''));
                const rec = recommendations?.equipment[idx];
                if (rec) { removeEquipment(rec.equipmentId); onDismiss('equipment', id); }
              }}
            />
            {/* Add existing or new equipment */}
            <div className="flex gap-[6px]">
              {orgEquipment.filter(e => !data.equipmentSelections.some(s => s.equipmentId === e.id)).length > 0 && (
                <select className={`${inputClass} flex-1`} value="" onChange={(e) => {
                  if (!e.target.value) return;
                  const equip = orgEquipment.find(eq => eq.id === e.target.value);
                  if (equip) onChange({ equipmentSelections: [...data.equipmentSelections, { equipmentId: equip.id, name: equip.name, dailyRate: equip.dailyRate, durationDays: 1 }] });
                }}>
                  <option value="">+ Add from inventory...</option>
                  {orgEquipment.filter(e => !data.equipmentSelections.some(s => s.equipmentId === e.id)).map(e => <option key={e.id} value={e.id}>{e.name} — ${e.dailyRate}/day</option>)}
                </select>
              )}
              <button type="button" onClick={() => setShowNewEquip(true)}
                className="px-[10px] py-[8px] rounded-[6px] text-[11px] font-[500] cursor-pointer border whitespace-nowrap"
                style={{ borderColor: 'var(--border)', color: 'var(--green-l)', backgroundColor: 'var(--surface2)' }}>
                + New equipment
              </button>
            </div>
            {showNewEquip && (
              <div className="rounded-[8px] border p-[10px] space-y-[6px]" style={{ borderColor: 'var(--green)', backgroundColor: 'rgba(45,106,79,0.04)' }}>
                <div className="grid grid-cols-3 gap-[6px]">
                  <input className={inputClass} placeholder="Equipment name" value={newEquipName} onChange={(e) => setNewEquipName(e.target.value)} />
                  <select className={inputClass} value={newEquipType} onChange={(e) => setNewEquipType(e.target.value)}>
                    <option value="other">Other</option>
                    <option value="Excavator">Excavator</option>
                    <option value="Mini Excavator">Mini Excavator</option>
                    <option value="Skid Steer">Skid Steer</option>
                    <option value="Compact Track Loader">Track Loader</option>
                    <option value="Dump Truck">Dump Truck</option>
                    <option value="Pickup Truck">Pickup Truck</option>
                    <option value="Trailer">Trailer</option>
                    <option value="Plate Compactor">Plate Compactor</option>
                    <option value="Trencher">Trencher</option>
                    <option value="Chainsaw">Chainsaw</option>
                    <option value="Concrete Mixer">Concrete Mixer</option>
                    <option value="Pressure Washer">Pressure Washer</option>
                  </select>
                  <input className={inputClass} type="number" min="0" placeholder="Daily rate $" value={newEquipRate} onChange={(e) => setNewEquipRate(e.target.value)} />
                </div>
                <div className="flex gap-[6px]">
                  <button type="button" onClick={async () => {
                    if (!newEquipName.trim()) return;
                    await equipStoreRef.addEquipment({
                      name: newEquipName.trim(), type: newEquipType, dailyRate: parseFloat(newEquipRate) || 0,
                      hourlyCost: null, equipmentType: null, makeModel: '', year: null, serial: '', plate: '',
                      status: 'available', assignedProject: '', location: '', operator: '', hours: 0,
                      serviceDueHours: 0, lastService: '', nextService: '', maintNotes: '', value: 0,
                      insurance: '', insuranceExpiry: '', regExpiry: '', inspectionDue: '', notes: '',
                      capabilities: [], maintenanceLog: [],
                    });
                    const created = equipStoreRef.equipment.find(e => e.name === newEquipName.trim());
                    if (created) onChange({ equipmentSelections: [...data.equipmentSelections, { equipmentId: created.id, name: created.name, dailyRate: created.dailyRate, durationDays: 1 }] });
                    setNewEquipName(''); setNewEquipRate(''); setShowNewEquip(false);
                  }} className="px-[10px] py-[5px] rounded-[6px] text-[11px] font-[500] cursor-pointer border-none" style={{ backgroundColor: 'var(--green)', color: '#fff' }}>Save & Add</button>
                  <button type="button" onClick={() => setShowNewEquip(false)} className="px-[10px] py-[5px] rounded-[6px] text-[11px] cursor-pointer bg-transparent border-none" style={{ color: 'var(--text-3)' }}>Cancel</button>
                </div>
              </div>
            )}
            {data.equipmentSelections.length > 0 && (
              <div className="text-[11px] text-[var(--text-4)] px-[4px]">Equipment cost: {fmt(totalEquipCost)}</div>
            )}
          </div>
        )}
      </div>

      {/* MATERIALS REVIEW (3D-in-Wizard) — totals, adjust qty, see element assignments */}
      <div>
        <SectionHead
          title="Materials"
          count={data.materialSelections.length}
          onClick={() => toggle('materials')}
          open={expanded.materials}
        />
        {expanded.materials && (
          <div className="mt-[8px] space-y-[6px]">
            {data.materialSelections.length === 0 ? (
              <div className="text-[12px] text-[var(--text-4)] px-[8px] py-[6px]">
                No materials yet. Add per-element materials in Step 2 (Design).
              </div>
            ) : (
              <>
                {data.materialSelections.map((m) => {
                  const assignments = elementAssignmentsFor(m);
                  return (
                    <div
                      key={m.tempId}
                      className="rounded-[6px] border p-[8px]"
                      style={{ backgroundColor: 'rgba(45,106,79,0.04)', borderColor: 'var(--border)' }}
                    >
                      <div className="flex items-center gap-[8px]">
                        <span
                          className="px-[5px] py-[1px] rounded-[3px] text-[10px] font-[500] shrink-0"
                          style={{ backgroundColor: 'rgba(45,106,79,0.12)', color: 'var(--green-l)' }}
                        >
                          {getCategoryLabel(m.category)}
                        </span>
                        <span className="text-[12px] font-[500] text-[var(--text)] flex-1 truncate">
                          {m.materialName}
                          {!m.inLibrary && (
                            <span className="text-[10px] text-[var(--status-amber)] ml-[6px]">+ new</span>
                          )}
                        </span>
                        <input
                          className="w-[64px] bg-[var(--surface)] border border-[var(--border)] rounded-[4px] px-[6px] py-[3px] text-[11px] text-[var(--text)] text-right focus:outline-none focus:border-[var(--green)]"
                          type="number"
                          min={0}
                          step={1}
                          value={m.quantity}
                          onChange={(e) => updateMatQuantity(m.tempId, parseFloat(e.target.value) || 0)}
                        />
                        <span className="text-[11px] text-[var(--text-3)] w-[36px]">{m.unit}</span>
                        <span className="text-[11px] text-[var(--text-3)] w-[60px] text-right">@ {fmt(m.unitCost)}</span>
                        <span className="text-[12px] font-[600] text-[var(--text)] w-[78px] text-right tabular-nums">
                          {fmt(m.quantity * m.unitCost)}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeMaterial(m.tempId)}
                          className="text-[var(--text-4)] hover:text-[var(--status-red)] bg-transparent border-none cursor-pointer text-[11px]"
                        >
                          ✕
                        </button>
                      </div>
                      {assignments.length > 0 && (
                        <div className="mt-[3px] pl-[2px] text-[10px] text-[var(--text-4)]">
                          Applies to: <span className="text-[var(--text-3)]">{assignments.join(', ')}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
                <div className="flex items-center justify-between pt-[6px]">
                  <span className="text-[11px] text-[var(--text-4)]">
                    {data.materialSelections.length} material{data.materialSelections.length !== 1 ? 's' : ''} ·
                    {data.materialSelections.filter((m) => !m.inLibrary).length > 0 && (
                      <span className="text-[var(--status-amber)] ml-[4px]">
                        {data.materialSelections.filter((m) => !m.inLibrary).length} will be added to your library
                      </span>
                    )}
                  </span>
                  <span className="text-[12px] font-[700] text-[var(--green-l)] tabular-nums">
                    {fmt(totalMaterialsCost)}
                  </span>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* TASKS (collapsed by default) */}
      <div>
        <SectionHead title="Tasks" count={data.tasks.length} onClick={() => toggle('tasks')} open={expanded.tasks} highlight={data.tasks.length > 0 || (recommendations?.tasks?.length ?? 0) > 0} />
        {expanded.tasks && (
          <div className="mt-[8px] space-y-[8px]">
            <SuggestionPanel
              title="AI Task Recommendations"
              items={taskSuggestions}
              onAccept={handleAcceptTask}
              onDismiss={(id) => onDismiss('tasks', id)}
              onAcceptAll={() => {
                const ids = taskSuggestions.filter(s => !taskAccepted.has(s.id) && !taskDismissed.has(s.id)).map(s => s.id);
                onAcceptAll('tasks', ids);
                const newTasks = ids.map(id => {
                  const idx = parseInt(id.replace('task-', ''));
                  return recommendations?.tasks[idx];
                }).filter(r => r && !data.tasks.some(t => t.name === r.name));
                if (newTasks.length > 0) {
                  const additions = newTasks.map((r, i) => ({
                    tempId: crypto.randomUUID(), name: r!.name, description: r!.description || null,
                    phase: r!.phase, sequenceNumber: data.tasks.length + i, estimatedHours: r!.estimatedHours, aiGenerated: true,
                  }));
                  onChange({ tasks: [...data.tasks, ...additions] });
                }
              }}
              onDismissAll={() => { const ids = taskSuggestions.filter(s => !taskAccepted.has(s.id) && !taskDismissed.has(s.id)).map(s => s.id); onDismissAll('tasks', ids); }}
              acceptedIds={taskAccepted}
              dismissedIds={taskDismissed}
              isLoading={aiLoading}
              emptyMessage="No task recommendations yet."
              onEditAccepted={() => toggleEdit('tasks')}
              onRemoveAccepted={(id) => {
                const idx = parseInt(id.replace('task-', ''));
                const rec = recommendations?.tasks[idx];
                if (rec) { onChange({ tasks: data.tasks.filter(t => t.name !== rec.name) }); onDismiss('tasks', id); }
              }}
              onAdd={addTask}
              addLabel="Add task"
            />
            {data.tasks.length > 0 && (
              <div className="text-[11px] text-[var(--text-4)] px-[4px]">{data.tasks.length} tasks · {totalManHours} man hrs</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default WizardStepPlan;
