import React, { useState, useMemo, useEffect } from 'react';
import { useProjectStore } from '@/stores/projectStore';
import { useMaterialStore } from '@/stores/materialStore';
import { generateSteps } from '@/lib/workorders';
import { Badge } from '@/components/shared/Badge';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { AlertBanner } from '@/components/shared/AlertBanner';
import { Skeleton } from '@/components/shared/Skeleton';
import { pdf } from '@react-pdf/renderer';
import { CrewPacketPDF } from '@/components/pdf/CrewPacketPDF';
import { useCrewStore } from '@/stores/crewStore';
import { useNavigate } from 'react-router-dom';
import { EmptyState, WorkOrdersIcon } from '@/components/shared/EmptyState';
import { PageHeader } from '@/components/layout/PageHeader';

// ── Component ─────────────────────────────────────────────────────────────────

export const WorkOrders: React.FC = () => {
  const { projects, activeProjectId, setActiveProject, isLoading, error } = useProjectStore();
  const { materials } = useMaterialStore();
  const { crew } = useCrewStore();
  const navigate = useNavigate();

  const [initialLoad, setInitialLoad] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setInitialLoad(false), 600);
    return () => clearTimeout(t);
  }, []);

  // completedSteps[zoneId] = Set of step numbers (1-based) marked done
  const [completedSteps, setCompletedSteps] = useState<Record<string, Set<number>>>({});
  // collapsedZones: zones the user has manually collapsed
  const [collapsedZones, setCollapsedZones] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);

  const project = useMemo(
    () => projects.find(p => p.id === activeProjectId) ?? null,
    [projects, activeProjectId]
  );

  // Pre-generate steps for every zone once per project/materials change
  const zoneSteps = useMemo(() => {
    if (!project) return new Map<string, ReturnType<typeof generateSteps>>();
    const map = new Map<string, ReturnType<typeof generateSteps>>();
    for (const zone of project.zones) {
      map.set(zone.id, generateSteps(zone, materials));
    }
    return map;
  }, [project, materials]);

  // Zone id → name map for dependency labels (must be before early returns — Rules of Hooks)
  const zoneNameMap = useMemo(
    () => Object.fromEntries((project?.zones ?? []).map(z => [z.id, z.name])),
    [project?.zones]
  );

  function toggleStep(zoneId: string, stepN: number) {
    setCompletedSteps(prev => {
      const zoneSet = new Set(prev[zoneId] ?? []);
      if (zoneSet.has(stepN)) {
        zoneSet.delete(stepN);
      } else {
        zoneSet.add(stepN);
      }
      return { ...prev, [zoneId]: zoneSet };
    });
  }

  function toggleZone(zoneId: string) {
    setCollapsedZones(prev => {
      const next = new Set(prev);
      if (next.has(zoneId)) next.delete(zoneId);
      else next.add(zoneId);
      return next;
    });
  }

  function markAllZone(zoneId: string, steps: ReturnType<typeof generateSteps>, done: boolean) {
    setCompletedSteps(prev => ({
      ...prev,
      [zoneId]: done ? new Set(steps.map(s => s.n)) : new Set(),
    }));
  }

  async function handleExportCrewPacket() {
    if (!project) return;
    setExporting(true);
    try {
      const zonePackets = project.zones.map(zone => {
        const crewMember = crew.find(m => m.id === zone.crew);
        return {
          zone,
          steps: zoneSteps.get(zone.id) ?? [],
          crewName: crewMember?.name ?? '',
          equipmentNames: zone.equipment.map(ze => ze.name),
        };
      });
      const foreman = crew.find(m =>
        m.role === 'foreman' && project.zones.some(z => z.crew === m.id)
      );
      const blob = await pdf(
        <CrewPacketPDF
          project={project}
          zonePackets={zonePackets}
          foremanName={foreman?.name}
        />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-crew-packet.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  if (isLoading || initialLoad) {
    return (
      <div className="flex flex-col gap-[12px]">
        <Skeleton width="200px" height="22px" className="mb-[4px]" />
        <Skeleton width="300px" height="12px" className="mb-[8px]" />
        {[0,1,2].map(i => (
          <div key={i} style={{ background: 'var(--surface-card)', border: '1px solid var(--border-default)', borderRadius: '10px', padding: '16px' }}>
            <Skeleton width="50%" height="14px" className="mb-[10px]" />
            <Skeleton height="6px" rounded="4px" className="mb-[8px]" />
            <Skeleton width="70%" height="10px" />
          </div>
        ))}
      </div>
    );
  }

  // ── Empty / no-project state ──────────────────────────────────────────────
  if (!project) {
    return (
      <div>
        <PageHeader title="Work Orders" subtitle="Select a project to view its installation steps and export a crew packet." />
        {projects.length === 0 ? (
          <EmptyState
            icon={<WorkOrdersIcon />}
            title="No work orders yet"
            description="Work orders are generated from project zones. Create a project with zones first, then come back to see installation steps."
            actionLabel="Go to Projects"
            onAction={() => navigate('/projects')}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[12px]">
            {projects.map(p => (
              <button
                key={p.id}
                onClick={() => setActiveProject(p.id)}
                className="text-left p-[16px] rounded-[10px] border border-[var(--border)] bg-[var(--surface2)] cursor-pointer card-hover"
              >
                <div className="font-[600] text-[14px] text-[var(--text)] mb-[2px]">{p.name}</div>
                <div className="text-[12px] text-[var(--text-3)] mb-[8px]">{p.client}</div>
                <div className="text-[11px] text-[var(--text-4)]">
                  {p.zones.length} zone{p.zones.length !== 1 ? 's' : ''} · {p.zones.reduce((s, z) => s + z.materials.length, 0)} materials
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Overall completion stats
  const totalSteps = Array.from(zoneSteps.values()).reduce((s, steps) => s + steps.length, 0);
  const totalDone = Object.values(completedSteps).reduce((s, set) => s + set.size, 0);

  return (
    <div>
      {error && (
        <div className="mb-[16px]">
          <AlertBanner alert={{ level: 'red', title: 'Load error', msg: error }} />
        </div>
      )}
      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <div className="flex items-end gap-[16px] mb-[20px] flex-wrap">
        <div className="flex-1 min-w-[260px]">
          <label className="block text-[11px] font-[700] text-[var(--text-3)] uppercase tracking-[0.05em] mb-[6px]">
            Project
          </label>
          <select
            className="bg-[var(--surface2)] border border-[var(--border)] rounded-[8px] text-[var(--text)] px-[14px] py-[10px] text-[13px] outline-none focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)] focus:ring-opacity-30 cursor-pointer w-full"
            value={activeProjectId ?? ''}
            onChange={e => setActiveProject(e.target.value || null)}
          >
            <option value="">— Choose a project —</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name} · {p.client}</option>
            ))}
          </select>
        </div>
        <button
          onClick={handleExportCrewPacket}
          disabled={exporting || !project || project.zones.length === 0}
          className="px-[14px] py-[9px] text-[12px] font-[600] bg-[var(--green)] text-white rounded-[8px] border-none cursor-pointer hover:bg-[var(--green-d)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150 flex-shrink-0"
        >
          {exporting ? 'Generating…' : '⬇ Export Crew Packet'}
        </button>
      </div>

      {/* ── Project header ────────────────────────────────────────────────── */}
      <div className="bg-[var(--surface2)] border border-[var(--border)] rounded-[10px] p-[16px] mb-[20px] card-shadow">
        <div className="flex items-start justify-between gap-[16px] flex-wrap mb-[12px]">
          <div>
            <h2 className="font-serif text-[20px] text-[var(--text)] mb-[2px]">{project.name}</h2>
            <div className="text-[12px] text-[var(--text-3)]">
              {project.client} · {project.zones.length} zone{project.zones.length !== 1 ? 's' : ''} · {totalSteps} installation steps
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-[9px] font-[700] text-[var(--text-4)] uppercase tracking-[0.05em] mb-[2px]">
              Overall Progress
            </div>
            <div className="text-[20px] font-serif text-[var(--green-l)]">
              {totalDone}/{totalSteps}
            </div>
          </div>
        </div>
        <ProgressBar completed={totalDone} total={totalSteps} showPercentage={false} />
      </div>

      {/* ── No zones ──────────────────────────────────────────────────────── */}
      {project.zones.length === 0 && (
        <div className="text-center py-[48px] px-[24px] bg-[var(--surface2)] border border-[var(--border)] rounded-[10px] text-[var(--text-3)]">
          <div className="text-[32px] mb-[10px] opacity-30">🗺</div>
          <div className="text-[14px] font-[600] text-[var(--text-2)] mb-[6px]">No zones defined</div>
          <div className="text-[13px]">Add zones in the Projects page to generate work orders.</div>
        </div>
      )}

      {/* ── Zone cards ────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-[12px]">
        {project.zones
          .slice()
          .sort((a, b) => a.sequence - b.sequence)
          .map(zone => {
            const steps = zoneSteps.get(zone.id) ?? [];
            const doneSet = completedSteps[zone.id] ?? new Set<number>();
            const doneCount = doneSet.size;
            const allDone = steps.length > 0 && doneCount === steps.length;
            const collapsed = collapsedZones.has(zone.id);
            const depNames = zone.dependencies
              .map(id => zoneNameMap[id] ?? id)
              .filter(Boolean);

            return (
              <div
                key={zone.id}
                className={`border rounded-[10px] overflow-hidden transition-colors duration-200 card-shadow ${
                  allDone
                    ? 'border-[var(--green-l)] bg-[rgba(45,106,79,.06)]'
                    : 'border-[var(--border)] bg-[var(--surface2)]'
                }`}
              >
                {/* Zone header (always visible, clickable to collapse) */}
                <button
                  onClick={() => toggleZone(zone.id)}
                  className="w-full flex items-center gap-[12px] px-[16px] py-[14px] border-none bg-transparent cursor-pointer text-left"
                >
                  {/* Sequence bubble */}
                  <span className="w-[28px] h-[28px] rounded-full bg-[rgba(45,106,79,.25)] text-[var(--green-l)] text-[11px] font-[700] flex items-center justify-center flex-shrink-0 font-mono">
                    {zone.sequence}
                  </span>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-[8px] flex-wrap">
                      <span className="text-[14px] font-[700] text-[var(--text)]">{zone.name}</span>
                      {allDone && <Badge variant="green">Complete</Badge>}
                      {depNames.length > 0 && (
                        <span className="text-[10px] bg-[var(--surface3)] border border-[var(--border)] px-[8px] py-[2px] rounded-[4px] text-[var(--amber-l)]">
                          After: {depNames.join(', ')}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-[var(--text-3)] mt-[2px]">
                      {zone.area.toLocaleString()} sq ft · {zone.materials.length} material{zone.materials.length !== 1 ? 's' : ''} · {steps.length} steps
                      {zone.crew
                        ? (() => {
                            const member = crew.find(m => m.id === zone.crew);
                            return member
                              ? <span className="text-[var(--text-4)]"> · 👤 {member.name}</span>
                              : <span className="text-[#F87171]"> · ⚠ No crew assigned</span>;
                          })()
                        : <span className="text-[#F87171]"> · ⚠ No crew assigned</span>
                      }
                    </div>
                  </div>

                  {/* Progress and chevron */}
                  <div className="flex items-center gap-[12px] flex-shrink-0">
                    <span className="text-[11px] font-mono text-[var(--text-3)]">
                      {doneCount}/{steps.length}
                    </span>
                    <span className={`text-[var(--text-4)] text-[12px] transition-transform duration-200 ${collapsed ? '' : 'rotate-90'}`}>
                      ▶
                    </span>
                  </div>
                </button>

                {/* Zone body */}
                {!collapsed && (
                  <div className="border-t border-[var(--border)]">
                    {/* Zone progress bar */}
                    <div className="px-[16px] pt-[12px] pb-[4px]">
                      <ProgressBar completed={doneCount} total={steps.length} showPercentage />
                    </div>

                    <div className="px-[16px] py-[14px] flex flex-col gap-[16px]">
                      {/* Material pull list */}
                      <div>
                        <div className="text-[10px] font-[700] text-[var(--text-4)] uppercase tracking-[0.06em] mb-[8px]">
                          Material Pull List
                        </div>
                      {zone.materials.length > 0 ? (
                        <div>
                          <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-[4px]">
                            {zone.materials.map(zm => {
                              const mat = materials.find(m => m.id === zm.materialId);
                              return (
                                <div
                                  key={zm.materialId}
                                  className="flex items-center gap-[6px] bg-[var(--surface3)] px-[10px] py-[6px] rounded-[8px] text-[11px]"
                                >
                                  <span className="w-[6px] h-[6px] rounded-full bg-[var(--green-l)] flex-shrink-0" />
                                  <span className="text-[var(--text-2)] truncate">
                                    {mat ? mat.name : zm.name}
                                  </span>
                                  {mat && (
                                    <span className="text-[var(--text-4)] font-mono ml-auto flex-shrink-0">
                                      {mat.unit}
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className="text-[11px] text-[var(--text-4)] italic px-[2px]">
                          No materials assigned — add materials to this zone in the Projects page.
                        </div>
                      )}
                      </div>

                      {/* Installation steps */}
                      <div>
                        <div className="flex items-center justify-between mb-[8px]">
                          <div className="text-[10px] font-[700] text-[var(--text-4)] uppercase tracking-[0.06em]">
                            Installation Steps
                          </div>
                          <div className="flex gap-[8px]">
                            <button
                              onClick={() => markAllZone(zone.id, steps, true)}
                              className="text-[10px] text-[var(--green-l)] hover:underline bg-transparent border-none cursor-pointer"
                            >
                              Mark all done
                            </button>
                            <span className="text-[var(--text-4)]">·</span>
                            <button
                              onClick={() => markAllZone(zone.id, steps, false)}
                              className="text-[10px] text-[var(--text-3)] hover:underline bg-transparent border-none cursor-pointer"
                            >
                              Clear
                            </button>
                          </div>
                        </div>

                        <ol className="flex flex-col gap-[6px] list-none">
                          {steps.map(step => {
                            const done = doneSet.has(step.n);
                            return (
                              <li key={step.n}>
                                <button
                                  onClick={() => toggleStep(zone.id, step.n)}
                                  className={`w-full flex items-start gap-[10px] px-[10px] py-[9px] rounded-[8px] text-left border-none cursor-pointer transition-colors duration-150 ${
                                    done
                                      ? 'bg-[rgba(45,106,79,.12)]'
                                      : 'bg-[var(--surface3)] hover:bg-[rgba(255,255,255,.04)]'
                                  }`}
                                >
                                  {/* Step number / check indicator */}
                                  <span className={`w-[22px] h-[22px] rounded-full text-[10px] font-[700] flex items-center justify-center flex-shrink-0 font-mono mt-[1px] transition-colors duration-150 ${
                                    done
                                      ? 'bg-[var(--green-l)] text-[var(--surface)]'
                                      : 'bg-[rgba(45,106,79,.25)] text-[var(--green-l)]'
                                  }`}>
                                    {done ? '✓' : step.n}
                                  </span>

                                  {/* Step text */}
                                  <span className={`text-[12px] leading-[1.6] flex-1 ${
                                    done ? 'text-[var(--text-3)] line-through' : 'text-[var(--text-2)]'
                                  }`}>
                                    {step.text}
                                  </span>
                                </button>
                              </li>
                            );
                          })}
                        </ol>
                      </div>

                      {/* Zone notes */}
                      {zone.notes && (
                        <div className="text-[11px] text-[var(--text-3)] bg-[var(--surface3)] px-[12px] py-[8px] rounded-[8px] border-l-[3px] border-[var(--border2)]">
                          <span className="font-[700] text-[var(--text-4)] uppercase text-[9px] tracking-[0.05em] mr-[6px]">Note</span>
                          {zone.notes}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
      </div>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      {project.zones.length > 0 && (
        <div className="mt-[20px] flex items-center justify-between text-[11px] text-[var(--text-4)]">
          <span>
            {totalDone} of {totalSteps} steps complete across {project.zones.length} zones
          </span>
          <span>Ctrl+P to print for field use</span>
        </div>
      )}
    </div>
  );
};

export default WorkOrders;
