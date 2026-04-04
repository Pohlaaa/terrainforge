import React from 'react';
import type { Project } from '@/types';

const cardClass = 'rounded-[10px] border p-[16px]';
const cardHead = 'text-[12px] font-[700] uppercase text-[var(--text-3)] mb-[12px]';
const rowClass = 'flex justify-between text-[12px] py-[4px]';
const labelSpan = 'text-[var(--text-3)]';
const valueSpan = 'text-[var(--text)] font-[500]';

export interface ProjectNotesSectionProps {
  project: Project;
}

export const ProjectNotesSection: React.FC<ProjectNotesSectionProps> = ({ project }) => {
  return (
    <>
      {/* Site Conditions */}
      {(project.climateZone || project.soilType || project.slopeGrade || project.sunExposure) && (
        <div className={cardClass} style={{ backgroundColor: 'var(--surface2)', borderColor: 'var(--border)' }}>
          <div className={cardHead}>Site Conditions</div>
          <div className="space-y-[6px]">
            {project.climateZone && <div className={rowClass}><span className={labelSpan}>Climate</span><span className={valueSpan}>{project.climateZone}</span></div>}
            {project.soilType && <div className={rowClass}><span className={labelSpan}>Soil</span><span className={valueSpan}>{project.soilType}</span></div>}
            {project.slopeGrade && <div className={rowClass}><span className={labelSpan}>Slope</span><span className={valueSpan}>{project.slopeGrade}</span></div>}
            {project.sunExposure && <div className={rowClass}><span className={labelSpan}>Sun</span><span className={valueSpan}>{project.sunExposure.replace('_', ' ')}</span></div>}
            {project.drainagePattern && <div className={rowClass}><span className={labelSpan}>Drainage</span><span className={valueSpan}>{project.drainagePattern}</span></div>}
            {project.existingVegetation && <div className={rowClass}><span className={labelSpan}>Vegetation</span><span className={valueSpan}>{project.existingVegetation}</span></div>}
            {project.utilityLocations && <div className={rowClass}><span className={labelSpan}>Utilities</span><span className={valueSpan}>{project.utilityLocations}</span></div>}
          </div>
        </div>
      )}
    </>
  );
};
