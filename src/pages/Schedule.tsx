import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useScheduleStore } from '@/stores/scheduleStore';
import { useProjectStore } from '@/stores/projectStore';
import { useCrewStore } from '@/stores/crewStore';
import { useEquipmentStore } from '@/stores/equipmentStore';
import { useMaterialStore } from '@/stores/materialStore';
import { useOrgStore } from '@/stores/orgStore';
import { fetchAllCrewStatuses, fetchChecklistProgressCounts, fetchCrewPhotos, getPhotoUrl } from '@/services/supabaseData';
import type { CrewPhoto } from '@/services/supabaseData';
import { generateSteps } from '@/lib/workorders';
import { PageHeader } from '@/components/layout/PageHeader';
import { HelpIcon } from '@/components/shared/Tooltip';
import { toast } from '@/hooks/useToast';
import type { ScheduleEntry, ScheduleEntryStatus } from '@/types';

// ── Helpers ───────────────────────────────────────────────────────────────────

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

function formatDateHeader(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return `${days[d.getDay()]} ${d.getMonth() + 1}/${d.getDate()}`;
}

function formatWeekLabel(mondayStr: string): string {
  const d = new Date(mondayStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

/** Deterministic hue from a string */
function idToHue(id: string): number {
  let hash = 0;
  for (let i = 0; i < Math.min(6, id.length); i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 360;
}

function chipColor(projectId: string): { bg: string; text: string; border: string } {
  const hue = idToHue(projectId);
  return {
    bg: `hsl(${hue} 40% 18%)`,
    text: `hsl(${hue} 70% 75%)`,
    border: `hsl(${hue} 50% 30%)`,
  };
}

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ScheduleEntry['status'] }) {
  const map: Record<string, { label: string; color: string }> = {
    scheduled: { label: 'Scheduled', color: 'var(--text-3)' },
    in_progress: { label: 'In Progress', color: 'var(--green-l)' },
    completed: { label: 'Done', color: '#60A5FA' },
    cancelled: { label: 'Cancelled', color: '#F87171' },
  };
  const s = map[status] ?? map.scheduled;
  return (
    <span style={{ fontSize: '9px', color: s.color, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
      {s.label}
    </span>
  );
}

// ── Assignment Modal ──────────────────────────────────────────────────────────

interface AssignModalProps {
  crewMemberId: string;
  date: string;
  existingEntry?: ScheduleEntry | null;
  onClose: () => void;
}

const AssignModal: React.FC<AssignModalProps> = ({ crewMemberId, date, existingEntry, onClose }) => {
  const { projects } = useProjectStore();
  const { equipment } = useEquipmentStore();
  const { addEntry, updateEntry } = useScheduleStore();
  const [projectId, setProjectId] = useState(existingEntry?.projectId ?? '');
  const [startTime, setStartTime] = useState(existingEntry?.startTime ?? '');
  const [endTime, setEndTime] = useState(existingEntry?.endTime ?? '');
  const [notes, setNotes] = useState(existingEntry?.notes ?? '');
  const [status, setStatus] = useState<ScheduleEntryStatus>(existingEntry?.status ?? 'scheduled');
  const [equipmentId, setEquipmentId] = useState<string | null>(existingEntry?.equipmentId ?? null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!projectId) return;
    setSubmitting(true);
    if (existingEntry) {
      await updateEntry(existingEntry.id, {
        projectId,
        startTime: startTime || null,
        endTime: endTime || null,
        notes,
        status,
        equipmentId,
      });
    } else {
      await addEntry({
        projectId,
        crewMemberId,
        equipmentId,
        scheduledDate: date,
        startTime: startTime || null,
        endTime: endTime || null,
        notes,
        status: 'scheduled',
      });
    }
    setSubmitting(false);
    onClose();
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: '12px', padding: '24px', width: '380px', maxWidth: '90vw',
      }}>
        <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', marginBottom: '4px' }}>
          {existingEntry ? 'Edit Assignment' : 'Assign to Schedule'}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-3)', marginBottom: '20px' }}>
          {new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>
              Project *
            </label>
            <select
              value={projectId}
              onChange={e => setProjectId(e.target.value)}
              style={{
                width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)',
                borderRadius: '8px', color: 'var(--text)', padding: '9px 12px', fontSize: '13px', outline: 'none',
              }}
            >
              <option value="">— Select a project —</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>
              Equipment (optional)
            </label>
            <select
              value={equipmentId ?? ''}
              onChange={e => setEquipmentId(e.target.value || null)}
              style={{
                width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)',
                borderRadius: '8px', color: 'var(--text)', padding: '9px 12px', fontSize: '13px', outline: 'none',
              }}
            >
              <option value="">— None —</option>
              {equipment.filter(eq => eq.status === 'available' || eq.id === existingEntry?.equipmentId).map(eq => (
                <option key={eq.id} value={eq.id}>{eq.name} ({eq.type})</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>
                Start (optional)
              </label>
              <input
                type="time"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                style={{
                  width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)',
                  borderRadius: '8px', color: 'var(--text)', padding: '9px 12px', fontSize: '13px', outline: 'none',
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>
                End (optional)
              </label>
              <input
                type="time"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                style={{
                  width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)',
                  borderRadius: '8px', color: 'var(--text)', padding: '9px 12px', fontSize: '13px', outline: 'none',
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              style={{
                width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)',
                borderRadius: '8px', color: 'var(--text)', padding: '9px 12px', fontSize: '13px', outline: 'none',
                resize: 'none', fontFamily: 'inherit',
              }}
              placeholder="Task notes..."
            />
          </div>

          {existingEntry && (
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>
                Status
              </label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as ScheduleEntryStatus)}
                style={{
                  width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)',
                  borderRadius: '8px', color: 'var(--text)', padding: '9px 12px', fontSize: '13px', outline: 'none',
                }}
              >
                <option value="scheduled">Scheduled</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
              background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text-2)', cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!projectId || submitting}
            style={{
              padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
              background: 'var(--green)', border: 'none', color: 'white', cursor: !projectId ? 'not-allowed' : 'pointer',
              opacity: !projectId ? 0.5 : 1,
            }}
          >
            {submitting ? (existingEntry ? 'Saving…' : 'Assigning…') : (existingEntry ? 'Save' : 'Assign')}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────

export const Schedule: React.FC = () => {
  const navigate = useNavigate();
  const { entries, moveEntry, deleteEntry, getEntriesForCrewMember, hasConflict, fetchSchedule } = useScheduleStore();
  const { projects } = useProjectStore();
  const { crew } = useCrewStore();
  const { equipment } = useEquipmentStore();
  const { materials } = useMaterialStore();
  const orgId = useOrgStore((s) => s.org?.id);

  // Crew status indicators
  const [crewStatuses, setCrewStatuses] = useState<Record<string, string>>({});
  // Checklist progress counts per entry
  const [progressCounts, setProgressCounts] = useState<Record<string, number>>({});

  // Track visit for setup checklist
  useEffect(() => {
    localStorage.setItem('tf-visited-schedule', 'true');
  }, []);

  // Poll crew statuses every 30 seconds
  useEffect(() => {
    if (!orgId) return;
    const load = () => {
      fetchAllCrewStatuses(orgId).then((list) => {
        const map: Record<string, string> = {};
        for (const { crewMemberId, status } of list) map[crewMemberId] = status;
        setCrewStatuses(map);
      }).catch(() => { /* silent — polling will retry */ });
    };
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [orgId]);

  // Fetch checklist progress counts for visible entries
  // Photo counts per entry
  const [photoCounts, setPhotoCounts] = useState<Record<string, number>>({});
  // Photo gallery modal
  const [photoGallery, setPhotoGallery] = useState<{ entryId: string; photos: Array<CrewPhoto & { url: string }> } | null>(null);

  useEffect(() => {
    // Only query Supabase for entries with valid UUID IDs (skip localStorage seed IDs like "se_001")
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const ids = entries.map(e => e.id).filter(id => uuidPattern.test(id));
    if (ids.length === 0) return;
    fetchChecklistProgressCounts(ids).then(setProgressCounts).catch(() => {});
    // Fetch photo counts
    Promise.all(ids.map(async (id) => {
      const photos = await fetchCrewPhotos(id);
      return { id, count: photos.length };
    })).then((results) => {
      const counts: Record<string, number> = {};
      for (const { id, count } of results) {
        if (count > 0) counts[id] = count;
      }
      setPhotoCounts(counts);
    }).catch(() => {});
  }, [entries]);

  async function handleViewPhotos(entryId: string) {
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidPattern.test(entryId)) return;
    try {
      const photos = await fetchCrewPhotos(entryId);
      const withUrls = await Promise.all(
        photos.map(async (p) => ({ ...p, url: await getPhotoUrl(p.storagePath) }))
      );
      setPhotoGallery({ entryId, photos: withUrls });
    } catch {
      toast.error('Failed to load photos');
    }
  }

  // Week navigation
  const [weekStart, setWeekStart] = useState(() => isoDate(getMonday(new Date())));
  const [showWeekend, setShowWeekend] = useState(true);

  // Fetch schedule entries from Supabase for the visible week
  useEffect(() => {
    if (!orgId) return;
    fetchSchedule(weekStart);
  }, [orgId, weekStart, fetchSchedule]);

  // Modal state
  const [modalTarget, setModalTarget] = useState<{ crewMemberId: string; date: string } | null>(null);
  const [editEntry, setEditEntry] = useState<ScheduleEntry | null>(null);

  // Drag state
  const [dragEntryId, setDragEntryId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ crewId: string; date: string } | null>(null);

  // Build week dates
  const weekDays = useMemo(() => {
    const days: string[] = [];
    for (let i = 0; i < 7; i++) {
      days.push(addDays(weekStart, i));
    }
    return showWeekend ? days : days.slice(0, 5);
  }, [weekStart, showWeekend]);

  const todayISO = isoDate(new Date());

  function prevWeek() {
    setWeekStart(addDays(weekStart, -7));
  }

  function nextWeek() {
    setWeekStart(addDays(weekStart, 7));
  }

  function goToday() {
    setWeekStart(isoDate(getMonday(new Date())));
  }

  // Drag handlers
  function handleDragStart(e: React.DragEvent, entryId: string) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', entryId);
    setDragEntryId(entryId);
  }

  function handleDragOver(e: React.DragEvent, crewId: string, date: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTarget({ crewId, date });
  }

  function handleDragLeave() {
    setDropTarget(null);
  }

  function handleDrop(e: React.DragEvent, crewId: string, date: string) {
    e.preventDefault();
    const entryId = e.dataTransfer.getData('text/plain');
    if (entryId) {
      const entry = entries.find(en => en.id === entryId);
      if (entry) {
        const newCrewId = crewId !== entry.crewMemberId ? crewId : undefined;
        moveEntry(entryId, date, newCrewId);
      }
    }
    setDragEntryId(null);
    setDropTarget(null);
  }

  function handleDragEnd() {
    setDragEntryId(null);
    setDropTarget(null);
  }

  const projectMap = useMemo(
    () => Object.fromEntries(projects.map(p => [p.id, p.name])),
    [projects]
  );

  const equipmentMap = useMemo(
    () => Object.fromEntries(equipment.map(eq => [eq.id, eq.name])),
    [equipment]
  );

  return (
    <div>
      <PageHeader title="Schedule" subtitle="Assign crew to projects by day. Drag chips to reschedule." titleExtra={<HelpIcon tooltip="Drag crew members onto days to assign them. Click an assignment to edit details." position="right" />} />

      {/* Week nav bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', flexWrap: 'wrap',
      }}>
        <button
          onClick={prevWeek}
          style={{
            padding: '7px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
            background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text-2)', cursor: 'pointer',
          }}
        >
          ← Prev Week
        </button>
        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)', flex: 1, textAlign: 'center', minWidth: '200px' }}>
          Week of {formatWeekLabel(weekStart)}
        </div>
        <button
          onClick={nextWeek}
          style={{
            padding: '7px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
            background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text-2)', cursor: 'pointer',
          }}
        >
          Next Week →
        </button>
        <button
          onClick={goToday}
          style={{
            padding: '7px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
            background: 'var(--green)', border: 'none', color: 'white', cursor: 'pointer',
          }}
        >
          Today
        </button>
        <button
          onClick={() => setShowWeekend(s => !s)}
          style={{
            padding: '7px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
            background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text-3)', cursor: 'pointer',
          }}
        >
          {showWeekend ? '5-day' : '7-day'}
        </button>
      </div>

      {crew.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '48px 24px',
          background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '10px',
          color: 'var(--text-3)',
        }}>
          <div style={{ fontSize: '32px', marginBottom: '10px', opacity: 0.3 }}>📅</div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-2)', marginBottom: '6px' }}>Your schedule is empty</div>
          <div style={{ fontSize: '13px' }}>
            Once you have projects and crew, drag and drop assignments here to plan each work week.{' '}
            Tip: Add projects and crew members first, then come back to build your schedule.{' '}
            <button
              onClick={() => navigate('/crew')}
              style={{ background: 'none', border: 'none', color: 'var(--green-l)', cursor: 'pointer', fontSize: '13px', textDecoration: 'underline' }}
            >
              Go to Crew Manager →
            </button>
          </div>
        </div>
      ) : (
        /* Calendar grid */
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: `${weekDays.length * 120 + 140}px` }}>
            {/* Day header row */}
            <thead>
              <tr>
                <th style={{
                  width: '140px', padding: '10px 12px', fontSize: '11px', fontWeight: 700,
                  color: 'var(--text-4)', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.06em',
                  borderBottom: '1px solid var(--border)',
                }}>
                  Crew Member
                </th>
                {weekDays.map((date) => {
                  const isToday = date === todayISO;
                  return (
                    <th
                      key={date}
                      style={{
                        padding: '10px 8px', fontSize: '11px', fontWeight: 700,
                        color: isToday ? 'var(--green-l)' : 'var(--text-3)',
                        textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.05em',
                        borderBottom: '1px solid var(--border)',
                        background: isToday ? 'rgba(45,106,79,0.08)' : 'transparent',
                      }}
                    >
                      {formatDateHeader(date)}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {crew.map((member) => (
                <tr key={member.id}>
                  {/* Crew name cell */}
                  <td style={{
                    padding: '10px 12px', fontSize: '12px', fontWeight: 600,
                    color: 'var(--text-2)', borderBottom: '1px solid var(--border)',
                    whiteSpace: 'nowrap', verticalAlign: 'top',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        width: '28px', height: '28px', borderRadius: '50%',
                        background: 'var(--surface3)', border: '1px solid var(--border)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '11px', fontWeight: 700, color: 'var(--green-l)', flexShrink: 0,
                      }}>
                        {member.name.charAt(0)}
                      </div>
                      {(() => {
                        const st = crewStatuses[member.id];
                        const statusColors: Record<string, string> = {
                          en_route: '#60A5FA',
                          on_site: 'var(--green-l)',
                          on_break: '#FCD34D',
                          done: '#A78BFA',
                        };
                        const color = st ? statusColors[st] : null;
                        if (!color) return null;
                        return (
                          <span
                            title={st.replace('_', ' ')}
                            style={{
                              width: '8px', height: '8px', borderRadius: '50%',
                              background: color, flexShrink: 0,
                            }}
                          />
                        );
                      })()}
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '90px' }}>
                        {member.name}
                      </span>
                    </div>
                  </td>

                  {/* Day cells */}
                  {weekDays.map((date) => {
                    const cellEntries = getEntriesForCrewMember(member.id, date);
                    const conflict = hasConflict(member.id, date);
                    const isDropTarget =
                      dropTarget?.crewId === member.id && dropTarget?.date === date;
                    const isToday = date === todayISO;

                    return (
                      <td
                        key={date}
                        onDragOver={(e) => handleDragOver(e, member.id, date)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, member.id, date)}
                        onClick={() => {
                          setModalTarget({ crewMemberId: member.id, date });
                        }}
                        style={{
                          padding: '6px',
                          minHeight: '60px',
                          verticalAlign: 'top',
                          borderBottom: '1px solid var(--border)',
                          borderLeft: '1px solid var(--border)',
                          background: isDropTarget
                            ? 'rgba(45,106,79,0.15)'
                            : isToday
                            ? 'rgba(45,106,79,0.05)'
                            : 'transparent',
                          outline: isDropTarget ? '2px dashed var(--green-l)' : 'none',
                          cursor: 'pointer',
                          transition: 'background 0.1s',
                          position: 'relative',
                        }}
                      >
                        {/* Conflict warning */}
                        {conflict && (
                          <div
                            title={`${member.name} has multiple assignments on this day`}
                            style={{
                              position: 'absolute', top: '4px', right: '4px',
                              cursor: 'help', zIndex: 2,
                              width: '16px', height: '16px', borderRadius: '50%',
                              background: '#F59E0B', color: '#000', fontSize: '11px',
                              fontWeight: 800, display: 'flex', alignItems: 'center',
                              justifyContent: 'center', lineHeight: 1,
                            }}
                          >
                            !
                          </div>
                        )}

                        {/* Entry chips */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {cellEntries.map((entry) => {
                            const colors = chipColor(entry.projectId);
                            const projName = projectMap[entry.projectId] ?? 'Unknown';
                            const isDragging = dragEntryId === entry.id;
                            return (
                              <div
                                key={entry.id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, entry.id)}
                                onDragEnd={handleDragEnd}
                                onClick={(e) => { e.stopPropagation(); setEditEntry(entry); setModalTarget({ crewMemberId: entry.crewMemberId, date: entry.scheduledDate }); }}
                                title={`${projName}${equipmentMap[entry.equipmentId ?? ''] ? ' · ' + equipmentMap[entry.equipmentId ?? ''] : ''}${entry.startTime ? ' · ' + entry.startTime : ''}${entry.notes ? '\n' + entry.notes : ''}`}
                                style={{
                                  background: colors.bg,
                                  border: `1px solid ${colors.border}`,
                                  color: colors.text,
                                  borderRadius: '8px',
                                  padding: '4px 8px',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  cursor: 'grab',
                                  opacity: isDragging ? 0.4 : 1,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  maxWidth: '100%',
                                  userSelect: 'none',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  gap: '4px',
                                }}
                              >
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
                                  {projName}
                                  {(() => {
                                    const done = progressCounts[entry.id];
                                    if (!done) return null;
                                    const proj = projects.find(p => p.id === entry.projectId);
                                    const total = proj
                                      ? proj.zones.reduce((s, z) => s + generateSteps(z, materials).length, 0)
                                      : 0;
                                    if (total === 0) return null;
                                    return (
                                      <span style={{
                                        fontSize: '9px', fontFamily: 'monospace', marginLeft: '4px',
                                        color: done >= total ? 'var(--green-l)' : 'inherit',
                                        opacity: done >= total ? 1 : 0.7,
                                      }}>
                                        {done}/{total}
                                      </span>
                                    );
                                  })()}
                                </span>
                                {photoCounts[entry.id] > 0 && (
                                  <span
                                    onClick={(e) => { e.stopPropagation(); handleViewPhotos(entry.id); }}
                                    title={`${photoCounts[entry.id]} photo(s)`}
                                    style={{ fontSize: '9px', cursor: 'pointer', flexShrink: 0, opacity: 0.8 }}
                                  >
                                    📷{photoCounts[entry.id]}
                                  </span>
                                )}
                                <button
                                  onClick={(e) => { e.stopPropagation(); deleteEntry(entry.id); }}
                                  style={{
                                    background: 'none', border: 'none', color: colors.text,
                                    cursor: 'pointer', fontSize: '10px', padding: '0 2px',
                                    opacity: 0.6, flexShrink: 0, lineHeight: 1,
                                  }}
                                  title="Remove"
                                >
                                  ✕
                                </button>
                              </div>
                            );
                          })}
                        </div>

                        {/* "+" hover indicator */}
                        {!isDropTarget && (
                          <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            height: cellEntries.length === 0 ? '40px' : '20px',
                            opacity: 0, transition: 'opacity 0.15s',
                            color: 'var(--text-4)',
                            fontSize: cellEntries.length === 0 ? '18px' : '14px',
                            marginTop: cellEntries.length > 0 ? '2px' : '0',
                          }}
                          className="schedule-cell-plus"
                          >
                            +
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Assignment / Edit Modal */}
      {modalTarget && (
        <AssignModal
          crewMemberId={modalTarget.crewMemberId}
          date={modalTarget.date}
          existingEntry={editEntry}
          onClose={() => { setModalTarget(null); setEditEntry(null); }}
        />
      )}

      {/* Photo gallery modal */}
      {photoGallery && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 50,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={() => setPhotoGallery(null)}
        >
          <div
            style={{
              background: 'var(--surface-card)', borderRadius: '12px',
              padding: '20px', maxWidth: '640px', width: '90vw', maxHeight: '80vh',
              overflow: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>
                Job Photos ({photoGallery.photos.length})
              </div>
              <button
                onClick={() => setPhotoGallery(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontSize: '18px', cursor: 'pointer', padding: '4px' }}
              >
                ✕
              </button>
            </div>
            {photoGallery.photos.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-3)', fontSize: '13px' }}>
                No photos uploaded yet.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '8px' }}>
                {photoGallery.photos.map(p => (
                  <div key={p.id} style={{ aspectRatio: '1', borderRadius: '8px', overflow: 'hidden', background: 'var(--surface-hover)' }}>
                    <img src={p.url} alt={p.caption || 'Job photo'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ))}
              </div>
            )}
            {photoGallery.photos.length > 0 && (
              <div style={{ marginTop: '12px', fontSize: '11px', color: 'var(--text-3)' }}>
                Uploaded by crew during job execution
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        td:hover .schedule-cell-plus { opacity: 1 !important; }
      `}</style>
    </div>
  );
};

export default Schedule;
