import { useEffect, useRef, useState } from 'react';
import type { Map as MapboxMap, Marker } from 'mapbox-gl';
import type { Project } from '@/types';

interface UseMapboxOptions {
  container: React.RefObject<HTMLDivElement | null>;
  center?: [number, number];
  zoom?: number;
  style?: string;
  darkStyle?: string;
  projects?: Project[];
  onProjectClick?: (projectId: string) => void;
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
}: UseMapboxOptions): UseMapboxReturn {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const markersRef = useRef<Marker[]>([]);

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
        const mapStyle = prefersDark ? darkStyle : style;
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        const mapInstance = new mapboxgl.Map({
          container: container.current!,
          style: mapStyle,
          center,
          zoom,
          fadeDuration: prefersReducedMotion ? 0 : 300,
        });

        mapRef.current = mapInstance;

        mapInstance.on('load', () => {
          setLoaded(true);

          const projectsWithCoords = projects.filter((p) => p.lat && p.lng);
          if (projectsWithCoords.length === 0) return;

          const bounds = new mapboxgl.LngLatBounds();

          projectsWithCoords.forEach((project) => {
            const el = document.createElement('div');
            const primaryColor =
              getComputedStyle(document.documentElement)
                .getPropertyValue('--color-primary')
                .trim() || '#2D6A4F';
            el.style.cssText = [
              'width:32px',
              'height:32px',
              'border-radius:50%',
              `background:${primaryColor}`,
              'border:3px solid white',
              'box-shadow:0 2px 4px rgba(0,0,0,0.2)',
              'cursor:pointer',
              'padding:6px',
              'box-sizing:content-box',
            ].join(';');

            const popup = new mapboxgl.Popup({ offset: 12 }).setHTML(
              `<div style="font-family:Inter,sans-serif;padding:4px 0">
                <div style="font-weight:600;font-size:13px">${project.name}</div>
                <div style="font-size:11px;color:#666;margin-top:2px">${project.client}</div>
              </div>`,
            );

            const marker = new mapboxgl.Marker({ element: el })
              .setLngLat([project.lng!, project.lat!])
              .setPopup(popup)
              .addTo(mapInstance);

            el.addEventListener('click', () => {
              onProjectClick?.(project.id);
            });

            bounds.extend([project.lng!, project.lat!]);
            markersRef.current.push(marker);
          });

          if (projectsWithCoords.length > 1) {
            mapInstance.fitBounds(bounds, {
              padding: 40,
              maxZoom: 12,
              animate: !prefersReducedMotion,
            });
          }
        });

        // Theme change observer
        const observer = new MutationObserver(() => {
          const theme = document.documentElement.dataset.theme;
          const newStyle = theme === 'dark' ? darkStyle : style;
          const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          if (prefersReduced) {
            mapInstance.setStyle(newStyle);
          } else {
            mapInstance.setStyle(newStyle);
          }
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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { map: mapRef.current, loaded, error };
}
