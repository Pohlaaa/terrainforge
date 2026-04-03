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
 * Group tasks by phase, maintaining phase order.
 */
function groupTasksByPhase(tasks: WizardTask[]): Map<string, WizardTask[]> {
  const groups = new Map<string, WizardTask[]>();
  // Sort tasks by phase order first, then sequence
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
 * Schedule tasks on a timeline with phase-based parallelism and crew-aware duration.
 *
 * - Tasks within the SAME phase run in parallel (phase duration = max task duration)
 * - Tasks in DIFFERENT phases run sequentially
 * - Crew count reduces individual task duration (more crew = fewer days per task)
 * - If total phase durations exceed available weekdays, compress proportionally
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

  // First pass: calculate raw durations with phase parallelism
  const result: ScheduledTask[] = [];
  let currentDay = 0;
  const phaseDurations: number[] = [];

  for (const [phase, phaseTasks] of phases) {
    let maxDuration = 0;
    for (const task of phaseTasks) {
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
    phaseDurations.push(maxDuration);
    currentDay += maxDuration;
  }

  // Compress if total exceeds available weekdays
  const totalRawDays = currentDay;
  if (totalRawDays > totalWeekdays) {
    const ratio = totalWeekdays / totalRawDays;
    // Rebuild start days with compressed durations
    let compressedDay = 0;
    let phaseIdx = 0;
    let phaseKey = '';
    let phaseStart = 0;
    let phaseMaxCompressed = 0;

    for (const scheduled of result) {
      if (scheduled.phase !== phaseKey) {
        // New phase — advance by the max compressed duration of previous phase
        if (phaseKey !== '') {
          compressedDay = phaseStart + phaseMaxCompressed;
        }
        phaseKey = scheduled.phase;
        phaseStart = compressedDay;
        phaseMaxCompressed = 0;
        phaseIdx++;
      }
      const compressed = Math.max(1, Math.round(scheduled.durationDays * ratio));
      scheduled.startDay = phaseStart;
      scheduled.durationDays = compressed;
      phaseMaxCompressed = Math.max(phaseMaxCompressed, compressed);
    }
  }

  return result;
}
