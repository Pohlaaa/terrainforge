/**
 * Schedule — dedicated Gantt-lite scheduling page (jbluhm V6).
 *
 * Rows = projects. Columns = days. Bar spans startDate → targetDate.
 * Drag a bar horizontally to shift both dates by the same number of days
 * (the project keeps its duration). Click a bar to open a side panel that
 * edits status, start, and target inline. Crew assignments render as small
 * chips inside the bar.
 *
 * Filters: status (multi-select), date range (presets + custom), crew member.
 *
 * Source of truth:
 *   - Bars: projects.startDate / targetDate / status (projectStore)
 *   - Chips: schedule_entries (scheduleStore.fetchEntries)
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { HubHeader } from '@/components/shared/HubHeader';
import { NavIcon } from '@/components/layout/NavIcon';
import { useProjectStore } from '@/stores/projectStore';
import { useScheduleStore } from '@/stores/scheduleStore';
import { useCrewStore } from '@/stores/crewStore';
import { useOrgStore } from '@/stores/orgStore';
import { useBillingGate } from '@/hooks/useBillingGate';
import { toast } from '@/hooks/useToast';
import type { ProjectListItem, ProjectStatus, ScheduleEntry } from '@/types';

// ── Constants ───────────────────────────────────────────────────────────────

const DAY_PX = 36;
const ROW_HEIGHT = 44;
const PROJECT_LABEL_WIDTH = 240;

const STATUS_OPTIONS: { value: ProjectStatus; label: string; color: string }[] = [
  { value: 'estimate', label: 'Estimate', color: 'var(--text-tertiary)' },
  { value: 'quoted', label: 'Quoted', color: 'var(--status-amber, #d4a44c)' },
  { value: 'approved', label: 'Approved', color: 'var(--status-blue, #4c8cd4)' },
  { value: 'scheduled', label: 'Scheduled', color: 'var(--brand-primary)' },
  { value: 'in_progress', label: 'In Progress', color: 'var(--status-green, #22c55e)' },
  { value: 'completed', label: 'Completed', color: 'var(--text-disabled)' },
  { value: 'on_hold', label: 'On Hold', color: 'var(--status-red, #ef4444)' },
];

const STATUS_COLOR: Record<ProjectStatus, string> = STATUS_OPTIONS.reduce(
  (acc, s) => ({ ...acc, [s.value]: s.color }),
  {} as Record<ProjectStatus, string>
);

type DateRangePreset = 'this_week' | 'this_month' | 'next_30' | 'next_90' | 'custom';

// ── Date helpers ────────────────────────────────────────────────────────────

// F-SCH-04: build the YYYY-MM-DD string from local-TZ getters. Was using
// `d.toISOString().split('T')[0]` which reads as UTC — for users west of
// UTC, evening hours flip "today" forward a day (4/30 evening → 5/1 UTC),
// breaking the today highlight, the Next-30 preset, and any "is today"
// comparison against project dates that were stored as local YYYY-MM-DD.
function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseDate(iso: string): Date {
  return new Date(iso + 'T00:00:00');
}

function addDays(iso: string, n: number): string {
  const d = parseDate(iso);
  d.setDate(d.getDate() + n);
  return isoDate(d);
}

function daysBetween(a: string, b: string): number {
  const ad = parseDate(a).getTime();
  const bd = parseDate(b).getTime();
  return Math.round((bd - ad) / (24 * 60 * 60 * 1000));
}

function getMonday(d: Date): Date {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const mon = new Date(d);
  mon.setDate(d.getDate() + diff);
  return mon;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function presetRange(preset: DateRangePreset, customStart: string, customEnd: string): { start: string; end: string } {
  const today = new Date();
  switch (preset) {
    case 'this_week': {
      const mon = getMonday(today);
      const sun = new Date(mon);
      sun.setDate(mon.getDate() + 6);
      return { start: isoDate(mon), end: isoDate(sun) };
    }
    case 'this_month':
      return { start: isoDate(startOfMonth(today)), end: isoDate(endOfMonth(today)) };
    case 'next_30':
      return { start: isoDate(today), end: addDays(isoDate(today), 29) };
    case 'next_90':
      return { start: isoDate(today), end: addDays(isoDate(today), 89) };
    case 'custom':
      return { start: customStart, end: customEnd };
  }
}

function formatDayHeader(iso: string): { weekday: string; day: string } {
  const d = parseDate(iso);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return { weekday: days[d.getDay()], day: `${d.getMonth() + 1}/${d.getDate()}` };
}

function isWeekend(iso: string): boolean {
  const d = parseDate(iso).getDay();
  return d === 0 || d === 6;
}

function isToday(iso: string): boolean {
  return iso === isoDate(new Date());
}

// ── Component ───────────────────────────────────────────────────────────────

const Schedule: React.FC = () => {
  const projects = useProjectStore((s) => s.projects);
  const updateProject = useProjectStore((s) => s.updateProject);
  const fetchProjects = useProjectStore((s) => s.fetchProjects);
  const entries = useScheduleStore((s) => s.entries);
  const fetchEntries = useScheduleStore((s) => s.fetchEntries);
  const crew = useCrewStore((s) => s.crew);
  const org = useOrgStore((s) => s.org);
  const { readOnly } = useBillingGate();

  // Filters
  const [statusFilter, setStatusFilter] = useState<Set<ProjectStatus>>(
    () => new Set(['approved', 'scheduled', 'in_progress'])
  );
  const [datePreset, setDatePreset] = useState<DateRangePreset>('this_month');
  const [customStart, setCustomStart] = useState(isoDate(startOfMonth(new Date())));
  const [customEnd, setCustomEnd] = useState(isoDate(endOfMonth(new Date())));
  const [crewFilter, setCrewFilter] = useState<string>('');

  const range = useMemo(
    () => presetRange(datePreset, customStart, customEnd),
    [datePreset, customStart, customEnd]
  );

  // Fetch entries when date range changes
  useEffect(() => {
    if (!org?.id) return;
    fetchEntries(org.id, range.start, range.end);
  }, [org?.id, range.start, range.end, fetchEntries]);

  // Build day list from range
  const days = useMemo(() => {
    const total = daysBetween(range.start, range.end) + 1;
    if (total <= 0 || total > 366) return [];
    return Array.from({ length: total }, (_, i) => addDays(range.start, i));
  }, [range.start, range.end]);

  // Filter projects
  const visibleProjects = useMemo(() => {
    return projects.filter((p) => {
      const status = p.status ?? 'estimate';
      if (!statusFilter.has(status)) return false;
      if (crewFilter) {
        const projectEntries = entries.filter((e) => e.projectId === p.id);
        if (!projectEntries.some((e) => e.crewMemberId === crewFilter)) return false;
      }
      // Show projects whose dates intersect the visible range, OR projects
      // with no dates (estimate/quoted) so contractor can drag them onto
      // the timeline.
      if (!p.startDate && !p.targetDate) return true;
      const pStart = p.startDate || p.targetDate;
      const pEnd = p.targetDate || p.startDate;
      if (!pStart || !pEnd) return true;
      return !(pEnd < range.start || pStart > range.end);
    });
  }, [projects, statusFilter, crewFilter, entries, range.start, range.end]);

  // Group entries by project
  const entriesByProject = useMemo(() => {
    const map: Record<string, ScheduleEntry[]> = {};
    for (const e of entries) {
      if (!map[e.projectId]) map[e.projectId] = [];
      map[e.projectId].push(e);
    }
    return map;
  }, [entries]);

  // Refresh project list once on mount in case nav came from somewhere stale
  useEffect(() => {
    if (org?.id) fetchProjects(org.id);
  }, [org?.id, fetchProjects]);

  // ── Drag state ───────────────────────────────────────────────────────────

  const [drag, setDrag] = useState<{
    projectId: string;
    startX: number;
    originalStart: string;
    originalEnd: string;
    deltaDays: number;
  } | null>(null);

  // F-SCH-05: track whether the mouse moved during the press so the trailing
  // click event can be suppressed after a drag. Without this, every drag
  // pops the edit panel because click fires after mouseup with deltaDays
  // already reset to 0.
  const dragHappenedRef = useRef(false);

  function handleBarMouseDown(e: React.MouseEvent, project: ProjectListItem) {
    if (readOnly) return;
    if (!project.startDate || !project.targetDate) return;
    e.preventDefault();
    dragHappenedRef.current = false;
    setDrag({
      projectId: project.id,
      startX: e.clientX,
      originalStart: project.startDate,
      originalEnd: project.targetDate,
      deltaDays: 0,
    });
  }

  useEffect(() => {
    if (!drag) return;
    const onMove = (ev: MouseEvent) => {
      const dx = ev.clientX - drag.startX;
      // 4px movement counts as drag-not-click for click suppression.
      if (Math.abs(dx) > 4) dragHappenedRef.current = true;
      const days = Math.round(dx / DAY_PX);
      if (days !== drag.deltaDays) {
        setDrag((d) => (d ? { ...d, deltaDays: days } : d));
      }
    };
    const onUp = async () => {
      const finalDelta = drag.deltaDays;
      const finalProjectId = drag.projectId;
      const finalStart = drag.originalStart;
      const finalEnd = drag.originalEnd;
      setDrag(null);
      if (finalDelta === 0) return;
      const newStart = addDays(finalStart, finalDelta);
      const newEnd = addDays(finalEnd, finalDelta);
      try {
        await updateProject(finalProjectId, { startDate: newStart, targetDate: newEnd });
        toast.success(`Rescheduled ${finalDelta > 0 ? '+' : ''}${finalDelta} day${Math.abs(finalDelta) === 1 ? '' : 's'}`);
      } catch {
        toast.error('Failed to reschedule');
      }
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [drag, updateProject]);

  // ── Side panel ───────────────────────────────────────────────────────────

  const [editingId, setEditingId] = useState<string | null>(null);
  const editingProject = projects.find((p) => p.id === editingId) ?? null;

  // ── Render ───────────────────────────────────────────────────────────────

  const totalWidth = days.length * DAY_PX;

  return (
    <div className="space-y-4">
      <HubHeader />

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Schedule</h2>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            Drag a project bar to reschedule. Click to edit dates and status.
          </p>
        </div>
        <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
          {visibleProjects.length} project{visibleProjects.length === 1 ? '' : 's'} · {days.length} day{days.length === 1 ? '' : 's'}
        </div>
      </div>

      {/* Filters */}
      <div
        className="rounded-xl p-3 flex flex-wrap items-center gap-3"
        style={{ background: 'var(--surface-card)', border: '1px solid var(--border-default)' }}
      >
        {/* Status pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {STATUS_OPTIONS.map((s) => {
            const active = statusFilter.has(s.value);
            return (
              <button
                key={s.value}
                onClick={() => {
                  setStatusFilter((prev) => {
                    const next = new Set(prev);
                    if (next.has(s.value)) next.delete(s.value); else next.add(s.value);
                    return next;
                  });
                }}
                className="text-[11px] font-medium px-2.5 py-1 rounded-full cursor-pointer border transition-colors"
                style={{
                  background: active ? s.color : 'transparent',
                  color: active ? 'var(--text-on-primary, #fff)' : 'var(--text-secondary)',
                  borderColor: active ? s.color : 'var(--border-default)',
                }}
              >
                {s.label}
              </button>
            );
          })}
        </div>

        <div className="h-5 w-px" style={{ background: 'var(--border-default)' }} />

        {/* Date range */}
        <div className="flex items-center gap-1.5">
          {([
            ['this_week', 'This Week'],
            ['this_month', 'This Month'],
            ['next_30', 'Next 30'],
            ['next_90', 'Next 90'],
          ] as Array<[DateRangePreset, string]>).map(([val, label]) => (
            <button
              key={val}
              onClick={() => setDatePreset(val)}
              className="text-[11px] font-medium px-2.5 py-1 rounded-md cursor-pointer border transition-colors"
              style={{
                background: datePreset === val ? 'var(--brand-primary)' : 'transparent',
                color: datePreset === val ? 'var(--text-on-primary, #fff)' : 'var(--text-secondary)',
                borderColor: datePreset === val ? 'var(--brand-primary)' : 'var(--border-default)',
              }}
            >
              {label}
            </button>
          ))}
          <button
            onClick={() => setDatePreset('custom')}
            className="text-[11px] font-medium px-2.5 py-1 rounded-md cursor-pointer border transition-colors"
            style={{
              background: datePreset === 'custom' ? 'var(--brand-primary)' : 'transparent',
              color: datePreset === 'custom' ? 'var(--text-on-primary, #fff)' : 'var(--text-secondary)',
              borderColor: datePreset === 'custom' ? 'var(--brand-primary)' : 'var(--border-default)',
            }}
          >
            Custom
          </button>
          {datePreset === 'custom' && (
            <>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="text-xs px-2 py-1 rounded-md"
                style={{ background: 'var(--surface-bg)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
              />
              <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>→</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="text-xs px-2 py-1 rounded-md"
                style={{ background: 'var(--surface-bg)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
              />
            </>
          )}
        </div>

        <div className="h-5 w-px" style={{ background: 'var(--border-default)' }} />

        {/* Crew filter */}
        <select
          value={crewFilter}
          onChange={(e) => setCrewFilter(e.target.value)}
          className="text-xs px-2 py-1 rounded-md cursor-pointer"
          style={{ background: 'var(--surface-bg)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
        >
          <option value="">All crew</option>
          {crew.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Gantt grid */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: 'var(--surface-card)', border: '1px solid var(--border-default)' }}
      >
        {visibleProjects.length === 0 ? (
          <div className="p-12 text-center">
            <NavIcon name="calendar" size={32} />
            <div className="mt-3 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              No projects in this view
            </div>
            <div className="mt-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>
              Adjust the status pills or date range to see more, or create a project from the Projects tab.
            </div>
          </div>
        ) : (
          <GanttGrid
            days={days}
            projects={visibleProjects}
            entriesByProject={entriesByProject}
            crew={crew}
            onBarMouseDown={handleBarMouseDown}
            onBarClick={(id) => {
              if (dragHappenedRef.current) {
                dragHappenedRef.current = false;
                return;
              }
              setEditingId(id);
            }}
            drag={drag}
            totalWidth={totalWidth}
          />
        )}
      </div>

      {/* Side panel */}
      {editingProject && (
        <EditPanel
          project={editingProject}
          onClose={() => setEditingId(null)}
          onSave={async (updates) => {
            await updateProject(editingProject.id, updates);
            toast.success('Project updated');
            setEditingId(null);
          }}
          readOnly={readOnly}
        />
      )}
    </div>
  );
};

// ── Gantt sub-component ─────────────────────────────────────────────────────

interface GanttGridProps {
  days: string[];
  projects: ProjectListItem[];
  entriesByProject: Record<string, ScheduleEntry[]>;
  crew: ReturnType<typeof useCrewStore.getState>['crew'];
  onBarMouseDown: (e: React.MouseEvent, project: ProjectListItem) => void;
  onBarClick: (id: string) => void;
  drag: { projectId: string; deltaDays: number } | null;
  totalWidth: number;
}

const GanttGrid: React.FC<GanttGridProps> = ({
  days, projects, entriesByProject, crew, onBarMouseDown, onBarClick, drag, totalWidth,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to today on mount.
  // F-SCH-01: original `useEffect` ran before the inner timeline content
  // had its computed width laid out, so `scrollLeft` silently capped at 0.
  // Defer one frame so layout is committed before we set scrollLeft.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const todayIdx = days.findIndex(isToday);
    if (todayIdx < 0) return;
    const target = Math.max(0, todayIdx * DAY_PX - 120);
    const id = requestAnimationFrame(() => {
      if (scrollRef.current) scrollRef.current.scrollLeft = target;
    });
    return () => cancelAnimationFrame(id);
  }, [days]);

  return (
    <div className="flex">
      {/* Sticky project labels */}
      <div
        className="flex-shrink-0"
        style={{ width: PROJECT_LABEL_WIDTH, borderRight: '1px solid var(--border-default)' }}
      >
        {/* Header spacer */}
        <div
          className="flex items-center px-3 text-[10px] font-bold uppercase tracking-wider"
          style={{ height: 48, color: 'var(--text-tertiary)', background: 'var(--surface-bg)', borderBottom: '1px solid var(--border-default)' }}
        >
          Project
        </div>
        {projects.map((p) => {
          const status = p.status ?? 'estimate';
          return (
            <div
              key={p.id}
              className="flex items-center px-3 gap-2"
              style={{ height: ROW_HEIGHT, borderBottom: '1px solid var(--border-light, var(--border-default))' }}
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: STATUS_COLOR[status] }}
                title={STATUS_OPTIONS.find((s) => s.value === status)?.label}
              />
              <button
                onClick={() => onBarClick(p.id)}
                className="text-[12px] font-medium truncate cursor-pointer border-none bg-transparent text-left"
                style={{ color: 'var(--text-primary)' }}
                title={p.name}
              >
                {p.name}
              </button>
            </div>
          );
        })}
      </div>

      {/* Scrollable timeline */}
      <div ref={scrollRef} className="flex-1 overflow-x-auto">
        <div style={{ width: totalWidth, position: 'relative' }}>
          {/* Day headers */}
          <div
            className="flex"
            style={{ height: 48, background: 'var(--surface-bg)', borderBottom: '1px solid var(--border-default)' }}
          >
            {days.map((d) => {
              const { weekday, day } = formatDayHeader(d);
              const today = isToday(d);
              const wknd = isWeekend(d);
              return (
                <div
                  key={d}
                  className="flex-shrink-0 flex flex-col items-center justify-center"
                  style={{
                    width: DAY_PX,
                    background: today ? 'var(--brand-primary-bg, rgba(59,130,246,0.08))' : wknd ? 'var(--surface-card)' : 'transparent',
                    borderRight: '1px solid var(--border-light, var(--border-default))',
                  }}
                >
                  <div
                    className="text-[9px] uppercase font-medium"
                    style={{ color: today ? 'var(--brand-primary)' : 'var(--text-tertiary)' }}
                  >
                    {weekday}
                  </div>
                  <div
                    className="text-[11px] font-semibold"
                    style={{ color: today ? 'var(--brand-primary)' : wknd ? 'var(--text-tertiary)' : 'var(--text-secondary)' }}
                  >
                    {day}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Project rows */}
          {projects.map((p) => (
            <ProjectRow
              key={p.id}
              project={p}
              days={days}
              entries={entriesByProject[p.id] ?? []}
              crew={crew}
              dragDeltaDays={drag?.projectId === p.id ? drag.deltaDays : 0}
              onMouseDown={(e) => onBarMouseDown(e, p)}
              onClick={() => onBarClick(p.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

// ── Single row ──────────────────────────────────────────────────────────────

interface ProjectRowProps {
  project: ProjectListItem;
  days: string[];
  entries: ScheduleEntry[];
  crew: ReturnType<typeof useCrewStore.getState>['crew'];
  dragDeltaDays: number;
  onMouseDown: (e: React.MouseEvent) => void;
  onClick: () => void;
}

const ProjectRow: React.FC<ProjectRowProps> = ({
  project, days, entries, crew, dragDeltaDays, onMouseDown, onClick,
}) => {
  const status = project.status ?? 'estimate';
  const color = STATUS_COLOR[status];

  const rangeStart = days[0];
  const rangeEnd = days[days.length - 1];

  // Compute bar offset + width in pixels.
  let bar: { left: number; width: number } | null = null;
  if (project.startDate && project.targetDate && rangeStart && rangeEnd) {
    const shiftedStart = addDays(project.startDate, dragDeltaDays);
    const shiftedEnd = addDays(project.targetDate, dragDeltaDays);
    // Clip to visible range
    const clipStart = shiftedStart < rangeStart ? rangeStart : shiftedStart;
    const clipEnd = shiftedEnd > rangeEnd ? rangeEnd : shiftedEnd;
    if (clipEnd >= clipStart) {
      const startIdx = daysBetween(rangeStart, clipStart);
      const endIdx = daysBetween(rangeStart, clipEnd);
      bar = {
        left: startIdx * DAY_PX,
        width: Math.max(DAY_PX, (endIdx - startIdx + 1) * DAY_PX),
      };
    }
  }

  return (
    <div
      className="relative"
      style={{
        height: ROW_HEIGHT,
        borderBottom: '1px solid var(--border-light, var(--border-default))',
      }}
    >
      {/* Day grid lines */}
      <div className="absolute inset-0 flex">
        {days.map((d) => (
          <div
            key={d}
            className="flex-shrink-0"
            style={{
              width: DAY_PX,
              background: isWeekend(d) ? 'var(--surface-card)' : 'transparent',
              borderRight: '1px solid var(--border-light, var(--border-default))',
            }}
          />
        ))}
      </div>

      {/* Bar */}
      {bar ? (
        <div
          className="absolute flex items-center px-2 gap-1 rounded-md cursor-grab active:cursor-grabbing select-none transition-shadow"
          onMouseDown={onMouseDown}
          onClick={(e) => {
            // Only fire click if no drag happened
            if (Math.abs(dragDeltaDays) === 0) onClick();
            e.stopPropagation();
          }}
          style={{
            top: 6,
            left: bar.left + 2,
            width: bar.width - 4,
            height: ROW_HEIGHT - 12,
            background: color,
            color: 'var(--text-on-primary, #fff)',
            boxShadow: dragDeltaDays !== 0 ? '0 4px 12px rgba(0,0,0,0.18)' : 'var(--shadow-card)',
            opacity: dragDeltaDays !== 0 ? 0.85 : 1,
          }}
          title={`${project.name} · ${project.startDate} → ${project.targetDate}${dragDeltaDays !== 0 ? ` (drag ${dragDeltaDays > 0 ? '+' : ''}${dragDeltaDays}d)` : ''}`}
        >
          <span className="text-[11px] font-semibold truncate flex-1">{project.name}</span>
          {entries.slice(0, 3).map((e) => {
            const c = crew.find((cm) => cm.id === e.crewMemberId);
            const initials = c?.name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() ?? '?';
            return (
              <span
                key={e.id}
                className="inline-flex items-center justify-center text-[9px] font-bold rounded-full flex-shrink-0"
                style={{
                  width: 18,
                  height: 18,
                  background: 'rgba(255,255,255,0.25)',
                  color: 'var(--text-on-primary, #fff)',
                }}
                title={c?.name ?? 'Unknown crew'}
              >
                {initials}
              </span>
            );
          })}
          {entries.length > 3 && (
            <span className="text-[9px] font-semibold flex-shrink-0" style={{ opacity: 0.85 }}>
              +{entries.length - 3}
            </span>
          )}
        </div>
      ) : (
        // No dates — render a hint button on the left of the row
        <button
          onClick={onClick}
          className="absolute flex items-center px-2 rounded-md text-[10px] cursor-pointer border bg-transparent"
          style={{
            top: 10,
            left: 4,
            height: ROW_HEIGHT - 20,
            color: 'var(--text-tertiary)',
            borderColor: 'var(--border-default)',
            borderStyle: 'dashed',
          }}
        >
          + Set dates
        </button>
      )}
    </div>
  );
};

// ── Side panel for inline edit ──────────────────────────────────────────────

interface EditPanelProps {
  project: ProjectListItem;
  onClose: () => void;
  onSave: (updates: { startDate?: string; targetDate?: string; status?: ProjectStatus }) => Promise<void>;
  readOnly: boolean;
}

const EditPanel: React.FC<EditPanelProps> = ({ project, onClose, onSave, readOnly }) => {
  const [start, setStart] = useState(project.startDate ?? '');
  const [end, setEnd] = useState(project.targetDate ?? '');
  const [status, setStatus] = useState<ProjectStatus>(project.status ?? 'estimate');
  const [saving, setSaving] = useState(false);

  // Re-sync when project changes
  useEffect(() => {
    setStart(project.startDate ?? '');
    setEnd(project.targetDate ?? '');
    setStatus(project.status ?? 'estimate');
  }, [project.id, project.startDate, project.targetDate, project.status]);

  async function handleSave() {
    if (saving) return;
    if (start && end && end < start) {
      toast.error('Target date is before start date');
      return;
    }
    setSaving(true);
    const updates: { startDate?: string; targetDate?: string; status?: ProjectStatus } = {};
    if (start !== (project.startDate ?? '')) updates.startDate = start;
    if (end !== (project.targetDate ?? '')) updates.targetDate = end;
    if (status !== (project.status ?? 'estimate')) updates.status = status;
    if (Object.keys(updates).length === 0) {
      onClose();
      return;
    }
    try {
      await onSave(updates);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.4)' }}
      />
      {/* Panel */}
      <div
        className="fixed right-0 top-0 bottom-0 z-50 flex flex-col"
        style={{
          width: 'min(420px, 100vw)',
          background: 'var(--surface-card)',
          borderLeft: '1px solid var(--border-default)',
          boxShadow: 'var(--shadow-panel)',
        }}
      >
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: '1px solid var(--border-default)' }}
        >
          <div>
            <div className="text-xs uppercase font-medium tracking-wide" style={{ color: 'var(--text-tertiary)' }}>
              Edit
            </div>
            <div className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
              {project.name}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center cursor-pointer border-none bg-transparent rounded-md"
            style={{ color: 'var(--text-secondary)' }}
            aria-label="Close"
          >
            <NavIcon name="x" size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div>
            <label className="text-[11px] font-semibold uppercase block mb-1.5" style={{ color: 'var(--text-tertiary)' }}>
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ProjectStatus)}
              disabled={readOnly}
              className="w-full px-3 py-2 text-sm rounded-md cursor-pointer disabled:opacity-50"
              style={{ background: 'var(--surface-bg)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
            <p className="text-[10px] mt-1" style={{ color: 'var(--text-tertiary)' }}>
              Approved → Scheduled freezes a manifest snapshot.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold uppercase block mb-1.5" style={{ color: 'var(--text-tertiary)' }}>
                Start
              </label>
              <input
                type="date"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                disabled={readOnly}
                className="w-full px-3 py-2 text-sm rounded-md disabled:opacity-50"
                style={{ background: 'var(--surface-bg)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase block mb-1.5" style={{ color: 'var(--text-tertiary)' }}>
                Target
              </label>
              <input
                type="date"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                disabled={readOnly}
                className="w-full px-3 py-2 text-sm rounded-md disabled:opacity-50"
                style={{ background: 'var(--surface-bg)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
              />
            </div>
          </div>

          {start && end && (
            <div className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
              Duration: {daysBetween(start, end) + 1} day{daysBetween(start, end) === 0 ? '' : 's'}
            </div>
          )}

          <Link
            to={`/projects/${project.id}`}
            className="inline-flex items-center gap-1.5 text-[12px] font-medium"
            style={{ color: 'var(--brand-primary)' }}
          >
            Open project →
          </Link>
        </div>

        <div
          className="flex items-center justify-end gap-2 px-4 py-3"
          style={{ borderTop: '1px solid var(--border-default)' }}
        >
          <button
            onClick={onClose}
            className="px-3 py-2 text-sm font-medium rounded-md cursor-pointer border"
            style={{ borderColor: 'var(--border-default)', background: 'transparent', color: 'var(--text-secondary)' }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || readOnly}
            className="px-3 py-2 text-sm font-semibold rounded-md cursor-pointer border-none disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'var(--brand-primary)', color: 'var(--text-on-primary, #fff)' }}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </>
  );
};

export default Schedule;
