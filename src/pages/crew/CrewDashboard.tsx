/**
 * CrewDashboard — Today's schedule for the selected crew member.
 * Shows job cards for today's schedule entries. Tapping a card navigates
 * to the job detail (work order checklist).
 */

import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjectStore } from '@/stores/projectStore';
import { useCrewStore } from '@/stores/crewStore';
import { useOrgStore } from '@/stores/orgStore';
import { fetchScheduleEntries } from '@/services/supabaseData';
import { Badge } from '@/components/shared/Badge';
import type { ScheduleEntry } from '@/types';

type BadgeVariant = 'green' | 'amber' | 'blue' | 'red' | 'purple' | 'teal';

const STATUS_BADGE: Record<string, BadgeVariant> = {
  scheduled: 'blue',
  in_progress: 'amber',
  completed: 'green',
  cancelled: 'red',
};

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

export const CrewDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { projects } = useProjectStore();
  const { crew } = useCrewStore();
  const orgId = useOrgStore((s) => s.org?.id);

  const [crewMemberId, setCrewMemberId] = useState<string | null>(
    () => localStorage.getItem('tf_crew_member_id')
  );
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const crewMember = crew.find(c => c.id === crewMemberId) || null;

  // Fetch today's schedule entries for the selected crew member
  useEffect(() => {
    if (!orgId || !crewMemberId) return;
    setLoading(true);
    const today = todayStr();
    fetchScheduleEntries(orgId, today, today).then((all) => {
      setEntries(all.filter(e => e.crewMemberId === crewMemberId));
      setLoading(false);
    });
  }, [orgId, crewMemberId]);

  function selectCrewMember(id: string) {
    localStorage.setItem('tf_crew_member_id', id);
    setCrewMemberId(id);
  }

  // ── Crew member picker ──────────────────────────────────────────────────
  if (!crewMemberId || !crewMember) {
    return (
      <div>
        <h1 className="text-[22px] font-serif mb-[4px]" style={{ color: 'var(--text)' }}>
          Who are you?
        </h1>
        <p className="text-[13px] mb-[20px]" style={{ color: 'var(--text-3)' }}>
          Select your name to see today's schedule.
        </p>
        <div className="flex flex-col gap-[8px]">
          {crew.map(c => (
            <button
              key={c.id}
              onClick={() => selectCrewMember(c.id)}
              className="flex items-center gap-[12px] px-[16px] rounded-[10px] border text-left cursor-pointer transition-all duration-150 card-hover"
              style={{
                minHeight: '56px',
                background: 'var(--surface-card, var(--surface2))',
                borderColor: 'var(--border)',
              }}
            >
              <span
                className="w-[36px] h-[36px] rounded-full flex items-center justify-center text-[14px] font-[700] flex-shrink-0"
                style={{ background: 'rgba(45,106,79,.2)', color: 'var(--green-l)' }}
              >
                {c.name.charAt(0).toUpperCase()}
              </span>
              <div>
                <div className="text-[14px] font-[600]" style={{ color: 'var(--text)' }}>{c.name}</div>
                <div className="text-[12px] capitalize" style={{ color: 'var(--text-3)' }}>{c.role}</div>
              </div>
            </button>
          ))}
          {crew.length === 0 && (
            <p className="text-[13px]" style={{ color: 'var(--text-4)' }}>
              No crew members found. Ask your manager to add you.
            </p>
          )}
        </div>
      </div>
    );
  }

  // ── Today's schedule ────────────────────────────────────────────────────
  const today = new Date();

  if (loading) {
    return (
      <div>
        <div className="text-[13px] font-[600] mb-[2px]" style={{ color: 'var(--text-2)' }}>
          {formatDate(today)}
        </div>
        <h1 className="text-[22px] font-serif mb-[20px]" style={{ color: 'var(--text)' }}>
          Hi, {crewMember.name}
        </h1>
        <div className="text-[13px]" style={{ color: 'var(--text-3)' }}>Loading schedule...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="text-[13px] font-[600] mb-[2px]" style={{ color: 'var(--text-2)' }}>
        {formatDate(today)}
      </div>
      <h1 className="text-[22px] font-serif mb-[20px]" style={{ color: 'var(--text)' }}>
        Hi, {crewMember.name}
      </h1>

      {entries.length === 0 ? (
        /* Empty state */
        <div className="text-center py-[48px]">
          <div className="text-[48px] opacity-30 mb-[12px]">☀</div>
          <div className="text-[16px] font-[600] mb-[4px]" style={{ color: 'var(--text-2)' }}>
            No jobs today
          </div>
          <div className="text-[13px]" style={{ color: 'var(--text-3)' }}>
            Enjoy your day off.
          </div>
        </div>
      ) : (
        /* Job cards */
        <div className="flex flex-col gap-[12px]">
          {entries.map(entry => {
            const project = projects.find(p => p.id === entry.projectId);
            const timeRange = entry.startTime && entry.endTime
              ? `${entry.startTime} – ${entry.endTime}`
              : 'All day';

            return (
              <button
                key={entry.id}
                onClick={() => navigate(`/crew/job/${entry.id}`)}
                className="flex items-center gap-[12px] px-[16px] py-[14px] rounded-[12px] border text-left cursor-pointer transition-all duration-150 card-hover"
                style={{
                  minHeight: '80px',
                  background: 'var(--surface-card, var(--surface2))',
                  borderColor: 'var(--border)',
                }}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-[600] truncate" style={{ color: 'var(--text)' }}>
                    {project?.name || 'Unknown Project'}
                  </div>
                  <div className="text-[12px] truncate mt-[2px]" style={{ color: 'var(--text-3)' }}>
                    {project?.address || ''}
                  </div>
                  <div className="flex items-center gap-[8px] mt-[6px]">
                    <span className="text-[12px] font-mono" style={{ color: 'var(--text-2)' }}>
                      {timeRange}
                    </span>
                    <Badge variant={STATUS_BADGE[entry.status] || 'blue'}>
                      {entry.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  {entry.notes && (
                    <div className="text-[11px] italic mt-[4px]" style={{ color: 'var(--text-4)' }}>
                      {entry.notes}
                    </div>
                  )}
                </div>
                <span className="text-[12px] flex-shrink-0" style={{ color: 'var(--text-4)' }}>▶</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Switch crew member link */}
      <button
        onClick={() => {
          localStorage.removeItem('tf_crew_member_id');
          setCrewMemberId(null);
        }}
        className="mt-[24px] text-[12px] bg-transparent border-none cursor-pointer"
        style={{ color: 'var(--text-4)' }}
      >
        Not {crewMember.name}? Switch crew member
      </button>
    </div>
  );
};

export default CrewDashboard;
