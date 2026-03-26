/**
 * Formatting Utilities
 */

import type { Project, ChecklistProgress, BudgetStatus, Material } from '@/types';
import { computeProjectCostRaw } from './manifest';

export function formatCurrency(amount: number): string {
  return '$' + amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatDate(dateString: string): string {
  if (!dateString) return '—';
  const d = new Date(dateString);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export function formatNumber(num: number): string {
  return num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export function formatQty(n: number): string {
  if (n === 0) return '0';
  if (n < 1) return n.toFixed(2);
  if (n < 10) return n.toFixed(1);
  return Math.round(n).toLocaleString();
}

export function getChecklistProgress(project: Project): ChecklistProgress {
  const checklistKeys = Object.keys(project.checklist) as Array<keyof Project['checklist']>;
  const completed = checklistKeys.filter((k) => project.checklist[k]).length;
  const total = checklistKeys.length;
  const percentage = Math.round((completed / total) * 100);

  return { completed, total, percentage };
}

export function getBudgetStatus(project: Project, materials: Material[]): BudgetStatus {
  const estimate = computeProjectCostRaw(project, materials);
  const budget = project.budget || 0;
  const percentage = budget > 0 ? Math.round((estimate / budget) * 100) : 0;
  const isOver = budget > 0 && estimate > budget;

  return { estimate, budget, percentage, isOver };
}
