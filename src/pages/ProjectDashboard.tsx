import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/shared/Badge';
import { useProjectStore } from '@/stores/projectStore';
import { useOrgStore } from '@/stores/orgStore';
import { useScheduleStore } from '@/stores/scheduleStore';
import { useCrewStore } from '@/stores/crewStore';
import { ProjectDashboardOverview } from '@/components/project-dashboard/OverviewTab';
import { ProjectDashboardTasks } from '@/components/project-dashboard/TasksTab';
import { ProjectDashboardBudget } from '@/components/project-dashboard/BudgetTab';
import { ProjectDashboardResources } from '@/components/project-dashboard/ResourcesTab';
import { ProjectDashboardCompliance } from '@/components/project-dashboard/ComplianceTab';
import { ProjectDashboardMaterials } from '@/components/project-dashboard/MaterialsTab';
import type { Project, ProjectTask, ProjectSubcontractor, ProjectPermit, ZoneMaterialDetail, TaskStatus } from '@/types';
import {
  fetchProjectTasks,
  fetchProjectSubcontractors,
  fetchProjectPermits,
  fetchZoneMaterialDetails,
  updateProjectTask,
} from '@/services/supabaseData';

// ── Status helpers ───────────────────────────────────────────────────────────

function getProjectStatus(p: Project) {
  const now = new Date();
  const start = p.startDate ? new Date(p.startDate) : null;
  const target = p.targetDate ? new Date(p.targetDate) : null;

  if (!start) return { label: 'Planning', variant: 'purple' as const };
  if (start > now) return { label: 'Scheduled', variant: 'blue' as const };
  if (target && target < now) return { label: 'Overdue', variant: 'red' as const };
  return { label: 'Active', variant: 'green' as const };
}

const PROJECT_TYPE_LABELS: Record<string, string> = {
  full_install: 'Full Install',
  renovation: 'Renovation',
  hardscape: 'Hardscape',
  softscape: 'Softscape',
  drainage: 'Drainage',
  irrigation: 'Irrigation',
  maintenance: 'Maintenance',
  mixed: 'Mixed',
};

// ── Tabs ─────────────────────────────────────────────────────────────────────

type TabId = 'overview' | 'tasks' | 'budget' | 'materials' | 'resources' | 'compliance';

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'budget', label: 'Budget' },
  { id: 'materials', label: 'Materials' },
  { id: 'resources', label: 'Resources' },
  { id: 'compliance', label: 'Compliance' },
];

// ── Component ────────────────────────────────────────────────────────────────

