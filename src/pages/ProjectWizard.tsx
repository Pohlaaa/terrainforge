import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { WizardStepper } from '@/components/wizard/WizardStepper';
import { WizardStep1 } from '@/components/wizard/WizardStep1';
import { WizardStep2 } from '@/components/wizard/WizardStep2';
import { WizardStep3 } from '@/components/wizard/WizardStep3';
import { WizardStepPlaceholder } from '@/components/wizard/WizardStepPlaceholder';
import { useProjectStore } from '@/stores/projectStore';
import { useOrgStore } from '@/stores/orgStore';
import type { Project, ProjectTask } from '@/types';
import { createProjectTask } from '@/services/supabaseData';

// ── Wizard data shape (local state until project is created) ────────────────

export interface WizardTask {
  tempId: string;
  name: string;
  description: string | null;
  phase: string;
  sequenceNumber: number;
  estimatedHours: number | null;
}

export interface WizardData {
  // Step 1: Job Description
  name: string;
  clientName: string | null;
  clientPhone: string | null;
  clientEmail: string | null;
  propertyType: string | null;
  projectType: string | null;
  scopeSize: string | null;
  description: string | null;

  // Step 2: Site Intelligence
  address: string;
  lat: number | null;
  lng: number | null;
  slopeGrade: string | null;
  soilType: string | null;
  sunExposure: string | null;
  drainagePattern: string | null;
  existingVegetation: string | null;
  climateZone: string | null;
  permitZone: string | null;
  hoaFlag: boolean;
  gateCode: string | null;
  parkingRestrictions: string | null;
  permittedHours: string | null;
  utilityLocations: string | null;
  hoaRules: string | null;

  // Step 3: Scope & Tasks
  tasks: WizardTask[];

  // Steps 4-7 will be added in Sprint 31
}

const INITIAL_DATA: WizardData = {
  name: '',
  clientName: null,
  clientPhone: null,
  clientEmail: null,
  propertyType: null,
  projectType: null,
  scopeSize: null,
  description: null,
  address: '',
  lat: null,
  lng: null,
  slopeGrade: null,
  soilType: null,
  sunExposure: null,
  drainagePattern: null,
  existingVegetation: null,
  climateZone: null,
  permitZone: null,
  hoaFlag: false,
  gateCode: null,
  parkingRestrictions: null,
  permittedHours: null,
  utilityLocations: null,
  hoaRules: null,
  tasks: [],
};

const WIZARD_STEPS = [
  { label: 'Job Description', shortLabel: 'Job' },
  { label: 'Site Intelligence', shortLabel: 'Site' },
  { label: 'Scope & Tasks', shortLabel: 'Tasks' },
  { label: 'Resources', shortLabel: 'Resources' },
  { label: 'Timeline & Budget', shortLabel: 'Budget' },
  { label: 'Compliance', shortLabel: 'Permits' },
  { label: 'Review & Create', shortLabel: 'Review' },
];

