import React, { useState, useMemo, useEffect } from 'react';
import { useCrewStore } from '@/stores/crewStore';
import { useEquipmentStore } from '@/stores/equipmentStore';
import { useScheduleStore } from '@/stores/scheduleStore';
import { useProjectStore } from '@/stores/projectStore';
import { useOrgStore } from '@/stores/orgStore';
import { Badge } from '@/components/shared/Badge';
import { Modal } from '@/components/shared/Modal';
import { NavIcon } from '@/components/layout/NavIcon';
import { toast } from '@/hooks/useToast';
import { formatPhoneNumber } from '@/utils/validation';
import { useBillingGate } from '@/hooks/useBillingGate';
import { EQUIPMENT_TYPES } from '@/types';
import type { CrewMember, Equipment, ScheduleEntry, ProjectCrewAssignment } from '@/types';

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

const ROLE_BADGE: Record<string, 'green' | 'amber' | 'blue' | 'purple' | 'teal' | 'red'> = {
  foreman: 'green', lead: 'teal', installer: 'blue',
  laborer: 'amber', specialist: 'purple', apprentice: 'amber',
};

// ── Component ────────────────────────────────────────────────────────────────

const CrewEquipmentHub: React.FC = () => {
  const crew = useCrewStore((s) => s.crew);
  const crewLoading = useCrewStore((s) => s.isLoading);
  const addCrewMember = useCrewStore((s) => s.addCrewMember);
  const equipment = useEquipmentStore((s) => s.equipment);
  const equipLoading = useEquipmentStore((s) => s.isLoading);
  const addEquipment = useEquipmentStore((s) => s.addEquipment);
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
      {/* ── KPI Cards ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="kpi-card-accent rounded-lg p-4" style={{ background: 'var(--surface-card)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-card)' }}>
          <div className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-tertiary)' }}>Total Crew</div>
          <div className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>{crew.length}</div>
        </div>
        <div className="kpi-card-accent rounded-lg p-4" style={{ background: 'var(--surface-card)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-card)' }}>
          <div className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-tertiary)' }}>Available</div>
          <div className="text-2xl font-semibold" style={{ color: availableCrew.length > 0 ? 'var(--status-green)' : 'var(--text-primary)' }}>{availableCrew.length}</div>
        </div>
        <div className="kpi-card-accent rounded-lg p-4" style={{ background: 'var(--surface-card)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-card)' }}>
          <div className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-tertiary)' }}>Total Equipment</div>
          <div className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>{equipment.length}</div>
        </div>
        <div className="kpi-card-accent rounded-lg p-4" style={{ background: 'var(--surface-card)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-card)' }}>
          <div className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-tertiary)' }}>Maintenance Due</div>
          <div className="text-2xl font-semibold" style={{ color: maintenanceDue.length > 0 ? 'var(--status-amber)' : 'var(--text-primary)' }}>{maintenanceDue.length}</div>
        </div>
      </div>

      {/* ── Split View: Crew Cards + Weekly Schedule ────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Crew Cards */}
        <div
          className="rounded-xl p-4"
          style={{ background: 'var(--surface-card)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-card)' }}
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Crew Members</h2>
            {!readOnly && (
              <button
                onClick={() => setShowAddCrew(true)}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md cursor-pointer border-none transition-colors"
                style={{ background: 'var(--brand-primary)', color: '#FFFFFF' }}
              >
                + Add
              </button>
            )}
          </div>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {crew.length === 0 ? (
              <div className="text-center py-8 text-sm" style={{ color: 'var(--text-tertiary)' }}>
                No crew members yet. Add your first team member.
              </div>
            ) : (
              crew.map(member => {
                const assignment = getCrewAssignment(member.id);
                return (
                  <div
                    key={member.id}
                    className="rounded-lg p-3 transition-colors cursor-pointer"
                    style={{ background: 'var(--surface-bg)', border: '1px solid var(--border-default)' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-strong)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-default)'; }}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{member.name}</span>
                          {member.phone && (
                            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                              <NavIcon name="phone" size={12} />
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5">
                          <Badge variant={ROLE_BADGE[member.role] || 'blue'}>{member.role}</Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <span
                          className="text-xs font-medium"
                          style={{ color: assignment ? 'var(--text-secondary)' : 'var(--status-green)' }}
                        >
                          {assignment || 'Available'}
                        </span>
                      </div>
                    </div>
                    {member.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {member.skills.slice(0, 4).map(skill => (
                          <span
                            key={skill}
                            className="text-[10px] px-1.5 py-0.5 rounded-md"
                            style={{ background: 'var(--surface-hover)', color: 'var(--text-tertiary)' }}
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

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
                              {project?.name?.slice(0, 15) || '?'} ({crewMember?.name?.split(' ')[0] || '?'})
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

      {/* ── Equipment Table ────────────────────────────────────────────────── */}
      <div
        className="rounded-xl"
        style={{ background: 'var(--surface-card)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-card)' }}
      >
        <div className="flex items-center justify-between p-3">
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Equipment</h2>
          {!readOnly && (
            <button
              onClick={() => setShowAddEquip(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md cursor-pointer border-none transition-colors"
              style={{ background: 'var(--brand-primary)', color: '#FFFFFF' }}
            >
              + Add Equipment
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr style={{ background: 'var(--surface-hover)' }}>
                <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Name</th>
                <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Type</th>
                <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Status</th>
                <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider hidden md:table-cell" style={{ color: 'var(--text-tertiary)' }}>Hourly Cost</th>
                <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider hidden lg:table-cell" style={{ color: 'var(--text-tertiary)' }}>Next Maintenance</th>
                <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider hidden lg:table-cell" style={{ color: 'var(--text-tertiary)' }}>Assigned</th>
              </tr>
            </thead>
            <tbody>
              {equipment.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>
                    No equipment yet. Add your first piece of equipment.
                  </td>
                </tr>
              ) : (
                equipment.map(equip => {
                  const statusBadge: Record<string, 'green' | 'amber' | 'blue' | 'red'> = {
                    'available': 'green', 'in-use': 'blue', 'maintenance': 'amber', 'out-of-service': 'red',
                  };
                  const typeLabel = EQUIPMENT_TYPES.find(t => t.value === equip.equipmentType)?.label || equip.type || '—';
                  return (
                    <tr
                      key={equip.id}
                      className="border-t transition-colors"
                      style={{ borderColor: 'var(--border-default)' }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-hover)'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                    >
                      <td className="px-3 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>{equip.name}</td>
                      <td className="px-3 py-3" style={{ color: 'var(--text-secondary)' }}>{typeLabel}</td>
                      <td className="px-3 py-3"><Badge variant={statusBadge[equip.status] || 'blue'}>{equip.status}</Badge></td>
                      <td className="px-3 py-3 hidden md:table-cell" style={{ color: 'var(--text-secondary)' }}>
                        {equip.hourlyCost ? `$${equip.hourlyCost}/hr` : '—'}
                      </td>
                      <td className="px-3 py-3 hidden lg:table-cell" style={{ color: 'var(--text-secondary)' }}>
                        {equip.nextService ? new Date(equip.nextService).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-3 py-3 hidden lg:table-cell" style={{ color: 'var(--text-secondary)' }}>
                        {equip.assignedProject || '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

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
            style={{ background: 'var(--brand-primary)', color: '#FFFFFF' }}
          >
            Add Crew Member
          </button>
        </div>
      </Modal>

      {/* ── Add Equipment Modal ────────────────────────────────────────────── */}
      <Modal isOpen={showAddEquip} onClose={() => setShowAddEquip(false)} title="Add Equipment">
        <div className="space-y-3 p-1">
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>Name</label>
            <input
              value={equipName}
              onChange={(e) => setEquipName(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-md"
              style={{ background: 'var(--surface-bg)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
              placeholder="Equipment name"
            />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>Type</label>
            <select
              value={equipType}
              onChange={(e) => setEquipType(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-md cursor-pointer"
              style={{ background: 'var(--surface-bg)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
            >
              <option value="">Select type...</option>
              {EQUIPMENT_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>Hourly Cost ($)</label>
            <input
              value={equipHourlyCost}
              onChange={(e) => setEquipHourlyCost(e.target.value)}
              type="number"
              className="w-full px-3 py-2 text-sm rounded-md"
              style={{ background: 'var(--surface-bg)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
              placeholder="85"
            />
          </div>
          <button
            onClick={handleAddEquipment}
            disabled={!equipName.trim()}
            className="w-full py-2.5 text-sm font-semibold rounded-lg cursor-pointer border-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'var(--brand-primary)', color: '#FFFFFF' }}
          >
            Add Equipment
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default CrewEquipmentHub;
