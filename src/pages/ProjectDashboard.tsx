import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/shared/Badge';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { toast } from '@/hooks/useToast';
import { useProjectStore } from '@/stores/projectStore';
import { useOrgStore } from '@/stores/orgStore';
import { useCrewStore } from '@/stores/crewStore';
import { useEquipmentStore } from '@/stores/equipmentStore';
import { ProjectDashboardOverview } from '@/components/project-dashboard/OverviewTab';
import { ProjectDashboardBudget } from '@/components/project-dashboard/BudgetTab';
import { ProjectDashboardResources } from '@/components/project-dashboard/ResourcesTab';
import { ProjectDashboardMaterials } from '@/components/project-dashboard/MaterialsTab';
import { CloseoutTab } from '@/components/project-dashboard/CloseoutTab';
import type { Project, ProjectTask, ProjectSubcontractor, ProjectPermit, TaskStatus, TaskPhase, ProjectStatus } from '@/types';
import { PROJECT_STATUS_BADGE, getProjectStatusBadge } from '@/lib/constants';
import { computeProjectProgress } from '@/lib/projectProgress';

// ── Status helpers ───────────────────────────────────────────────────────────

const STATUS_BADGE_MAP = PROJECT_STATUS_BADGE;

function getProjectStatus(p: Project) {
  return getProjectStatusBadge(p.status);
}

/** Valid next statuses from a given status */
const STATUS_TRANSITIONS: Record<ProjectStatus, { next: ProjectStatus; label: string }[]> = {
  estimate: [{ next: 'quoted', label: 'Send Quote' }],
  quoted: [
    { next: 'approved', label: 'Client Approved' },
    { next: 'estimate', label: 'Revise Estimate' },
  ],
  approved: [
    { next: 'scheduled', label: 'Schedule Project' },
    { next: 'quoted', label: 'Back to Quoted' },
  ],
  scheduled: [
    { next: 'in_progress', label: 'Start Work' },
    { next: 'approved', label: 'Unschedule' },
  ],
  in_progress: [
    { next: 'completed', label: 'Complete Project' },
    { next: 'on_hold', label: 'Put On Hold' },
  ],
  completed: [],
  on_hold: [
    { next: 'in_progress', label: 'Resume Work' },
    { next: 'estimate', label: 'Reopen as Estimate' },
  ],
};

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

