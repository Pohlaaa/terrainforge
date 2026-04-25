import React from 'react';
import type { Project } from '@/types';
import { formatPhone } from '@/utils/phone';

const cardClass = 'rounded-[10px] border p-[16px]';
const cardHead = 'text-[12px] font-[700] uppercase text-[var(--text-3)] mb-[12px]';
const rowClass = 'flex justify-between text-[12px] py-[4px]';
const labelSpan = 'text-[var(--text-3)]';
const valueSpan = 'text-[var(--text)] font-[500]';

const PROJECT_TYPES = [
  { value: 'full_install', label: 'Full Install' },
  { value: 'renovation', label: 'Renovation' },
  { value: 'hardscape', label: 'Hardscape' },
  { value: 'softscape', label: 'Softscape' },
  { value: 'drainage', label: 'Drainage' },
  { value: 'irrigation', label: 'Irrigation' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'mixed', label: 'Mixed' },
];

const PROPERTY_TYPES = [
  { value: 'residential', label: 'Residential' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'hoa', label: 'HOA' },
  { value: 'municipal', label: 'Municipal' },
  { value: 'multi_family', label: 'Multi-Family' },
  { value: 'other', label: 'Other' },
];

export interface ProjectInfoCardProps {
  project: Project;
  onEdit: () => void;
}

export const ProjectInfoCard: React.FC<ProjectInfoCardProps> = ({ project, onEdit }) => {
  return (
    <div className={cardClass} style={{ backgroundColor: 'var(--surface2)', borderColor: 'var(--border)' }}>
      <div className="flex items-center justify-between mb-[12px]">
        <div className={cardHead} style={{ marginBottom: 0 }}>Project Info</div>
        <button
          type="button"
          onClick={onEdit}
          className="flex items-center gap-[4px] text-[12px] font-[500] cursor-pointer bg-transparent border-none"
          style={{ color: 'var(--green-l)' }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
          Edit
        </button>
      </div>
      <div className="space-y-[6px]">
        {project.clientName && (
          <div className={rowClass}>
            <span className={labelSpan}>Client</span>
            <span className={valueSpan}>{project.clientName}</span>
          </div>
        )}
        {project.clientPhone && (
          <div className={rowClass}>
            <span className={labelSpan}>Phone</span>
            <span className={valueSpan}>{formatPhone(project.clientPhone)}</span>
          </div>
        )}
        {project.clientEmail && (
          <div className={rowClass}>
            <span className={labelSpan}>Email</span>
            <span className={valueSpan}>{project.clientEmail}</span>
          </div>
        )}
        {project.projectType && (
          <div className={rowClass}>
            <span className={labelSpan}>Type</span>
            <span className={valueSpan}>{PROJECT_TYPES.find((t) => t.value === project.projectType)?.label || project.projectType}</span>
          </div>
        )}
        {project.propertyType && (
          <div className={rowClass}>
            <span className={labelSpan}>Property</span>
            <span className={valueSpan}>{PROPERTY_TYPES.find((t) => t.value === project.propertyType)?.label || project.propertyType}</span>
          </div>
        )}
        {project.scopeSize && (
          <div className={rowClass}>
            <span className={labelSpan}>Scope</span>
            <span className={valueSpan} style={{ textTransform: 'capitalize' }}>{project.scopeSize}</span>
          </div>
        )}
        <div className={rowClass}>
          <span className={labelSpan}>Start</span>
          <span className={valueSpan}>
            {project.startDate ? new Date(project.startDate).toLocaleDateString() : '\u2014'}
          </span>
        </div>
        <div className={rowClass}>
          <span className={labelSpan}>Target</span>
          <span className={valueSpan}>
            {project.targetDate ? new Date(project.targetDate).toLocaleDateString() : '\u2014'}
          </span>
        </div>
      </div>
    </div>
  );
};
