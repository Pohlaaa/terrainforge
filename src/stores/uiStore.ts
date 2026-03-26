import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { DashboardConfig } from '@/types'

interface UIStore {
  sidebarCollapsed: boolean
  currentModal: string | null
  modalData: any
  dashboardConfig: DashboardConfig
  searchQuery: string
  toggleSidebar: () => void
  openModal: (name: string, data?: any) => void
  closeModal: () => void
  updateDashboardConfig: (updates: Partial<DashboardConfig>) => void
  setSearchQuery: (query: string) => void
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
      currentModal: null,
      modalData: null,
      dashboardConfig: defaultDashboardConfig,
      searchQuery: '',
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
    }),
    {
      name: 'tf_ui',
    }
  )
)
