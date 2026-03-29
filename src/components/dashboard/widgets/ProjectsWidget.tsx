import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { AppState } from '@/types';
import { computeProjectCostRaw } from '@/lib/manifest';
import { useProjectStore } from '@/stores/projectStore';

interface ProjectsWidgetProps {
  appState: AppState;
}

function RadialProgress({ pct, color }: { pct: number; color: string }) {
  const r = 15.9;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg
      width="36"
      height="36"
      viewBox="0 0 36 36"
      style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}
      aria-hidden="true"
    >
      <circle cx="18" cy="18" r={r} fill="none" stroke="var(--border-light)" strokeWidth="3" />
      <circle
        cx="18"
        cy="18"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeLinecap="round"
      />
      <text
        x="18"
        y="18"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="8"
        fill="var(--text-secondary)"
        style={{ transform: 'rotate(90deg)', transformOrigin: '18px 18px' }}
      >
        {pct}%
      </text>
    </svg>
  );
}

function statusColor(pct: number): string {
  if (pct === 100) return '#16A34A';
  if (pct >= 60) return '#2563EB';
  if (pct >= 30) return '#F59E0B';
  return '#DC2626';
}

export const ProjectsWidget: React.FC<ProjectsWidgetProps> = ({ appState }) => {
  const { projects, materials } = appState;
  const { setActiveProject } = useProjectStore();
  const navigate = useNavigate();

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
        <button
          onClick={() => navigate('/projects')}
          className="text-[12px] text-[var(--color-primary)] hover:underline bg-transparent border-none cursor-pointer p-0"
        >
          Create your first project →
        </button>
      </div>
    );
  }

  return (
    <div className="p-[14px]">
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          marginBottom: '10px',
        }}
      >
        <button
          onClick={() => navigate('/projects')}
          style={{
            background: 'transparent',
            border: 'none',
            fontSize: '13px',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            padding: 0,
            transition: 'color 0.15s ease',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--brand-primary)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'; }}
        >
          View All →
        </button>
      </div>
      <div className="space-y-[8px]">
        {activeProjectList.map((p) => {
          const checks = Object.values(p.checklist);
          const completedCount = checks.filter(Boolean).length;
          const pct = Math.round((completedCount / checks.length) * 100);
          const cost = computeProjectCostRaw(p, materials);
          const color = statusColor(pct);
          return (
            <div
              key={p.id}
              onClick={() => { setActiveProject(p.id); navigate('/projects'); }}
              style={{
                background: 'var(--surface-hover)',
                border: '1px solid var(--border-default)',
                borderRadius: '8px',
                padding: '10px 14px',
                cursor: 'pointer',
                transition: 'background 0.15s ease, box-shadow 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.background = 'var(--surface-active)';
                el.style.boxShadow = 'var(--shadow-hover)';
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.background = 'var(--surface-hover)';
                el.style.boxShadow = 'none';
              }}
            >
              <RadialProgress pct={pct} color={color} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {p.name}
                </div>
                <div
                  style={{
                    fontSize: '11px',
                    color: 'var(--text-tertiary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {p.client} · ${cost.toLocaleString()} est.
                </div>
              </div>
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                style={{ color: 'var(--text-tertiary)', flexShrink: 0 }}
              >
                <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProjectsWidget;
