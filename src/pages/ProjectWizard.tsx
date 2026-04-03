import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { WizardStepper } from '@/components/wizard/WizardStepper';
import { WizardStep1 } from '@/components/wizard/WizardStep1';
import { WizardStep2 } from '@/components/wizard/WizardStep2';
import { WizardStep3 } from '@/components/wizard/WizardStep3';
import { WizardStep4 } from '@/components/wizard/WizardStep4';
import { WizardStep5 } from '@/components/wizard/WizardStep5';
import { WizardStep6 } from '@/components/wizard/WizardStep6';
import { WizardStep7 } from '@/components/wizard/WizardStep7';
import { useProjectStore } from '@/stores/projectStore';
import { useOrgStore } from '@/stores/orgStore';
import { useCrewStore } from '@/stores/crewStore';
import { useEquipmentStore } from '@/stores/equipmentStore';
import { useMaterialStore } from '@/stores/materialStore';
import { useScheduleStore } from '@/stores/scheduleStore';
import { generateProjectRecommendations } from '@/services/aiRecommendations';
import type { Project, ProjectTask, AIRecommendationSet } from '@/types';
import { getWeekdaysBetween } from '@/utils/dates';

// ── Wizard data shape (local state until project is created) ────────────────

export interface WizardTask {
  tempId: string;
  name: string;
  description: string | null;
  phase: string;
  sequenceNumber: number;
  estimatedHours: number | null;
  aiGenerated?: boolean;
}

export interface WizardSubcontractor {
  tempId: string;
  companyName: string;
  contactName: string | null;
  phone: string | null;
  trade: string | null;
  scopeDescription: string | null;
  quotedCost: number | null;
}

export interface WizardEquipment {
  equipmentId: string;
  name: string;
  dailyRate: number;
  durationDays: number;
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

  // Step 4: Resources
  crewSize: number | null;
  crewNotes: string | null;
  crewSelections: Array<{
    crewMemberId: string;
    name: string;
    role: string;
    roleOnProject?: string;
  }>;
  equipmentSelections: WizardEquipment[];
  equipmentNotes: string | null;
  subcontractors: WizardSubcontractor[];

  // Step 5: Timeline & Budget
  startDate: string | null;
  targetDate: string | null;
  estimatedHours: number | null;
  laborBudget: number | null;
  materialsBudget: number | null;
  equipmentBudget: number | null;
  subcontractorBudget: number | null;
  disposalCost: number | null;
  equipmentCost: number | null;
  overheadPct: number | null;
  clientQuote: number | null;

  // Step 5: Compliance (now before budget)
  noPermitsRequired: boolean;
  permitStatus: string | null;
  permitChecklist: string[];
  permitFees: Record<string, number>;
  complianceNotes: string | null;
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
  crewSize: null,
  crewNotes: null,
  crewSelections: [],
  equipmentSelections: [],
  equipmentNotes: null,
  subcontractors: [],
  startDate: null,
  targetDate: null,
  estimatedHours: null,
  laborBudget: null,
  materialsBudget: null,
  equipmentBudget: null,
  subcontractorBudget: null,
  disposalCost: null,
  equipmentCost: null,
  overheadPct: null,
  clientQuote: null,
  noPermitsRequired: false,
  permitStatus: null,
  permitChecklist: [],
  permitFees: {},
  complianceNotes: null,
};

const WIZARD_STEPS = [
  { label: 'Job Description', shortLabel: 'Job' },
  { label: 'Site Intelligence', shortLabel: 'Site' },
  { label: 'Scope & Tasks', shortLabel: 'Tasks' },
  { label: 'Resources', shortLabel: 'Resources' },
  { label: 'Compliance', shortLabel: 'Permits' },
  { label: 'Timeline & Budget', shortLabel: 'Budget' },
  { label: 'Review & Create', shortLabel: 'Review' },
];

