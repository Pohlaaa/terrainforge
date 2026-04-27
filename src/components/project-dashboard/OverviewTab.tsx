import React, { useState, useMemo, useEffect } from 'react';
import type { Project, ProjectTask, ProjectSubcontractor, ProjectPermit, ScheduleEntry, CrewMember, Equipment, ProjectElement, ProjectSiteCondition, ShareToken } from '@/types';
import { useProjectStore } from '@/stores/projectStore';
import { useOrgStore } from '@/stores/orgStore';
import { useMaterialStore } from '@/stores/materialStore';
import { TaskTimeline } from '@/components/shared/TaskTimeline';
import { TaskTable } from './tasks/TaskTable';
import { ELEMENT_TYPE_LABELS } from '@/lib/elements';
import { computeProjectProgress } from '@/lib/projectProgress';
import { ElementVisual } from '@/components/shared/ElementVisual';
import { MaterialPicker } from '@/components/shared/MaterialPicker';
import PlanView2D from '@/components/plan/PlanView2D';
import PlanView3D from '@/components/plan/PlanView3D';
import { createShareToken, fetchShareTokensForProject, revokeShareToken, buildShareUrl, sendProposalEmail } from '@/services/supabaseShareTokens';
import { computeProjectCost } from '@/lib/projectCost';
import { toast } from '@/hooks/useToast';

interface Props {
  project: Project;
  tasks: ProjectTask[];
  subcontractors: ProjectSubcontractor[];
  permits: ProjectPermit[];
  scheduleEntries: ScheduleEntry[];
  crew: CrewMember[];
  projectEquipment?: Equipment[];
  elements?: ProjectElement[];
  siteConditions?: ProjectSiteCondition[];
  onProjectUpdated?: (updates: Partial<Project>) => void;
  onStatusChange?: (taskId: string, newStatus: string) => void;
  onTaskCreate?: (phase: string) => void;
  onTaskUpdate?: (taskId: string, updates: Partial<ProjectTask>) => void;
  onTaskDelete?: (taskId: string) => void;
  onTabChange?: (tab: string) => void;
}

