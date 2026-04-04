import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjectStore } from '@/stores/projectStore';
import { useCrewStore } from '@/stores/crewStore';
import { useEquipmentStore } from '@/stores/equipmentStore';
import { HelpIcon } from '@/components/shared/Tooltip';

interface SetupStep {
  label: string;
  complete: boolean;
  path: string;
}

/** Seed data uses IDs like crew_001, eq_001; real DB records use UUIDs. */
const isRealId = (id: string) => /^[0-9a-f]{8}-/.test(id);

function useSetupSteps(): SetupStep[] {
  const { projects } = useProjectStore();
  const { crew } = useCrewStore();
  const { equipment } = useEquipmentStore();

  const realProjects = projects.filter((p) => !p.isDemo && isRealId(p.id));
  const realCrew = crew.filter((c) => isRealId(c.id));
  const realEquipment = equipment.filter((e) => isRealId(e.id));

  return [
    {
      label: 'Create your first project',
      complete: realProjects.length > 0,
      path: '/projects',
    },
    {
      label: 'Add a crew member',
      complete: realCrew.length > 0,
      path: '/crew-manager',
    },
    {
      label: 'Add equipment',
      complete: realEquipment.length > 0,
      path: '/equipment',
    },
    {
      label: 'View your schedule',
      complete: localStorage.getItem('tf-visited-schedule') === 'true',
      path: '/schedule',
    },
  ];
}

export const SetupChecklist: React.FC = () => {
  const navigate = useNavigate();
  const steps = useSetupSteps();
  const completedCount = steps.filter((s) => s.complete).length;
  const allComplete = completedCount === steps.length;
  const dismissed = localStorage.getItem('tf-setup-dismissed') === 'true';
  const [localDismissed, setLocalDismissed] = useState(() => {
    if (dismissed) return true;
    const dataSteps = steps.slice(0, 3);
    if (dataSteps.every((s) => s.complete) && !localStorage.getItem('tf-setup-seen')) {
      localStorage.setItem('tf-setup-dismissed', 'true');
      return true;
    }
    localStorage.setItem('tf-setup-seen', 'true');
    return false;
  });

  if (localDismissed) return null;

  const handleDismiss = () => {
    localStorage.setItem('tf-setup-dismissed', 'true');
    setLocalDismissed(true);
  };

  if (allComplete) {
    return (
      <div className="bg-[var(--surface-card)] border-2 border-[var(--status-green)] rounded-xl p-6 mb-4 text-center">
        <div className="text-base font-bold text-[var(--status-green)] mb-1">
          You're all set!
        </div>
        <div className="text-[13px] text-[var(--text-secondary)] mb-4">
          Your TerrainForge workspace is ready.
        </div>
        <button
          onClick={handleDismiss}
          className="bg-transparent border-none text-[var(--text-tertiary)] text-xs font-semibold cursor-pointer px-3 py-1.5"
        >
          Dismiss
        </button>
      </div>
    );
  }

  const firstIncompleteIndex = steps.findIndex((s) => !s.complete);

  return (
    <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-xl p-6 mb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center">
          <span className="text-base font-bold text-[var(--text-primary)]">
            Get Started
          </span>
          <HelpIcon tooltip="Complete these steps to set up your workspace. You can dismiss this anytime." position="right" />
        </div>
        <span className="text-xs text-[var(--text-tertiary)]">
          {completedCount} of {steps.length} complete
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1 rounded-full bg-[var(--surface-hover)] mb-4 overflow-hidden">
        <div
          className="h-full rounded-full bg-[var(--status-green)] transition-[width] duration-300 ease-in-out"
          style={{ width: `${(completedCount / steps.length) * 100}%` }}
        />
      </div>

      {/* Steps */}
      <div className="flex flex-col gap-2">
        {steps.map((step, i) => {
          const isNext = i === firstIncompleteIndex;
          return (
            <div
              key={step.label}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg ${
                isNext
                  ? 'border-l-[3px] border-l-[var(--brand-primary)] bg-[var(--surface-hover)]'
                  : 'border-l-[3px] border-l-transparent'
              }`}
            >
              {/* Checkbox icon */}
              {step.complete ? (
                <div className="w-[22px] h-[22px] rounded-full bg-[var(--status-green)] flex items-center justify-center flex-shrink-0">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2.5 6L5 8.5L9.5 3.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              ) : (
                <div
                  className={`w-[22px] h-[22px] rounded-full flex-shrink-0 border-2 ${
                    isNext ? 'border-[var(--brand-primary)]' : 'border-[var(--text-secondary)]'
                  }`}
                />
              )}

              {/* Label */}
              <span
                className={`flex-1 text-sm ${
                  step.complete
                    ? 'text-[var(--text-tertiary)] line-through'
                    : 'text-[var(--text-secondary)]'
                } ${isNext ? 'font-semibold' : 'font-normal'}`}
              >
                {step.label}
              </span>

              {/* Go link */}
              {isNext && (
                <button
                  onClick={() => navigate(step.path)}
                  className="bg-transparent border-none text-[var(--brand-primary)] text-[13px] font-semibold cursor-pointer px-2 py-1 whitespace-nowrap"
                >
                  Go &rarr;
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Dismiss link */}
      <div className="text-right mt-3">
        <button
          onClick={handleDismiss}
          className="bg-transparent border-none text-[var(--text-secondary)] text-[11px] cursor-pointer"
        >
          Dismiss checklist
        </button>
      </div>
    </div>
  );
};

export default SetupChecklist;
