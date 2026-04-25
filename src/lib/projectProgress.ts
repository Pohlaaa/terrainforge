/**
 * Unified Project Progress — Stage-Gate Model
 *
 * Progress is computed from 5 weighted gates that represent the project lifecycle.
 * Each gate contributes to the overall percentage. A project must pass through
 * all gates to reach 100%.
 *
 * Gates and weights:
 *   1. Setup (10%)     — project has elements/measurements defined
 *   2. Planning (15%)  — tasks created + crew assigned + materials selected
 *   3. Scheduling (10%) — dates set, project approved/scheduled
 *   4. Execution (55%) — tasks completed (the actual work)
 *   5. Closeout (10%)  — material usage recorded, project marked completed
 *
 * This replaces the old dual system (checklist booleans + task count).
 */

import type { Project, ProjectTask, ProjectElement, ProjectMaterial, ProjectStatus } from '@/types';

// ── Gate Weights ────────────────────────────────────────────────────────────

const GATE_WEIGHTS = {
  setup: 0.10,
  planning: 0.15,
  scheduling: 0.10,
  execution: 0.55,
  closeout: 0.10,
} as const;

// ── Gate Interfaces ─────────────────────────────────────────────────────────

export interface GateStatus {
  label: string;
  weight: number;
  completion: number; // 0-1
  detail: string;
}

export interface ProjectProgress {
  /** Overall percentage 0-100 */
  percentage: number;
  /** Individual gate statuses */
  gates: GateStatus[];
  /** Current stage label for display */
  currentStage: string;
  /** Color for progress indicators */
  color: string;
  /** Is the project fully complete? */
  isComplete: boolean;
  /** Is the project overdue? */
  isOverdue: boolean;
}

// ── Progress Computation ────────────────────────────────────────────────────

export function computeProjectProgress(
  project: Project,
  tasks?: ProjectTask[],
  elements?: ProjectElement[],
): ProjectProgress {
  const taskList = tasks ?? [];
  const elementList = elements ?? [];
  const status = project.status ?? 'estimate';

  // Gate 1: Setup — do we have elements/measurements?
  const hasElements = elementList.length > 0;
  const hasDescription = !!(project.description && project.description.length > 10);
  const hasAddress = !!(project.address && project.address.length > 3);
  const setupScore = [hasElements, hasDescription, hasAddress].filter(Boolean).length / 3;

  // Gate 2: Planning — tasks + crew + materials defined?
  const hasTasks = taskList.length > 0;
  const hasCrew = (project.crewSize ?? 0) > 0;
  const hasMaterials = (project.materials?.length ?? 0) > 0;
  const planningScore = [hasTasks, hasCrew, hasMaterials].filter(Boolean).length / 3;

  // Gate 3: Scheduling — quote sent, client approved, dates set?
  const isQuoted = status !== 'estimate';
  const isApproved = status === 'approved' || status === 'scheduled' || status === 'in_progress' || status === 'completed';
  const hasDates = !!(project.startDate && project.targetDate);
  const isScheduled = status === 'scheduled' || status === 'in_progress' || status === 'completed';
  const schedulingScore = [isQuoted, isApproved, hasDates, isScheduled].filter(Boolean).length / 4;

  // Gate 4: Execution — task completion percentage
  const completedTasks = taskList.filter(t => t.status === 'completed').length;
  const executionScore = taskList.length > 0 ? completedTasks / taskList.length : 0;

  // Gate 5: Closeout — material usage recorded + status completed
  const hasActualUsage = (project.materials ?? []).some(m => m.actualUsage != null);
  const isCompleted = status === 'completed';
  const closeoutScore = [hasActualUsage, isCompleted].filter(Boolean).length / 2;

  // Weighted overall.
  // F-CW-20: terminal status overrides per-gate math. A `status='completed'`
  // project should always read 100% even if individual tasks weren't marked
  // completed (contractor flipped status without backfilling task statuses).
  const percentage = isCompleted
    ? 100
    : Math.round(
        (setupScore * GATE_WEIGHTS.setup +
         planningScore * GATE_WEIGHTS.planning +
         schedulingScore * GATE_WEIGHTS.scheduling +
         executionScore * GATE_WEIGHTS.execution +
         closeoutScore * GATE_WEIGHTS.closeout) * 100
      );

  // Determine current stage
  let currentStage = 'Setup';
  if (setupScore >= 1) currentStage = 'Planning';
  if (planningScore >= 0.66) currentStage = 'Scheduling';
  if (schedulingScore >= 0.66) currentStage = 'Execution';
  if (executionScore >= 1) currentStage = 'Closeout';
  if (isCompleted) currentStage = 'Complete';

  // Overdue check
  const today = new Date().toISOString().split('T')[0];
  const isOverdue = !!(project.targetDate && project.targetDate < today && !isCompleted);

  // Color
  let color = 'var(--text-4)'; // gray — not started
  if (isOverdue) color = 'var(--status-amber)';
  else if (isCompleted) color = 'var(--status-green)';
  else if (percentage >= 50) color = 'var(--status-info)';
  else if (percentage > 0) color = 'var(--green)';

  const gates: GateStatus[] = [
    { label: 'Setup', weight: GATE_WEIGHTS.setup, completion: setupScore, detail: `${[hasElements && 'elements', hasDescription && 'description', hasAddress && 'address'].filter(Boolean).join(', ') || 'none'}` },
    { label: 'Planning', weight: GATE_WEIGHTS.planning, completion: planningScore, detail: `${[hasTasks && `${taskList.length} tasks`, hasCrew && 'crew', hasMaterials && 'materials'].filter(Boolean).join(', ') || 'none'}` },
    { label: 'Scheduling', weight: GATE_WEIGHTS.scheduling, completion: schedulingScore, detail: `${[isQuoted && 'quoted', isApproved && 'client approved', hasDates && 'dates set', isScheduled && 'scheduled'].filter(Boolean).join(', ') || 'not quoted yet'}` },
    { label: 'Execution', weight: GATE_WEIGHTS.execution, completion: executionScore, detail: `${completedTasks}/${taskList.length} tasks done` },
    { label: 'Closeout', weight: GATE_WEIGHTS.closeout, completion: closeoutScore, detail: `${[hasActualUsage && 'usage tracked', isCompleted && 'completed'].filter(Boolean).join(', ') || 'pending'}` },
  ];

  return {
    percentage,
    gates,
    currentStage,
    color,
    isComplete: isCompleted,
    isOverdue,
  };
}

// ── Map Pin Color (simplified for map markers) ──────────────────────────────

export function getProgressPinColor(progress: ProjectProgress): string {
  if (progress.isOverdue) return '#F59E0B';     // amber
  if (progress.isComplete) return '#16A34A';     // green
  if (progress.percentage >= 50) return '#2563EB'; // blue
  if (progress.percentage > 0) return '#2D6A4F'; // brand green
  return '#9CA3AF';                              // gray
}
