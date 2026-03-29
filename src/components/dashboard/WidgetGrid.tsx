import React, { useRef, useState } from 'react';
import type { AppState, WidgetConfig } from '@/types';
import { WidgetCard } from './WidgetCard';
import { AlertsWidget } from './widgets/AlertsWidget';
import { ProjectsWidget } from './widgets/ProjectsWidget';
import { CrewWidget } from './widgets/CrewWidget';
import { FleetWidget } from './widgets/FleetWidget';
import { MapWidget } from './widgets/MapWidget';
import { getAllAlerts } from '@/lib/alerts';

interface WidgetGridProps {
  widgets: WidgetConfig[];
  editMode: boolean;
  appState: AppState;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onToggleCollapsed: (widgetId: string) => void;
  onToggleVisibility: (widgetId: string) => void;
}

interface DragState {
  dragging: boolean;
  dragIndex: number;
  startY: number;
  currentY: number;
  itemHeight: number;
}

function renderWidgetContent(widget: WidgetConfig, appState: AppState) {
  switch (widget.type) {
    case 'alerts':
      return <AlertsWidget appState={appState} />;
    case 'projects':
      return <ProjectsWidget appState={appState} />;
    case 'crew':
      return <CrewWidget appState={appState} />;
    case 'fleet':
      return <FleetWidget appState={appState} />;
    case 'map':
      return <MapWidget projects={appState.projects} />;
    default:
      return null;
  }
}

function getWidgetHeaderTitle(widget: WidgetConfig, appState: AppState): string {
  if (widget.type === 'alerts') {
    const alerts = getAllAlerts(appState);
    return `${widget.title} (${alerts.length})`;
  }
  if (widget.type === 'crew') {
    const todayISO = new Date().toISOString().split('T')[0];
    const dayKey = (['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const)[
      new Date().getDay()
    ];
    const available = appState.crew.filter(
      (m) => m.availability[dayKey] && !(m.bookedDates ?? []).includes(todayISO),
    );
    return `${widget.title} — ${available.length}/${appState.crew.length} today`;
  }
  return widget.title;
}

export const WidgetGrid: React.FC<WidgetGridProps> = ({
  widgets,
  editMode,
  appState,
  onReorder,
  onToggleCollapsed,
  onToggleVisibility,
}) => {
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const [dragState, setDragState] = useState<DragState | null>(null);
  const widgetRefs = useRef<(HTMLDivElement | null)[]>([]);

  const visibleWidgets = [...widgets]
    .filter((w) => w.visible)
    .sort((a, b) => a.order - b.order);

  const handlePointerDown = (e: React.PointerEvent, index: number) => {
    if (!editMode) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const rect = widgetRefs.current[index]?.getBoundingClientRect();
    setDragState({
      dragging: true,
      dragIndex: index,
      startY: e.clientY,
      currentY: e.clientY,
      itemHeight: rect?.height ?? 80,
    });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragState?.dragging) return;
    setDragState((prev) => (prev ? { ...prev, currentY: e.clientY } : null));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!dragState) return;
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    const delta = dragState.currentY - dragState.startY;
    const indexOffset = Math.round(delta / dragState.itemHeight);
    const toIndex = Math.max(
      0,
      Math.min(visibleWidgets.length - 1, dragState.dragIndex + indexOffset),
    );
    if (toIndex !== dragState.dragIndex) {
      onReorder(dragState.dragIndex, toIndex);
    }
    setDragState(null);
  };

  return (
    <div className="flex flex-col gap-[12px]">
      {visibleWidgets.map((widget, index) => {
        const isDragging = Boolean(dragState?.dragging && dragState.dragIndex === index);
        const delta = dragState ? dragState.currentY - dragState.startY : 0;

        let transformStyle: React.CSSProperties = {};
        if (isDragging && !prefersReducedMotion) {
          transformStyle = {
            transform: `translateY(${delta}px) scale(1.02)`,
            zIndex: 100,
            position: 'relative',
          };
        }

        // Show drop placeholder
        const isDraggingOther =
          dragState?.dragging && dragState.dragIndex !== index;
        const draggedIndex = dragState?.dragIndex ?? -1;
        const targetIndex =
          dragState && dragState.itemHeight > 0
            ? Math.max(
                0,
                Math.min(
                  visibleWidgets.length - 1,
                  draggedIndex + Math.round(delta / dragState.itemHeight),
                ),
              )
            : -1;
        const showPlaceholder =
          isDraggingOther && targetIndex === index && !prefersReducedMotion;

        const displayTitle = getWidgetHeaderTitle(widget, appState);
        const titleOverride = { ...widget, title: displayTitle };

        return (
          <div key={widget.id}>
            {showPlaceholder && (
              <div
                className="animate-placeholder-pulse"
                style={{
                  height: `${dragState?.itemHeight ?? 80}px`,
                  background: 'var(--surface-hover)',
                  border: '2px dashed var(--border-default)',
                  borderRadius: '10px',
                  marginBottom: '12px',
                }}
              />
            )}
            <div
              ref={(el) => {
                widgetRefs.current[index] = el;
              }}
              style={{
                transition:
                  isDraggingOther && !prefersReducedMotion
                    ? 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)'
                    : undefined,
                ...transformStyle,
              }}
            >
              <WidgetCard
                config={titleOverride}
                editMode={editMode}
                onToggleCollapse={() => onToggleCollapsed(widget.id)}
                onToggleVisibility={() => onToggleVisibility(widget.id)}
                dragHandleProps={{
                  onPointerDown: (e: React.PointerEvent) => handlePointerDown(e, index),
                  onPointerMove: handlePointerMove,
                  onPointerUp: handlePointerUp,
                  style: {
                    '@media (pointer: coarse)': { minWidth: '48px' },
                  },
                }}
                isDragging={isDragging}
                style={transformStyle}
              >
                {renderWidgetContent(widget, appState)}
              </WidgetCard>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default WidgetGrid;