export default function ProjectWizard() {
  const navigate = useNavigate();
  const { addProject } = useProjectStore();
  const { org } = useOrgStore();
  const orgId = org?.id;

  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState<WizardData>(INITIAL_DATA);
  const [isCreating, setIsCreating] = useState(false);

  const handleChange = useCallback((updates: Partial<WizardData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  }, []);

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 0:
        return data.name.trim().length > 0;
      case 1:
        return true; // Address is optional
      case 2:
        return true; // Tasks are optional at this stage
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (currentStep < WIZARD_STEPS.length - 1) {
      setCurrentStep((s) => s + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
    }
  };

  const handleCancel = () => {
    navigate('/projects');
  };

  const handleCreate = async () => {
    if (!orgId || isCreating) return;
    setIsCreating(true);

    try {
      // Build project object from wizard data
      const project: Omit<Project, 'id' | 'createdAt'> = {
        name: data.name.trim(),
        client: data.clientName || '',
        address: data.address,
        totalArea: 0,
        startDate: '',
        targetDate: '',
        budget: 0,
        notes: '',
        lat: data.lat ?? undefined,
        lng: data.lng ?? undefined,
        zones: [],
        checklist: {
          permit: false,
          utility: false,
          deposit: false,
          design: false,
          access: false,
          materials: false,
          crew: false,
          equipment: false,
        },
        // M1.5 fields
        clientName: data.clientName,
        clientPhone: data.clientPhone,
        clientEmail: data.clientEmail,
        propertyType: data.propertyType as Project['propertyType'],
        projectType: data.projectType as Project['projectType'],
        scopeSize: data.scopeSize as Project['scopeSize'],
        description: data.description,
        climateZone: data.climateZone,
        soilType: data.soilType,
        permitZone: data.permitZone,
        hoaFlag: data.hoaFlag,
        slopeGrade: data.slopeGrade,
        existingVegetation: data.existingVegetation,
        sunExposure: data.sunExposure as Project['sunExposure'],
        drainagePattern: data.drainagePattern,
        gateCode: data.gateCode,
        parkingRestrictions: data.parkingRestrictions,
        permittedHours: data.permittedHours,
        utilityLocations: data.utilityLocations,
        hoaRules: data.hoaRules,
        wizardStep: 7,
        wizardCompletedAt: new Date().toISOString(),
      };

      // Create the project via store (handles Supabase persistence + ID generation)
      const projectId = await addProject(project);

      if (!projectId) {
        console.error('Wizard: project creation returned null');
        return;
      }

      // Create tasks in Supabase
      for (const task of data.tasks) {
        if (task.name.trim()) {
          await createProjectTask(
            {
              orgId,
              projectId,
              zoneId: null,
              name: task.name.trim(),
              description: task.description,
              phase: task.phase as ProjectTask['phase'],
              sequenceNumber: task.sequenceNumber,
              status: 'pending',
              assignedCrewId: null,
              estimatedHours: task.estimatedHours,
              actualHours: null,
              dependsOn: [],
              scheduledDate: null,
              completedAt: null,
              aiGenerated: false,
              aiConfidence: null,
            },
            crypto.randomUUID(),
            orgId
          );
        }
      }

      navigate('/projects');
    } catch (err) {
      console.error('Wizard create failed:', err);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="max-w-[800px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-[24px]">
        <div>
          <h1 className="font-serif text-[22px] text-[var(--text)]">
            New Project Wizard
          </h1>
          <p className="text-[13px] text-[var(--text-3)] mt-[2px]">
            Step {currentStep + 1} of {WIZARD_STEPS.length}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={handleCancel}>
          Cancel
        </Button>
      </div>

      {/* Stepper */}
      <div className="mb-[32px]">
        <WizardStepper
          steps={WIZARD_STEPS}
          currentStep={currentStep}
          onStepClick={(step) => {
            if (step <= currentStep) setCurrentStep(step);
          }}
        />
      </div>

      {/* Step content */}
      <div
        className="rounded-[12px] border p-[24px] mb-[24px]"
        style={{
          backgroundColor: 'var(--surface)',
          borderColor: 'var(--border)',
        }}
      >
        {currentStep === 0 && (
          <WizardStep1 data={data} onChange={handleChange} />
        )}
        {currentStep === 1 && (
          <WizardStep2 data={data} onChange={handleChange} />
        )}
        {currentStep === 2 && (
          <WizardStep3 data={data} onChange={handleChange} />
        )}
        {currentStep === 3 && (
          <WizardStepPlaceholder
            stepNumber={4}
            title="Resources"
            description="Assign crew, materials, equipment, and subcontractors to the project. AI will recommend based on your tasks and scope."
          />
        )}
        {currentStep === 4 && (
          <WizardStepPlaceholder
            stepNumber={5}
            title="Timeline & Budget"
            description="Set start/end dates, review AI-generated timeline, and build your budget breakdown with labor, materials, equipment, and overhead."
          />
        )}
        {currentStep === 5 && (
          <WizardStepPlaceholder
            stepNumber={6}
            title="Compliance"
            description="Track permits, inspection requirements, and compliance notes. AI will suggest required permits based on your location and scope."
          />
        )}
        {currentStep === 6 && (
          <WizardStepPlaceholder
            stepNumber={7}
            title="Review & Create"
            description="Review all project details and create the project with one tap. Everything you've entered becomes a living project."
          />
        )}
      </div>

      {/* Navigation buttons */}
      <div className="flex items-center justify-between">
        <Button
          variant="secondary"
          size="md"
          onClick={handleBack}
          disabled={currentStep === 0}
        >
          Back
        </Button>

        <div className="flex items-center gap-[8px]">
          {currentStep < WIZARD_STEPS.length - 1 ? (
            <Button
              variant="primary"
              size="md"
              onClick={handleNext}
              disabled={!canProceed()}
            >
              Next
            </Button>
          ) : (
            <Button
              variant="primary"
              size="md"
              onClick={handleCreate}
              loading={isCreating}
              disabled={!data.name.trim() || isCreating}
            >
              Create Project
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
