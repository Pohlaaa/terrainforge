import React, { useState, useMemo, useEffect } from 'react';
import { useCrewStore } from '@/stores/crewStore';
import { useEquipmentStore } from '@/stores/equipmentStore';
import { useScheduleStore } from '@/stores/scheduleStore';
import { useProjectStore } from '@/stores/projectStore';
import { useOrgStore } from '@/stores/orgStore';
import { HubHeader } from '@/components/shared/HubHeader';
import { Modal } from '@/components/shared/Modal';
import { NavIcon } from '@/components/layout/NavIcon';
import { toast } from '@/hooks/useToast';
import { formatPhoneNumber } from '@/utils/validation';
import { useBillingGate } from '@/hooks/useBillingGate';
import { EQUIPMENT_TYPES } from '@/types';
import { searchEquipment, formatEquipmentDisplay } from '@/lib/equipmentKnowledge';
import type { EquipmentTemplate } from '@/lib/equipmentKnowledge';
import { CrewEquipmentKPIs } from '@/components/crew/CrewEquipmentKPIs';
import { CrewTable } from '@/components/crew/CrewTable';
import { EquipmentTable } from '@/components/crew/EquipmentTable';
import type { CrewMember, Equipment, ScheduleEntry } from '@/types';

// ── Helpers ──────────────────────────────────────────────────────────────────

function getMonday(d: Date): Date {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const mon = new Date(d);
  mon.setDate(d.getDate() + diff);
  return mon;
}

function isoDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return isoDate(d);
}

function formatDayHeader(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return `${days[d.getDay()]} ${d.getMonth() + 1}/${d.getDate()}`;
}

