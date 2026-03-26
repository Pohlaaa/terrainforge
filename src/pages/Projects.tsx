import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/shared/Badge';
import { ProgressBar } from '@/components/shared/ProgressBar';
import type { Project, Zone } from '@/types';

interface ProjectsProps {
  projects?: Project[];
  onProjectSelect?: (projectId: string) => void;
  onEditProject?: (projectId: string) => void;
  onDeleteProject?: (projectId: string) => void;
}

const ProjectsComponent: React.FC<ProjectsProps> = ({
  projects = [],
  onProjectSelect,
  onEditProject,
  onDeleteProject,
}) => {
  // TODO: Connect to useProjectStore()

  return (
    <div>
      {projects.length === 0 ? (
        <div className="text-center py-[48px] px-[24px] text-[var(--text-3)]">
          <div className="text-[36px] mb-[12px] opacity-40">⊞</div>
          <div className="text-[16px] font-[600] text-[var(--text-2)] mb-[6px]">
            No projects yet
          </div>
          <div className="text-[13px]">Create a new project to get started</div>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(340px,1fr))] gap-[16px]">
          {projects.map((project) => (
            <div
              key={project.id}
              className="bg-[var(--surface2)] border border-[var(--border)] rounded-[10px] overflow-hidden hover:border-[var(--green-l)] transition-colors duration-200"
            >
              {/* Card header with title and address */}
              <div className="px-[16px] py-[14px] border-b border-[var(--border)]">
                <h3 className="text-[15px] font-[700] text-[var(--text)]">
                  {project.name}
                </h3>
                <p className="text-[11px] text-[var(--text-3)] mt-[2px]">
                  {project.address}
                </p>
              </div>

              {/* Card body */}
              <div className="px-[16px] py-[14px]">
                {/* Zones list */}
                <div className="mb-[14px]">
                  <div className="text-[10px] font-[700] text-[var(--text-3)] uppercase tracking-[0.06em] mb-[8px]">
                    Zones ({project.zones?.length || 0})
                  </div>
                  {project.zones && project.zones.length > 0 ? (
                    <div className="space-y-[6px]">
                      {project.zones.slice(0, 3).map((zone: Zone) => (
                        <div
                          key={zone.id}
                          className="flex items-center justify-between text-[12px] bg-[var(--surface3)] px-[8px] py-[6px] rounded-[6px]"
                        >
                          <span className="text-[var(--text-2)]">{zone.name}</span>
                          <span className="text-[var(--text-4)]">{zone.area} sq ft</span>
                        </div>
                      ))}
                      {project.zones.length > 3 && (
                        <div className="text-[11px] text-[var(--text-4)] px-[8px]">
                          +{project.zones.length - 3} more zones
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-[12px] text-[var(--text-3)]">No zones defined</div>
                  )}
                </div>

                {/* Pre-project checklist */}
                <div className="mb-[14px]">
                  <div className="text-[10px] font-[700] text-[var(--text-3)] uppercase tracking-[0.06em] mb-[6px]">
                    Pre-project Checklist
                  </div>
                  <ProgressBar
                    completed={4}
                    total={8}
                    showPercentage={true}
                  />
                </div>

                {/* Budget info */}
                <div className="mb-[14px]">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-[700] text-[var(--text-3)] uppercase tracking-[0.06em]">
                      Budget
                    </span>
                    <span className="text-[16px] font-serif text-[var(--text)]">
                      ${project.budget?.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Timeline */}
                <div className="flex gap-[12px] mb-[14px]">
                  <div className="flex-1">
                    <div className="text-[9px] font-[700] text-[var(--text-4)] uppercase tracking-[0.04em] mb-[4px]">
                      Start Date
                    </div>
                    <div className="text-[12px] text-[var(--text)]">
                      {new Date(project.startDate).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="text-[9px] font-[700] text-[var(--text-4)] uppercase tracking-[0.04em] mb-[4px]">
                      Target Date
                    </div>
                    <div className="text-[12px] text-[var(--text)]">
                      {new Date(project.targetDate).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                {/* Divider */}
                <div className="h-px bg-[var(--border)] my-[14px]"></div>

                {/* Actions */}
                <div className="flex gap-[8px]">
                  <Button
                    variant="primary"
                    size="sm"
                    className="flex-1"
                    onClick={() => onProjectSelect?.(project.id)}
                  >
                    Select
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEditProject?.(project.id)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => onDeleteProject?.(project.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const Projects = ProjectsComponent;
export default ProjectsComponent;
