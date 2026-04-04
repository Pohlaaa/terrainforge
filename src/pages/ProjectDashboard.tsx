import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/shared/Badge';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { toast } from '@/hooks/useToast';
import { useProjectStore } from '@/stores/projectStore';
import { useOrgStore } from '@/stores/orgStore';
import { useCrewStore } from '@/stores/crewStore';
import { ProjectDashboardOverview } from '@/components/project-dashboard/OverviewTab';
import { ProjectDashboardTasks } from '@/components/project-dashboard/TasksTab';
import { ProjectDashboardBudget } from '@/components/project-dashboard/BudgetTab';
import { ProjectDashboardResources } from '@/components/project-dashboard/ResourcesTab';
import { ProjectDashboardCompliance } from '@/components/project-dashboard/ComplianceTab';
import { ProjectDashboardMaterials } from '@/components/project-dashboard/MaterialsTab';
import { CloseoutTab } from '@/components/project-dashboard/CloseoutTab';
import type { Project, ProjectTask, ProjectSubcontractor, ProjectPermit, TaskStatus, TaskPhase } from '@/types';

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

type TabId = 'overview' | 'tasks' | 'budget' | 'materials' | 'resources' | 'compliance' | 'closeout';

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'budget', label: 'Budget' },
  { id: 'materials', label: 'Materials' },
  { id: 'resources', label: 'Resources' },
  { id: 'compliance', label: 'Compliance' },
  { id: 'closeout', label: 'Closeout' },
];

// ── Component ────────────────────────────────────────────────────────────────

