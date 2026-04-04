/**
 * CrewJobDetail — Work order checklist for a specific schedule entry.
 * Shows project info, zone-by-zone installation steps, and status buttons.
 */

import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProjectStore } from '@/stores/projectStore';
import { useMaterialStore } from '@/stores/materialStore';
import { useEquipmentStore } from '@/stores/equipmentStore';
import { useOrgStore } from '@/stores/orgStore';
import { useScheduleStore } from '@/stores/scheduleStore';
import type { CrewPhoto } from '@/services/supabaseCrewOps';
import { generateSteps } from '@/lib/workorders';
import { ProgressBar } from '@/components/shared/ProgressBar';
import type { ScheduleEntry } from '@/types';

export const CrewJobDetail: React.FC = () => {
  const { entryId } = useParams<{ entryId: string }>();
  const navigate = useNavigate();
  const { projects } = useProjectStore();
  const { materials } = useMaterialStore();
  const { equipment } = useEquipmentStore();
  const orgId = useOrgStore((s) => s.org?.id);
  const schedule = useScheduleStore();

  const [entry, setEntry] = useState<ScheduleEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [completedSteps, setCompletedSteps] = useState<Record<string, Set<number>>>({});
  const [crewStatus, setCrewStatus] = useState<string>('off_duty');
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [photos, setPhotos] = useState<Array<CrewPhoto & { url: string }>>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const crewMemberId = localStorage.getItem('tf_crew_member_id');

  // Fetch the schedule entry
  useEffect(() => {
    if (!orgId || !entryId) return;
    const today = new Date().toISOString().split('T')[0];
    schedule.fetchEntries(orgId, today, today).then(() => {
      const found = useScheduleStore.getState().entries.find(e => e.id === entryId) || null;
      setEntry(found);
      setLoading(false);
    });
  }, [orgId, entryId]);

  // Fetch persisted checklist progress
  useEffect(() => {
    if (!entry) return;
    schedule.fetchChecklistProgress(entry.id).then((rows) => {
      const map: Record<string, Set<number>> = {};
      for (const { zoneId, stepNumber } of rows) {
        if (!map[zoneId]) map[zoneId] = new Set();
        map[zoneId].add(stepNumber);
      }
      setCompletedSteps(map);
    });
  }, [entry?.id]);

  // Fetch photos
  useEffect(() => {
    if (!entry) return;
    schedule.fetchCrewPhotos(entry.id).then(async (list) => {
      const withUrls = await Promise.all(
        list.map(async (p) => ({ ...p, url: await schedule.getPhotoUrl(p.storagePath) }))
      );
      setPhotos(withUrls);
    });
  }, [entry?.id]);

  // Fetch current crew status
  useEffect(() => {
    if (!crewMemberId) return;
    schedule.fetchCrewStatus(crewMemberId).then(setCrewStatus);
  }, [crewMemberId]);

  const project = entry ? projects.find(p => p.id === entry.projectId) || null : null;
  const assignedEquipment = entry?.equipmentId
    ? equipment.find(e => e.id === entry.equipmentId) || null
    : null;

  // Generate steps per zone
  const zoneSteps = useMemo(() => {
    if (!project) return new Map<string, ReturnType<typeof generateSteps>>();
    const map = new Map<string, ReturnType<typeof generateSteps>>();
    for (const zone of project.zones) {
      map.set(zone.id, generateSteps(zone, materials));
    }
    return map;
  }, [project, materials]);

  // Total progress
  const totalSteps = Array.from(zoneSteps.values()).reduce((s, steps) => s + steps.length, 0);
  const totalDone = Object.values(completedSteps).reduce((s, set) => s + set.size, 0);

  function toggleStep(zoneId: string, stepN: number) {
    if (!orgId || !crewMemberId || !entry) return;
    setCompletedSteps(prev => {
      const zoneSet = new Set(prev[zoneId] ?? []);
      if (zoneSet.has(stepN)) {
        zoneSet.delete(stepN);
        schedule.removeChecklistStep(entry.id, zoneId, stepN);
      } else {
        zoneSet.add(stepN);
        schedule.saveChecklistStep(orgId, entry.id, crewMemberId, zoneId, stepN);
      }
      return { ...prev, [zoneId]: zoneSet };
    });
  }

  async function handlePhotoCapture(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !orgId || !crewMemberId || !entry) return;
    setUploading(true);
    const photo = await schedule.uploadCrewPhoto(orgId, entry.id, crewMemberId, file);
    if (photo) {
      const url = await schedule.getPhotoUrl(photo.storagePath);
      setPhotos(prev => [...prev, { ...photo, url }]);
    }
    setUploading(false);
    e.target.value = '';
  }

  async function handleStatusUpdate(status: string) {
    if (!orgId || !crewMemberId || !entryId || statusUpdating) return;
    setStatusUpdating(true);
    await schedule.upsertCrewStatus(orgId, crewMemberId, entryId, status);
    setCrewStatus(status);
    setStatusUpdating(false);
  }

  if (loading) {
    return (
      <div className="text-[13px]" style={{ color: 'var(--text-3)', padding: '24px 0' }}>
        Loading job details...
      </div>
    );
  }

  if (!entry || !project) {
    return (
      <div>
        <button
          onClick={() => navigate('/crew')}
          className="text-[13px] bg-transparent border-none cursor-pointer min-h-[44px] px-0 mb-[12px]"
          style={{ color: 'var(--green-l)' }}
        >
          ← Back
        </button>
        <div className="text-center py-[48px]">
          <div className="text-[16px] font-[600] mb-[4px]" style={{ color: 'var(--text-2)' }}>
            Job not found
          </div>
          <div className="text-[13px]" style={{ color: 'var(--text-3)' }}>
            This schedule entry may have been removed.
          </div>
        </div>
      </div>
    );
  }

  const statusButtons: Array<{ label: string; value: string; activeColor: string }> = [
    { label: 'En Route', value: 'en_route', activeColor: 'var(--blue, #60A5FA)' },
    { label: 'On Site', value: 'on_site', activeColor: 'var(--green)' },
    { label: 'Done', value: 'done', activeColor: 'var(--green-l)' },
  ];

  return (
    <div className="pb-[80px]">
      {/* Back button */}
      <button
        onClick={() => navigate('/crew')}
        className="text-[13px] bg-transparent border-none cursor-pointer min-h-[44px] px-0 mb-[12px]"
        style={{ color: 'var(--green-l)' }}
      >
        ← Back
      </button>

      {/* Project header card */}
      <div
        className="rounded-[12px] border p-[16px] mb-[16px]"
        style={{ background: 'var(--surface-card, var(--surface2))', borderColor: 'var(--border)' }}
      >
        <div className="text-[18px] font-serif font-[600]" style={{ color: 'var(--text)' }}>
          {project.name}
        </div>
        {project.address && (
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(project.address)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[12px] mt-[2px] underline underline-offset-2 block"
            style={{ color: 'var(--brand-primary)' }}
          >
            {project.address}
          </a>
        )}
        {assignedEquipment && (
          <div className="text-[12px] mt-[4px]" style={{ color: 'var(--text-2)' }}>
            Equipment: {assignedEquipment.name}
          </div>
        )}
      </div>

      {/* Overall progress */}
      <div className="mb-[16px]">
        <div className="flex items-center justify-between mb-[6px]">
          <span className="text-[11px] font-[700] uppercase tracking-[0.05em]" style={{ color: 'var(--text-4)' }}>
            Overall Progress
          </span>
          <span className="text-[13px] font-mono" style={{ color: 'var(--text-2)' }}>
            {totalDone}/{totalSteps}
          </span>
        </div>
        <ProgressBar completed={totalDone} total={totalSteps} showPercentage={false} />
      </div>

      {/* Photo gallery */}
      {(photos.length > 0 || uploading) && (
        <div className="mb-[16px]">
          <div className="text-[11px] font-[700] uppercase tracking-[0.05em] mb-[8px]" style={{ color: 'var(--text-4)' }}>
            Photos ({photos.length})
          </div>
          <div className="grid grid-cols-3 gap-[8px]">
            {photos.map(p => (
              <div key={p.id} className="aspect-square rounded-[8px] overflow-hidden" style={{ background: 'var(--surface2)' }}>
                <img src={p.url} alt={p.caption || 'Job photo'} className="w-full h-full object-cover" />
              </div>
            ))}
            {uploading && (
              <div
                className="aspect-square rounded-[8px] flex items-center justify-center text-[11px]"
                style={{ background: 'var(--surface2)', color: 'var(--text-4)' }}
              >
                Uploading...
              </div>
            )}
          </div>
        </div>
      )}

      {/* Zone sections */}
      {project.zones.length === 0 ? (
        <div className="text-center py-[32px] text-[13px]" style={{ color: 'var(--text-3)' }}>
          No zones defined for this project.
        </div>
      ) : (
        <div className="flex flex-col gap-[16px]">
          {project.zones
            .slice()
            .sort((a, b) => a.sequence - b.sequence)
            .map(zone => {
              const steps = zoneSteps.get(zone.id) ?? [];
              const doneSet = completedSteps[zone.id] ?? new Set<number>();
              const doneCount = doneSet.size;

              return (
                <div key={zone.id}>
                  {/* Zone header */}
                  <div className="flex items-center gap-[10px] mb-[10px]">
                    <span
                      className="w-[28px] h-[28px] rounded-full flex items-center justify-center text-[11px] font-[700] font-mono flex-shrink-0"
                      style={{ background: 'rgba(45,106,79,.25)', color: 'var(--green-l)' }}
                    >
                      {zone.sequence}
                    </span>
                    <span className="text-[14px] font-[700]" style={{ color: 'var(--text)' }}>
                      {zone.name}
                    </span>
                    <span className="text-[11px] font-mono ml-auto" style={{ color: 'var(--text-3)' }}>
                      {doneCount}/{steps.length}
                    </span>
                  </div>

                  {/* Steps */}
                  <div className="flex flex-col gap-[6px]">
                    {steps.map(step => {
                      const done = doneSet.has(step.n);
                      return (
                        <button
                          key={step.n}
                          onClick={() => toggleStep(zone.id, step.n)}
                          className="w-full flex items-start gap-[10px] px-[12px] py-[10px] rounded-[8px] text-left border-none cursor-pointer transition-colors"
                          style={{
                            minHeight: '48px',
                            background: done ? 'rgba(45,106,79,.12)' : 'var(--surface-card, var(--surface2))',
                          }}
                        >
                          <span
                            className="w-[22px] h-[22px] rounded-full text-[10px] font-[700] flex items-center justify-center flex-shrink-0 font-mono mt-[2px] transition-colors"
                            style={{
                              background: done ? 'var(--green-l)' : 'rgba(45,106,79,.25)',
                              color: done ? 'var(--surface, #111)' : 'var(--green-l)',
                            }}
                          >
                            {done ? '✓' : step.n}
                          </span>
                          <span
                            className="text-[13px] leading-[1.6] flex-1"
                            style={{
                              color: done ? 'var(--text-3)' : 'var(--text-2)',
                              textDecoration: done ? 'line-through' : 'none',
                            }}
                          >
                            {step.text}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* Hidden file input for camera */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handlePhotoCapture}
        className="hidden"
        style={{ display: 'none' }}
      />

      {/* Camera FAB */}
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="fixed rounded-full flex items-center justify-center cursor-pointer border-none transition-opacity disabled:opacity-50"
        style={{
          bottom: '76px',
          right: '16px',
          width: '52px',
          height: '52px',
          background: 'var(--green)',
          color: '#fff',
          fontSize: '22px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          zIndex: 10,
        }}
        title="Take photo"
      >
        📷
      </button>

      {/* Status buttons — fixed to bottom */}
      <div
        className="fixed bottom-0 left-0 right-0 flex gap-[8px] px-[16px] py-[12px]"
        style={{
          background: 'var(--bg-primary)',
          borderTop: '1px solid var(--border)',
        }}
      >
        {statusButtons.map(btn => {
          const isActive = crewStatus === btn.value;
          return (
            <button
              key={btn.value}
              onClick={() => handleStatusUpdate(btn.value)}
              disabled={statusUpdating}
              className="flex-1 rounded-[8px] text-[13px] font-[600] border cursor-pointer transition-colors disabled:opacity-50"
              style={{
                minHeight: '44px',
                background: isActive ? btn.activeColor : 'var(--surface-card, var(--surface2))',
                color: isActive ? '#fff' : 'var(--text-2)',
                borderColor: isActive ? 'transparent' : 'var(--border)',
              }}
            >
              {btn.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default CrewJobDetail;
