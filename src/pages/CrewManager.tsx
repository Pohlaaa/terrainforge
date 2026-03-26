import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/shared/Badge';
import { Modal } from '@/components/shared/Modal';
import type { CrewMember } from '@/types';

interface CrewManagerProps {
  crewMembers?: CrewMember[];
  onAddCrew?: () => void;
  onEditCrew?: (crewId: string) => void;
  onDeleteCrew?: (crewId: string) => void;
  onRecommend?: () => void;
}

export const CrewManager: React.FC<CrewManagerProps> = ({
  crewMembers = [],
  onAddCrew,
  onEditCrew,
  onDeleteCrew,
  onRecommend,
}) => {
  // TODO: Connect to useCrewStore()
  const [editingCrew, setEditingCrew] = useState<CrewMember | null>(null);

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const shifts = ['morning', 'afternoon', 'evening'] as const;

  return (
    <div>
      {/* Callout banner */}
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

      {/* Action buttons */}
      <div className="flex gap-[8px] mb-[16px]">
        <Button variant="primary" onClick={onAddCrew}>
          + Add Crew Member
        </Button>
        <Button variant="outline" onClick={onRecommend}>
          ⚡ Recommend Crew for Active Project
        </Button>
      </div>

      {/* Crew list */}
      {crewMembers.length === 0 ? (
        <div className="text-center py-[48px] px-[24px] text-[var(--text-3)]">
          <div className="text-[36px] mb-[12px] opacity-40">👥</div>
          <div className="text-[16px] font-[600] text-[var(--text-2)] mb-[6px]">
            No crew members added
          </div>
          <div className="text-[13px]">Create your crew roster to get started</div>
        </div>
      ) : (
        <div className="grid gap-[16px]">
          {crewMembers.map((member) => (
            <div
              key={member.id}
              className="bg-[var(--surface2)] border border-[var(--border)] rounded-[10px] overflow-hidden"
            >
              {/* Card header */}
              <div className="px-[16px] py-[14px] border-b border-[var(--border)]">
                <div className="flex items-center justify-between gap-[12px]">
                  <div className="flex-1">
                    <h3 className="text-[15px] font-[700] text-[var(--text)]">
                      {member.name}
                    </h3>
                    <p className="text-[11px] text-[var(--text-3)] mt-[2px]">
                      {member.role || 'No role specified'}
                    </p>
                  </div>
                  <div className="flex gap-[8px]">
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => onEditCrew?.(member.id)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="danger"
                      size="xs"
                      onClick={() => onDeleteCrew?.(member.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </div>

              {/* Card body */}
              <div className="px-[16px] py-[14px]">
                {/* Skills */}
                {member.skills.length > 0 && (
                  <div className="mb-[12px]">
                    <div className="text-[10px] font-[700] text-[var(--text-4)] uppercase tracking-[0.06em] mb-[6px]">
                      Skills
                    </div>
                    <div className="flex flex-wrap gap-[6px]">
                      {member.skills.map((skill, idx) => (
                        <Badge key={idx} variant="green">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Certifications */}
                {member.certs && member.certs.length > 0 && (
                  <div className="mb-[12px]">
                    <div className="text-[10px] font-[700] text-[var(--text-4)] uppercase tracking-[0.06em] mb-[6px]">
                      Certifications
                    </div>
                    <div className="flex flex-wrap gap-[6px]">
                      {member.certs.map((cert, idx) => (
                        <Badge key={idx} variant="blue">
                          {cert.label}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Weekly availability grid */}
                <div className="mb-[12px]">
                  <div className="text-[10px] font-[700] text-[var(--text-4)] uppercase tracking-[0.06em] mb-[8px]">
                    Weekly Availability
                  </div>
                  <div className="overflow-x-auto">
                    <table className="text-[10px] w-full">
                      <thead>
                        <tr>
                          <th className="text-left text-[var(--text-3)] pb-[6px]">Day</th>
                          <th className="text-center text-[var(--text-3)] pb-[6px]">Available</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(member.availability).map(([dayKey, available]) => (
                          <tr key={dayKey}>
                            <td className="text-[var(--text-2)] py-[4px] capitalize">{dayKey}</td>
                            <td className="text-center py-[4px]">
                              {available ? (
                                <span className="text-[var(--green-l)]">✓</span>
                              ) : (
                                <span className="text-[var(--text-4)]">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {member.maxProjects && (
                  <div className="text-[11px]">
                    <span className="text-[var(--text-4)] font-[700]">Max Projects: </span>
                    <span className="text-[var(--text-2)]">
                      {member.maxProjects}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      <Modal
        isOpen={!!editingCrew}
        title="Edit Crew Member"
        onClose={() => setEditingCrew(null)}
      >
        {/* TODO: Form to edit crew member */}
        <div className="text-[13px] text-[var(--text-2)]">
          Edit form placeholder - connect to crew store and form handling
        </div>
      </Modal>
    </div>
  );
};

export default CrewManager;