function formatWeekRange(mondayStr: string): string {
  const mon = new Date(mondayStr + 'T00:00:00');
  const fri = new Date(mondayStr + 'T00:00:00');
  fri.setDate(fri.getDate() + 4);
  const moStr = mon.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const frStr = fri.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${moStr} - ${frStr}`;
}

// ── Component ────────────────────────────────────────────────────────────────

const CrewEquipmentHub: React.FC = () => {
  const crew = useCrewStore((s) => s.crew);
  const crewLoading = useCrewStore((s) => s.isLoading);
  const addCrewMember = useCrewStore((s) => s.addCrewMember);
  const equipment = useEquipmentStore((s) => s.equipment);
  const equipLoading = useEquipmentStore((s) => s.isLoading);
  const addEquipment = useEquipmentStore((s) => s.addEquipment);
  const updateEquipment = useEquipmentStore((s) => s.updateEquipment);
  const assignments = useScheduleStore((s) => s.assignments);
  const entries = useScheduleStore((s) => s.entries);
  const fetchEntries = useScheduleStore((s) => s.fetchEntries);
  const fetchAssignments = useScheduleStore((s) => s.fetchAssignments);
  const projects = useProjectStore((s) => s.projects);
  const org = useOrgStore((s) => s.org);
  const { readOnly } = useBillingGate();

  // Schedule week navigation
  const [weekStart, setWeekStart] = useState(() => isoDate(getMonday(new Date())));

  // Modals
  const [showAddCrew, setShowAddCrew] = useState(false);
  const [showAddEquip, setShowAddEquip] = useState(false);

  // Crew form
  const [crewName, setCrewName] = useState('');
  const [crewRole, setCrewRole] = useState<CrewMember['role']>('installer');
  const [crewPhone, setCrewPhone] = useState('');

  // Equipment form
  const [equipName, setEquipName] = useState('');
  const [equipType, setEquipType] = useState('');
  const [equipHourlyCost, setEquipHourlyCost] = useState('');
  const [equipSuggestions, setEquipSuggestions] = useState<EquipmentTemplate[]>([]);
  const [showEquipSuggestions, setShowEquipSuggestions] = useState(false);

  // Equipment edit modal
  const [editEquipId, setEditEquipId] = useState<string | null>(null);
  const editEquip = equipment.find(e => e.id === editEquipId) ?? null;

  // Fetch schedule data
  useEffect(() => {
    if (!org?.id) return;
    const weekEnd = addDays(weekStart, 6);
    fetchEntries(org.id, weekStart, weekEnd);
    fetchAssignments(org.id);
  }, [org?.id, weekStart, fetchEntries, fetchAssignments]);

  // ── KPI computations ────────────────────────────────────────────────────

  const assignedCrewIds = useMemo(() => {
    return new Set(assignments.map(a => a.crewMemberId));
  }, [assignments]);

  const availableCrew = useMemo(() => {
    return crew.filter(c => !assignedCrewIds.has(c.id));
  }, [crew, assignedCrewIds]);

  const maintenanceDue = useMemo(() => {
    const soon = new Date();
    soon.setDate(soon.getDate() + 7);
    return equipment.filter(e => {
      if (!e.nextService) return false;
      return new Date(e.nextService) <= soon;
    });
  }, [equipment]);

  // ── Schedule data for week ──────────────────────────────────────────────

  const weekDays = useMemo(() => {
    return Array.from({ length: 5 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  const entriesByDay = useMemo(() => {
    const map: Record<string, ScheduleEntry[]> = {};
    for (const day of weekDays) {
      map[day] = entries.filter(e => e.scheduledDate === day);
    }
    return map;
  }, [entries, weekDays]);

  // Get assignment info for crew member
  function getCrewAssignment(crewMemberId: string): string | null {
    const assignment = assignments.find(a => a.crewMemberId === crewMemberId);
    if (!assignment) return null;
    const project = projects.find(p => p.id === assignment.projectId);
    return project?.name || 'Assigned';
  }

  // ── Handlers ────────────────────────────────────────────────────────────

  async function handleAddCrew() {
    if (!crewName.trim()) return;
    await addCrewMember({
      name: crewName.trim(),
      role: crewRole,
      phone: crewPhone.trim() || null,
      skills: [],
      availability: { mon: true, tue: true, wed: true, thu: true, fri: true, sat: false, sun: false },
      maxProjects: 2,
      notes: '',
      bookedDates: [],
      certs: [],
    });
    toast.success(`${crewName.trim()} added`);
    setCrewName(''); setCrewRole('installer'); setCrewPhone('');
    setShowAddCrew(false);
  }

  async function handleAddEquipment() {
    if (!equipName.trim()) return;
    await addEquipment({
      name: equipName.trim(),
      type: equipType || 'other',
      hourlyCost: equipHourlyCost ? parseFloat(equipHourlyCost) : null,
      equipmentType: equipType || null,
      makeModel: '', year: null, serial: '', plate: '',
      status: 'available', assignedProject: '', location: '',
      operator: '', hours: 0, serviceDueHours: 0, lastService: '',
      nextService: '', maintNotes: '', value: 0, dailyRate: 0,
      insurance: '', insuranceExpiry: '', regExpiry: '',
      inspectionDue: '', notes: '', capabilities: [], maintenanceLog: [],
    });
    toast.success(`${equipName.trim()} added`);
    setEquipName(''); setEquipType(''); setEquipHourlyCost('');
    setShowAddEquip(false);
  }

  // ── Loading ─────────────────────────────────────────────────────────────

  if (crewLoading && crew.length === 0) {
    return (
      <div className="py-8 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[1,2,3,4].map(i => <div key={i} className="skeleton-shimmer rounded-lg h-20" />)}
        </div>
        <div className="skeleton-shimmer rounded-lg h-64" />
        <div className="skeleton-shimmer rounded-lg h-48" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <HubHeader />

      <CrewEquipmentKPIs
        crewCount={crew.length}
        availableCount={availableCrew.length}
        equipmentCount={equipment.length}
        maintenanceDueCount={maintenanceDue.length}
      />

      {/* Equipment Details Prompt — shows when equipment has missing details */}
      {equipment.filter(e => !e.hours && !e.insurance && !e.lastService).length > 0 && (
        <div className="rounded-[10px] border p-[14px] flex items-start gap-[12px]" style={{ backgroundColor: 'rgba(212,164,76,0.08)', borderColor: 'rgba(212,164,76,0.3)' }}>
          <span className="text-[18px] shrink-0">⚙️</span>
          <div className="flex-1">
            <div className="text-[13px] font-[600] text-[var(--text)] mb-[4px]">Complete your equipment profiles</div>
            <p className="text-[12px] text-[var(--text-3)] mb-[8px]">
              {equipment.filter(e => !e.hours && !e.insurance && !e.lastService).length} piece(s) of equipment are missing details like clock hours, insurance, maintenance history, and service schedules.
              Complete these now to enable maintenance alerts and accurate equipment costing.
            </p>
            <div className="flex flex-wrap gap-[6px] text-[11px]">
              <span className="px-[6px] py-[2px] rounded-[4px]" style={{ backgroundColor: 'rgba(212,164,76,0.15)', color: 'var(--status-amber)' }}>Clock hours</span>
              <span className="px-[6px] py-[2px] rounded-[4px]" style={{ backgroundColor: 'rgba(212,164,76,0.15)', color: 'var(--status-amber)' }}>Service due hours</span>
              <span className="px-[6px] py-[2px] rounded-[4px]" style={{ backgroundColor: 'rgba(212,164,76,0.15)', color: 'var(--status-amber)' }}>Last service date</span>
              <span className="px-[6px] py-[2px] rounded-[4px]" style={{ backgroundColor: 'rgba(212,164,76,0.15)', color: 'var(--status-amber)' }}>Insurance provider</span>
              <span className="px-[6px] py-[2px] rounded-[4px]" style={{ backgroundColor: 'rgba(212,164,76,0.15)', color: 'var(--status-amber)' }}>Insurance expiry</span>
              <span className="px-[6px] py-[2px] rounded-[4px]" style={{ backgroundColor: 'rgba(212,164,76,0.15)', color: 'var(--status-amber)' }}>Serial number</span>
              <span className="px-[6px] py-[2px] rounded-[4px]" style={{ backgroundColor: 'rgba(212,164,76,0.15)', color: 'var(--status-amber)' }}>Equipment value</span>
              <span className="px-[6px] py-[2px] rounded-[4px]" style={{ backgroundColor: 'rgba(212,164,76,0.15)', color: 'var(--status-amber)' }}>Year</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Split View: Crew Cards + Weekly Schedule ────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CrewTable
          crew={crew}
          getCrewAssignment={getCrewAssignment}
          readOnly={readOnly}
          onAddCrew={() => setShowAddCrew(true)}
        />

        {/* Weekly Schedule Grid */}
        <div
          className="rounded-xl p-4"
          style={{ background: 'var(--surface-card)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-card)' }}
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Weekly Schedule</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setWeekStart(addDays(weekStart, -7))}
                className="w-7 h-7 flex items-center justify-center cursor-pointer border-none bg-transparent rounded-md transition-colors"
                style={{ color: 'var(--text-secondary)' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-hover)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <NavIcon name="chevron-left" size={16} />
              </button>
              <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                {formatWeekRange(weekStart)}
              </span>
              <button
                onClick={() => setWeekStart(addDays(weekStart, 7))}
                className="w-7 h-7 flex items-center justify-center cursor-pointer border-none bg-transparent rounded-md transition-colors"
                style={{ color: 'var(--text-secondary)' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-hover)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <NavIcon name="chevron-right" size={16} />
              </button>
            </div>
          </div>
          <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
            {weekDays.map(day => {
              const dayEntries = entriesByDay[day] || [];
              return (
                <div key={day} className="flex gap-2">
                  <div
                    className="w-16 flex-shrink-0 text-xs font-medium py-2"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {formatDayHeader(day)}
                  </div>
                  <div className="flex-1 min-h-[36px]">
                    {dayEntries.length === 0 ? (
                      <div className="py-2 text-xs" style={{ color: 'var(--text-disabled)' }}>—</div>
                    ) : (
                      <div className="flex flex-wrap gap-1 py-1">
                        {dayEntries.map(entry => {
                          const project = projects.find(p => p.id === entry.projectId);
                          const crewMember = crew.find(c => c.id === entry.crewMemberId);
                          return (
                            <span
                              key={entry.id}
                              className="text-[10px] px-2 py-1 rounded-md font-medium"
                              style={{ background: 'var(--brand-primary-bg)', color: 'var(--brand-primary)' }}
                              title={`${crewMember?.name || 'Unknown'} - ${project?.name || 'Unknown project'}`}
                            >
                              {/* F-CW-50: avoid mid-word truncation. Trim
                                  at the last whitespace ≤ 15 chars and add
                                  an ellipsis. Title attr above shows full
                                  name on hover. */}
                              {(() => {
                                const n = project?.name ?? '?';
                                if (n.length <= 15) return n;
                                const cut = n.slice(0, 15);
                                const lastSpace = cut.lastIndexOf(' ');
                                return (lastSpace > 6 ? cut.slice(0, lastSpace) : cut) + '\u2026';
                              })()} ({crewMember?.name?.split(' ')[0] || '?'})
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <EquipmentTable
        equipment={equipment}
        readOnly={readOnly}
        onAddEquipment={() => setShowAddEquip(true)}
        onEditEquipment={(id) => setEditEquipId(id)}
        projects={projects.map(p => ({ id: p.id, name: p.name }))}
      />

      {/* ── Add Crew Modal ─────────────────────────────────────────────────── */}
      <Modal isOpen={showAddCrew} onClose={() => setShowAddCrew(false)} title="Add Crew Member">
        <div className="space-y-3 p-1">
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>Name</label>
            <input
              value={crewName}
              onChange={(e) => setCrewName(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-md"
              style={{ background: 'var(--surface-bg)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
              placeholder="Full name"
            />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>Role</label>
            <select
              value={crewRole}
              onChange={(e) => setCrewRole(e.target.value as CrewMember['role'])}
              className="w-full px-3 py-2 text-sm rounded-md cursor-pointer"
              style={{ background: 'var(--surface-bg)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
            >
              <option value="owner">Owner/Operator</option>
              <option value="foreman">Foreman</option>
              <option value="lead">Lead</option>
              <option value="installer">Installer</option>
              <option value="laborer">Laborer</option>
              <option value="specialist">Specialist</option>
              <option value="apprentice">Apprentice</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>Phone</label>
            <input
              value={crewPhone}
              onChange={(e) => setCrewPhone(formatPhoneNumber(e.target.value))}
              className="w-full px-3 py-2 text-sm rounded-md"
              style={{ background: 'var(--surface-bg)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
              placeholder="xxx-xxx-xxxx"
              maxLength={12}
            />
          </div>
          <button
            onClick={handleAddCrew}
            disabled={!crewName.trim()}
            className="w-full py-2.5 text-sm font-semibold rounded-lg cursor-pointer border-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'var(--brand-primary)', color: 'var(--text-on-primary)' }}
          >
            Add Crew Member
          </button>
        </div>
      </Modal>

      {/* ── Add Equipment Modal ────────────────────────────────────────────── */}
      {/* Add Equipment Modal — with autofill */}
      <Modal isOpen={showAddEquip} onClose={() => { setShowAddEquip(false); setEquipSuggestions([]); setShowEquipSuggestions(false); }} title="Add Equipment">
        <div className="space-y-3 p-1">
          <div className="relative">
            <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>Make & Model</label>
            <input value={equipName}
              onChange={(e) => {
                setEquipName(e.target.value);
                if (e.target.value.length > 0) {
                  const results = searchEquipment(e.target.value);
                  setEquipSuggestions(results);
                  setShowEquipSuggestions(results.length > 0);
                } else {
                  setEquipSuggestions([]); setShowEquipSuggestions(false);
                }
              }}
              className="w-full px-3 py-2 text-sm rounded-md"
              style={{ background: 'var(--surface-bg)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
              placeholder="Start typing — e.g., Bobcat, CAT, STIHL..."
            />
            {showEquipSuggestions && equipSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 rounded-[8px] border shadow-lg z-20 max-h-[200px] overflow-y-auto" style={{ background: 'var(--surface-card)', borderColor: 'var(--border-default)' }}>
                {equipSuggestions.map((s, i) => (
                  <button key={i} type="button" onClick={() => {
                    setEquipName(`${s.make} ${s.model}`);
                    setEquipType(s.type);
                    setEquipHourlyCost(String(s.typicalHourlyRate));
                    setShowEquipSuggestions(false);
                  }} className="w-full text-left px-3 py-2 text-[13px] hover:bg-[var(--surface-hover)] border-b last:border-b-0 bg-transparent border-x-0 border-t-0 cursor-pointer" style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}>
                    {formatEquipmentDisplay(s)}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>Type</label>
            <select value={equipType} onChange={(e) => setEquipType(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-md cursor-pointer"
              style={{ background: 'var(--surface-bg)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}>
              <option value="">Select type...</option>
              {EQUIPMENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>Hourly Cost ($)</label>
            <input value={equipHourlyCost} onChange={(e) => setEquipHourlyCost(e.target.value)} type="number"
              className="w-full px-3 py-2 text-sm rounded-md"
              style={{ background: 'var(--surface-bg)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
              placeholder="85" />
          </div>
          <button onClick={handleAddEquipment} disabled={!equipName.trim()}
            className="w-full py-2.5 text-sm font-semibold rounded-lg cursor-pointer border-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'var(--brand-primary)', color: 'var(--text-on-primary)' }}>
            Add Equipment
          </button>
        </div>
      </Modal>

      {/* Edit Equipment Modal — full details */}
      <Modal isOpen={!!editEquipId} onClose={() => setEditEquipId(null)} title={`Edit: ${editEquip?.name || 'Equipment'}`} maxWidth="640px">
        {editEquip && (
          <div className="space-y-4 p-1">
            {/* Basic Info */}
            <div className="text-[10px] font-[600] uppercase text-[var(--text-tertiary)]">Basic Info</div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>Name</label>
                <input defaultValue={editEquip.name} onBlur={(e) => updateEquipment(editEquip.id, { name: e.target.value })} className="w-full px-3 py-2 text-sm rounded-md" style={{ background: 'var(--surface-bg)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }} /></div>
              <div><label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>Make & Model</label>
                <input defaultValue={editEquip.makeModel} onBlur={(e) => updateEquipment(editEquip.id, { makeModel: e.target.value })} className="w-full px-3 py-2 text-sm rounded-md" style={{ background: 'var(--surface-bg)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }} /></div>
              <div><label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>Type</label>
                <select defaultValue={editEquip.type} onChange={(e) => updateEquipment(editEquip.id, { type: e.target.value })} className="w-full px-3 py-2 text-sm rounded-md cursor-pointer" style={{ background: 'var(--surface-bg)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}>
                  {EQUIPMENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select></div>
              <div><label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>Year</label>
                <input type="number" defaultValue={editEquip.year ?? ''} onBlur={(e) => updateEquipment(editEquip.id, { year: e.target.value ? parseInt(e.target.value) : null })} className="w-full px-3 py-2 text-sm rounded-md" style={{ background: 'var(--surface-bg)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }} placeholder="2023" /></div>
              <div><label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>Serial Number</label>
                <input defaultValue={editEquip.serial} onBlur={(e) => updateEquipment(editEquip.id, { serial: e.target.value })} className="w-full px-3 py-2 text-sm rounded-md" style={{ background: 'var(--surface-bg)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }} /></div>
              <div><label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>License Plate</label>
                <input defaultValue={editEquip.plate} onBlur={(e) => updateEquipment(editEquip.id, { plate: e.target.value })} className="w-full px-3 py-2 text-sm rounded-md" style={{ background: 'var(--surface-bg)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }} /></div>
            </div>

            {/* Rates & Value */}
            <div className="text-[10px] font-[600] uppercase text-[var(--text-tertiary)] pt-2">Rates & Value</div>
            <div className="grid grid-cols-3 gap-3">
              <div><label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>Hourly Cost ($)</label>
                <input type="number" defaultValue={editEquip.hourlyCost ?? ''} onBlur={(e) => updateEquipment(editEquip.id, { hourlyCost: e.target.value ? parseFloat(e.target.value) : null })} className="w-full px-3 py-2 text-sm rounded-md" style={{ background: 'var(--surface-bg)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }} /></div>
              <div><label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>Daily Rate ($)</label>
                <input type="number" defaultValue={editEquip.dailyRate ?? ''} onBlur={(e) => updateEquipment(editEquip.id, { dailyRate: e.target.value ? parseFloat(e.target.value) : 0 })} className="w-full px-3 py-2 text-sm rounded-md" style={{ background: 'var(--surface-bg)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }} /></div>
              <div><label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>Equipment Value ($)</label>
                <input type="number" defaultValue={editEquip.value ?? ''} onBlur={(e) => updateEquipment(editEquip.id, { value: e.target.value ? parseFloat(e.target.value) : 0 })} className="w-full px-3 py-2 text-sm rounded-md" style={{ background: 'var(--surface-bg)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }} /></div>
            </div>

            {/* Hours & Maintenance */}
            <div className="text-[10px] font-[600] uppercase text-[var(--text-tertiary)] pt-2">Hours & Maintenance</div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>Current Hours</label>
                <input type="number" defaultValue={editEquip.hours ?? ''} onBlur={(e) => updateEquipment(editEquip.id, { hours: e.target.value ? parseFloat(e.target.value) : 0 })} className="w-full px-3 py-2 text-sm rounded-md" style={{ background: 'var(--surface-bg)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }} placeholder="0" /></div>
              <div><label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>Service Due Hours</label>
                <input type="number" defaultValue={editEquip.serviceDueHours ?? ''} onBlur={(e) => updateEquipment(editEquip.id, { serviceDueHours: e.target.value ? parseFloat(e.target.value) : 0 })} className="w-full px-3 py-2 text-sm rounded-md" style={{ background: 'var(--surface-bg)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }} placeholder="500" /></div>
              <div><label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>Last Service Date</label>
                <input type="date" defaultValue={editEquip.lastService} onBlur={(e) => updateEquipment(editEquip.id, { lastService: e.target.value })} className="w-full px-3 py-2 text-sm rounded-md" style={{ background: 'var(--surface-bg)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }} /></div>
              <div><label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>Next Service Date</label>
                <input type="date" defaultValue={editEquip.nextService} onBlur={(e) => updateEquipment(editEquip.id, { nextService: e.target.value })} className="w-full px-3 py-2 text-sm rounded-md" style={{ background: 'var(--surface-bg)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }} /></div>
            </div>

            {/* Insurance & Registration */}
            <div className="text-[10px] font-[600] uppercase text-[var(--text-tertiary)] pt-2">Insurance & Registration</div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>Insurance Provider</label>
                <input defaultValue={editEquip.insurance} onBlur={(e) => updateEquipment(editEquip.id, { insurance: e.target.value })} className="w-full px-3 py-2 text-sm rounded-md" style={{ background: 'var(--surface-bg)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }} /></div>
              <div><label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>Insurance Expiry</label>
                <input type="date" defaultValue={editEquip.insuranceExpiry} onBlur={(e) => updateEquipment(editEquip.id, { insuranceExpiry: e.target.value })} className="w-full px-3 py-2 text-sm rounded-md" style={{ background: 'var(--surface-bg)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }} /></div>
              <div><label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>Registration Expiry</label>
                <input type="date" defaultValue={editEquip.regExpiry} onBlur={(e) => updateEquipment(editEquip.id, { regExpiry: e.target.value })} className="w-full px-3 py-2 text-sm rounded-md" style={{ background: 'var(--surface-bg)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }} /></div>
              <div><label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>Inspection Due</label>
                <input type="date" defaultValue={editEquip.inspectionDue} onBlur={(e) => updateEquipment(editEquip.id, { inspectionDue: e.target.value })} className="w-full px-3 py-2 text-sm rounded-md" style={{ background: 'var(--surface-bg)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }} /></div>
            </div>

            {/* Status & Notes */}
            <div className="text-[10px] font-[600] uppercase text-[var(--text-tertiary)] pt-2">Status & Notes</div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>Status</label>
                <select defaultValue={editEquip.status} onChange={(e) => updateEquipment(editEquip.id, { status: e.target.value as Equipment['status'] })} className="w-full px-3 py-2 text-sm rounded-md cursor-pointer" style={{ background: 'var(--surface-bg)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}>
                  <option value="available">Available</option><option value="in-use">In Use</option><option value="maintenance">Maintenance</option><option value="out-of-service">Out of Service</option>
                </select></div>
              <div><label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>Location</label>
                <input defaultValue={editEquip.location} onBlur={(e) => updateEquipment(editEquip.id, { location: e.target.value })} className="w-full px-3 py-2 text-sm rounded-md" style={{ background: 'var(--surface-bg)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }} placeholder="Main yard" /></div>
            </div>
            <div><label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>Notes</label>
              <textarea defaultValue={editEquip.notes} onBlur={(e) => updateEquipment(editEquip.id, { notes: e.target.value })} className="w-full px-3 py-2 text-sm rounded-md resize-y" style={{ background: 'var(--surface-bg)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', minHeight: 60 }} /></div>

            <button onClick={() => { toast.success('Equipment updated'); setEditEquipId(null); }}
              className="w-full py-2.5 text-sm font-semibold rounded-lg cursor-pointer border-none"
              style={{ background: 'var(--brand-primary)', color: 'var(--text-on-primary)' }}>
              Done
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default CrewEquipmentHub;
