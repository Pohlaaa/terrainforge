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

function useSetupSteps(): SetupStep[] {
  const { projects } = useProjectStore();
  const { crew } = useCrewStore();
  const { equipment } = useEquipmentStore();

  const realProjects = projects.filter((p) => !p.isDemo);
  const realCrew = crew.filter((c) => !(c as { isDemo?: boolean }).isDemo);
  const realEquipment = equipment.filter((e) => !(e as { isDemo?: boolean }).isDemo);

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
    {
      label: 'Explore the manifest engine',
      complete: localStorage.getItem('tf-visited-manifest') === 'true',
      path: '/manifest',
    },
  ];
}

export const SetupChecklist: React.FC = () => {
  const navigate = useNavigate();
  const steps = useSetupSteps();
  const completedCount = steps.filter((s) => s.complete).length;
  const allComplete = completedCount === steps.length;
  const dismissed = localStorage.getItem('tf-setup-dismissed') === 'true';
  const [localDismissed, setLocalDismissed] = useState(dismissed);

  if (localDismissed) return null;

  const handleDismiss = () => {
    localStorage.setItem('tf-setup-dismissed', 'true');
    setLocalDismissed(true);
  };

  if (allComplete) {
    return (
      <div
        style={{
          background: 'var(--surface2)',
          border: '2px solid var(--green-l)',
          borderRadius: 'var(--radius-lg, 12px)',
          padding: '24px',
          marginBottom: '16px',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--green-l)', marginBottom: '4px' }}>
          You're all set!
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text-2)', marginBottom: '16px' }}>
          Your TerrainForge workspace is ready.
        </div>
        <button
          onClick={handleDismiss}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-3)',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            padding: '6px 12px',
          }}
        >
          Dismiss
        </button>
      </div>
    );
  }

  const firstIncompleteIndex = steps.findIndex((s) => !s.complete);

  return (
    <div
      style={{
        background: 'var(--surface2)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg, 12px)',
        padding: '24px',
        marginBottom: '16px',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>
            Get Started
          </span>
          <HelpIcon tooltip="Complete these steps to set up your workspace. You can dismiss this anytime." position="right" />
        </div>
        <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>
          {completedCount} of {steps.length} complete
        </span>
      </div>

      {/* Progress bar */}
      <div
        style={{
          height: '4px',
          borderRadius: '9999px',
          background: 'var(--surface3)',
          marginBottom: '16px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${(completedCount / steps.length) * 100}%`,
            background: 'var(--green-l)',
            borderRadius: '9999px',
            transition: 'width 0.3s ease',
          }}
        />
      </div>

      {/* Steps */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {steps.map((step, i) => {
          const isNext = i === firstIncompleteIndex;
          return (
            <div
              key={step.label}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 12px',
                borderRadius: '8px',
                borderLeft: isNext ? '3px solid var(--green)' : '3px solid transparent',
                background: isNext ? 'var(--surface3)' : 'transparent',
              }}
            >
              {/* Checkbox icon */}
              {step.complete ? (
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    background: 'var(--green-l)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2.5 6L5 8.5L9.5 3.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              ) : (
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    border: `2px solid ${isNext ? 'var(--green)' : 'var(--text-4)'}`,
                    flexShrink: 0,
                  }}
                />
              )}

              {/* Label */}
              <span
                style={{
                  flex: 1,
                  fontSize: '14px',
                  fontWeight: isNext ? 600 : 400,
                  color: step.complete ? 'var(--text-3)' : 'var(--text-2)',
                  textDecoration: step.complete ? 'line-through' : 'none',
                }}
              >
                {step.label}
              </span>

              {/* Go link */}
              {isNext && (
                <button
                  onClick={() => navigate(step.path)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--green-l)',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: '4px 8px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Go &rarr;
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Dismiss link */}
      <div style={{ textAlign: 'right', marginTop: '12px' }}>
        <button
          onClick={handleDismiss}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-4)',
            fontSize: '11px',
            cursor: 'pointer',
          }}
        >
          Dismiss checklist
        </button>
      </div>
    </div>
  );
};

export default SetupChecklist;
