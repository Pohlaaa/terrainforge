import React, { useRef } from 'react';
import type { Project } from '@/types';
import { useMapbox } from '@/hooks/useMapbox';
import { useProjectStore } from '@/stores/projectStore';
import { useNavigate } from 'react-router-dom';

interface MapWidgetProps {
  projects: Project[];
}

export const MapWidget: React.FC<MapWidgetProps> = ({ projects }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { setActiveProject } = useProjectStore();

  const { loaded, error } = useMapbox({
    container: mapRef,
    projects,
    onProjectClick: (projectId) => {
      setActiveProject(projectId);
      navigate('/projects');
    },
  });

  if (error) {
    return (
      <div className="text-center py-[40px]">
        <div className="text-[32px] mb-[10px] opacity-30">🗺️</div>
        <div className="text-[13px] text-[var(--text-secondary)] mb-[4px]">Project Map</div>
        <div className="text-[11px] text-[var(--text-tertiary)]">
          {error.includes('VITE_MAPBOX_TOKEN')
            ? 'Add VITE_MAPBOX_TOKEN to .env.local to enable the map'
            : 'Map unavailable'}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '12px' }}>
      {!loaded && (
        <div
          className="skeleton-shimmer"
          style={{ width: '100%', height: '280px', borderRadius: '8px' }}
        />
      )}
      <div
        ref={mapRef}
        style={{
          width: '100%',
          height: '280px',
          borderRadius: '8px',
          overflow: 'hidden',
          display: loaded ? 'block' : 'none',
        }}
      />
      {loaded && projects.filter((p) => p.lat && p.lng).length === 0 && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <div
            className="text-center"
            style={{
              background: 'var(--surface-card)',
              borderRadius: '8px',
              padding: '12px 16px',
              maxWidth: '220px',
            }}
          >
            <div className="text-[11px] text-[var(--text-tertiary)]">
              Add coordinates to your projects to see them on the map
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapWidget;