type TabId = 'overview' | 'budget' | 'materials' | 'resources' | 'closeout';

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'budget', label: 'Budget' },
  { id: 'materials', label: 'Materials' },
  { id: 'resources', label: 'Resources' },
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
  const { equipment } = useEquipmentStore();
  const orgId = org?.id;

  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showSchedulePicker, setShowSchedulePicker] = useState(false);
  const [scheduleStart, setScheduleStart] = useState('');
  const [scheduleEnd, setScheduleEnd] = useState('');
  const [editingClient, setEditingClient] = useState(false);
  const [editingDetails, setEditingDetails] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);

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
  const siteConditions = project?.siteConditions ?? [];

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

  // Status transition handler
  const handleStatusTransition = async (nextStatus: ProjectStatus) => {
    if (!id) return;
    const now = new Date().toISOString();
    const updates: Partial<Project> = { status: nextStatus };

    // Set lifecycle timestamps
    if (nextStatus === 'approved') updates.approvedAt = now;
    if (nextStatus === 'in_progress') updates.startedAt = now;
    if (nextStatus === 'completed') {
      updates.completedAt = now;
    }

    await updateProject(id, updates);
    toast.success(`Project moved to ${STATUS_BADGE_MAP[nextStatus].label}`);
  };

  // Not found / loading
  // Treat "we have an id in the URL but activeProject hasn't populated yet"
  // as loading — otherwise the first paint after a back-button nav shows
  // "Project not found" before the fetch effect has a chance to run.
  if (loading || (id && !project)) {
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
  const projectProgress = computeProjectProgress(project, tasks, project.elements);
  const taskProgress = projectProgress.percentage;

  return (
    <div className="max-w-[960px] mx-auto">
      {/* ── Header ────────────────────────────────────────────────────────────── */}
      <div className="mb-[24px]">
        {/* Back nav */}
        <button type="button" onClick={() => navigate('/projects')}
          className="text-[12px] text-[var(--text-3)] hover:text-[var(--text)] bg-transparent border-none cursor-pointer p-0 mb-[12px] flex items-center gap-[4px]">
          ← Back to Projects
        </button>

        {/* Title + Status */}
        <div className="flex items-center gap-[10px] mb-[12px]">
          <h1 className="font-serif text-[24px] text-[var(--text)]">{project.name}</h1>
          <Badge variant={status.variant}>{status.label}</Badge>
        </div>

        {/* Description — prominent, editable */}
        <div className="rounded-[8px] border px-[14px] py-[10px] mb-[16px] group" style={{ backgroundColor: 'var(--surface2)', borderColor: 'var(--border)' }}>
          {editingDescription ? (
            <textarea
              className="w-full bg-transparent border-none text-[14px] text-[var(--text)] leading-[1.5] resize-y focus:outline-none"
              style={{ minHeight: 60 }}
              defaultValue={project.description ?? ''}
              autoFocus
              placeholder="Describe the scope of work..."
              onBlur={(e) => {
                updateProject(id!, { description: e.target.value || null });
                setEditingDescription(false);
              }}
              onKeyDown={(e) => { if (e.key === 'Escape') setEditingDescription(false); }}
            />
          ) : (
            <div className="flex items-start gap-[8px] cursor-pointer" onClick={() => setEditingDescription(true)}>
              <p className="text-[14px] text-[var(--text-2)] leading-[1.5] flex-1">
                {project.description || <span className="text-[var(--text-4)] italic">No description — click to add</span>}
              </p>
              <span className="text-[var(--text-4)] opacity-0 group-hover:opacity-100 transition-opacity text-[11px] shrink-0 mt-[2px]">edit</span>
            </div>
          )}
        </div>

        {/* Info Panels */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-[12px] mb-[16px]">
          {/* Client & Location Panel */}
          <div className="rounded-[10px] border p-[14px]" style={{ backgroundColor: 'var(--surface2)', borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between mb-[8px]">
              <div className="text-[10px] font-[600] uppercase text-[var(--text-4)]">Client & Location</div>
              <button type="button" onClick={() => setEditingClient(!editingClient)} className="text-[10px] font-[500] bg-transparent border-none cursor-pointer" style={{ color: editingClient ? 'var(--green-l)' : 'var(--text-4)' }}>{editingClient ? 'Done' : 'Edit'}</button>
            </div>
            {editingClient ? (
              <div className="space-y-[6px]">
                <input className="w-full px-[8px] py-[4px] text-[12px] rounded-[4px] bg-transparent border" style={{ borderColor: 'var(--border)', color: 'var(--text)' }} defaultValue={project.clientName ?? ''} placeholder="Client name" onBlur={(e) => updateProject(id!, { clientName: e.target.value || null })} />
                <input className="w-full px-[8px] py-[4px] text-[12px] rounded-[4px] bg-transparent border" style={{ borderColor: 'var(--border)', color: 'var(--text)' }} defaultValue={project.clientPhone ?? ''} placeholder="Phone" onBlur={(e) => updateProject(id!, { clientPhone: e.target.value || null })} />
                <input className="w-full px-[8px] py-[4px] text-[12px] rounded-[4px] bg-transparent border" style={{ borderColor: 'var(--border)', color: 'var(--text)' }} defaultValue={project.clientEmail ?? ''} placeholder="Email" onBlur={(e) => updateProject(id!, { clientEmail: e.target.value || null })} />
                <input className="w-full px-[8px] py-[4px] text-[12px] rounded-[4px] bg-transparent border" style={{ borderColor: 'var(--border)', color: 'var(--text)' }} defaultValue={project.address ?? ''} placeholder="Address" onBlur={(e) => updateProject(id!, { address: e.target.value || '' })} />
              </div>
            ) : (
              <>
                {project.clientName && <div className="text-[13px] font-[600] text-[var(--text)] mb-[2px]">{project.clientName}</div>}
                {project.clientPhone && <div className="text-[11px] text-[var(--text-3)]">{project.clientPhone}</div>}
                {project.clientEmail && <div className="text-[11px] text-[var(--text-3)]">{project.clientEmail}</div>}
                {project.address && (
                  <a href={`https://maps.google.com/?q=${encodeURIComponent(project.address)}`} target="_blank" rel="noopener noreferrer" className="text-[12px] mt-[6px] block underline" style={{ color: 'var(--green-l)' }}>{project.address}</a>
                )}
                {!project.clientName && !project.address && <div className="text-[11px] text-[var(--text-4)]">No client info — click Edit</div>}
              </>
            )}
          </div>

          {/* Project Details Panel */}
          <div className="rounded-[10px] border p-[14px]" style={{ backgroundColor: 'var(--surface2)', borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between mb-[8px]">
              <div className="text-[10px] font-[600] uppercase text-[var(--text-4)]">Project Details</div>
              <button type="button" onClick={() => setEditingDetails(!editingDetails)} className="text-[10px] font-[500] bg-transparent border-none cursor-pointer" style={{ color: editingDetails ? 'var(--green-l)' : 'var(--text-4)' }}>{editingDetails ? 'Done' : 'Edit'}</button>
            </div>
            {editingDetails ? (
              <div className="space-y-[6px]">
                <div><label className="text-[10px] text-[var(--text-4)]">Project Name</label><input className="w-full px-[8px] py-[4px] text-[12px] rounded-[4px] bg-transparent border" style={{ borderColor: 'var(--border)', color: 'var(--text)' }} defaultValue={project.name} onBlur={(e) => updateProject(id!, { name: e.target.value })} /></div>
                <div><label className="text-[10px] text-[var(--text-4)]">Type</label>
                  <select className="w-full px-[8px] py-[4px] text-[12px] rounded-[4px] bg-transparent border cursor-pointer" style={{ borderColor: 'var(--border)', color: 'var(--text)' }} defaultValue={project.projectType ?? ''} onChange={(e) => updateProject(id!, { projectType: (e.target.value || null) as Project['projectType'] })}>
                    <option value="">—</option>{Object.entries(PROJECT_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select></div>
                <div><label className="text-[10px] text-[var(--text-4)]">Scope</label>
                  <select className="w-full px-[8px] py-[4px] text-[12px] rounded-[4px] bg-transparent border cursor-pointer" style={{ borderColor: 'var(--border)', color: 'var(--text)' }} defaultValue={project.scopeSize ?? ''} onChange={(e) => updateProject(id!, { scopeSize: (e.target.value || null) as Project['scopeSize'] })}>
                    <option value="">—</option><option value="small">Small</option><option value="medium">Medium</option><option value="large">Large</option><option value="commercial">Commercial</option>
                  </select></div>
                <div><label className="text-[10px] text-[var(--text-4)]">Description</label><textarea className="w-full px-[8px] py-[4px] text-[12px] rounded-[4px] bg-transparent border resize-y" style={{ borderColor: 'var(--border)', color: 'var(--text)', minHeight: 50 }} defaultValue={project.description ?? ''} onBlur={(e) => updateProject(id!, { description: e.target.value || null })} /></div>
              </div>
            ) : (
              <div className="space-y-[4px] text-[12px]">
                {project.projectType && <div className="flex justify-between"><span className="text-[var(--text-4)]">Type</span><span className="text-[var(--text)] font-[500]">{PROJECT_TYPE_LABELS[project.projectType] || project.projectType}</span></div>}
                {project.scopeSize && <div className="flex justify-between"><span className="text-[var(--text-4)]">Scope</span><span className="text-[var(--text)] font-[500] capitalize">{project.scopeSize}</span></div>}
                {project.startDate && <div className="flex justify-between"><span className="text-[var(--text-4)]">Start</span><span className="text-[var(--text)]">{project.startDate}</span></div>}
                {project.targetDate && <div className="flex justify-between"><span className="text-[var(--text-4)]">Target</span><span className="text-[var(--text)]">{project.targetDate}</span></div>}
                {project.crewSize && <div className="flex justify-between"><span className="text-[var(--text-4)]">Crew</span><span className="text-[var(--text)]">{project.crewSize} members</span></div>}
              </div>
            )}
          </div>

          {/* Progress & Actions Panel */}
          <div className="rounded-[10px] border p-[14px]" style={{ backgroundColor: 'var(--surface2)', borderColor: 'var(--border)' }}>
            <div className="text-[10px] font-[600] uppercase text-[var(--text-4)] mb-[8px]">Progress & Actions</div>
            <div className="mb-[10px]">
              <div className="flex items-center justify-between mb-[4px]">
                <span className="text-[24px] font-[700]" style={{ color: projectProgress.color }}>{taskProgress}%</span>
                <span className="text-[11px] px-[6px] py-[1px] rounded-[4px] font-[500]" style={{ backgroundColor: 'rgba(45,106,79,0.1)', color: 'var(--green-l)' }}>{projectProgress.currentStage}</span>
              </div>
              <div className="h-[6px] rounded-[3px] overflow-hidden" style={{ backgroundColor: 'var(--surface3)' }}>
                <div className="h-full rounded-[3px] transition-all" style={{ width: `${taskProgress}%`, backgroundColor: projectProgress.color }} />
              </div>
              {/* Stage gate indicators */}
              <div className="flex gap-[2px] mt-[6px]">
                {projectProgress.gates.map(g => (
                  <div key={g.label} className="flex-1" title={`${g.label}: ${Math.round(g.completion * 100)}% — ${g.detail}`}>
                    <div className="h-[3px] rounded-[2px]" style={{ backgroundColor: g.completion >= 1 ? 'var(--status-green)' : g.completion > 0 ? 'var(--status-amber)' : 'var(--surface3)' }} />
                    <div className="text-[8px] text-center mt-[2px]" style={{ color: g.completion >= 1 ? 'var(--status-green)' : 'var(--text-4)' }}>{g.label}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-[6px]">
              {STATUS_TRANSITIONS[project.status ?? 'estimate']?.map((t) => (
                t.next === 'scheduled' ? (
                  <Button key={t.next} variant="secondary" size="sm" onClick={() => setShowSchedulePicker(true)}>{t.label}</Button>
                ) : (
                  <Button key={t.next} variant={t.next === 'completed' ? 'primary' : 'secondary'} size="sm" onClick={() => handleStatusTransition(t.next)}>{t.label}</Button>
                )
              ))}
              <Button variant="danger" size="sm" onClick={() => setShowDeleteConfirm(true)}>Delete</Button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Schedule Date Picker (inline) ────────────────────────────────────── */}
      {showSchedulePicker && (
        <div className="rounded-[10px] border p-[16px] mb-[16px] flex items-end gap-[12px] flex-wrap" style={{ backgroundColor: 'rgba(45,106,79,0.06)', borderColor: 'var(--green)' }}>
          <div>
            <label className="block text-[12px] font-[600] text-[var(--text-2)] mb-[4px]">Start Date</label>
            <input type="date" className="bg-[var(--surface2)] border border-[var(--border)] rounded-[6px] px-[10px] py-[8px] text-[13px] text-[var(--text)] focus:outline-none focus:border-[var(--green)]" value={scheduleStart} onChange={(e) => setScheduleStart(e.target.value)} />
          </div>
          <div>
            <label className="block text-[12px] font-[600] text-[var(--text-2)] mb-[4px]">Target Date</label>
            <input type="date" className="bg-[var(--surface2)] border border-[var(--border)] rounded-[6px] px-[10px] py-[8px] text-[13px] text-[var(--text)] focus:outline-none focus:border-[var(--green)]" value={scheduleEnd} onChange={(e) => setScheduleEnd(e.target.value)} />
          </div>
          <Button variant="primary" size="sm" disabled={!scheduleStart || !scheduleEnd} onClick={async () => {
            await updateProject(id!, { startDate: scheduleStart, targetDate: scheduleEnd });
            await handleStatusTransition('scheduled' as ProjectStatus);
            setShowSchedulePicker(false);
          }}>
            Confirm Schedule
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShowSchedulePicker(false)}>Cancel</Button>
        </div>
      )}

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
          projectEquipment={equipment.filter(e => e.assignedProject === id)}
          elements={project.elements ?? []}
          siteConditions={siteConditions}
          onProjectUpdated={handleProjectUpdated}
          onStatusChange={handleTaskStatusChange}
          onTaskCreate={handleTaskCreate}
          onTaskUpdate={handleTaskUpdate}
          onTaskDelete={handleTaskDelete}
          onTabChange={(tab: string) => setActiveTab(tab as TabId)}
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
          elements={project.elements ?? []}
        />
      )}
      {activeTab === 'resources' && (
        <ProjectDashboardResources
          project={project}
          subcontractors={subcontractors}
          crew={crew}
          scheduleEntries={projectSchedule}
          projectEquipment={equipment.filter(e => e.assignedProject === id)}
          onSubCreate={handleSubCreate}
          onSubUpdate={handleSubUpdate}
          onSubDelete={handleSubDelete}
        />
      )}
      {activeTab === 'closeout' && (
        <CloseoutTab
          project={project}
          permits={permits}
          onPermitCreate={handlePermitCreate}
          onPermitUpdate={handlePermitUpdate}
          onProjectUpdated={() => {
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