const cardClass = 'rounded-[10px] border p-[16px]';
const cardHead = 'text-[12px] font-[700] uppercase text-[var(--text-3)] mb-[12px]';
function fmt(n: number | null | undefined): string {
  if (n == null) return '$0';
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

const PHASE_LABELS: Record<string, string> = {
  demo_prep: 'Demo / Prep',
  rough_grade: 'Rough Grade',
  hardscape: 'Hardscape',
  softscape: 'Softscape',
  irrigation: 'Irrigation',
  lighting: 'Lighting',
  cleanup_punchlist: 'Cleanup / Punchlist',
  custom: 'Custom',
};

export const ProjectDashboardOverview: React.FC<Props> = ({
  project,
  tasks,
  subcontractors,
  permits,
  scheduleEntries,
  crew,
  projectEquipment = [],
  elements = [],
  siteConditions = [],
  onProjectUpdated,
  onStatusChange,
  onTaskCreate,
  onTaskUpdate,
  onTaskDelete,
  onTabChange,
}) => {
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editingElements, setEditingElements] = useState(false);
  const [pickerElementId, setPickerElementId] = useState<string | null>(null);
  const pickerElement = elements.find(el => el.id === pickerElementId) ?? null;
  const projectStoreRef = useProjectStore();

  // ── Client share link (migration 028) ─────────────────────────────────
  const [shareTokens, setShareTokens] = useState<ShareToken[]>([]);
  const [creatingShare, setCreatingShare] = useState(false);
  const activeToken = shareTokens.find(
    (t) => !t.revokedAt && (!t.expiresAt || new Date(t.expiresAt) > new Date()),
  ) ?? null;

  useEffect(() => {
    fetchShareTokensForProject(project.id).then(setShareTokens);
  }, [project.id]);

  async function handleCreateShareLink() {
    const orgId = useOrgStore.getState().org?.id;
    if (!orgId) {
      toast.error('No organization context; cannot create share link.');
      return;
    }
    setCreatingShare(true);
    const created = await createShareToken(project.id, orgId);
    setCreatingShare(false);
    if (!created) {
      toast.error('Could not create share link. Check that migration 028 is applied.');
      return;
    }
    setShareTokens((prev) => [created, ...prev]);
    try {
      await navigator.clipboard.writeText(buildShareUrl(created.token));
      toast.success('Share link copied to clipboard.');
    } catch {
      toast.success('Share link created.');
    }
  }

  // Phase C v0: issue a client-editable design link. Same flow as the
  // view-only link, but `role: 'client_design'` unlocks the
  // client_update_element_geometry RPC for the holder.
  async function handleCreateDesignLink() {
    const orgId = useOrgStore.getState().org?.id;
    if (!orgId) {
      toast.error('No organization context; cannot create design link.');
      return;
    }
    setCreatingShare(true);
    const created = await createShareToken(project.id, orgId, { role: 'client_design' });
    setCreatingShare(false);
    if (!created) {
      toast.error('Could not create design link. Check that migration 031 is applied.');
      return;
    }
    setShareTokens((prev) => [created, ...prev]);
    try {
      await navigator.clipboard.writeText(buildShareUrl(created.token));
      toast.success('Design link copied to clipboard.');
    } catch {
      toast.success('Design link created.');
    }
  }

  async function handleCopyShareLink() {
    if (!activeToken) return;
    try {
      await navigator.clipboard.writeText(buildShareUrl(activeToken.token));
      toast.success('Copied.');
    } catch {
      toast.error('Could not copy.');
    }
  }

  async function handleRevokeShareLink() {
    if (!activeToken) return;
    const ok = await revokeShareToken(activeToken.id);
    if (!ok) {
      toast.error('Could not revoke link.');
      return;
    }
    const refreshed = await fetchShareTokensForProject(project.id);
    setShareTokens(refreshed);
    toast.success('Link revoked.');
  }

  // ── Email proposal to client ──────────────────────────────────────────
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailTo, setEmailTo] = useState(project.clientEmail ?? '');
  const [emailMessage, setEmailMessage] = useState('');
  const [emailSending, setEmailSending] = useState(false);

  async function handleSendProposalEmail() {
    if (!activeToken) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTo.trim())) {
      toast.error('Please enter a valid email address.');
      return;
    }
    setEmailSending(true);
    const result = await sendProposalEmail({
      token: activeToken.token,
      clientEmail: emailTo.trim(),
      message: emailMessage.trim() || undefined,
      shareUrl: buildShareUrl(activeToken.token),
    });
    setEmailSending(false);
    if (!result.ok) {
      toast.error(`Could not send email: ${result.error}`);
      return;
    }
    if (result.emailed) {
      toast.success(`Proposal emailed to ${emailTo.trim()}.`);
    } else {
      toast.success(`Share link prepared. Email delivery is not configured (${result.reason ?? 'backend off'}) — copy the link and send manually.`);
    }
    setEmailModalOpen(false);
    setEmailMessage('');
  }

  // ── Layout editor (Sprint 3a/c/d — move + resize + rotate) ─────────────
  const [editingLayout, setEditingLayout] = useState(false);
  // Sprint 7c: material catalog lookup for PlanView3D texture resolution.
  const materialCatalog = useMaterialStore((s) => s.materials);
  const materialsById = useMemo(() => {
    const map: Record<string, import('@/types').Material> = {};
    for (const m of materialCatalog) map[m.id] = m;
    return map;
  }, [materialCatalog]);
  // ── 2D / 3D view toggle (Sprint 4, restored Sprint 5 after Vite fix) ────
  const [planViewMode, setPlanViewMode] = useState<'2d' | '3d'>('2d');

  async function handleElementGeometryChange(elementId: string, geometry: import('@/types').ElementGeometry) {
    const result = await projectStoreRef.updateElement(elementId, { geometry });
    if (!result) {
      toast.error('Could not save layout change.');
    }
  }

  const completedTasks = tasks.filter((t) => t.status === 'completed').length;
  const totalManHours = tasks.reduce((sum, t) => sum + (t.estimatedHours ?? 0), 0);
  const crewSize = project.crewSize ?? 1;
  const clockHours = crewSize > 0 ? totalManHours / crewSize : totalManHours;

  // F-CW-07 fix: use the shared computeProjectCost helper so this matches
  // the wizard's Numbers/Review screens exactly. Previously this subset
  // omitted disposalCost, equipmentCost, and permit fees, producing a
  // budget figure ~$3-4k below what the contractor saw at quote time.
  // F-CW-LIVE-07: permitFees aren't stored on the Project row — they live
  // on `project_permits.fee`. Build the map from the permits prop so the
  // total cost includes them and matches the wizard exactly.
  const permitFeesMap: Record<string, number> = {};
  for (const p of permits) {
    if (p.fee != null && p.permitType) permitFeesMap[p.permitType] = (permitFeesMap[p.permitType] ?? 0) + p.fee;
  }
  const { totalCost, quote, profit, marginPct } = computeProjectCost({
    ...project,
    permitFees: permitFeesMap,
  });

  const phasesInProgress = [...new Set(tasks.filter((t) => t.status === 'in_progress').map((t) => t.phase))];

  // Compute next step from stage-gate progress
  const progress = computeProjectProgress(project, tasks, elements);
  const nextStep = (() => {
    const incompleteGate = progress.gates.find(g => g.completion < 1);
    if (!incompleteGate) return { action: 'Project complete', detail: 'All gates passed' };
    switch (incompleteGate.label) {
      case 'Setup': {
        if (elements.length === 0) return { action: 'Add measurements', detail: 'Define project elements with dimensions' };
        if (!project.description) return { action: 'Add description', detail: 'Describe the scope of work' };
        return { action: 'Add address', detail: 'Set the job site location' };
      }
      case 'Planning': {
        if (tasks.length === 0) return { action: 'Create tasks', detail: 'Break the work into phases' };
        if ((project.crewSize ?? 0) === 0) return { action: 'Assign crew', detail: 'Add crew to this project' };
        return { action: 'Add materials', detail: 'Select materials for this project' };
      }
      case 'Scheduling': {
        if (project.status === 'estimate') return { action: 'Send quote to client', detail: 'Finalize the estimate and send it' };
        if (project.status === 'quoted') return { action: 'Awaiting client approval', detail: 'Quote sent — waiting for green light' };
        if (!project.startDate || !project.targetDate) return { action: 'Set dates', detail: 'Pick start and target dates' };
        return { action: 'Schedule project', detail: 'Confirm the project schedule' };
      }
      case 'Execution': {
        const nextTask = tasks.find(t => t.status === 'pending' || t.status === 'in_progress');
        if (nextTask) return { action: nextTask.status === 'in_progress' ? `Finish: ${nextTask.name}` : `Start: ${nextTask.name}`, detail: `${completedTasks}/${tasks.length} tasks done` };
        return { action: 'Complete tasks', detail: `${completedTasks}/${tasks.length} done` };
      }
      case 'Closeout':
        return { action: 'Record usage', detail: 'Log actual material quantities and close out' };
      default:
        return { action: progress.currentStage, detail: '' };
    }
  })();

  return (
    <div className="space-y-[16px]">
        {/* KPI Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-[10px]">
          {[
            { label: 'Next Step', value: nextStep.action, sub: nextStep.detail, highlight: true },
            { label: 'Man Hours', value: `${totalManHours}h`, sub: `~${clockHours.toFixed(1)} clock hrs (${crewSize} crew)` },
            { label: 'Budget', value: fmt(totalCost), sub: quote > 0 ? `Quote: ${fmt(quote)}` : '' },
            { label: 'Margin', value: quote > 0 ? `${marginPct.toFixed(0)}%` : '\u2014', sub: profit > 0 ? fmt(profit) : profit < 0 ? `(${fmt(Math.abs(profit))})` : '' },
          ].map((kpi) => (
            <div key={kpi.label} className="rounded-[8px] border p-[12px]" style={{
              backgroundColor: (kpi as { highlight?: boolean }).highlight ? 'rgba(45,106,79,0.08)' : 'var(--surface2)',
              borderColor: (kpi as { highlight?: boolean }).highlight ? 'var(--green)' : 'var(--border)',
            }}>
              <div className="text-[10px] font-[600] uppercase text-[var(--text-4)] mb-[4px]">{kpi.label}</div>
              <div className="text-[14px] font-[700]" style={{ color: (kpi as { highlight?: boolean }).highlight ? 'var(--green-l)' : 'var(--text)' }}>{kpi.value}</div>
              {kpi.sub && <div className="text-[11px] text-[var(--text-4)] mt-[2px]">{kpi.sub}</div>}
            </div>
          ))}
        </div>

        {/* Active Phase */}
        {phasesInProgress.length > 0 && (
          <div className={cardClass} style={{ backgroundColor: 'rgba(45,106,79,0.06)', borderColor: 'var(--green)' }}>
            <div className="text-[12px] font-[600] text-[var(--green-l)] mb-[6px]">Active Phase</div>
            <div className="flex gap-[6px] flex-wrap">
              {phasesInProgress.map((phase) => (
                <span key={phase} className="px-[10px] py-[4px] rounded-[6px] text-[12px] font-[500]" style={{ backgroundColor: 'rgba(45,106,79,0.12)', color: 'var(--green-l)' }}>
                  {PHASE_LABELS[phase] || phase}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Client Preview & Share (migration 028 — first slice of the 3D app) */}
        <div className={cardClass} style={{ backgroundColor: 'var(--surface2)', borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between mb-[12px]">
            <div>
              <div className={cardHead} style={{ marginBottom: 2 }}>Client Preview</div>
              <div className="text-[11px] text-[var(--text-4)]">
                {editingLayout
                  ? 'Drag elements to reposition them. Positions snap to a 1-ft grid and save automatically.'
                  : 'Top-down plan from your project elements. Share the link to let a client view it in their browser.'}
              </div>
            </div>
            <div className="flex gap-[6px] items-start">
              {/* 2D / 3D view mode */}
              <div
                role="tablist"
                aria-label="Plan view mode"
                className="flex rounded-[6px] overflow-hidden border"
                style={{ borderColor: 'var(--border)' }}
              >
                {(['2d', '3d'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    role="tab"
                    aria-selected={planViewMode === mode}
                    onClick={() => setPlanViewMode(mode)}
                    className="px-[10px] py-[6px] text-[11px] font-[600] uppercase border-none cursor-pointer"
                    style={{
                      backgroundColor: planViewMode === mode ? 'var(--green)' : 'transparent',
                      color: planViewMode === mode ? '#fff' : 'var(--text-3)',
                      letterSpacing: 0.5,
                    }}
                  >
                    {mode}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setEditingLayout((v) => !v)}
                disabled={elements.length === 0}
                title={planViewMode === '3d' ? 'Drag elements in 3D to reposition them. Resize/rotate still only in 2D.' : undefined}
                className="px-[10px] py-[6px] rounded-[6px] text-[11px] font-[500] cursor-pointer"
                style={{
                  backgroundColor: editingLayout ? 'var(--green)' : 'transparent',
                  color: editingLayout ? '#fff' : 'var(--text-3)',
                  border: `1px solid ${editingLayout ? 'var(--green)' : 'var(--border)'}`,
                  opacity: elements.length === 0 ? 0.4 : 1,
                  cursor: elements.length === 0 ? 'not-allowed' : 'pointer',
                }}
              >
                {editingLayout ? 'Done editing' : 'Edit layout'}
              </button>
            {activeToken ? (
              <div className="flex gap-[6px]">
                <button
                  type="button"
                  onClick={() => { setEmailTo(project.clientEmail ?? ''); setEmailModalOpen(true); }}
                  className="px-[10px] py-[6px] rounded-[6px] text-[11px] font-[500] cursor-pointer border-none"
                  style={{ backgroundColor: 'var(--green)', color: '#fff' }}
                >
                  Email to client
                </button>
                <button
                  type="button"
                  onClick={handleCopyShareLink}
                  className="px-[10px] py-[6px] rounded-[6px] text-[11px] font-[500] cursor-pointer bg-transparent border"
                  style={{ borderColor: 'var(--border)', color: 'var(--text-3)' }}
                >
                  Copy link
                </button>
                <button
                  type="button"
                  onClick={handleRevokeShareLink}
                  className="px-[10px] py-[6px] rounded-[6px] text-[11px] font-[500] cursor-pointer bg-transparent border"
                  style={{ borderColor: 'var(--border)', color: 'var(--text-3)' }}
                >
                  Revoke
                </button>
              </div>
            ) : (
              <div className="flex gap-[6px]">
                <button
                  type="button"
                  onClick={handleCreateShareLink}
                  disabled={creatingShare || elements.length === 0}
                  className="px-[10px] py-[6px] rounded-[6px] text-[11px] font-[500] border-none"
                  style={{
                    backgroundColor: elements.length === 0 ? 'var(--surface)' : 'var(--green)',
                    color: elements.length === 0 ? 'var(--text-4)' : '#fff',
                    cursor: creatingShare || elements.length === 0 ? 'not-allowed' : 'pointer',
                    opacity: creatingShare ? 0.6 : 1,
                  }}
                  title="Read-only preview — client can approve or request changes"
                >
                  {creatingShare ? 'Creating…' : 'Share with client'}
                </button>
                <button
                  type="button"
                  onClick={handleCreateDesignLink}
                  disabled={creatingShare || elements.length === 0}
                  className="px-[10px] py-[6px] rounded-[6px] text-[11px] font-[500] border"
                  style={{
                    borderColor: elements.length === 0 ? 'var(--border)' : 'var(--green)',
                    color: elements.length === 0 ? 'var(--text-4)' : 'var(--green-l)',
                    backgroundColor: 'transparent',
                    cursor: creatingShare || elements.length === 0 ? 'not-allowed' : 'pointer',
                    opacity: creatingShare ? 0.6 : 1,
                  }}
                  title="Editable link — client can drag/resize elements, then submit for review"
                >
                  ✎ Design link
                </button>
              </div>
            )}
            </div>
          </div>
          {activeToken && (
            <>
              <div
                className="mb-[8px] px-[10px] py-[8px] rounded-[6px] text-[11px] font-mono break-all"
                style={{ backgroundColor: 'var(--surface)', color: 'var(--text-3)', border: '1px solid var(--border)' }}
              >
                {activeToken.role === 'client_design' && (
                  <span
                    className="mr-[8px] px-[6px] py-[1px] rounded-[3px] text-[10px] font-[600] font-sans"
                    style={{ backgroundColor: 'rgba(16,185,129,0.15)', color: 'var(--green-l)' }}
                  >
                    ✎ EDIT
                  </span>
                )}
                {buildShareUrl(activeToken.token)}
                {activeToken.viewCount > 0 && (
                  <span className="ml-[8px]" style={{ color: 'var(--green-l)' }}>
                    · viewed {activeToken.viewCount}×
                  </span>
                )}
              </div>
              {/* Phase C v0: client_design submission banner */}
              {activeToken.role === 'client_design' && activeToken.clientChangesSubmittedAt && (
                <div
                  className="mb-[12px] px-[12px] py-[10px] rounded-[8px] text-[12px]"
                  style={{
                    backgroundColor: 'rgba(16,185,129,0.08)',
                    border: '1px solid #10B981',
                    color: '#10B981',
                  }}
                >
                  <div style={{ fontWeight: 700, marginBottom: activeToken.clientChangesNote ? 4 : 0 }}>
                    ✎ Client submitted design changes
                    <span style={{ fontWeight: 400, marginLeft: 6, opacity: 0.75 }}>
                      · {new Date(activeToken.clientChangesSubmittedAt).toLocaleString()}
                    </span>
                  </div>
                  {activeToken.clientChangesNote && (
                    <div style={{ color: 'var(--text-secondary)', marginTop: 4 }}>
                      "{activeToken.clientChangesNote}"
                    </div>
                  )}
                  <div style={{ fontSize: 11, opacity: 0.75, marginTop: 6 }}>
                    Their edits are reflected on the plan above. Review and revoke or send a follow-up link.
                  </div>
                </div>
              )}
              {activeToken.clientResponse && (
                <div
                  className="mb-[12px] px-[12px] py-[10px] rounded-[8px] text-[12px]"
                  style={{
                    backgroundColor:
                      activeToken.clientResponse === 'approved'
                        ? 'rgba(16,185,129,0.08)'
                        : 'rgba(245,158,11,0.08)',
                    border: `1px solid ${activeToken.clientResponse === 'approved' ? '#10B981' : '#F59E0B'}`,
                    color:
                      activeToken.clientResponse === 'approved'
                        ? '#10B981'
                        : '#F59E0B',
                  }}
                >
                  <div style={{ fontWeight: 700, marginBottom: activeToken.clientNote ? 4 : 0 }}>
                    {activeToken.clientResponse === 'approved'
                      ? '✓ Client approved'
                      : '✎ Client requested changes'}
                    {activeToken.clientRespondedAt && (
                      <span style={{ fontWeight: 400, marginLeft: 6, opacity: 0.75 }}>
                        · {new Date(activeToken.clientRespondedAt).toLocaleString()}
                      </span>
                    )}
                  </div>
                  {activeToken.clientNote && (
                    <div style={{ color: 'var(--text-secondary)', marginTop: 4 }}>
                      "{activeToken.clientNote}"
                    </div>
                  )}
                </div>
              )}
              {!activeToken.clientResponse && activeToken.viewCount > 0 && (
                <div
                  className="mb-[12px] text-[11px]"
                  style={{ color: 'var(--text-4)' }}
                >
                  Client has viewed the link but not responded yet.
                </div>
              )}
            </>
          )}
          {planViewMode === '2d' ? (
            <PlanView2D
              elements={elements}
              height={360}
              labelMode="full"
              backdrop={
                project.lat != null && project.lng != null
                  ? { lat: project.lat, lng: project.lng }
                  : null
              }
              editable={editingLayout}
              onElementGeometryChange={handleElementGeometryChange}
            />
          ) : (
            <PlanView3D
              elements={elements}
              height={360}
              backdrop={
                project.lat != null && project.lng != null
                  ? { lat: project.lat, lng: project.lng }
                  : null
              }
              materialsById={materialsById}
              editable={editingLayout}
              onElementGeometryChange={handleElementGeometryChange}
            />
          )}
        </div>

        {/* Elements Summary (editable + per-element materials) */}
        <div className={cardClass} style={{ backgroundColor: 'var(--surface2)', borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between mb-[12px]">
            <div className={cardHead} style={{ marginBottom: 0 }}>Project Elements ({elements.length})</div>
            <button type="button" onClick={() => setEditingElements(!editingElements)}
              className="text-[11px] font-[500] bg-transparent border-none cursor-pointer" style={{ color: editingElements ? 'var(--green-l)' : 'var(--text-3)' }}>
              {editingElements ? 'Done' : 'Edit'}
            </button>
          </div>
          {elements.length === 0 && !editingElements && (
            <p className="text-[12px] text-[var(--text-4)]">No elements yet. Click Edit to add measurements.</p>
          )}
          <div className="space-y-[6px]">
            {elements.map((el) => {
              const area = el.computedAreaSqft || (el.lengthFt && el.widthFt ? el.lengthFt * el.widthFt : el.areaSqft) || 0;
              const elMaterials = el.materials || [];
              if (editingElements) {
                return (
                  <div key={el.id} className="rounded-[6px] border px-[8px] py-[6px]" style={{ borderColor: 'var(--border)' }}>
                    <div className="flex items-center gap-[6px] text-[12px]">
                      <input className="bg-transparent border border-[var(--border)] rounded-[4px] px-[6px] py-[3px] text-[12px] text-[var(--text)] w-[120px] focus:outline-none focus:border-[var(--green)]"
                        defaultValue={el.name} placeholder="Name" onBlur={(e) => projectStoreRef.updateElement(el.id, { name: e.target.value })} />
                      <span className="text-[10px] text-[var(--text-4)] shrink-0">{ELEMENT_TYPE_LABELS[el.elementType]}</span>
                      <input className="bg-transparent border border-[var(--border)] rounded-[4px] px-[4px] py-[3px] text-[11px] text-[var(--text)] w-[50px] text-right focus:outline-none focus:border-[var(--green)]"
                        type="number" min="0" defaultValue={el.lengthFt ?? ''} placeholder="L"
                        onBlur={(e) => { const v = parseFloat(e.target.value) || null; projectStoreRef.updateElement(el.id, { lengthFt: v, computedAreaSqft: v && el.widthFt ? v * el.widthFt : el.computedAreaSqft }); }} />
                      <span className="text-[var(--text-4)]">×</span>
                      <input className="bg-transparent border border-[var(--border)] rounded-[4px] px-[4px] py-[3px] text-[11px] text-[var(--text)] w-[50px] text-right focus:outline-none focus:border-[var(--green)]"
                        type="number" min="0" defaultValue={el.widthFt ?? ''} placeholder="W"
                        onBlur={(e) => { const v = parseFloat(e.target.value) || null; projectStoreRef.updateElement(el.id, { widthFt: v, computedAreaSqft: el.lengthFt && v ? el.lengthFt * v : el.computedAreaSqft }); }} />
                      <span className="text-[var(--text-4)] text-[10px]">ft</span>
                      <span className="text-[var(--text-4)] ml-auto tabular-nums text-[11px]">{area > 0 ? `${area} sqft` : ''}</span>
                      <button type="button" onClick={() => projectStoreRef.deleteElement(el.id)}
                        className="text-[var(--text-4)] hover:text-[var(--status-red)] bg-transparent border-none cursor-pointer text-[11px]">✕</button>
                    </div>
                  </div>
                );
              }
              return (
                <div key={el.id} className="rounded-[8px] border px-[12px] py-[10px] flex gap-[12px]" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}>
                  <div className="shrink-0">
                    <ElementVisual element={el} size={100} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-[6px] text-[12px]">
                      <span className="px-[6px] py-[1px] rounded-[4px] text-[10px] font-[500] shrink-0" style={{ backgroundColor: 'rgba(45,106,79,0.1)', color: 'var(--green-l)' }}>
                        {ELEMENT_TYPE_LABELS[el.elementType] || el.elementType}
                      </span>
                      <span className="text-[var(--text)] font-[500]">{el.name}</span>
                      <span className="text-[var(--text-4)] ml-auto tabular-nums text-[11px]">
                        {el.lengthFt && el.widthFt ? `${el.lengthFt} × ${el.widthFt} ft` : ''}
                        {area > 0 ? ` = ${area.toLocaleString()} sqft` : el.linearFt ? `${el.linearFt} LF` : ''}
                      </span>
                    </div>
                    <div className="mt-[4px] flex flex-wrap gap-[4px] items-center">
                      {elMaterials.map((m, mi) => (
                        <span key={mi} className="text-[10px] px-[5px] py-[1px] rounded-[3px]" style={{ backgroundColor: 'rgba(45,106,79,0.08)', color: 'var(--text-3)' }}>
                          {m.name} · {m.quantity} {m.unit}
                        </span>
                      ))}
                      <button type="button" onClick={() => setPickerElementId(el.id)}
                        className="text-[10px] px-[5px] py-[1px] rounded-[3px] cursor-pointer bg-transparent border border-dashed transition-colors"
                        style={{ borderColor: 'var(--border)', color: 'var(--green-l)' }}>
                        {elMaterials.length > 0 ? '+ edit' : '+ add materials'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {editingElements && (
            <button type="button" onClick={async () => {
              const orgId = useOrgStore.getState().org?.id;
              if (!orgId) return;
              await projectStoreRef.addElement({ orgId, projectId: project.id, name: 'New Element', elementType: 'other', lengthFt: null, widthFt: null, areaSqft: null, linearFt: null, heightFt: null, depthIn: null, computedAreaSqft: 0, notes: '', sequence: elements.length, createdAt: new Date().toISOString() }, orgId);
            }}
              className="mt-[8px] w-full rounded-[6px] border-2 border-dashed py-[8px] text-[12px] font-[500] cursor-pointer bg-transparent transition-colors"
              style={{ borderColor: 'var(--border)', color: 'var(--green-l)' }}>
              + Add Element
            </button>
          )}
        </div>

        {/* Task Timeline (Gantt chart + crew schedule) */}
        {tasks.length > 0 && (
          <div className={cardClass} style={{ backgroundColor: 'var(--surface2)', borderColor: 'var(--border)' }}>
            <div className={cardHead}>Task Timeline</div>
            <TaskTimeline
              tasks={tasks}
              startDate={project.startDate || null}
              targetDate={project.targetDate || null}
              crewSize={project.crewSize ?? 1}
              projectMaterials={project.materials ?? []}
              projectEquipment={projectEquipment}
              crewEntries={scheduleEntries
                .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))
                .map(entry => ({
                  id: entry.id,
                  crewName: crew.find(c => c.id === entry.crewMemberId)?.name ?? 'Unassigned',
                  date: entry.scheduledDate,
                  status: entry.status,
                }))}
              crewMembers={crew.map(c => ({ id: c.id, name: c.name }))}
              onTaskUpdate={onTaskUpdate}
            />
          </div>
        )}

        {/* Inline Task List (absorbed from Tasks tab) */}
        {tasks.length > 0 && onStatusChange && (
          <div className={cardClass} style={{ backgroundColor: 'var(--surface2)', borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between mb-[12px]">
              <div className={cardHead} style={{ marginBottom: 0 }}>Tasks ({tasks.filter(t => t.status === 'completed').length}/{tasks.length})</div>
              <div className="flex-1 h-[4px] rounded-[2px] ml-[12px]" style={{ backgroundColor: 'var(--surface3)', maxWidth: 120 }}>
                <div className="h-full rounded-[2px]" style={{ width: `${tasks.length > 0 ? (tasks.filter(t => t.status === 'completed').length / tasks.length) * 100 : 0}%`, backgroundColor: 'var(--green)' }} />
              </div>
            </div>
            {(() => {
              // F-CW-48: include all standard phases (even ones with no tasks
              // yet) so contractors can add tasks to any phase. Wizard-
              // generated tasks normally only cover the phases AI thought
              // applied, so missing phases would be invisible without this.
              const populatedPhases = [...new Set(tasks.map(t => t.phase))];
              const allPhases = ['demo_prep', 'rough_grade', 'hardscape', 'softscape', 'irrigation', 'lighting', 'cleanup_punchlist'];
              const phasesToShow = onTaskCreate
                ? Array.from(new Set([...populatedPhases, ...allPhases]))
                : populatedPhases;
              return phasesToShow.map(phase => {
                const phaseTasks = tasks.filter(t => t.phase === phase).sort((a, b) => a.sequenceNumber - b.sequenceNumber);
                if (phaseTasks.length === 0 && !onTaskCreate) return null;
                return (
                  <div key={phase} className="mb-[8px]">
                    <div className="flex items-center justify-between mb-[4px]">
                      <div className="text-[11px] font-[600] text-[var(--text-3)] uppercase">{PHASE_LABELS[phase] || phase}</div>
                      {onTaskCreate && (
                        <button
                          type="button"
                          onClick={() => onTaskCreate(phase)}
                          className="text-[11px] font-[500] cursor-pointer bg-transparent border-none px-[6px] py-[2px] rounded-[4px]"
                          style={{ color: 'var(--green-l)' }}
                        >
                          + Add Task
                        </button>
                      )}
                    </div>
                    {phaseTasks.length > 0 ? (
                      <TaskTable
                        tasks={phaseTasks}
                        editingTaskId={editingTaskId}
                        confirmDeleteId={confirmDeleteId}
                        onEditTask={setEditingTaskId}
                        onConfirmDelete={setConfirmDeleteId}
                        onStatusChange={onStatusChange}
                        onTaskSave={(id, updates) => { onTaskUpdate?.(id, updates); setEditingTaskId(null); }}
                        onTaskDelete={(id) => { onTaskDelete?.(id); setConfirmDeleteId(null); }}
                      />
                    ) : (
                      <div className="text-[11px] text-[var(--text-4)] italic px-[2px] pb-[6px]">No tasks in this phase yet.</div>
                    )}
                  </div>
                );
              });
            })()}
          </div>
        )}

      {/* Material Picker Modal */}
      {pickerElement && (
        <MaterialPicker
          element={pickerElement}
          isOpen={!!pickerElementId}
          onClose={() => setPickerElementId(null)}
        />
      )}

      {/* Email-to-client modal (Phase 2a) */}
      {emailModalOpen && activeToken && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
            background: 'rgba(0,0,0,0.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 24,
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setEmailModalOpen(false); }}
        >
          <div
            style={{
              background: 'var(--surface-card, #0F1510)',
              color: 'var(--text, #F9FAFB)',
              borderRadius: 12,
              border: '1px solid var(--border)',
              maxWidth: 520, width: '100%',
              padding: 24,
            }}
          >
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Email proposal to client</h2>
            <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 18 }}>
              Sends them the shareable link + optional note. They click it to preview + approve.
            </p>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Client email
            </label>
            <input
              type="email"
              value={emailTo}
              onChange={(e) => setEmailTo(e.target.value)}
              placeholder="client@example.com"
              style={{
                width: '100%', padding: 10, borderRadius: 6,
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--text)',
                fontSize: 14, marginTop: 6, marginBottom: 14,
                boxSizing: 'border-box',
              }}
            />
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Personal note (optional)
            </label>
            <textarea
              value={emailMessage}
              onChange={(e) => setEmailMessage(e.target.value)}
              rows={4}
              maxLength={2000}
              placeholder={`Hi ${project.client || 'there'}, here's the design we put together — take a look and let me know what you think.`}
              style={{
                width: '100%', padding: 10, borderRadius: 6,
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--text)',
                fontSize: 13, marginTop: 6, marginBottom: 14,
                resize: 'vertical', fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setEmailModalOpen(false)}
                disabled={emailSending}
                style={{
                  padding: '10px 16px', borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: 'transparent',
                  color: 'var(--text-3)',
                  fontSize: 13, fontWeight: 500,
                  cursor: emailSending ? 'not-allowed' : 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendProposalEmail}
                disabled={emailSending || !emailTo.trim()}
                style={{
                  padding: '10px 20px', borderRadius: 8,
                  border: 'none',
                  background: 'var(--green)',
                  color: '#fff',
                  fontSize: 13, fontWeight: 600,
                  cursor: emailSending || !emailTo.trim() ? 'not-allowed' : 'pointer',
                  opacity: emailSending ? 0.6 : 1,
                }}
              >
                {emailSending ? 'Sending…' : 'Send proposal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
