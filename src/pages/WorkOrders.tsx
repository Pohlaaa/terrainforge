import React from 'react';
import { Badge } from '@/components/shared/Badge';
import type { Project, WorkOrder } from '@/types';

interface WorkOrdersProps {
  activeProject?: Project | null;
  workOrders?: WorkOrder[];
}

export const WorkOrders: React.FC<WorkOrdersProps> = ({
  activeProject,
  workOrders = [],
}) => {
  // TODO: Connect to useProjectStore() and useWorkOrderStore()

  if (!activeProject) {
    return (
      <div className="text-center py-[48px] px-[24px] text-[var(--text-3)]">
        <div className="text-[36px] mb-[12px] opacity-40">⊟</div>
        <div className="text-[16px] font-[600] text-[var(--text-2)] mb-[6px]">
          No project selected
        </div>
        <div className="text-[13px]">
          Select a project to view its crew work orders
        </div>
      </div>
    );
  }

  const statusColors: Record<'draft' | 'scheduled' | 'in-progress' | 'completed' | 'cancelled', 'amber' | 'green' | 'teal' | 'blue' | 'red'> = {
    draft: 'amber',
    scheduled: 'blue',
    'in-progress': 'green',
    completed: 'teal',
    cancelled: 'red',
  };

  return (
    <div>
      <div className="mb-[20px]">
        <h2 className="font-serif text-[20px] text-[var(--text)] mb-[4px]">
          Work Orders — {activeProject.name}
        </h2>
        <p className="text-[13px] text-[var(--text-3)]">
          {activeProject.zones?.length || 0} zones, organized with material pull lists
          and installation steps
        </p>
      </div>

      {(!activeProject.zones || activeProject.zones.length === 0) ? (
        <div className="text-center py-[48px] px-[24px] text-[var(--text-3)]">
          <div className="text-[14px]">No zones defined for this project</div>
        </div>
      ) : (
        <div className="grid gap-[16px]">
          {activeProject.zones.map((zone) => {
            const zoneWorkOrders = workOrders.filter((wo) => wo.projectId === zone.id);

            return (
              <div
                key={zone.id}
                className="bg-[var(--surface2)] border border-[var(--border)] rounded-[10px] overflow-hidden"
              >
                {/* Card header with zone info */}
                <div className="px-[16px] py-[14px] border-b border-[var(--border)]">
                  <div className="flex items-center justify-between gap-[12px]">
                    <div className="flex-1">
                      <h3 className="text-[15px] font-[700] text-[var(--text)]">
                        {zone.name}
                      </h3>
                      <p className="text-[11px] text-[var(--text-3)] mt-[2px]">
                        {"zone"}
                      </p>
                    </div>
                    {zone.dependencies && zone.dependencies.length > 0 && (
                      <div className="text-[10px] bg-[var(--surface3)] px-[10px] py-[6px] rounded-[6px] text-[var(--text-3)]">
                        Depends on: {zone.dependencies.length} zone(s)
                      </div>
                    )}
                  </div>
                </div>

                {/* Card body */}
                <div className="px-[16px] py-[14px]">
                  {zoneWorkOrders.length === 0 ? (
                    <div className="text-[12px] text-[var(--text-3)] py-[20px] text-center">
                      No work orders for this zone
                    </div>
                  ) : (
                    <div className="space-y-[16px]">
                      {zoneWorkOrders.map((wo) => (
                        <div
                          key={wo.id}
                          className="border-l-[3px] border-[var(--green-l)] px-[12px] py--[12px]"
                        >
                          {/* Work order header */}
                          <div className="flex items-center justify-between mb-[10px]">
                            <div className="text-[12px] font-[700] text-[var(--text)]">
                              Work Order #{wo.id.slice(0, 8)}
                            </div>
                            <Badge variant={statusColors[wo.status]}>
                              {wo.status}
                            </Badge>
                          </div>

                          {/* Material pull list */}
                          <div className="mb-[10px]">
                            <div className="text-[10px] font-[700] text-[var(--text-4)] uppercase tracking-[0.06em] mb-[6px]">
                              Material Pull List
                            </div>
                            <div className="space-y-[4px]">
                              {((wo as any).materials || []).length === 0 ? (
                                <div className="text-[11px] text-[var(--text-3)]">
                                  No materials specified
                                </div>
                              ) : (
                                ((wo as any).materials || []).map((mat: any, idx: number) => (
                                  <div
                                    key={idx}
                                    className="text-[11px] text-[var(--text-2)] flex items-center justify-between bg-[var(--surface3)] px-[8px] py-[4px] rounded-[4px]"
                                  >
                                    <span>
                                      {/* TODO: Look up material name */}
                                      Material {mat.materialId}
                                    </span>
                                    <span className="font-mono">
                                      {mat.quantity} {mat.unit}
                                    </span>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>

                          {/* Installation steps */}
                          <div className="mb-[10px]">
                            <div className="text-[10px] font-[700] text-[var(--text-4)] uppercase tracking-[0.06em] mb-[6px]">
                              Installation Steps
                            </div>
                            <ol className="list-none space-y-[6px]">
                              {(((wo as any).steps || []).length === 0) ? (
                                <div className="text-[11px] text-[var(--text-3)]">
                                  No steps defined
                                </div>
                              ) : (
                                ((wo as any).steps || []).map((step: any) => (
                                  <li key={step.id} className="flex gap-[8px] text-[11px]">
                                    <span className="w-[22px] h-[22px] rounded-full bg-[rgba(45,106,79,.25)] text-[var(--green-l)] text-[10px] font-[700] flex items-center justify-center flex-shrink-0 font-mono">
                                      {step.stepNumber}
                                    </span>
                                    <div className="flex-1 pt-[2px]">
                                      <div className="text-[var(--text-2)] leading-[1.6]">
                                        {step.description}
                                      </div>
                                      <div className="text-[10px] text-[var(--text-4)] mt-[2px]">
                                        Est. {step.estimatedHours}h
                                        {step.completed && (
                                          <Badge variant="green">
                                            ✓
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                  </li>
                                ))
                              )}
                            </ol>
                          </div>

                          {/* Assigned crew and equipment */}
                          {((wo.assignedTo && wo.assignedTo.length > 0)) && (
                            <div className="flex gap-[12px] text-[10px] pt-[10px] border-t border-[var(--border)]">
                              {wo.assignedTo && wo.assignedTo.length > 0 && (
                                <div>
                                  <span className="text-[var(--text-4)] uppercase font-[700]">
                                    Assigned To:{' '}
                                  </span>
                                  <span className="text-[var(--text-2)]">
                                    {wo.assignedTo.length} assigned
                                  </span>
                                </div>
                              )}
                              <div>
                                <span className="text-[var(--text-4)] uppercase font-[700]">
                                  Status:{' '}
                                </span>
                                <span className="text-[var(--text-2)]">
                                  {wo.status}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Print button */}
      <div className="mt-[20px] text-[12px] text-[var(--text-3)]">
        💡 Use <strong>Ctrl+P</strong> or <strong>Cmd+P</strong> to print these work
        orders for field use.
      </div>
    </div>
  );
};

export default WorkOrders;
