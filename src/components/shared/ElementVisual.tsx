/**
 * ElementVisual — renders a scaled SVG with unique textures per element type.
 * Each element type has a distinct visual pattern so contractors can identify
 * patio vs sod vs walkway at a glance.
 */
import React from 'react';
import type { ProjectElement } from '@/types';

interface Props {
  element: ProjectElement;
  size?: number; // default 100
}

const COLORS: Record<string, string> = {
  patio: '#5c8fd4', walkway: '#5c8fd4', driveway: '#7c8a99', parking_lot: '#7c8a99',
  pool_deck: '#4ecdc4', fire_pit: '#e05c5c', wall: '#d4a44c', retaining_wall: '#d4a44c',
  garden_bed: '#2d6a4f', sod_area: '#4ade80', tree_planting: '#166534', shrub_planting: '#22c55e',
  mulch_area: '#92400e', gravel_area: '#a8a29e', edging: '#8e6bb0', curbing: '#8e6bb0',
  fence: '#d4a44c', pergola: '#d4a44c', outdoor_kitchen: '#e05c5c', drainage: '#4ecdc4',
  steps_stairs: '#7c8a99', concrete_slab: '#9ca3af', irrigation_zone: '#4ecdc4', other: '#6b7280',
};

/** SVG pattern definitions for each element type */
function renderPattern(type: string, color: string, id: string) {
  switch (type) {
    // Pavers — grid of rectangular bricks
    case 'patio': case 'walkway': case 'pool_deck':
      return (
        <pattern id={id} width="12" height="12" patternUnits="userSpaceOnUse">
          <rect width="12" height="12" fill={color} opacity="0.12" />
          <rect x="0.5" y="0.5" width="5" height="11" rx="0.5" fill={color} opacity="0.25" />
          <rect x="6.5" y="0.5" width="5" height="5" rx="0.5" fill={color} opacity="0.2" />
          <rect x="6.5" y="6.5" width="5" height="5" rx="0.5" fill={color} opacity="0.3" />
        </pattern>
      );
    // Sod — horizontal grass lines
    case 'sod_area':
      return (
        <pattern id={id} width="16" height="8" patternUnits="userSpaceOnUse">
          <rect width="16" height="8" fill={color} opacity="0.12" />
          <path d="M0 6 Q4 2 8 6 Q12 10 16 6" stroke={color} strokeWidth="1" fill="none" opacity="0.35" />
          <path d="M2 3 Q5 0 8 3" stroke={color} strokeWidth="0.6" fill="none" opacity="0.2" />
        </pattern>
      );
    // Gravel/concrete — stipple dots
    case 'driveway': case 'parking_lot': case 'concrete_slab': case 'gravel_area':
      return (
        <pattern id={id} width="10" height="10" patternUnits="userSpaceOnUse">
          <rect width="10" height="10" fill={color} opacity="0.1" />
          <circle cx="2" cy="2" r="0.8" fill={color} opacity="0.3" />
          <circle cx="7" cy="4" r="0.6" fill={color} opacity="0.25" />
          <circle cx="4" cy="8" r="0.7" fill={color} opacity="0.2" />
          <circle cx="9" cy="9" r="0.5" fill={color} opacity="0.3" />
        </pattern>
      );
    // Garden bed — leaf/plant shapes
    case 'garden_bed': case 'shrub_planting':
      return (
        <pattern id={id} width="14" height="14" patternUnits="userSpaceOnUse">
          <rect width="14" height="14" fill={color} opacity="0.1" />
          <path d="M7 2 Q9 5 7 7 Q5 5 7 2Z" fill={color} opacity="0.3" />
          <path d="M2 9 Q4 7 5 10 Q3 11 2 9Z" fill={color} opacity="0.2" />
          <path d="M10 10 Q12 8 13 11 Q11 12 10 10Z" fill={color} opacity="0.25" />
        </pattern>
      );
    // Mulch — scattered chips
    case 'mulch_area':
      return (
        <pattern id={id} width="12" height="12" patternUnits="userSpaceOnUse">
          <rect width="12" height="12" fill={color} opacity="0.12" />
          <ellipse cx="3" cy="3" rx="2" ry="1" fill={color} opacity="0.3" transform="rotate(20 3 3)" />
          <ellipse cx="9" cy="5" rx="1.5" ry="0.8" fill={color} opacity="0.25" transform="rotate(-15 9 5)" />
          <ellipse cx="5" cy="10" rx="2" ry="0.8" fill={color} opacity="0.2" transform="rotate(40 5 10)" />
        </pattern>
      );
    // Wall/fence — horizontal brick courses
    case 'wall': case 'retaining_wall': case 'fence': case 'steps_stairs':
      return (
        <pattern id={id} width="16" height="8" patternUnits="userSpaceOnUse">
          <rect width="16" height="8" fill={color} opacity="0.12" />
          <rect x="0.5" y="0.5" width="7" height="3" rx="0.3" fill={color} opacity="0.25" />
          <rect x="8.5" y="0.5" width="7" height="3" rx="0.3" fill={color} opacity="0.2" />
          <rect x="4" y="4.5" width="7" height="3" rx="0.3" fill={color} opacity="0.22" />
        </pattern>
      );
    // Water/drainage — wave lines
    case 'drainage': case 'irrigation_zone':
      return (
        <pattern id={id} width="16" height="8" patternUnits="userSpaceOnUse">
          <rect width="16" height="8" fill={color} opacity="0.1" />
          <path d="M0 4 Q4 1 8 4 Q12 7 16 4" stroke={color} strokeWidth="1" fill="none" opacity="0.3" />
        </pattern>
      );
    // Fire pit — radial glow
    case 'fire_pit': case 'outdoor_kitchen':
      return (
        <pattern id={id} width="1" height="1" patternUnits="objectBoundingBox">
          <rect width="1" height="1" fill={color} opacity="0.15" />
        </pattern>
      );
    // Default — solid fill
    default:
      return (
        <pattern id={id} width="1" height="1" patternUnits="objectBoundingBox">
          <rect width="1" height="1" fill={color} opacity="0.15" />
        </pattern>
      );
  }
}

