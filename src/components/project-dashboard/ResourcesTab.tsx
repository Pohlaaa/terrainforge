import React, { useState } from 'react';
import type { Project, ProjectSubcontractor, ScheduleEntry, CrewMember, Equipment, SubcontractorStatus } from '@/types';
import { useProjectStore } from '@/stores/projectStore';
import { CrewAssignmentPanel } from './resources/CrewAssignmentPanel';

interface Props {
  project: Project;
  subcontractors: ProjectSubcontractor[];
  crew: CrewMember[];
  scheduleEntries: ScheduleEntry[];
  projectEquipment?: Equipment[];
  onSubCreate: () => void;
  onSubUpdate: (subId: string, updates: Partial<ProjectSubcontractor>) => void;
  onSubDelete: (subId: string) => void;
}

function fmt(n: number | null | undefined): string {
  if (n == null) return '—';
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

const cardClass = 'rounded-[10px] border p-[16px]';
const cardHead = 'text-[12px] font-[700] uppercase text-[var(--text-3)] mb-[14px]';
const inputClass =
  'bg-transparent border rounded-[6px] px-[8px] py-[4px] text-[12px] text-[var(--text)] w-full focus:outline-none focus:border-[var(--green)]';

const STATUS_COLORS: Record<string, string> = {
  pending: 'var(--text-4)',
  confirmed: 'var(--status-blue)',
  in_progress: 'var(--status-amber)',
  completed: 'var(--status-green)',
  cancelled: 'var(--status-red)',
};

const SUB_STATUSES: { value: SubcontractorStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

// Inline edit form for a subcontractor
const SubEditForm: React.FC<{
  sub: ProjectSubcontractor;
  onSave: (updates: Partial<ProjectSubcontractor>) => void;
  onCancel: () => void;
  onDelete: () => void;
}> = ({ sub, onSave, onCancel, onDelete }) => {
  const [companyName, setCompanyName] = useState(sub.companyName);
  const [trade, setTrade] = useState(sub.trade || '');
  const [scopeDescription, setScopeDescription] = useState(sub.scopeDescription || '');
  const [quotedCost, setQuotedCost] = useState(sub.quotedCost?.toString() || '');
  const [actualCost, setActualCost] = useState(sub.actualCost?.toString() || '');
  const [status, setStatus] = useState(sub.status);
  const [contactName, setContactName] = useState(sub.contactName || '');
  const [phone, setPhone] = useState(sub.phone || '');
  const [email, setEmail] = useState(sub.email || '');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSave = () => {
    if (!companyName.trim()) return;
    onSave({
      companyName: companyName.trim(), trade: trade.trim() || null,
      scopeDescription: scopeDescription.trim() || null,
      quotedCost: quotedCost ? parseFloat(quotedCost) : null,
      actualCost: actualCost ? parseFloat(actualCost) : null,
      status: status as SubcontractorStatus,
      contactName: contactName.trim() || null, phone: phone.trim() || null, email: email.trim() || null,
    });
  };

  return (
    <div className="rounded-[8px] border px-[12px] py-[10px] space-y-[8px]" style={{ borderColor: 'var(--green)', backgroundColor: 'var(--surface3)' }}>
      <div className="grid grid-cols-2 gap-[8px]">
        <div><label className="text-[10px] text-[var(--text-4)] mb-[2px] block">Company Name</label><input type="text" className={inputClass} style={{ borderColor: 'var(--border)' }} value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Company name" /></div>
        <div><label className="text-[10px] text-[var(--text-4)] mb-[2px] block">Trade</label><input type="text" className={inputClass} style={{ borderColor: 'var(--border)' }} value={trade} onChange={(e) => setTrade(e.target.value)} placeholder="e.g., electrician, plumber" /></div>
        <div className="col-span-2"><label className="text-[10px] text-[var(--text-4)] mb-[2px] block">Scope</label><input type="text" className={inputClass} style={{ borderColor: 'var(--border)' }} value={scopeDescription} onChange={(e) => setScopeDescription(e.target.value)} placeholder="What they're doing on this job" /></div>
        <div><label className="text-[10px] text-[var(--text-4)] mb-[2px] block">Quoted Cost</label><input type="number" className={inputClass} style={{ borderColor: 'var(--border)' }} value={quotedCost} onChange={(e) => setQuotedCost(e.target.value)} placeholder="0" min={0} /></div>
        <div><label className="text-[10px] text-[var(--text-4)] mb-[2px] block">Actual Cost</label><input type="number" className={inputClass} style={{ borderColor: 'var(--border)' }} value={actualCost} onChange={(e) => setActualCost(e.target.value)} placeholder="0" min={0} /></div>
        <div><label className="text-[10px] text-[var(--text-4)] mb-[2px] block">Status</label><select className={inputClass} style={{ borderColor: 'var(--border)' }} value={status} onChange={(e) => setStatus(e.target.value as SubcontractorStatus)}>{SUB_STATUSES.map((s) => (<option key={s.value} value={s.value}>{s.label}</option>))}</select></div>
        <div><label className="text-[10px] text-[var(--text-4)] mb-[2px] block">Contact Name</label><input type="text" className={inputClass} style={{ borderColor: 'var(--border)' }} value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Contact name" /></div>
        <div><label className="text-[10px] text-[var(--text-4)] mb-[2px] block">Phone</label><input type="tel" className={inputClass} style={{ borderColor: 'var(--border)' }} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" /></div>
        <div><label className="text-[10px] text-[var(--text-4)] mb-[2px] block">Email</label><input type="email" className={inputClass} style={{ borderColor: 'var(--border)' }} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" /></div>
      </div>
      <div className="flex items-center justify-between">
        {confirmDelete ? (
          <div className="flex items-center gap-[4px]">
            <span className="text-[11px] text-[var(--status-red)]">Delete this sub?</span>
            <button type="button" onClick={onDelete} className="px-[8px] py-[3px] rounded-[4px] text-[10px] font-[600] border-none cursor-pointer" style={{ backgroundColor: 'rgba(224,92,92,0.15)', color: 'var(--status-red)' }}>Yes, delete</button>
            <button type="button" onClick={() => setConfirmDelete(false)} className="px-[6px] py-[3px] text-[10px] bg-transparent border-none cursor-pointer" style={{ color: 'var(--text-4)' }}>No</button>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirmDelete(true)} className="text-[11px] bg-transparent border-none cursor-pointer" style={{ color: 'var(--text-4)' }}>Delete</button>
        )}
        <div className="flex gap-[6px]">
          <button type="button" onClick={onCancel} className="px-[10px] py-[4px] rounded-[5px] border text-[11px] bg-transparent cursor-pointer" style={{ borderColor: 'var(--border)', color: 'var(--text-3)' }}>Cancel</button>
          <button type="button" onClick={handleSave} className="px-[10px] py-[4px] rounded-[5px] text-[11px] border-none cursor-pointer font-[600]" style={{ backgroundColor: 'var(--green)', color: '#fff' }}>Save</button>
        </div>
      </div>
    </div>
  );
};

export const ProjectDashboardResources: React.FC<Props> = ({
  project, subcontractors, crew, scheduleEntries, projectEquipment = [], onSubCreate, onSubUpdate, onSubDelete,
}) => {
  const [editingSubId, setEditingSubId] = useState<string | null>(null);
  const updateProject = useProjectStore((s) => s.updateProject);

  const scheduledCrewIds = [...new Set(scheduleEntries.map((e) => e.crewMemberId))];
  const scheduledCrew = scheduledCrewIds.map((id) => crew.find((c) => c.id === id)).filter(Boolean) as CrewMember[];

  const handleSubSave = (subId: string, updates: Partial<ProjectSubcontractor>) => { onSubUpdate(subId, updates); setEditingSubId(null); };
  const handleSubDelete = (subId: string) => { onSubDelete(subId); setEditingSubId(null); };

  const handleCrewFieldSave = (field: 'crewSize' | 'crewNotes', value: string) => {
    const update: Partial<Project> = {};
    if (field === 'crewSize') { update.crewSize = value ? parseInt(value, 10) : null; }
    else { update.crewNotes = value.trim() || null; }
    updateProject(project.id, update);
  };

  const handleEquipmentNotesSave = (value: string) => {
    updateProject(project.id, { equipmentNotes: value.trim() || null });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-[16px]">
      <CrewAssignmentPanel
        project={project}
        scheduledCrew={scheduledCrew}
        scheduleEntries={scheduleEntries}
        onCrewFieldSave={handleCrewFieldSave}
      />

      {/* Subcontractors */}
      <div className={cardClass} style={{ backgroundColor: 'var(--surface2)', borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between mb-[14px]">
          <div className={cardHead} style={{ marginBottom: 0 }}>Subcontractors ({subcontractors.length})</div>
          <button type="button" onClick={onSubCreate} className="flex items-center gap-[4px] text-[12px] font-[500] cursor-pointer bg-transparent border-none" style={{ color: 'var(--green-l)' }}>
            <span className="text-[14px] leading-none">+</span> Add Sub
          </button>
        </div>
        {subcontractors.length === 0 ? (
          <p className="text-[12px] text-[var(--text-4)]">No subcontractors assigned to this project.</p>
        ) : (
          <div className="space-y-[10px]">
            {subcontractors.map((sub) => {
              if (editingSubId === sub.id) {
                return <SubEditForm key={sub.id} sub={sub} onSave={(updates) => handleSubSave(sub.id, updates)} onCancel={() => setEditingSubId(null)} onDelete={() => handleSubDelete(sub.id)} />;
              }
              return (
                <div key={sub.id} className="rounded-[8px] border px-[12px] py-[10px] cursor-pointer transition-colors hover:border-[var(--green)]" style={{ borderColor: 'var(--border)' }} onClick={() => setEditingSubId(sub.id)}>
                  <div className="flex items-center justify-between mb-[4px]">
                    <span className="text-[13px] font-[600] text-[var(--text)]">{sub.companyName}</span>
                    <span className="text-[10px] font-[500] px-[6px] py-[1px] rounded-[4px]" style={{ color: STATUS_COLORS[sub.status] || 'var(--text-4)', backgroundColor: `${STATUS_COLORS[sub.status] || 'var(--text-4)'}15` }}>{sub.status}</span>
                  </div>
                  {sub.trade && <div className="text-[11px] text-[var(--text-3)] mb-[2px]">{sub.trade}</div>}
                  {sub.scopeDescription && <div className="text-[11px] text-[var(--text-4)]">{sub.scopeDescription}</div>}
                  <div className="flex justify-between text-[12px] py-[4px] mt-[6px]">
                    <span className="text-[var(--text-4)]">Quoted</span>
                    <span className="text-[var(--text)] font-[500]">{fmt(sub.quotedCost)}</span>
                  </div>
                  {sub.actualCost != null && sub.quotedCost != null && (
                    <div className="flex justify-between text-[12px] py-[2px]">
                      <span className="text-[var(--text-4)]">Actual</span>
                      <span className="font-[500]" style={{ color: sub.actualCost <= sub.quotedCost ? 'var(--status-green)' : 'var(--status-red)' }}>
                        {fmt(sub.actualCost)}
                        {sub.actualCost !== sub.quotedCost && <span className="text-[10px] ml-[4px]">({sub.actualCost > sub.quotedCost ? '+' : ''}{fmt(sub.actualCost - sub.quotedCost)})</span>}
                      </span>
                    </div>
                  )}
                  {sub.contactName && <div className="text-[11px] text-[var(--text-4)] mt-[4px]">Contact: {sub.contactName}{sub.phone ? ` · ${sub.phone}` : ''}</div>}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Equipment Assigned to Project */}
      <div className={cardClass} style={{ backgroundColor: 'var(--surface2)', borderColor: 'var(--border)' }}>
        <div className={cardHead}>Equipment ({projectEquipment.length})</div>
        {projectEquipment.length === 0 ? (
          <p className="text-[12px] text-[var(--text-4)]">No equipment assigned to this project.</p>
        ) : (
          <div className="space-y-[6px]">
            {projectEquipment.map((e) => (
              <div key={e.id} className="flex items-center justify-between text-[12px] rounded-[6px] border px-[10px] py-[6px]" style={{ borderColor: 'var(--border)' }}>
                <div>
                  <div className="text-[var(--text)] font-[500]">{e.name}</div>
                  <div className="text-[var(--text-4)] text-[11px]">{e.type}</div>
                </div>
                <div className="text-right">
                  {e.hourlyCost != null && <div className="text-[var(--text-3)]">${e.hourlyCost}/hr</div>}
                  {e.dailyRate > 0 && <div className="text-[var(--text-4)] text-[11px]">${e.dailyRate}/day</div>}
                </div>
              </div>
            ))}
          </div>
        )}
        {project.equipmentNotes && (
          <div className="mt-[8px] pt-[8px] border-t" style={{ borderColor: 'var(--border)' }}>
            <div className="text-[11px] text-[var(--text-4)]">Notes</div>
            <p className="text-[12px] text-[var(--text-3)]">{project.equipmentNotes}</p>
          </div>
        )}
      </div>
    </div>
  );
};