export default function ProjectWizard() {
  const navigate = useNavigate();
  const { addProject, createProjectTask, createProjectSubcontractor } = useProjectStore();
  const projectStore = useProjectStore();
  const { org } = useOrgStore();
  const crewStore = useCrewStore();
  const equipmentStore = useEquipmentStore();
  const materialStore = useMaterialStore();
  const scheduleStore = useScheduleStore();
  const orgId = org?.id;

  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState<WizardData>(INITIAL_DATA);
  const [isCreating, setIsCreating] = useState(false);
  const [createStatus, setCreateStatus] = useState('');

  // AI recommendation state
  const [recommendations, setRecommendations] = useState<AIRecommendationSet | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [acceptedItems, setAcceptedItems] = useState<Record<string, Set<string>>>({
    tasks: new Set(),
    crew: new Set(),
    equipment: new Set(),
    materials: new Set(),
    permits: new Set(),
  });
  const [dismissedItems, setDismissedItems] = useState<Record<string, Set<string>>>({
    tasks: new Set(),
    crew: new Set(),
    equipment: new Set(),
    materials: new Set(),
    permits: new Set(),
  });

  // Fetch org data needed for AI recommendations
  useEffect(() => {
    if (!orgId) return;
    crewStore.fetchCrew();
    equipmentStore.fetchEquipment();
    materialStore.fetchMaterials();
    scheduleStore.fetchAssignments(orgId);
    const today = new Date().toISOString().split('T')[0];
    const future = new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0];
    scheduleStore.fetchEntries(orgId, today, future);
  }, [orgId]);

  const handleChange = useCallback((updates: Partial<WizardData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  }, []);

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 0:
        return data.name.trim().length > 0;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (currentStep < WIZARD_STEPS.length - 1) {
      // Fire AI when leaving Site Intelligence step (index 1)
      if (currentStep === 1 && !recommendations && !aiLoading) {
        setAiLoading(true);
        generateProjectRecommendations({
          description: data.description || '',
          projectType: data.projectType,
          propertyType: data.propertyType,
          scopeSize: data.scopeSize,
          address: data.address || '',
          siteConditions: {
            slopeGrade: data.slopeGrade ?? undefined,
            soilType: data.soilType ?? undefined,
            sunExposure: data.sunExposure ?? undefined,
            drainagePattern: data.drainagePattern ?? undefined,
            climateZone: data.climateZone ?? undefined,
            hoaFlag: data.hoaFlag,
          },
          startDate: data.startDate ?? undefined,
          targetDate: data.targetDate ?? undefined,
          orgCrew: crewStore.crew,
          orgEquipment: equipmentStore.equipment,
          orgMaterials: materialStore.materials,
          defaultLaborRate: org?.defaultLaborRate ?? 35,
          defaultEquipmentRate: org?.defaultEquipmentRate ?? 0,
          existingAssignments: scheduleStore.assignments,
          existingScheduleEntries: scheduleStore.entries,
          existingProjects: projectStore.projects,
        }).then((result) => {
          setRecommendations(result);
          setAiLoading(false);
        }).catch(() => setAiLoading(false));
      }
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

  // AI accept/dismiss helpers
  const handleAccept = (category: string, id: string) => {
    setAcceptedItems((prev) => {
      const next = { ...prev };
      next[category] = new Set(prev[category]);
      next[category].add(id);
      return next;
    });
    // Remove from dismissed if it was there (undo)
    setDismissedItems((prev) => {
      if (!prev[category].has(id)) return prev;
      const next = { ...prev };
      next[category] = new Set(prev[category]);
      next[category].delete(id);
      return next;
    });
  };

  const handleDismiss = (category: string, id: string) => {
    setDismissedItems((prev) => {
      const next = { ...prev };
      next[category] = new Set(prev[category]);
      next[category].add(id);
      return next;
    });
    setAcceptedItems((prev) => {
      if (!prev[category].has(id)) return prev;
      const next = { ...prev };
      next[category] = new Set(prev[category]);
      next[category].delete(id);
      return next;
    });
  };

  const handleAcceptAll = (category: string, ids: string[]) => {
    setAcceptedItems((prev) => {
      const next = { ...prev };
      next[category] = new Set([...prev[category], ...ids]);
      return next;
    });
    setDismissedItems((prev) => {
      const next = { ...prev };
      next[category] = new Set([...prev[category]].filter((id) => !ids.includes(id)));
      return next;
    });
  };

  const handleDismissAll = (category: string, ids: string[]) => {
    setDismissedItems((prev) => {
      const next = { ...prev };
      next[category] = new Set([...prev[category], ...ids]);
      return next;
    });
    setAcceptedItems((prev) => {
      const next = { ...prev };
      next[category] = new Set([...prev[category]].filter((id) => !ids.includes(id)));
      return next;
    });
  };

  const handleCreate = async () => {
    if (!orgId || isCreating) return;
    setIsCreating(true);

    try {
      // Compute budget total for the legacy budget field
      const labor = data.laborBudget ?? 0;
      const materials = data.materialsBudget ?? 0;
      const equipment = data.equipmentBudget ?? 0;
      const subs = data.subcontractorBudget ?? 0;
      const disposal = data.disposalCost ?? 0;
      const equipCost = data.equipmentCost ?? 0;
      const subtotal = labor + materials + equipment + subs + disposal + equipCost;
      const overhead = subtotal * ((data.overheadPct ?? 10) / 100);
      const totalCost = subtotal + overhead;
      const profit = (data.clientQuote ?? 0) - totalCost;

      // Build project object from wizard data
      const project: Omit<Project, 'id' | 'createdAt'> = {
        name: data.name.trim(),
        client: data.clientName || '',
        address: data.address,
        totalArea: 0,
        startDate: data.startDate || '',
        targetDate: data.targetDate || '',
        budget: data.clientQuote ?? 0,
        notes: [
          ...data.equipmentSelections.map((e) => `${e.name} (${e.durationDays}d)`),
          data.equipmentNotes || '',
        ].filter(Boolean).join('; '),
        lat: data.lat ?? undefined,
        lng: data.lng ?? undefined,
        zones: [],
        checklist: {
          permit: data.permitChecklist.length > 0,
          utility: !!data.utilityLocations,
          deposit: false,
          design: false,
          access: !!data.gateCode || !!data.permittedHours,
          materials: (data.materialsBudget ?? 0) > 0,
          crew: (data.crewSize ?? 0) > 0,
          equipment: data.equipmentSelections.length > 0 || !!data.equipmentNotes,
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
        laborBudget: data.laborBudget,
        materialsBudget: data.materialsBudget,
        equipmentBudget: data.equipmentBudget,
        subcontractorBudget: data.subcontractorBudget,
        overheadPct: data.overheadPct,
        clientQuote: data.clientQuote,
        profitMargin: profit,
        estimatedHours: data.estimatedHours,
        disposalCost: data.disposalCost,
        equipmentCost: data.equipmentCost,
        crewSize: data.crewSize,
        crewNotes: data.crewNotes,
        equipmentNotes: data.equipmentNotes,
        complianceNotes: data.complianceNotes,
        permitStatus: data.permitStatus as Project['permitStatus'],
        wizardStep: 7,
        wizardCompletedAt: new Date().toISOString(),
      };

      // Create the project via store (handles Supabase persistence + ID generation)
      const projectId = await addProject(project);

      if (!projectId) {
        console.error('Wizard: project creation returned null');
        return;
      }

      // Create tasks through store
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
              aiGenerated: task.aiGenerated ?? false,
              aiConfidence: null,
            },
            orgId
          );
        }
      }

      // Create subcontractors through store
      for (const sub of data.subcontractors) {
        if (sub.companyName.trim()) {
          await createProjectSubcontractor(
            {
              orgId,
              projectId,
              companyName: sub.companyName.trim(),
              contactName: sub.contactName,
              phone: sub.phone,
              email: null,
              trade: sub.trade,
              scopeDescription: sub.scopeDescription,
              scheduledStart: null,
              scheduledEnd: null,
              quotedCost: sub.quotedCost,
              actualCost: null,
              status: 'pending',
              notes: null,
            },
            orgId
          );
        }
      }

      navigate(`/projects/${projectId}`);
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
        {currentStep === 0 && <WizardStep1 data={data} onChange={handleChange} />}
        {currentStep === 1 && <WizardStep2 data={data} onChange={handleChange} />}
        {currentStep === 2 && (
          <WizardStep3
            data={data}
            onChange={handleChange}
            recommendations={recommendations}
            aiLoading={aiLoading}
            acceptedIds={acceptedItems.tasks}
            dismissedIds={dismissedItems.tasks}
            onAccept={(id) => handleAccept('tasks', id)}
            onDismiss={(id) => handleDismiss('tasks', id)}
            onAcceptAll={(ids) => handleAcceptAll('tasks', ids)}
            onDismissAll={(ids) => handleDismissAll('tasks', ids)}
          />
        )}
        {currentStep === 3 && (
          <WizardStep4
            data={data}
            onChange={handleChange}
            recommendations={recommendations}
            aiLoading={aiLoading}
            acceptedCrewIds={acceptedItems.crew}
            dismissedCrewIds={dismissedItems.crew}
            acceptedEquipIds={acceptedItems.equipment}
            dismissedEquipIds={dismissedItems.equipment}
            onAcceptCrew={(id) => handleAccept('crew', id)}
            onDismissCrew={(id) => handleDismiss('crew', id)}
            onAcceptAllCrew={(ids) => handleAcceptAll('crew', ids)}
            onDismissAllCrew={(ids) => handleDismissAll('crew', ids)}
            onAcceptEquip={(id) => handleAccept('equipment', id)}
            onDismissEquip={(id) => handleDismiss('equipment', id)}
            onAcceptAllEquip={(ids) => handleAcceptAll('equipment', ids)}
            onDismissAllEquip={(ids) => handleDismissAll('equipment', ids)}
          />
        )}
        {currentStep === 4 && (
          <WizardStep6
            data={data}
            onChange={handleChange}
            recommendations={recommendations}
            aiLoading={aiLoading}
            acceptedIds={acceptedItems.permits}
            dismissedIds={dismissedItems.permits}
            onAccept={(id) => handleAccept('permits', id)}
            onDismiss={(id) => handleDismiss('permits', id)}
            onAcceptAll={(ids) => handleAcceptAll('permits', ids)}
            onDismissAll={(ids) => handleDismissAll('permits', ids)}
          />
        )}
        {currentStep === 5 && (
          <WizardStep5
            data={data}
            onChange={handleChange}
            recommendations={recommendations}
          />
        )}
        {currentStep === 6 && <WizardStep7 data={data} />}
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