export default function ProjectDashboard() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    activeProject: project,
    loading,
    fetchProjectFull,
    clearActiveProject,
    updateProject,
    createProjectTask,
    updateProjectTask,
    deleteProjectTask,
    createProjectSubcontractor,
    updateProjectSubcontractor,
    deleteProjectSubcontractor,
    createProjectPermit,
    updateProjectPermit,
  } = useProjectStore();
  const { org } = useOrgStore();
  const { crew } = useCrewStore();
  const orgId = org?.id;

  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Fetch complete project graph on mount
  useEffect(() => {
    if (!orgId || !id) return;
    fetchProjectFull(orgId, id);

    return () => {
      clearActiveProject();
    };
  }, [orgId, id]);

  // Read sub-entities from activeProject
  const tasks = project?.tasks ?? [];
  const subcontractors = project?.subcontractors ?? [];
  const permits = project?.permits ?? [];
  const projectSchedule = project?.scheduleEntries ?? [];

  // Task status toggle handler
  const handleTaskStatusChange = async (taskId: string, newStatus: string) => {
    await updateProjectTask(taskId, {
      status: newStatus as TaskStatus,
      completedAt: newStatus === 'completed' ? new Date().toISOString() : null,
    });
  };

  // Create a new task in a given phase
  const handleTaskCreate = async (phase: string) => {
    if (!orgId || !id) return;
    const maxSeq = tasks.reduce((max, t) => Math.max(max, t.sequenceNumber), -1);
    await createProjectTask(
      {
        orgId,
        projectId: id,
        zoneId: null,
        name: 'New Task',
        description: null,
        phase: phase as TaskPhase,
        sequenceNumber: maxSeq + 1,
        status: 'pending',
        assignedCrewId: null,
        estimatedHours: null,
        actualHours: null,
        dependsOn: [],
        scheduledDate: null,
        completedAt: null,
        aiGenerated: false,
        aiConfidence: null,
      },
      orgId
    );
  };

  // Update a task's fields
  const handleTaskUpdate = async (taskId: string, updates: Partial<ProjectTask>) => {
    await updateProjectTask(taskId, updates);
  };

  // Delete a task
  const handleTaskDelete = async (taskId: string) => {
    await deleteProjectTask(taskId);
  };

  // Create a new permit
  const handlePermitCreate = async () => {
    if (!orgId || !id) return;
    await createProjectPermit(
      {
        orgId,
        projectId: id,
        permitType: 'general',
        jurisdiction: null,
        permitNumber: null,
        status: 'needed',
        appliedDate: null,
        approvedDate: null,
        expiryDate: null,
        inspectionDate: null,
        inspectionResult: null,
        inspectionNotes: null,
        fee: null,
        aiSuggested: false,
        notes: null,
      },
      orgId
    );
  };

  // Update a permit
  const handlePermitUpdate = async (permitId: string, updates: Partial<ProjectPermit>) => {
    await updateProjectPermit(permitId, updates);
  };

  // Create a new subcontractor
  const handleSubCreate = async () => {
    if (!orgId || !id) return;
    await createProjectSubcontractor(
      {
        orgId,
        projectId: id,
        companyName: 'New Subcontractor',
        contactName: null,
        phone: null,
        email: null,
        trade: null,
        scopeDescription: null,
        scheduledStart: null,
        scheduledEnd: null,
        quotedCost: null,
        actualCost: null,
        status: 'pending',
        notes: null,
      },
      orgId
    );
  };

  // Update a subcontractor
  const handleSubUpdate = async (subId: string, updates: Partial<ProjectSubcontractor>) => {
    await updateProjectSubcontractor(subId, updates);
  };

  // Delete a subcontractor
  const handleSubDelete = async (subId: string) => {
    await deleteProjectSubcontractor(subId);
  };

  // Handle project field updates from inline editing (budget, etc.)
  const handleProjectUpdated = (updates: Partial<Project>) => {
    if (!id) return;
    // BudgetTab already persisted to DB — sync the store
    updateProject(id, updates);
  };

  // Delete project handler
  const handleDeleteProject = async () => {
    if (!id) return;
    setDeleting(true);
    try {
      await useProjectStore.getState().deleteProject(id);
      toast.info('Project deleted');
      navigate('/projects');
    } catch {
      toast.error('Failed to delete project');
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  // Not found / loading
  if (loading) {
    return (
      <div className="text-center py-[40px] text-[13px] text-[var(--text-3)]">
        Loading project data...
      </div>
    );
  }

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

          <div className="flex items-center gap-[12px]">
            {/* Progress indicator */}
            {tasks.length > 0 && (
              <div className="text-right">
                <div className="text-[20px] font-[700] text-[var(--text)]">{taskProgress}%</div>
                <div className="text-[11px] text-[var(--text-4)]">
                  {tasks.filter((t) => t.status === 'completed').length}/{tasks.length} tasks
                </div>
              </div>
            )}
            {/* Delete button */}
            <Button
              variant="danger"
              size="sm"
              onClick={() => setShowDeleteConfirm(true)}
            >
              Delete
            </Button>
          </div>
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
      {activeTab === 'overview' && (
        <ProjectDashboardOverview
          project={project}
          tasks={tasks}
          subcontractors={subcontractors}
          permits={permits}
          scheduleEntries={projectSchedule}
          crew={crew}
          onProjectUpdated={handleProjectUpdated}
        />
      )}
      {activeTab === 'tasks' && (
        <ProjectDashboardTasks
          tasks={tasks}
          projectId={id!}
          orgId={orgId!}
          onStatusChange={handleTaskStatusChange}
          onTaskCreate={handleTaskCreate}
          onTaskUpdate={handleTaskUpdate}
          onTaskDelete={handleTaskDelete}
        />
      )}
      {activeTab === 'budget' && (
        <ProjectDashboardBudget
          project={project}
          tasks={tasks}
          subcontractors={subcontractors}
          permits={permits}
          onProjectUpdated={handleProjectUpdated}
        />
      )}
      {activeTab === 'materials' && (
        <ProjectDashboardMaterials
          project={project}
          loading={loading}
        />
      )}
      {activeTab === 'resources' && (
        <ProjectDashboardResources
          project={project}
          subcontractors={subcontractors}
          crew={crew}
          scheduleEntries={projectSchedule}
          onSubCreate={handleSubCreate}
          onSubUpdate={handleSubUpdate}
          onSubDelete={handleSubDelete}
        />
      )}
      {activeTab === 'compliance' && (
        <ProjectDashboardCompliance
          project={project}
          permits={permits}
          orgId={orgId!}
          onPermitCreate={handlePermitCreate}
          onPermitUpdate={handlePermitUpdate}
        />
      )}
      {activeTab === 'closeout' && (
        <CloseoutTab
          project={project}
          onProjectUpdated={() => {
            // Closeout tab has already updated via store, just ensure UI refreshes
            fetchProjectFull(orgId!, id!);
          }}
        />
      )}

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Delete Project"
        message={`Are you sure you want to delete "${project.name}"? All tasks, permits, subcontractors, and other project data will be permanently removed. This cannot be undone.`}
        confirmText="Delete Project"
        confirmVariant="danger"
        onConfirm={handleDeleteProject}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}
