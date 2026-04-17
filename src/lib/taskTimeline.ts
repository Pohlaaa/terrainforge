import type { WizardTask } from '@/pages/ProjectWizard';

export interface ScheduledTask {
  name: string;
  phase: string;
  startDay: number;
  /** Clock days = manHours / (8 * crewSize), rounded up */
  durationDays: number;
  /** Man hours — the base unit of labor estimation */
  estimatedHours: number;
}

const PHASE_ORDER = [
  'demo_prep',
  'rough_grade',
  'hardscape',
  'softscape',
  'irrigation',
  'lighting',
  'cleanup_punchlist',
  'custom',
];

/**
 * Get all weekdays between two dates (inclusive).
 */
function countWeekdays(start: Date, end: Date): number {
  let count = 0;
  const cur = new Date(start);
  while (cur <= end) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

/**
 * Get weekday dates between two dates for labeling.
 */
export function getWeekdayDates(startDate: string, targetDate: string): Date[] {
  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(targetDate + 'T00:00:00');
  const dates: Date[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) dates.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

/**
 * Group tasks by phase, maintaining phase order.
 */
function groupTasksByPhase(tasks: WizardTask[]): Map<string, WizardTask[]> {
  const groups = new Map<string, WizardTask[]>();
  const sorted = [...tasks].sort((a, b) => {
    const phaseA = PHASE_ORDER.indexOf(a.phase);
    const phaseB = PHASE_ORDER.indexOf(b.phase);
    if (phaseA !== phaseB) return (phaseA === -1 ? 999 : phaseA) - (phaseB === -1 ? 999 : phaseB);
    return a.sequenceNumber - b.sequenceNumber;
  });
  for (const task of sorted) {
    const existing = groups.get(task.phase);
    if (existing) {
      existing.push(task);
    } else {
      groups.set(task.phase, [task]);
    }
  }
  return groups;
}

/**
 * Group tasks within a phase by sequence number.
 * Tasks with the same sequence number run in parallel.
 * Tasks with different sequence numbers are sequential.
 */
function groupBySequence(tasks: WizardTask[]): Map<number, WizardTask[]> {
  const groups = new Map<number, WizardTask[]>();
  for (const task of tasks) {
    const seq = task.sequenceNumber;
    const existing = groups.get(seq);
    if (existing) {
      existing.push(task);
    } else {
      groups.set(seq, [task]);
    }
  }
  // Sort by sequence number
  return new Map([...groups.entries()].sort(([a], [b]) => a - b));
}

/**
 * Schedule tasks on a timeline with phase-based and sequence-based parallelism,
 * plus crew-aware duration.
 *
 * - Tasks in DIFFERENT phases run sequentially
 * - Within a phase, tasks with the SAME sequence number run in parallel
 * - Tasks with DIFFERENT sequence numbers within a phase are sequential
 * - Crew count reduces individual task duration (more crew = fewer days)
 * - If total durations exceed available weekdays, compress proportionally
 */
export function scheduleTasksOnTimeline(
  tasks: WizardTask[],
  startDate: string,
  targetDate: string,
  crewCount: number = 1
): ScheduledTask[] {
  if (tasks.length === 0) return [];

  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(targetDate + 'T00:00:00');
  const totalWeekdays = countWeekdays(start, end);
  if (totalWeekdays <= 0) return [];

  const effectiveCrew = Math.max(1, crewCount);
  const phases = groupTasksByPhase(tasks);

  // First pass: schedule with sequence-based parallelism within phases
  const result: ScheduledTask[] = [];
  let currentDay = 0;

  for (const [phase, phaseTasks] of phases) {
    const sequenceGroups = groupBySequence(phaseTasks);

    for (const [, groupTasks] of sequenceGroups) {
      let maxDuration = 0;
      for (const task of groupTasks) {
        const duration = Math.max(1, Math.ceil((task.estimatedHours ?? 8) / (8 * effectiveCrew)));
        result.push({
          name: task.name || '(untitled)',
          phase,
          startDay: currentDay,
          durationDays: duration,
          estimatedHours: task.estimatedHours ?? 0,
        });
        maxDuration = Math.max(maxDuration, duration);
      }
      currentDay += maxDuration;
    }
  }

  // Compress if total exceeds available weekdays
  const totalRawDays = currentDay;
  if (totalRawDays > totalWeekdays) {
    const ratio = totalWeekdays / totalRawDays;
    // Rebuild start days with compressed durations
    let compressedDay = 0;
    let prevPhase = '';
    let groupStart = 0;
    let groupMaxCompressed = 0;
    let prevStartDay = -1;

    for (const scheduled of result) {
      // Detect new group (different phase or different startDay)
      if (scheduled.phase !== prevPhase || scheduled.startDay !== prevStartDay) {
        if (prevPhase !== '' && scheduled.startDay !== prevStartDay) {
          compressedDay = groupStart + groupMaxCompressed;
        }
        if (scheduled.phase !== prevPhase) {
          if (prevPhase !== '') {
            compressedDay = groupStart + groupMaxCompressed;
          }
          prevPhase = scheduled.phase;
        }
        groupStart = compressedDay;
        groupMaxCompressed = 0;
        prevStartDay = scheduled.startDay;
      }
      const compressed = Math.max(1, Math.round(scheduled.durationDays * ratio));
      scheduled.startDay = groupStart;
      scheduled.durationDays = compressed;
      groupMaxCompressed = Math.max(groupMaxCompressed, compressed);
    }
  }

  return result;
}
