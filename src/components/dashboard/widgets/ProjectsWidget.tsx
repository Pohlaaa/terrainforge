import React from 'react';
import { Link } from 'react-router-dom';
import type { AppState } from '@/types';
import { computeProjectCostRaw } from '@/lib/manifest';
import { useProjectStore } from '@/stores/projectStore';

interface ProjectsWidgetProps {
  appState: AppState;
}

export const ProjectsWidget: React.FC<ProjectsWidgetProps> = ({ appState }) => {
  const { projects, materials } = appState;
  const { setActiveProject } = useProjectStore();

  const activeProjectList = projects
    .filter((p) => {
      const checks = Object.values(p.checklist);
      return checks.filter(Boolean).length < checks.length;
    })
    .slice(0, 5);

  if (activeProjectList.length === 0) {
    return (
      <div className="text-center py-[40px] text-[var(--text-tertiary)]">
        <div className="text-[32px] mb-[10px] opacity-30">⊞</div>
        <div className="text-[13px] mb-[8px]">No active projects</div>
        <Link to="/projects" className="text-[12px] text-[var(--color-primary)] hover:underline">
          Create your first project →
        </Link>
      </div>
    );
  }

  return (
    <div className="p-[14px]">
      <div className="space-y-[8px]">
        {activeProjectList.map((p) => {
          const checks = Object.values(p.checklist);
          const completedCount = checks.filter(Boolean).length;
          const pct = Math.round((completedCount / checks.length) * 100);
          const cost = computeProjectCostRaw(p, materials);
          return (
            <div
              key={p.id}
              className="bg-[var(--surface-hover)] border border-[var(--border-default)] rounded-[8px] px-[14px] py-[10px]"
            >
              <div className="flex items-start justify-between gap-2 mb-[4px]">
                <div className="min-w-0">
                  <div className="text-[13px] font-[600] text-[var(--text-primary)] truncate">
                    {p.name}
                  </div>
                  <div className="text-[11px] text-[var(--text-tertiary)] truncate">{p.client}</div>
                </div>
                <Link
                  to="/projects"
                  onClick={() => setActiveProject(p.id)}
                  className="text-[11px] text-[var(--color-primary)] hover:underline flex-shrink-0"
                >
                  View →
                </Link>
              </div>
              <div className="flex gap-[12px] text-[11px] text-[var(--text-tertiary)] mt-[6px] mb-[6px]">
                <span>
                  {p.zones.length} zone{p.zones.length !== 1 ? 's' : ''}
                </span>
                <span>${cost.toLocaleString()} est.</span>
                <span>
                  {completedCount}/{checks.length} checks
                </span>
              </div>
              <div className="w-full h-[4px] rounded-full bg-[var(--border-default)]">
                <div
                  className="h-[4px] rounded-full"
                  style={{ width: `${pct}%`, backgroundColor: 'var(--color-primary)' }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProjectsWidget;
