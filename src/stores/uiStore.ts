import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { DashboardConfig, WidgetConfig } from '@/types'
import { DEFAULT_SELECTED_KPIS, DEFAULT_WIDGET_LAYOUT } from '@/lib/kpiCompute'

interface UIStore {
  sidebarCollapsed: boolean
  theme: 'dark' | 'light'
  currentModal: string | null
  modalData: unknown
  dashboardConfig: DashboardConfig
  searchQuery: string
  setTheme: (theme: 'dark' | 'light') => void
  toggleSidebar: () => void
  openModal: (name: string, data?: unknown) => void
  closeModal: () => void
  updateDashboardConfig: (updates: Partial<DashboardConfig>) => void
  setSearchQuery: (query: string) => void

  // KPI Customization Drawer (S10-1)
  kpiDrawerOpen: boolean
  selectedKpis: string[]
  toggleKpiDrawer: () => void
  openKpiDrawer: () => void
  closeKpiDrawer: () => void
  setSelectedKpis: (ids: string[]) => void

  // Widget Dashboard (S10-2)
  editMode: boolean
  widgetLayout: WidgetConfig[]
  toggleEditMode: () => void
  reorderWidgets: (fromIndex: number, toIndex: number) => void
  toggleWidgetVisibility: (widgetId: string) => void
  toggleWidgetCollapsed: (widgetId: string) => void
  toggleWidgetSize: (widgetId: string) => void
  resetWidgetLayout: () => void
  setWidgetLayout: (layout: WidgetConfig[]) => void
}

const defaultDashboardConfig: DashboardConfig = {
  showKpis: true,
  showMap: false,
  showAlerts: true,
  showCrewUtilization: true,
  showEquipStatus: true,
  showRecentActivity: true,
}

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      theme: (localStorage.getItem('tf-theme') as 'dark' | 'light') || 'dark',
      currentModal: null,
      modalData: null,
      dashboardConfig: defaultDashboardConfig,
      searchQuery: '',
      setTheme: (theme) => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('tf-theme', theme);
        set({ theme });
      },
      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      openModal: (name, data) =>
        set({ currentModal: name, modalData: data || null }),
      closeModal: () =>
        set({ currentModal: null, modalData: null }),
      updateDashboardConfig: (updates) =>
        set((state) => ({
          dashboardConfig: { ...state.dashboardConfig, ...updates },
        })),
      setSearchQuery: (query) => set({ searchQuery: query }),

      // KPI Customization
      kpiDrawerOpen: false,
      selectedKpis: DEFAULT_SELECTED_KPIS,
      toggleKpiDrawer: () => set((state) => ({ kpiDrawerOpen: !state.kpiDrawerOpen })),
      openKpiDrawer: () => set({ kpiDrawerOpen: true }),
      closeKpiDrawer: () => set({ kpiDrawerOpen: false }),
      setSelectedKpis: (ids) => set({ selectedKpis: ids }),

      // Widget Dashboard
      editMode: false,
      widgetLayout: DEFAULT_WIDGET_LAYOUT,
      toggleEditMode: () => set((state) => ({ editMode: !state.editMode })),
      reorderWidgets: (fromIndex, toIndex) =>
        set((state) => {
          const sorted = [...state.widgetLayout].sort((a, b) => a.order - b.order)
          const [moved] = sorted.splice(fromIndex, 1)
          sorted.splice(toIndex, 0, moved)
          const reordered = sorted.map((w, i) => ({ ...w, order: i }))
          return { widgetLayout: reordered }
        }),
      toggleWidgetVisibility: (widgetId) =>
        set((state) => ({
          widgetLayout: state.widgetLayout.map((w) =>
            w.id === widgetId ? { ...w, visible: !w.visible } : w,
          ),
        })),
      toggleWidgetCollapsed: (widgetId) =>
        set((state) => ({
          widgetLayout: state.widgetLayout.map((w) =>
            w.id === widgetId ? { ...w, collapsed: !w.collapsed } : w,
          ),
        })),
      toggleWidgetSize: (widgetId) =>
        set((state) => ({
          widgetLayout: state.widgetLayout.map((w) =>
            w.id === widgetId ? { ...w, size: w.size === 'full' ? 'half' : 'full' } : w,
          ),
        })),
      resetWidgetLayout: () => set({ widgetLayout: DEFAULT_WIDGET_LAYOUT }),
      setWidgetLayout: (layout) => set({ widgetLayout: layout }),
    }),
    {
      name: 'tf_ui',
      merge: (persistedState: unknown, currentState: UIStore) => {
        const persisted = (persistedState ?? {}) as Partial<UIStore>;
        const merged = { ...currentState, ...persisted };
        // Ensure new widgets added in future sprints are appended to cached layouts
        if (merged.widgetLayout && Array.isArray(merged.widgetLayout)) {
          const existingTypes = new Set(merged.widgetLayout.map((w: WidgetConfig) => w.type));
          const missing = DEFAULT_WIDGET_LAYOUT.filter(w => !existingTypes.has(w.type));
          if (missing.length > 0) {
            const maxOrder = Math.max(...merged.widgetLayout.map((w: WidgetConfig) => w.order), -1);
            merged.widgetLayout = [
              ...merged.widgetLayout,
              ...missing.map((w, i) => ({ ...w, order: maxOrder + 1 + i })),
            ];
          }
        }
        return merged;
      },
    },
  ),
)
