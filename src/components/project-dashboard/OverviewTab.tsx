import React, { useState } from 'react';
import type { Project, ProjectTask, ProjectSubcontractor, ProjectPermit, ScheduleEntry, CrewMember } from '@/types';
import { useProjectStore } from '@/stores/projectStore';
import { Modal } from '@/components/shared/Modal';

interface Props {
  project: Project;
  tasks: ProjectTask[];
  subcontractors: ProjectSubcontractor[];
  permits: ProjectPermit[];
  scheduleEntries: ScheduleEntry[];
  crew: CrewMember[];
  onProjectUpdated?: (updates: Partial<Project>) => void;
}

const cardClass =
  'rounded-[10px] border p-[16px]';

const cardHead = 'text-[12px] font-[700] uppercase text-[var(--text-3)] mb-[12px]';
const rowClass = 'flex justify-between text-[12px] py-[4px]';
const labelSpan = 'text-[var(--text-3)]';
const valueSpan = 'text-[var(--text)] font-[500]';

const inputClass =
  'bg-transparent border rounded-[6px] px-[8px] py-[6px] text-[13px] text-[var(--text)] w-full focus:outline-none focus:border-[var(--green)]';

const formLabelClass = 'block text-[11px] font-[600] text-[var(--text-3)] mb-[4px]';

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

const PROJECT_TYPES = [
  { value: 'full_install', label: 'Full Install' },
  { value: 'renovation', label: 'Renovation' },
  { value: 'hardscape', label: 'Hardscape' },
  { value: 'softscape', label: 'Softscape' },
  { value: 'drainage', label: 'Drainage' },
  { value: 'irrigation', label: 'Irrigation' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'mixed', label: 'Mixed' },
];

const PROPERTY_TYPES = [
  { value: 'residential', label: 'Residential' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'hoa', label: 'HOA' },
  { value: 'municipal', label: 'Municipal' },
  { value: 'multi_family', label: 'Multi-Family' },
  { value: 'other', label: 'Other' },
];

const SCOPE_SIZES = [
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
  { value: 'commercial', label: 'Commercial' },
];

const SUN_EXPOSURES = [
  { value: 'full_sun', label: 'Full Sun' },
  { value: 'partial_shade', label: 'Partial Shade' },
  { value: 'full_shade', label: 'Full Shade' },
  { value: 'mixed', label: 'Mixed' },
];

interface EditFormState {
  name: string;
  description: string;
  projectType: string;
  propertyType: string;
  scopeSize: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  address: string;
  startDate: string;
  targetDate: string;
  estimatedHours: string;
  slopeGrade: string;
  soilType: string;
  sunExposure: string;
  drainagePattern: string;
  existingVegetation: string;
  climateZone: string;
  utilityLocations: string;
}

