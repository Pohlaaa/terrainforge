import React, { useState, useMemo, useEffect } from 'react';
import { useCrewStore } from '@/stores/crewStore';
import { SKILL_OPTIONS, ALERT_THRESHOLDS } from '@/lib/constants';
import type { CrewMember } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { TextArea } from '@/components/ui/Textarea';
import { Checkbox } from '@/components/ui/Checkbox';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/shared/Badge';
import { Modal } from '@/components/shared/Modal';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { AlertBanner } from '@/components/shared/AlertBanner';
import { Skeleton } from '@/components/shared/Skeleton';
import { toast } from '@/hooks/useToast';
import { EmptyState, CrewIcon } from '@/components/shared/EmptyState';

// ── Constants ─────────────────────────────────────────────────────────────────

const ROLE_OPTIONS = [
  { value: 'foreman', label: 'Foreman' },
  { value: 'lead', label: 'Lead' },
  { value: 'installer', label: 'Installer' },
  { value: 'laborer', label: 'Laborer' },
  { value: 'specialist', label: 'Specialist' },
  { value: 'apprentice', label: 'Apprentice' },
];

const ROLE_BADGE: Record<string, 'green' | 'amber' | 'blue' | 'purple' | 'teal' | 'red'> = {
  foreman: 'green',
  lead: 'teal',
  installer: 'blue',
  laborer: 'amber',
  specialist: 'purple',
  apprentice: 'amber',
};

const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
const DAY_LABELS: Record<typeof DAY_KEYS[number], string> = {
  mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu',
  fri: 'Fri', sat: 'Sat', sun: 'Sun',
};

type DayKey = typeof DAY_KEYS[number];
type AvailMap = CrewMember['availability'];

