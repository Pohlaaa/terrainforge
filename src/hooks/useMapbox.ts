import 'mapbox-gl/dist/mapbox-gl.css';
import { useEffect, useRef, useState } from 'react';
import type { Map as MapboxMap, Marker } from 'mapbox-gl';
import type { Project } from '@/types';

function statusPinColor(project: Project): string {
  const checks = Object.values(project.checklist);
  const completed = checks.filter(Boolean).length;
  const pct = checks.length > 0 ? completed / checks.length : 0;
  const today = new Date().toISOString().split('T')[0];
  const isOverdue = project.targetDate && project.targetDate < today && pct < 1;

  if (isOverdue) return '#F59E0B';
  if (pct === 1) return '#16A34A';
  if (pct === 0) return '#9CA3AF';
  if (pct >= 0.5) return '#2563EB';
  return '#F59E0B';
}

interface UseMapboxOptions {
  container: React.RefObject<HTMLDivElement | null>;
  center?: [number, number];
  zoom?: number;
  style?: string;
  darkStyle?: string;
  projects?: Project[];
  onProjectClick?: (projectId: string) => void;
  satelliteMode?: boolean;
}

interface UseMapboxReturn {
  map: MapboxMap | null;
  loaded: boolean;
  error: string | null;
}

export function useMapbox({
  container,
  center = [-98.5795, 39.8283],
  zoom = 4,
  style = 'mapbox://styles/mapbox/light-v11',
  darkStyle = 'mapbox://styles/mapbox/dark-v11',
  projects = [],
  onProjectClick,
  satelliteMode = false,
}: UseMapboxOptions): UseMapboxReturn {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  // Keep a stable ref to onProjectClick to avoid re-running the marker effect
  const onProjectClickRef = useRef(onProjectClick);
  useEffect(() => { onProjectClickRef.current = onProjectClick; }, [onProjectClick]);

  // Effect 1: initialize the map instance. Re-runs only when satelliteMode changes.
  useEffect(() => {
    const token = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;
    if (!token) {
      setError('VITE_MAPBOX_TOKEN is not set');
      return;
    }
    if (!container.current) return;

    const initMap = async () => {
      try {
        const mapboxgl = (await import('mapbox-gl')).default;
        mapboxgl.accessToken = token;

        const prefersDark = document.documentElement.dataset.theme === 'dark';
        let mapStyle: string;
        if (satelliteMode) {
          mapStyle = 'mapbox://styles/mapbox/satellite-streets-v12';
        } else {
          mapStyle = prefersDark ? darkStyle : style;
        }
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        const mapInstance = new mapboxgl.Map({
          container: container.current!,
          style: mapStyle,
          center,
          zoom,
          fadeDuration: prefersReducedMotion ? 0 : 300,
          scrollZoom: false, // Prevent scroll capture — user must ctrl+scroll or pinch
        });

        mapRef.current = mapInstance;
        mapInstance.on('load', () => {
          setLoaded(true);
          // Trigger resize after a short delay to fix initial scale
          setTimeout(() => mapInstance.resize(), 100);
        });

        // Container resize observer — fixes map scale when layout changes
        const resizeObserver = new ResizeObserver(() => {
          mapInstance.resize();
        });
        resizeObserver.observe(container.current!);
        mapInstance.once('remove', () => resizeObserver.disconnect());

        // Theme change observer
        const observer = new MutationObserver(() => {
          if (satelliteMode) return;
          const theme = document.documentElement.dataset.theme;
          const newStyle = theme === 'dark' ? darkStyle : style;
          mapInstance.setStyle(newStyle);
        });
        observer.observe(document.documentElement, {
          attributes: true,
          attributeFilter: ['data-theme'],
        });

        mapInstance.once('remove', () => observer.disconnect());
      } catch (err) {
        setError(String(err));
      }
    };

    initMap();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      markersRef.current = [];
      setLoaded(false);
    };
  }, [satelliteMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Effect 2: render markers. Re-runs when the map finishes loading OR when
  // projects data changes (e.g. arrives asynchronously from Supabase).
  useEffect(() => {
    console.log('[TF-DEBUG] useMapbox: projects received', projects.length, 'with coords:', projects.filter(p => p.lat && p.lng).length, projects.map(p => ({ id: p.id, name: p.name, lat: p.lat, lng: p.lng })));
    if (!loaded || !mapRef.current) return;

    const mapInstance = mapRef.current;

    // Clear any existing markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const projectsWithCoords = projects.filter((p) => p.lat && p.lng);
    if (projectsWithCoords.length === 0) return;

    const addMarkers = async () => {
      const mapboxgl = (await import('mapbox-gl')).default;
      const bounds = new mapboxgl.LngLatBounds();
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      projectsWithCoords.forEach((project) => {
        const pinColor = statusPinColor(project);
        const checks = Object.values(project.checklist);
        const completedCount = checks.filter(Boolean).length;
        const pct = checks.length > 0 ? Math.round((completedCount / checks.length) * 100) : 0;

        const el = document.createElement('div');
        el.style.cssText = [
          'width:32px',
          'height:32px',
          'border-radius:50%',
          `background:${pinColor}`,
          'border:3px solid white',
          'box-shadow:0 2px 8px rgba(0,0,0,0.3)',
          'cursor:pointer',
          'transition:width 0.15s ease,height 0.15s ease,margin 0.15s ease',
          'display:flex',
          'align-items:center',
          'justify-content:center',
        ].join(';');

        // Hover: enlarge pin + show popup
        el.addEventListener('mouseenter', () => {
          el.style.width = '38px';
          el.style.height = '38px';
          el.style.marginLeft = '-3px';
          el.style.marginTop = '-3px';
          // Open popup on hover (marker set below)
          (el as any).__tfMarker?.togglePopup();
        });
        el.addEventListener('mouseleave', () => {
          el.style.width = '32px';
          el.style.height = '32px';
          el.style.marginLeft = '0';
          el.style.marginTop = '0';
          // Close popup on leave
          const m = (el as any).__tfMarker;
          if (m?.getPopup()?.isOpen()) m.togglePopup();
        });

        const budgetStr = project.budget
          ? `$${(project.budget / 1000).toFixed(1)}k`
          : 'TBD';

        const popup = new mapboxgl.Popup({ offset: 16, maxWidth: '240px' }).setHTML(
          `<div style="font-family:Inter,sans-serif;padding:6px 2px 2px">
            <div style="font-weight:700;font-size:14px;color:#111827;margin-bottom:2px;line-height:1.2">${project.name}</div>
            <div style="font-size:12px;color:#6B7280;margin-bottom:4px">${project.client}</div>
            ${project.address ? `<div style="font-size:11px;color:#9CA3AF;margin-bottom:8px">${project.address}</div>` : ''}
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
              <span style="font-size:12px;color:#374151;font-weight:600">${budgetStr}</span>
              <span style="font-size:11px;color:#6B7280">${pct}% complete</span>
            </div>
            <div style="height:4px;background:#E5E7EB;border-radius:4px;overflow:hidden;margin-bottom:8px">
              <div style="height:100%;width:${pct}%;background:${pinColor};border-radius:4px"></div>
            </div>
            <a href="/projects" style="font-size:12px;color:#2D6A4F;font-weight:600;text-decoration:none" onclick="event.preventDefault()">View Project →</a>
          </div>`,
        );

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([project.lng!, project.lat!])
          .setPopup(popup)
          .addTo(mapInstance);

        // Store ref on DOM element for hover handler
        (el as any).__tfMarker = marker;

        el.addEventListener('click', () => {
          onProjectClickRef.current?.(project.id);
        });

        bounds.extend([project.lng!, project.lat!]);
        markersRef.current.push(marker);
      });

      if (projectsWithCoords.length === 1) {
        mapInstance.flyTo({
          center: [projectsWithCoords[0].lng!, projectsWithCoords[0].lat!],
          zoom: 12,
          animate: !prefersReducedMotion,
        });
      } else {
        mapInstance.fitBounds(bounds, {
          padding: 48,
          maxZoom: 12,
          animate: !prefersReducedMotion,
        });
      }
    };

    addMarkers();
  }, [projects, loaded]); // re-runs when project data arrives or map finishes loading

  return { map: mapRef.current, loaded, error };
}