export const ProjectDashboardOverview: React.FC<Props> = ({
  project,
  tasks,
  subcontractors,
  permits,
  scheduleEntries,
  crew,
  onProjectUpdated,
}) => {
  const [showEditModal, setShowEditModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<EditFormState>({
    name: '',
    description: '',
    projectType: '',
    propertyType: '',
    scopeSize: '',
    clientName: '',
    clientPhone: '',
    clientEmail: '',
    address: '',
    startDate: '',
    targetDate: '',
    estimatedHours: '',
    slopeGrade: '',
    soilType: '',
    sunExposure: '',
    drainagePattern: '',
    existingVegetation: '',
    climateZone: '',
    utilityLocations: '',
  });

  const openEdit = () => {
    setForm({
      name: project.name || '',
      description: project.description || '',
      projectType: project.projectType || '',
      propertyType: project.propertyType || '',
      scopeSize: project.scopeSize || '',
      clientName: project.clientName || '',
      clientPhone: project.clientPhone || '',
      clientEmail: project.clientEmail || '',
      address: project.address || '',
      startDate: project.startDate || '',
      targetDate: project.targetDate || '',
      estimatedHours: project.estimatedHours?.toString() || '',
      slopeGrade: project.slopeGrade || '',
      soilType: project.soilType || '',
      sunExposure: project.sunExposure || '',
      drainagePattern: project.drainagePattern || '',
      existingVegetation: project.existingVegetation || '',
      climateZone: project.climateZone || '',
      utilityLocations: project.utilityLocations || '',
    });
    setShowEditModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    const updates: Partial<Project> = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      projectType: (form.projectType || null) as Project['projectType'],
      propertyType: (form.propertyType || null) as Project['propertyType'],
      scopeSize: (form.scopeSize || null) as Project['scopeSize'],
      clientName: form.clientName.trim() || null,
      clientPhone: form.clientPhone.trim() || null,
      clientEmail: form.clientEmail.trim() || null,
      address: form.address.trim(),
      startDate: form.startDate || '',
      targetDate: form.targetDate || '',
      estimatedHours: form.estimatedHours ? parseFloat(form.estimatedHours) : null,
      slopeGrade: form.slopeGrade.trim() || null,
      soilType: form.soilType.trim() || null,
      sunExposure: (form.sunExposure || null) as Project['sunExposure'],
      drainagePattern: form.drainagePattern.trim() || null,
      existingVegetation: form.existingVegetation.trim() || null,
      climateZone: form.climateZone.trim() || null,
      utilityLocations: form.utilityLocations.trim() || null,
    };
    await useProjectStore.getState().updateProject(project.id, updates);
    setSaving(false);
    onProjectUpdated?.(updates);
    setShowEditModal(false);
  };

  const setField = (field: keyof EditFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const completedTasks = tasks.filter((t) => t.status === 'completed').length;
  const totalHours = tasks.reduce((sum, t) => sum + (t.estimatedHours ?? 0), 0);

  // Budget summary
  const labor = project.laborBudget ?? 0;
  const materials = project.materialsBudget ?? 0;
  const equipment = project.equipmentBudget ?? 0;
  const subs = project.subcontractorBudget ?? 0;
  const subtotal = labor + materials + equipment + subs;
  const overhead = subtotal * ((project.overheadPct ?? 10) / 100);
  const totalCost = subtotal + overhead;
  const quote = project.clientQuote ?? project.budget ?? 0;
  const profit = quote - totalCost;
  const marginPct = quote > 0 ? (profit / quote) * 100 : 0;

  // Upcoming schedule (next 7 days)
  const now = new Date();
  const weekOut = new Date(now);
  weekOut.setDate(weekOut.getDate() + 7);
  const upcoming = scheduleEntries
    .filter((e) => {
      const d = new Date(e.scheduledDate + 'T00:00:00');
      return d >= now && d <= weekOut;
    })
    .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));

  // Active phase
  const phasesInProgress = [...new Set(
    tasks.filter((t) => t.status === 'in_progress').map((t) => t.phase)
  )];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-[16px] items-start">
      {/* ── Left column ──────────────────────────────────────────────────────── */}
      <div className="space-y-[16px]">
        {/* KPI Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-[10px]">
          {[
            { label: 'Tasks', value: `${completedTasks}/${tasks.length}`, sub: tasks.length > 0 ? `${Math.round((completedTasks / tasks.length) * 100)}% done` : 'No tasks' },
            { label: 'Est. Hours', value: `${totalHours}h`, sub: project.estimatedHours ? `of ${project.estimatedHours}h` : '' },
            { label: 'Budget', value: fmt(totalCost), sub: quote > 0 ? `Quote: ${fmt(quote)}` : '' },
            { label: 'Margin', value: quote > 0 ? `${marginPct.toFixed(0)}%` : '—', sub: profit > 0 ? fmt(profit) : profit < 0 ? `(${fmt(Math.abs(profit))})` : '' },
          ].map((kpi) => (
            <div
              key={kpi.label}
              className="rounded-[8px] border p-[12px]"
              style={{ backgroundColor: 'var(--surface2)', borderColor: 'var(--border)' }}
            >
              <div className="text-[10px] font-[600] uppercase text-[var(--text-4)] mb-[4px]">{kpi.label}</div>
              <div className="text-[18px] font-[700] text-[var(--text)]">{kpi.value}</div>
              {kpi.sub && <div className="text-[11px] text-[var(--text-4)] mt-[2px]">{kpi.sub}</div>}
            </div>
          ))}
        </div>

        {/* Active Phase */}
        {phasesInProgress.length > 0 && (
          <div
            className={cardClass}
            style={{ backgroundColor: 'rgba(45,106,79,0.06)', borderColor: 'var(--green)' }}
          >
            <div className="text-[12px] font-[600] text-[var(--green-l)] mb-[6px]">Active Phase</div>
            <div className="flex gap-[6px] flex-wrap">
              {phasesInProgress.map((phase) => (
                <span
                  key={phase}
                  className="px-[10px] py-[4px] rounded-[6px] text-[12px] font-[500]"
                  style={{ backgroundColor: 'rgba(45,106,79,0.12)', color: 'var(--green-l)' }}
                >
                  {PHASE_LABELS[phase] || phase}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Description */}
        {project.description && (
          <div className={cardClass} style={{ backgroundColor: 'var(--surface2)', borderColor: 'var(--border)' }}>
            <div className={cardHead}>Description</div>
            <p className="text-[13px] text-[var(--text-2)] leading-[1.5]">{project.description}</p>
          </div>
        )}

        {/* Recent Tasks */}
        {tasks.length > 0 && (
          <div className={cardClass} style={{ backgroundColor: 'var(--surface2)', borderColor: 'var(--border)' }}>
            <div className={cardHead}>Tasks Overview</div>
            <div className="space-y-[6px]">
              {tasks.slice(0, 8).map((task) => (
                <div key={task.id} className="flex items-center gap-[8px] text-[12px]">
                  <span
                    className="w-[8px] h-[8px] rounded-full shrink-0"
                    style={{
                      backgroundColor:
                        task.status === 'completed' ? 'var(--status-green)'
                          : task.status === 'in_progress' ? 'var(--status-amber)'
                          : 'var(--border)',
                    }}
                  />
                  <span className="text-[var(--text)] flex-1">{task.name}</span>
                  <span className="text-[var(--text-4)] text-[11px]">
                    {PHASE_LABELS[task.phase] || task.phase}
                  </span>
                  {task.estimatedHours != null && (
                    <span className="text-[var(--text-4)] text-[11px]">{task.estimatedHours}h</span>
                  )}
                </div>
              ))}
              {tasks.length > 8 && (
                <div className="text-[11px] text-[var(--text-4)] pt-[4px]">
                  +{tasks.length - 8} more tasks
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Right column ─────────────────────────────────────────────────────── */}
      <div className="space-y-[12px]">
        {/* Project Info */}
        <div className={cardClass} style={{ backgroundColor: 'var(--surface2)', borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between mb-[12px]">
            <div className={cardHead} style={{ marginBottom: 0 }}>Project Info</div>
            <button
              type="button"
              onClick={openEdit}
              className="flex items-center gap-[4px] text-[12px] font-[500] cursor-pointer bg-transparent border-none"
              style={{ color: 'var(--green-l)' }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              Edit
            </button>
          </div>
          <div className="space-y-[6px]">
            {project.clientName && (
              <div className={rowClass}>
                <span className={labelSpan}>Client</span>
                <span className={valueSpan}>{project.clientName}</span>
              </div>
            )}
            {project.clientPhone && (
              <div className={rowClass}>
                <span className={labelSpan}>Phone</span>
                <span className={valueSpan}>{project.clientPhone}</span>
              </div>
            )}
            {project.clientEmail && (
              <div className={rowClass}>
                <span className={labelSpan}>Email</span>
                <span className={valueSpan}>{project.clientEmail}</span>
              </div>
            )}
            {project.projectType && (
              <div className={rowClass}>
                <span className={labelSpan}>Type</span>
                <span className={valueSpan}>{PROJECT_TYPES.find((t) => t.value === project.projectType)?.label || project.projectType}</span>
              </div>
            )}
            {project.propertyType && (
              <div className={rowClass}>
                <span className={labelSpan}>Property</span>
                <span className={valueSpan}>{PROPERTY_TYPES.find((t) => t.value === project.propertyType)?.label || project.propertyType}</span>
              </div>
            )}
            {project.scopeSize && (
              <div className={rowClass}>
                <span className={labelSpan}>Scope</span>
                <span className={valueSpan} style={{ textTransform: 'capitalize' }}>{project.scopeSize}</span>
              </div>
            )}
            <div className={rowClass}>
              <span className={labelSpan}>Start</span>
              <span className={valueSpan}>
                {project.startDate ? new Date(project.startDate).toLocaleDateString() : '—'}
              </span>
            </div>
            <div className={rowClass}>
              <span className={labelSpan}>Target</span>
              <span className={valueSpan}>
                {project.targetDate ? new Date(project.targetDate).toLocaleDateString() : '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Site Conditions */}
        {(project.climateZone || project.soilType || project.slopeGrade || project.sunExposure) && (
          <div className={cardClass} style={{ backgroundColor: 'var(--surface2)', borderColor: 'var(--border)' }}>
            <div className={cardHead}>Site Conditions</div>
            <div className="space-y-[6px]">
              {project.climateZone && <div className={rowClass}><span className={labelSpan}>Climate</span><span className={valueSpan}>{project.climateZone}</span></div>}
              {project.soilType && <div className={rowClass}><span className={labelSpan}>Soil</span><span className={valueSpan}>{project.soilType}</span></div>}
              {project.slopeGrade && <div className={rowClass}><span className={labelSpan}>Slope</span><span className={valueSpan}>{project.slopeGrade}</span></div>}
              {project.sunExposure && <div className={rowClass}><span className={labelSpan}>Sun</span><span className={valueSpan}>{project.sunExposure.replace('_', ' ')}</span></div>}
              {project.drainagePattern && <div className={rowClass}><span className={labelSpan}>Drainage</span><span className={valueSpan}>{project.drainagePattern}</span></div>}
              {project.existingVegetation && <div className={rowClass}><span className={labelSpan}>Vegetation</span><span className={valueSpan}>{project.existingVegetation}</span></div>}
              {project.utilityLocations && <div className={rowClass}><span className={labelSpan}>Utilities</span><span className={valueSpan}>{project.utilityLocations}</span></div>}
            </div>
          </div>
        )}

        {/* Upcoming Schedule */}
        <div className={cardClass} style={{ backgroundColor: 'var(--surface2)', borderColor: 'var(--border)' }}>
          <div className={cardHead}>Upcoming Schedule</div>
          {upcoming.length === 0 ? (
            <p className="text-[12px] text-[var(--text-4)]">No crew scheduled this week.</p>
          ) : (
            <div className="space-y-[6px]">
              {upcoming.slice(0, 5).map((entry) => {
                const member = crew.find((c) => c.id === entry.crewMemberId);
                return (
                  <div key={entry.id} className="flex items-center justify-between text-[12px]">
                    <span className="text-[var(--text)] font-[500]">{member?.name ?? 'Unknown'}</span>
                    <span className="text-[var(--text-4)]">
                      {new Date(entry.scheduledDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Compliance Summary */}
        {(permits.length > 0 || project.complianceNotes) && (
          <div className={cardClass} style={{ backgroundColor: 'var(--surface2)', borderColor: 'var(--border)' }}>
            <div className={cardHead}>Compliance</div>
            {permits.length > 0 && (
              <div className="flex gap-[4px] flex-wrap mb-[6px]">
                {permits.map((p) => (
                  <span
                    key={p.id}
                    className="px-[6px] py-[2px] rounded-[4px] text-[10px] font-[500]"
                    style={{
                      backgroundColor:
                        p.status === 'approved' ? 'rgba(22,163,74,0.12)'
                          : p.status === 'applied' ? 'rgba(212,164,76,0.12)'
                          : 'var(--surface3)',
                      color:
                        p.status === 'approved' ? 'var(--status-green)'
                          : p.status === 'applied' ? 'var(--status-amber)'
                          : 'var(--text-4)',
                    }}
                  >
                    {p.permitType.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            )}
            {project.complianceNotes && (
              <p className="text-[11px] text-[var(--text-4)] italic">{project.complianceNotes}</p>
            )}
          </div>
        )}
      </div>

      {/* ── Edit Project Details Modal ────────────────────────────────────────── */}
      <Modal
        isOpen={showEditModal}
        title="Edit Project Details"
        onClose={() => setShowEditModal(false)}
        onConfirm={handleSave}
        confirmText={saving ? 'Saving...' : 'Save'}
        maxWidth="640px"
      >
        <div className="space-y-[20px]">
          {/* Section A: Project & Client Info */}
          <div>
            <div className="text-[13px] font-[600] text-[var(--text)] mb-[12px]">Project & Client Info</div>
            <div className="space-y-[10px]">
              <div>
                <label className={formLabelClass}>Project Name *</label>
                <input
                  type="text"
                  className={inputClass}
                  style={{ borderColor: 'var(--border)' }}
                  value={form.name}
                  onChange={(e) => setField('name', e.target.value)}
                  placeholder="Project name"
                />
              </div>
              <div>
                <label className={formLabelClass}>Description</label>
                <textarea
                  className={inputClass}
                  style={{ borderColor: 'var(--border)', minHeight: '60px', resize: 'vertical' }}
                  value={form.description}
                  onChange={(e) => setField('description', e.target.value)}
                  placeholder="Project description"
                />
              </div>
              <div className="grid grid-cols-2 gap-[10px]">
                <div>
                  <label className={formLabelClass}>Project Type</label>
                  <select
                    className={inputClass}
                    style={{ borderColor: 'var(--border)' }}
                    value={form.projectType}
                    onChange={(e) => setField('projectType', e.target.value)}
                  >
                    <option value="">—</option>
                    {PROJECT_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={formLabelClass}>Property Type</label>
                  <select
                    className={inputClass}
                    style={{ borderColor: 'var(--border)' }}
                    value={form.propertyType}
                    onChange={(e) => setField('propertyType', e.target.value)}
                  >
                    <option value="">—</option>
                    {PROPERTY_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={formLabelClass}>Scope Size</label>
                  <select
                    className={inputClass}
                    style={{ borderColor: 'var(--border)' }}
                    value={form.scopeSize}
                    onChange={(e) => setField('scopeSize', e.target.value)}
                  >
                    <option value="">—</option>
                    {SCOPE_SIZES.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={formLabelClass}>Client Name</label>
                  <input
                    type="text"
                    className={inputClass}
                    style={{ borderColor: 'var(--border)' }}
                    value={form.clientName}
                    onChange={(e) => setField('clientName', e.target.value)}
                    placeholder="Client name"
                  />
                </div>
                <div>
                  <label className={formLabelClass}>Client Phone</label>
                  <input
                    type="tel"
                    className={inputClass}
                    style={{ borderColor: 'var(--border)' }}
                    value={form.clientPhone}
                    onChange={(e) => setField('clientPhone', e.target.value)}
                    placeholder="Phone"
                  />
                </div>
                <div>
                  <label className={formLabelClass}>Client Email</label>
                  <input
                    type="email"
                    className={inputClass}
                    style={{ borderColor: 'var(--border)' }}
                    value={form.clientEmail}
                    onChange={(e) => setField('clientEmail', e.target.value)}
                    placeholder="Email"
                  />
                </div>
              </div>
              <div>
                <label className={formLabelClass}>Address</label>
                <input
                  type="text"
                  className={inputClass}
                  style={{ borderColor: 'var(--border)' }}
                  value={form.address}
                  onChange={(e) => setField('address', e.target.value)}
                  placeholder="Project address"
                />
              </div>
              <div className="grid grid-cols-3 gap-[10px]">
                <div>
                  <label className={formLabelClass}>Start Date</label>
                  <input
                    type="date"
                    className={inputClass}
                    style={{ borderColor: 'var(--border)' }}
                    value={form.startDate}
                    onChange={(e) => setField('startDate', e.target.value)}
                  />
                </div>
                <div>
                  <label className={formLabelClass}>Target Date</label>
                  <input
                    type="date"
                    className={inputClass}
                    style={{ borderColor: 'var(--border)' }}
                    value={form.targetDate}
                    onChange={(e) => setField('targetDate', e.target.value)}
                  />
                </div>
                <div>
                  <label className={formLabelClass}>Est. Hours</label>
                  <input
                    type="number"
                    className={inputClass}
                    style={{ borderColor: 'var(--border)' }}
                    value={form.estimatedHours}
                    onChange={(e) => setField('estimatedHours', e.target.value)}
                    placeholder="0"
                    min={0}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section B: Site Conditions */}
          <div>
            <div className="text-[13px] font-[600] text-[var(--text)] mb-[12px]">Site Conditions</div>
            <div className="grid grid-cols-2 gap-[10px]">
              <div>
                <label className={formLabelClass}>Slope Grade</label>
                <input
                  type="text"
                  className={inputClass}
                  style={{ borderColor: 'var(--border)' }}
                  value={form.slopeGrade}
                  onChange={(e) => setField('slopeGrade', e.target.value)}
                  placeholder="e.g., 5% grade"
                />
              </div>
              <div>
                <label className={formLabelClass}>Soil Type</label>
                <input
                  type="text"
                  className={inputClass}
                  style={{ borderColor: 'var(--border)' }}
                  value={form.soilType}
                  onChange={(e) => setField('soilType', e.target.value)}
                  placeholder="e.g., clay, sandy"
                />
              </div>
              <div>
                <label className={formLabelClass}>Sun Exposure</label>
                <select
                  className={inputClass}
                  style={{ borderColor: 'var(--border)' }}
                  value={form.sunExposure}
                  onChange={(e) => setField('sunExposure', e.target.value)}
                >
                  <option value="">—</option>
                  {SUN_EXPOSURES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={formLabelClass}>Drainage Pattern</label>
                <input
                  type="text"
                  className={inputClass}
                  style={{ borderColor: 'var(--border)' }}
                  value={form.drainagePattern}
                  onChange={(e) => setField('drainagePattern', e.target.value)}
                  placeholder="e.g., slopes to east"
                />
              </div>
              <div>
                <label className={formLabelClass}>Existing Vegetation</label>
                <input
                  type="text"
                  className={inputClass}
                  style={{ borderColor: 'var(--border)' }}
                  value={form.existingVegetation}
                  onChange={(e) => setField('existingVegetation', e.target.value)}
                  placeholder="e.g., mature oaks, lawn"
                />
              </div>
              <div>
                <label className={formLabelClass}>Climate Zone</label>
                <input
                  type="text"
                  className={inputClass}
                  style={{ borderColor: 'var(--border)' }}
                  value={form.climateZone}
                  onChange={(e) => setField('climateZone', e.target.value)}
                  placeholder="e.g., USDA 8b"
                />
              </div>
              <div className="col-span-2">
                <label className={formLabelClass}>Utility Locations</label>
                <input
                  type="text"
                  className={inputClass}
                  style={{ borderColor: 'var(--border)' }}
                  value={form.utilityLocations}
                  onChange={(e) => setField('utilityLocations', e.target.value)}
                  placeholder="e.g., gas line NE corner, power runs along fence"
                />
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};