const EMPTY_AVAIL: AvailMap = {
  mon: true, tue: true, wed: true, thu: true, fri: true, sat: false, sun: false,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function certExpiryBadge(expiry: string | null): { variant: 'blue' | 'amber' | 'red'; label: string } {
  if (!expiry) return { variant: 'blue', label: 'No expiry' };
  const daysLeft = Math.floor((new Date(expiry).getTime() - Date.now()) / 86400000);
  if (daysLeft < 0) return { variant: 'red', label: `Expired ${Math.abs(daysLeft)}d ago` };
  if (daysLeft <= ALERT_THRESHOLDS.CERT_EXPIRY_DAYS) return { variant: 'amber', label: `Exp. in ${daysLeft}d` };
  return { variant: 'blue', label: `Exp. ${new Date(expiry).toLocaleDateString()}` };
}

function availableDaysCount(avail: AvailMap): number {
  return DAY_KEYS.filter(d => avail[d]).length;
}

// ── Form types ────────────────────────────────────────────────────────────────

interface CrewForm {
  name: string;
  role: string;
  skills: string[];
  availability: AvailMap;
  maxProjects: string;
  notes: string;
}

const EMPTY_FORM: CrewForm = {
  name: '',
  role: 'installer',
  skills: [],
  availability: { ...EMPTY_AVAIL },
  maxProjects: '2',
  notes: '',
};

function memberToForm(m: CrewMember): CrewForm {
  return {
    name: m.name,
    role: m.role,
    skills: [...m.skills],
    availability: { ...m.availability },
    maxProjects: String(m.maxProjects),
    notes: m.notes,
  };
}

function formToMember(f: CrewForm): Omit<CrewMember, 'id'> {
  return {
    name: f.name.trim(),
    role: f.role as CrewMember['role'],
    skills: f.skills,
    availability: f.availability,
    maxProjects: parseInt(f.maxProjects) || 1,
    notes: f.notes.trim(),
    bookedDates: [],
    certs: [],
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

export const CrewManager: React.FC = () => {
  const { crew, addCrewMember, updateCrewMember, deleteCrewMember, isLoading, error } = useCrewStore();

  const [initialLoad, setInitialLoad] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setInitialLoad(false), 600);
    return () => clearTimeout(t);
  }, []);

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<CrewForm>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Partial<CrewForm>>({});

  // Today's available count
  const availableTodayCount = useMemo(() => {
    const dayIndex = new Date().getDay(); // 0=Sun
    const key = DAY_KEYS[dayIndex === 0 ? 6 : dayIndex - 1]; // shift Sun to end
    return crew.filter(m => m.availability[key]).length;
  }, [crew]);

  const deletingMember = deleteId ? crew.find(m => m.id === deleteId) : null;

  // ── Modal helpers ─────────────────────────────────────────────────────────

  function openAdd() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setShowModal(true);
  }

  function openEdit(member: CrewMember) {
    setEditingId(member.id);
    setForm(memberToForm(member));
    setFormErrors({});
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
  }

  function validate(): boolean {
    const errors: Partial<CrewForm> = {};
    if (!form.name.trim()) errors.name = 'Required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    if (editingId) {
      await updateCrewMember(editingId, formToMember(form));
      toast.success('Crew member updated');
    } else {
      await addCrewMember(formToMember(form));
      toast.success('Crew member added');
    }
    closeModal();
  }

  async function handleDelete() {
    if (!deleteId) return;
    await deleteCrewMember(deleteId);
    toast.info('Crew member removed');
    setDeleteId(null);
  }

  // Toggle a single day directly on the card
  async function toggleDay(member: CrewMember, day: DayKey) {
    await updateCrewMember(member.id, {
      availability: { ...member.availability, [day]: !member.availability[day] },
    });
  }

  // Skills toggle in form
  function toggleSkill(skillId: string) {
    setForm(f => ({
      ...f,
      skills: f.skills.includes(skillId)
        ? f.skills.filter(s => s !== skillId)
        : [...f.skills, skillId],
    }));
  }

  if (isLoading || initialLoad) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[16px]">
        {[0,1,2,3].map(i => (
          <div key={i} style={{ background: 'var(--surface-card)', border: '1px solid var(--border-default)', borderRadius: '10px', padding: '16px' }}>
            <div className="flex items-center gap-[10px] mb-[12px]">
              <Skeleton width="40px" height="40px" rounded="50%" />
              <div className="flex-1">
                <Skeleton width="60%" height="13px" className="mb-[6px]" />
                <Skeleton width="40%" height="10px" />
              </div>
            </div>
            <Skeleton height="10px" className="mb-[8px]" />
            <Skeleton width="80%" height="10px" />
          </div>
        ))}
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div>
      {error && (
        <div className="mb-[16px]">
          <AlertBanner alert={{ level: 'red', title: 'Load error', msg: error }} />
        </div>
      )}
      {/* ── Callout banner ───────────────────────────────────────────────── */}
      <div className="border border-[var(--teal-l)] bg-gradient-to-br from-[rgba(13,148,136,.12)] to-[rgba(10,15,10,.9)] rounded-[10px] px-[20px] py-[16px] mb-[16px]">
        <div className="text-[9px] font-[700] uppercase tracking-[0.12em] text-[var(--teal-l)] mb-[6px]">
          Crew Manager
        </div>
        <div className="text-[13px] text-[var(--text-2)] leading-[1.7]">
          Add crew members with their <strong>skills, roles, and weekly availability</strong>.
          When you open a project, the AI will recommend the best crew assignments based
          on zone requirements and who's available.
        </div>
      </div>

      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-[8px] mb-[16px] flex-wrap">
        <Button variant="primary" onClick={openAdd}>+ Add Crew Member</Button>
        <Button variant="outline" disabled title="AI crew recommendations coming in Phase 3">⚡ Recommend Crew for Active Project</Button>
        <div className="ml-auto flex gap-[16px] text-[12px] text-[var(--text-3)]">
          <span>
            <span className="font-[700] text-[var(--text)]">{crew.length}</span> total
          </span>
          <span>
            <span className="font-[700] text-[var(--green-l)]">{availableTodayCount}</span> available today
          </span>
        </div>
      </div>

      {/* ── Empty state ───────────────────────────────────────────────────── */}
      {crew.length === 0 && (
        <EmptyState
          icon={<CrewIcon />}
          title="Build your team"
          description="Add crew members to assign them to projects and track availability."
          actionLabel="Add Crew Member"
          onAction={openAdd}
        />
      )}

      {/* ── Crew grid ─────────────────────────────────────────────────────── */}
      {crew.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[14px]">
          {crew.map(member => {
            const daysOn = availableDaysCount(member.availability);

            return (
              <div
                key={member.id}
                className="bg-[var(--surface2)] border border-[var(--border)] rounded-[10px] overflow-hidden flex flex-col"
              >
                {/* Card header */}
                <div className="px-[16px] py-[13px] border-b border-[var(--border)] flex items-center justify-between gap-[10px]">
                  <div className="min-w-0">
                    <div className="flex items-center gap-[8px] flex-wrap">
                      <h3 className="text-[14px] font-[700] text-[var(--text)]">{member.name}</h3>
                      <Badge variant={ROLE_BADGE[member.role] ?? 'blue'}>
                        {member.role}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-[var(--text-3)] mt-[2px]">
                      {daysOn} day{daysOn !== 1 ? 's' : ''}/week · max {member.maxProjects} project{member.maxProjects !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="flex gap-[6px] flex-shrink-0">
                    <Button variant="ghost" size="xs" onClick={() => openEdit(member)}>Edit</Button>
                    <Button variant="danger" size="xs" onClick={() => setDeleteId(member.id)}>Delete</Button>
                  </div>
                </div>

                {/* Card body */}
                <div className="px-[16px] py-[13px] flex-1 flex flex-col gap-[12px]">
                  {/* Skills */}
                  {member.skills.length > 0 && (
                    <div>
                      <div className="text-[9px] font-[700] text-[var(--text-4)] uppercase tracking-[0.06em] mb-[6px]">
                        Skills
                      </div>
                      <div className="flex flex-wrap gap-[5px]">
                        {member.skills.map(skillId => {
                          const skill = SKILL_OPTIONS.find(s => s.id === skillId);
                          return (
                            <Badge key={skillId} variant="green">
                              {skill ? skill.label : skillId}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Certifications */}
                  {member.certs.length > 0 && (
                    <div>
                      <div className="text-[9px] font-[700] text-[var(--text-4)] uppercase tracking-[0.06em] mb-[6px]">
                        Certifications
                      </div>
                      <div className="flex flex-wrap gap-[5px]">
                        {member.certs.map(cert => {
                          const { variant, label } = certExpiryBadge(cert.expiry);
                          return (
                            <span key={cert.certId} className="flex items-center gap-[4px]">
                              <Badge variant="blue">{cert.label}</Badge>
                              <Badge variant={variant}>{label}</Badge>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Availability — interactive day pills */}
                  <div>
                    <div className="text-[9px] font-[700] text-[var(--text-4)] uppercase tracking-[0.06em] mb-[6px]">
                      Availability — click to toggle
                    </div>
                    <div className="flex gap-[4px] flex-wrap">
                      {DAY_KEYS.map(day => (
                        <button
                          key={day}
                          onClick={() => toggleDay(member, day)}
                          title={`Toggle ${DAY_LABELS[day]}`}
                          className={`px-[9px] py-[4px] rounded-[5px] text-[10px] font-[700] border-none cursor-pointer transition-colors duration-150 ${
                            member.availability[day]
                              ? 'bg-[rgba(45,106,79,.25)] text-[var(--green-l)]'
                              : 'bg-[var(--surface3)] text-[var(--text-4)]'
                          }`}
                        >
                          {DAY_LABELS[day]}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Notes */}
                  {member.notes && (
                    <p className="text-[11px] text-[var(--text-3)] leading-[1.6]">{member.notes}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Add / Edit Modal ──────────────────────────────────────────────── */}
      <Modal
        isOpen={showModal}
        title={editingId ? 'Edit Crew Member' : 'Add Crew Member'}
        onClose={closeModal}
        onConfirm={handleSave}
        confirmText={editingId ? 'Save Changes' : 'Add Member'}
        maxWidth="560px"
      >
        <div className="flex flex-col gap-[16px]">
          {/* Name + Role */}
          <div className="grid grid-cols-2 gap-[10px]">
            <Input
              label="Full Name"
              required
              value={form.name}
              error={formErrors.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Mike Reeves"
            />
            <Select
              label="Role"
              required
              value={form.role}
              options={ROLE_OPTIONS}
              onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
            />
          </div>

          {/* Max projects */}
          <Input
            label="Max Concurrent Projects"
            type="number"
            min="1"
            max="10"
            value={form.maxProjects}
            onChange={e => setForm(f => ({ ...f, maxProjects: e.target.value }))}
          />

          {/* Skills */}
          <div>
            <div className="text-[11px] font-[700] text-[var(--text-3)] uppercase tracking-[0.04em] mb-[8px]">
              Skills
            </div>
            <div className="grid grid-cols-2 gap-[6px]">
              {SKILL_OPTIONS.map(skill => (
                <Checkbox
                  key={skill.id}
                  label={skill.label}
                  checked={form.skills.includes(skill.id)}
                  onChange={() => toggleSkill(skill.id)}
                />
              ))}
            </div>
          </div>

          {/* Availability */}
          <div>
            <div className="text-[11px] font-[700] text-[var(--text-3)] uppercase tracking-[0.04em] mb-[8px]">
              Weekly Availability
            </div>
            <div className="flex gap-[6px] flex-wrap">
              {DAY_KEYS.map(day => (
                <button
                  key={day}
                  type="button"
                  onClick={() =>
                    setForm(f => ({
                      ...f,
                      availability: { ...f.availability, [day]: !f.availability[day] },
                    }))
                  }
                  className={`px-[12px] py-[7px] rounded-[6px] text-[11px] font-[700] border-none cursor-pointer transition-colors duration-150 ${
                    form.availability[day]
                      ? 'bg-[rgba(45,106,79,.25)] text-[var(--green-l)]'
                      : 'bg-[var(--surface3)] text-[var(--text-4)]'
                  }`}
                >
                  {DAY_LABELS[day]}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <TextArea
            label="Notes"
            rows={2}
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            placeholder="Experience, specializations, anything the crew dispatcher should know..."
          />
        </div>
      </Modal>

      {/* ── Delete confirmation ───────────────────────────────────────────── */}
      <ConfirmDialog
        isOpen={deleteId !== null}
        title="Remove Crew Member"
        message={`Are you sure you want to remove ${deletingMember?.name ?? 'this crew member'} from the roster? This cannot be undone.`}
        confirmText="Remove"
        confirmVariant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
};

export default CrewManager;