export const ElementVisual: React.FC<Props> = ({ element, size = 100 }) => {
  const color = COLORS[element.elementType] || '#6b7280';
  const l = element.lengthFt ?? 0;
  const w = element.widthFt ?? 0;
  const lin = element.linearFt ?? 0;
  const h = element.heightFt ?? 0;
  const area = element.computedAreaSqft || (l && w ? l * w : element.areaSqft ?? 0);
  const patId = `pat-${element.elementType}-${element.id?.slice(0, 6) || 'x'}`;

  // No dimensions — placeholder with icon
  if (!l && !w && !lin && !area) {
    return (
      <svg width={size} height={size} viewBox="0 0 100 100">
        <defs>{renderPattern(element.elementType, color, patId)}</defs>
        <circle cx="50" cy="50" r="38" fill={`url(#${patId})`} stroke={color} strokeWidth="1.5" strokeDasharray="5 3" />
        <text x="50" y="54" textAnchor="middle" fill={color} fontSize="12" fontWeight="600">?</text>
      </svg>
    );
  }

  // Linear elements
  if (lin > 0 && !w && !l) {
    const barH = h > 0 ? Math.max(20, Math.min(50, (h / Math.max(lin, 1)) * 100)) : 16;
    return (
      <svg width={size} height={size * 0.5} viewBox={`0 0 100 ${barH + 20}`}>
        <defs>{renderPattern(element.elementType, color, patId)}</defs>
        <rect x="4" y="6" width="92" height={barH} rx="3" fill={`url(#${patId})`} stroke={color} strokeWidth="1.5" />
        <text x="50" y={barH / 2 + 10} textAnchor="middle" fill={color} fontSize="11" fontWeight="700">{lin} LF{h > 0 ? ` × ${h}'h` : ''}</text>
      </svg>
    );
  }

  // Circular elements
  const isCircular = element.elementType === 'fire_pit' || element.elementType === 'tree_planting';
  if (isCircular) {
    const r = Math.min(size * 0.4, 40);
    return (
      <svg width={size} height={size} viewBox="0 0 100 100">
        <defs>{renderPattern(element.elementType, color, patId)}</defs>
        <circle cx="50" cy="46" r={r} fill={`url(#${patId})`} stroke={color} strokeWidth="1.5" />
        {element.elementType === 'fire_pit' && (
          <>
            <circle cx="50" cy="46" r={r * 0.55} fill="none" stroke={color} strokeWidth="0.75" opacity="0.4" />
            <text x="50" y="44" textAnchor="middle" fill={color} fontSize="14" opacity="0.6">🔥</text>
          </>
        )}
        {element.elementType === 'tree_planting' && (
          <text x="50" y="50" textAnchor="middle" fill={color} fontSize="16" opacity="0.5">🌳</text>
        )}
        {area > 0 && <text x="50" y="80" textAnchor="middle" fill={color} fontSize="10" fontWeight="600">{Math.round(area)} sqft</text>}
      </svg>
    );
  }

  // Area elements — scaled rectangle with texture
  const maxDim = Math.max(l || Math.sqrt(area), w || Math.sqrt(area), 1);
  const renderL = l > 0 ? l : Math.sqrt(area);
  const renderW = w > 0 ? w : Math.sqrt(area);
  const pad = 18;
  const scale = (size - pad * 2) / maxDim;
  const rw = Math.max(16, renderL * scale);
  const rh = Math.max(16, renderW * scale);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <defs>{renderPattern(element.elementType, color, patId)}</defs>
      <rect x={pad} y={pad} width={rw} height={rh} rx="4" fill={`url(#${patId})`} stroke={color} strokeWidth="1.5" />
      {/* Dimension lines */}
      {l > 0 && (
        <>
          <line x1={pad} y1={pad - 5} x2={pad + rw} y2={pad - 5} stroke={color} strokeWidth="0.75" opacity="0.5" markerEnd="url(#arr)" markerStart="url(#arr)" />
          <text x={pad + rw / 2} y={pad - 8} textAnchor="middle" fill={color} fontSize="10" fontWeight="700">{l}'</text>
        </>
      )}
      {w > 0 && (
        <>
          <line x1={pad + rw + 5} y1={pad} x2={pad + rw + 5} y2={pad + rh} stroke={color} strokeWidth="0.75" opacity="0.5" />
          <text x={pad + rw + 9} y={pad + rh / 2 + 4} fill={color} fontSize="10" fontWeight="700">{w}'</text>
        </>
      )}
      {/* Area label */}
      {area > 0 && (
        <text x={pad + rw / 2} y={pad + rh / 2 + 4} textAnchor="middle" fill={color} fontSize="11" fontWeight="700">{Math.round(area)} sqft</text>
      )}
    </svg>
  );
};
