import type { WizardTask } from '@/pages/ProjectWizard';

export interface ScheduledTask {
  name: string;
  phase: string;
  startDay: number;
  durationDays: number;
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
 * Schedule tasks sequentially on a timeline.
 * Tasks are sorted by phase order, then by sequence number.
 * If total task days exceed available weekdays, compress proportionally.
 */
export function scheduleTasksOnTimeline(
  tasks: WizardTask[],
  startDate: string,
  targetDate: string
): ScheduledTask[] {
  if (tasks.length === 0) return [];

  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(targetDate + 'T00:00:00');
  const totalWeekdays = countWeekdays(start, end);
  if (totalWeekdays <= 0) return [];

  // Sort by phase order, then sequence
  const sorted = [...tasks].sort((a, b) => {
    const phaseA = PHASE_ORDER.indexOf(a.phase);
    const phaseB = PHASE_ORDER.indexOf(b.phase);
    if (phaseA !== phaseB) return (phaseA === -1 ? 999 : phaseA) - (phaseB === -1 ? 999 : phaseB);
    return a.sequenceNumber - b.sequenceNumber;
  });

  // Calculate raw durations
  const rawDurations = sorted.map((t) =>
    Math.max(1, Math.ceil((t.estimatedHours ?? 8) / 8))
  );
  const totalRawDays = rawDurations.reduce((s, d) => s + d, 0);

  // Compress if needed
  const compressionRatio = totalRawDays > totalWeekdays ? totalWeekdays / totalRawDays : 1;

  let currentDay = 0;
  return sorted.map((task, i) => {
    const duration = Math.max(1, Math.round(rawDurations[i] * compressionRatio));
    const scheduled: ScheduledTask = {
      name: task.name || '(untitled)',
      phase: task.phase,
      startDay: currentDay,
      durationDays: duration,
      estimatedHours: task.estimatedHours ?? 0,
    };
    currentDay += duration;
    return scheduled;
  });
}