export default function ProjectDashboard() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { projects } = useProjectStore();
  const { org } = useOrgStore();
  const { entries: scheduleEntries } = useScheduleStore();
  const { crew } = useCrewStore();
  const orgId = org?.id;

  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [subcontractors, setSubcontractors] = useState<ProjectSubcontractor[]>([]);
  const [permits, setPermits] = useState<ProjectPermit[]>([]);
  const [zoneMaterials, setZoneMaterials] = useState<ZoneMaterialDetail[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [loadingMaterials, setLoadingMaterials] = useState(false);

  const project = useMemo(
    () => projects.find((p) => p.id === id) ?? null,
    [projects, id]
  );

  // Fetch M1.5 data when project loads
  useEffect(() => {
    if (!orgId || !id) return;
    setLoadingData(true);

    Promise.all([
      fetchProjectTasks(orgId, id),
      fetchProjectSubcontractors(orgId, id),
      fetchProjectPermits(orgId, id),
    ])
      .then(([t, s, p]) => {
        setTasks(t ?? []);
        setSubcontractors(s ?? []);
        setPermits(p ?? []);
      })
      .catch((err) => console.error('Failed to load project data:', err))
      .finally(() => setLoadingData(false));

    // Fetch zone materials separately (doesn't need orgId filter — filtered by project's zones)
    setLoadingMaterials(true);
    fetchZoneMaterialDetails(id)
      .then((m) => setZoneMaterials(m ?? []))
      .catch((err) => console.error('Failed to load zone materials:', err))
      .finally(() => setLoadingMaterials(false));
  }, [orgId, id]);

  // Task status toggle handler
  const handleTaskStatusChange = async (taskId: string, newStatus: string) => {
    // Optimistic update
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              status: newStatus as TaskStatus,
              completedAt: newStatus === 'completed' ? new Date().toISOString() : null,
            }
          : t
      )
    );

    try {
      await updateProjectTask(taskId, {
        status: newStatus as TaskStatus,
        completedAt: newStatus === 'completed' ? new Date().toISOString() : null,
      });
    } catch (err) {
      console.error('Failed to update task:', err);
      // Revert on failure
      if (orgId && id) {
        const refreshed = await fetchProjectTasks(orgId, id);
        if (refreshed) setTasks(refreshed);
      }
    }
  };

  // Schedule entries for this project
  const projectSchedule = useMemo(
    () => scheduleEntries.filter((e) => e.projectId === id),
    [scheduleEntries, id]
  );

  // Not found
  if (!project) {
    return (
      <div className="max-w-[900px] mx-auto text-center py-[60px]">
        <h2 className="text-[18px] font-[600] text-[var(--text)] mb-[8px]">Project not found</h2>
        <p className="text-[13px] text-[var(--text-3)] mb-[16px]">
          This project may have been deleted or you don't have access.
        </p>
        <Button variant="primary" size="md" onClick={() => navigate('/projects')}>
          Back to Projects
        </Button>
      </div>
    );
  }

  const status = getProjectStatus(project);
  const taskProgress = tasks.length > 0
    ? Math.round((tasks.filter((t) => t.status === 'completed').length / tasks.length) * 100)
    : 0;

  return (
    <div className="max-w-[960px] mx-auto">
      {/* ── Header ────────────────────────────────────────────────────────────── */}
      <div className="mb-[24px]">
        {/* Back nav */}
        <button
          type="button"
          onClick={() => navigate('/projects')}
          className="text-[12px] text-[var(--text-3)] hover:text-[var(--text)] bg-transparent border-none cursor-pointer p-0 mb-[12px] flex items-center gap-[4px]"
        >
          ← Back to Projects
        </button>

        <div className="flex items-start justify-between flex-wrap gap-[12px]">
          <div>
            <div className="flex items-center gap-[10px] mb-[4px]">
              <h1 className="font-serif text-[22px] text-[var(--text)]">{project.name}</h1>
              <Badge variant={status.variant}>{status.label}</Badge>
            </div>
            <div className="flex items-center gap-[16px] text-[12px] text-[var(--text-3)] flex-wrap">
              {project.clientName && (
                <span>{project.clientName}</span>
              )}
              {project.address && (
                <span>{project.address}</span>
              )}
              {project.projectType && (
                <span>{PROJECT_TYPE_LABELS[project.projectType] || project.projectType}</span>
              )}
              {project.scopeSize && (
                <span className="capitalize">{project.scopeSize}</span>
              )}
            </div>
          </div>

          {/* Progress indicator */}
          {tasks.length > 0 && (
            <div className="text-right">
              <div className="text-[20px] font-[700] text-[var(--text)]">{taskProgress}%</div>
              <div className="text-[11px] text-[var(--text-4)]">
                {tasks.filter((t) => t.status === 'completed').length}/{tasks.length} tasks
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Tabs ──────────────────────────────────────────────────────────────── */}
      <div
        className="flex gap-0 mb-[24px] border-b overflow-x-auto"
        style={{ borderColor: 'var(--border)' }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className="px-[16px] py-[10px] text-[13px] font-[600] border-b-[2px] transition-colors bg-transparent border-x-0 border-t-0 cursor-pointer whitespace-nowrap"
            style={{
              borderBottomColor:
                activeTab === tab.id ? 'var(--green)' : 'transparent',
              color:
                activeTab === tab.id ? 'var(--green-l)' : 'var(--text-3)',
            }}
          >
            {tab.label}
            {tab.id === 'tasks' && tasks.length > 0 && (
              <span className="ml-[4px] text-[11px] opacity-60">({tasks.length})</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tab Content ───────────────────────────────────────────────────────── */}
      {loadingData ? (
        <div className="text-center py-[40px] text-[13px] text-[var(--text-3)]">
          Loading project data...
        </div>
      ) : (
        <>
          {activeTab === 'overview' && (
            <ProjectDashboardOverview
              project={project}
              tasks={tasks}
              subcontractors={subcontractors}
              permits={permits}
              scheduleEntries={projectSchedule}
              crew={crew}
            />
          )}
          {activeTab === 'tasks' && (
            <ProjectDashboardTasks
              tasks={tasks}
              onStatusChange={handleTaskStatusChange}
            />
          )}
          {activeTab === 'budget' && (
            <ProjectDashboardBudget
              project={project}
              tasks={tasks}
              subcontractors={subcontractors}
              permits={permits}
            />
          )}
          {activeTab === 'materials' && (
            <ProjectDashboardMaterials
              materials={zoneMaterials}
              loading={loadingMaterials}
            />
          )}
          {activeTab === 'resources' && (
            <ProjectDashboardResources
              project={project}
              subcontractors={subcontractors}
              crew={crew}
              scheduleEntries={projectSchedule}
            />
          )}
          {activeTab === 'compliance' && (
            <ProjectDashboardCompliance
              project={project}
              permits={permits}
            />
          )}
        </>
      )}
    </div>
  );
}
