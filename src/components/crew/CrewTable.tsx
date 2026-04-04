import React from 'react';
import { Badge } from '@/components/shared/Badge';
import { NavIcon } from '@/components/layout/NavIcon';
import type { CrewMember } from '@/types';

const ROLE_BADGE: Record<string, 'green' | 'amber' | 'blue' | 'purple' | 'teal' | 'red'> = {
  foreman: 'green', lead: 'teal', installer: 'blue',
  laborer: 'amber', specialist: 'purple', apprentice: 'amber',
};

interface CrewTableProps {
  crew: CrewMember[];
  getCrewAssignment: (crewMemberId: string) => string | null;
  readOnly: boolean;
  onAddCrew: () => void;
}

export const CrewTable: React.FC<CrewTableProps> = ({ crew, getCrewAssignment, readOnly, onAddCrew }) => (
  <div
    className="rounded-xl p-4"
    style={{ background: 'var(--surface-card)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-card)' }}
  >
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Crew Members</h2>
      {!readOnly && (
        <button
          onClick={onAddCrew}
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md cursor-pointer border-none transition-colors"
          style={{ background: 'var(--brand-primary)', color: 'var(--text-on-primary)' }}
        >
          + Add
        </button>
      )}
    </div>
    <div className="space-y-2 max-h-[400px] overflow-y-auto">
      {crew.length === 0 ? (
        <div className="text-center py-8 text-sm" style={{ color: 'var(--text-tertiary)' }}>
          No crew members yet. Add your first team member.
        </div>
      ) : (
        crew.map(member => {
          const assignment = getCrewAssignment(member.id);
          return (
            <div
              key={member.id}
              className="rounded-lg p-3 transition-colors cursor-pointer"
              style={{ background: 'var(--surface-bg)', border: '1px solid var(--border-default)' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-strong)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-default)'; }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{member.name}</span>
                    {member.phone && (
                      <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                        <NavIcon name="phone" size={12} />
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5">
                    <Badge variant={ROLE_BADGE[member.role] || 'blue'}>{member.role}</Badge>
                  </div>
                </div>
                <div className="text-right">
                  <span
                    className="text-xs font-medium"
                    style={{ color: assignment ? 'var(--text-secondary)' : 'var(--status-green)' }}
                  >
                    {assignment || 'Available'}
                  </span>
                </div>
              </div>
              {member.skills.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {member.skills.slice(0, 4).map(skill => (
                    <span
                      key={skill}
                      className="text-[10px] px-1.5 py-0.5 rounded-md"
                      style={{ background: 'var(--surface-hover)', color: 'var(--text-tertiary)' }}
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  </div>
);
