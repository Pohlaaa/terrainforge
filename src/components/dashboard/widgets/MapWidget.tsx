import React, { useRef, useState } from 'react';
import type { Project } from '@/types';
import { useMapbox } from '@/hooks/useMapbox';
import { useProjectStore } from '@/stores/projectStore';
import { useNavigate } from 'react-router-dom';

interface MapWidgetProps {
  projects: Project[];
}

const STATUS_LEGEND = [
  { label: 'On Track', color: '#16A34A' },
  { label: 'In Progress', color: '#2563EB' },
  { label: 'Attention', color: '#F59E0B' },
  { label: 'Not Started', color: '#9CA3AF' },
];

export const MapWidget: React.FC<MapWidgetProps> = ({ projects }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { setActiveProject } = useProjectStore();
  const [satellite, setSatellite] = useState(false);

  const { loaded, error } = useMapbox({
    container: mapRef,
    projects,
    satelliteMode: satellite,
    onProjectClick: (projectId) => {
      setActiveProject(projectId);
      navigate('/projects');
    },
  });

  const geocodedCount = projects.filter((p) => p.lat && p.lng).length;

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

  // Empty state when no geocoded projects
  if (!error && geocodedCount === 0 && loaded) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 24px',
          textAlign: 'center',
          gap: '12px',
        }}
      >
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none" style={{ opacity: 0.35 }}>
          <circle cx="24" cy="22" r="10" stroke="var(--text-tertiary)" strokeWidth="2" />
          <path d="M24 32c0 0-12 8-12 14" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round" />
          <path d="M24 32c0 0 12 8 12 14" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round" />
          <circle cx="24" cy="22" r="3" fill="var(--text-tertiary)" />
        </svg>
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 }}>
          Add addresses to your projects to see them here
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
          Create a project with a verified address to show a pin on this map
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '0 12px 12px', position: 'relative' }}>
      {/* Satellite toggle in header area */}
      {loaded && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '6px 0 6px' }}>
          <button
            onClick={() => setSatellite((s) => !s)}
            style={{
              padding: '4px 10px',
              borderRadius: '6px',
              border: '1px solid var(--border-default)',
              background: satellite ? 'var(--brand-primary)' : 'var(--surface-card)',
              color: satellite ? 'white' : 'var(--text-secondary)',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {satellite ? 'Map' : 'Satellite'}
          </button>
        </div>
      )}

      {!loaded && (
        <div
          className="skeleton-shimmer"
          style={{ width: '100%', height: '280px', borderRadius: '8px', marginTop: '6px' }}
        />
      )}
      <div style={{ position: 'relative' }}>
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
        {/* Status legend overlay */}
        {loaded && geocodedCount > 0 && (
          <div
            style={{
              position: 'absolute',
              bottom: '10px',
              left: '10px',
              background: 'rgba(255,255,255,0.92)',
              backdropFilter: 'blur(4px)',
              borderRadius: '8px',
              padding: '8px 10px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              pointerEvents: 'none',
            }}
          >
            {STATUS_LEGEND.map((s) => (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: s.color,
                    border: '2px solid white',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: '10px', color: '#374151', fontWeight: 500 }}>{s.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MapWidget;
