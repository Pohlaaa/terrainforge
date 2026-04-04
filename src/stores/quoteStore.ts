import { create } from 'zustand'
import type { QuoteRequest, QuoteRequestItem, QuoteRequestStatus, ManifestItem } from '@/types'
import { useOrgStore } from './orgStore'
import * as db from '@/services/supabaseData'

interface QuoteStore {
  quoteRequests: QuoteRequest[]
  activeQuoteItems: QuoteRequestItem[]  // items for the currently-viewed quote
  isLoading: boolean
  error: string | null

  // Actions
  fetchQuoteRequests: (projectId?: string) => Promise<void>
  createQuoteRequest: (
    projectId: string,
    supplierId: string,
    manifestItems: ManifestItem[]
  ) => Promise<QuoteRequest | null>
  updateStatus: (quoteRequestId: string, status: QuoteRequestStatus, updates?: Partial<QuoteRequest>) => Promise<boolean>
  fetchQuoteItems: (quoteRequestId: string) => Promise<void>
  updateQuoteItem: (itemId: string, updates: Partial<QuoteRequestItem>) => Promise<void>

  // Selectors
  getQuotesForProject: (projectId: string) => QuoteRequest[]
  getQuotesByStatus: (status: QuoteRequestStatus) => QuoteRequest[]

  reset: () => void
}

export const useQuoteStore = create<QuoteStore>()(
  (set, get) => ({
    quoteRequests: [],
    activeQuoteItems: [],
    isLoading: false,
    error: null,

    reset: () => set({ quoteRequests: [], activeQuoteItems: [], isLoading: false, error: null }),

    // ── Quote Request CRUD ──────────────────────────────────────────────

    fetchQuoteRequests: async (projectId?) => {
      const orgId = useOrgStore.getState().org?.id
      if (!orgId) return
      set({ isLoading: true, error: null })
      try {
        const requests = await db.fetchQuoteRequests(orgId, projectId)
        set({ quoteRequests: requests, isLoading: false })
      } catch (err: unknown) {
        set({ isLoading: false, error: err instanceof Error ? err.message : 'Failed to load quotes' })
      }
    },

    createQuoteRequest: async (projectId, supplierId, manifestItems) => {
      const orgId = useOrgStore.getState().org?.id
      if (!orgId) return null

      try {
        // Convert manifest items to quote request items
        const items: Partial<QuoteRequestItem>[] = manifestItems.map((mi) => ({
          materialId: mi.materialId,
          materialName: mi.materialName,
          quantity: mi.totalOrder,
          unit: mi.unit,
          estimatedCost: mi.unitCost,
          notes: '',
        }))

        const result = await db.createQuoteRequest(
          orgId,
          { projectId, supplierId, status: 'draft' },
          items
        )

        if (!result) {
          set({ error: 'Failed to create quote request.' })
          return null
        }

        // Refresh the list
        await get().fetchQuoteRequests(projectId)
        return result
      } catch (err: unknown) {
        set({ error: err instanceof Error ? err.message : 'Failed to create quote request' })
        return null
      }
    },

    updateStatus: async (quoteRequestId, status, updates?) => {
      try {
        const success = await db.updateQuoteRequestStatus(quoteRequestId, status, updates)
        if (!success) {
          set({ error: 'Failed to update quote status.' })
          return false
        }
        // Optimistic update
        set((state) => ({
          quoteRequests: state.quoteRequests.map((qr) =>
            qr.id === quoteRequestId
              ? {
                  ...qr,
                  status,
                  ...(status === 'sent' ? { sentAt: new Date().toISOString() } : {}),
                  ...(status === 'received' ? { respondedAt: new Date().toISOString() } : {}),
                  ...updates,
                }
              : qr
          ),
        }))
        return true
      } catch (err: unknown) {
        set({ error: err instanceof Error ? err.message : 'Failed to update quote status' })
        return false
      }
    },

    // ── Quote Items ────────────────────────────────────────────────────

    fetchQuoteItems: async (quoteRequestId) => {
      try {
        const items = await db.fetchQuoteRequestItems(quoteRequestId)
        set({ activeQuoteItems: items })
      } catch (err: unknown) {
        set({ error: err instanceof Error ? err.message : 'Failed to load quote items' })
      }
    },

    updateQuoteItem: async (itemId, updates) => {
      try {
        const success = await db.updateQuoteRequestItem(itemId, updates)
        if (!success) {
          set({ error: 'Failed to update quote item.' })
          return
        }
        set((state) => ({
          activeQuoteItems: state.activeQuoteItems.map((item) =>
            item.id === itemId ? { ...item, ...updates } : item
          ),
        }))
      } catch (err: unknown) {
        set({ error: err instanceof Error ? err.message : 'Failed to update quote item' })
      }
    },

    // ── Selectors ─────────────────────────────────────────────────────

    getQuotesForProject: (projectId) =>
      get().quoteRequests.filter((qr) => qr.projectId === projectId),

    getQuotesByStatus: (status) =>
      get().quoteRequests.filter((qr) => qr.status === status),
  })
)
