import React, { useState, useEffect } from 'react'
import * as db from '@/services/supabaseData'
import { useOrgStore } from '@/stores/orgStore'
import type { PriceHistoryEntry } from '@/types'

interface Props {
  materialId: string
  supplierId?: string
}

export const PriceHistoryChart: React.FC<Props> = ({ materialId, supplierId }) => {
  const [history, setHistory] = useState<PriceHistoryEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const orgId = useOrgStore((s) => s.org?.id)

  useEffect(() => {
    if (!orgId || !materialId) return

    setIsLoading(true)
    db.fetchPriceHistory(orgId, materialId, supplierId, 50).then((data) => {
      setHistory(data)
      setIsLoading(false)
    })
  }, [orgId, materialId, supplierId])

  // Return null if no history
  if (!isLoading && history.length === 0) {
    return null
  }

  if (isLoading) {
    return (
      <div className="text-[12px] text-[var(--text-tertiary)] py-2">
        Loading price history...
      </div>
    )
  }

  // Calculate trend: oldest → newest price
  const sortedByDate = [...history].sort(
    (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()
  )

  const oldestPrice = sortedByDate[0]?.unitCost ?? 0
  const newestPrice = sortedByDate[sortedByDate.length - 1]?.unitCost ?? oldestPrice

  const priceDiff = newestPrice - oldestPrice
  const pctChange = oldestPrice === 0 ? 0 : ((priceDiff / oldestPrice) * 100)

  // Color based on direction
  let trendColor = 'var(--text-4)'
  let trendLabel = '→'
  if (pctChange < -0.5) {
    trendColor = 'var(--green-l)' // Price went down (good)
    trendLabel = '↓'
  } else if (pctChange > 0.5) {
    trendColor = 'var(--red-l)' // Price went up (bad)
    trendLabel = '↑'
  }

  return (
    <div className="text-[12px] text-[var(--text-tertiary)] py-2 px-0 border-t border-[var(--border-default)] mt-2">
      <div className="flex items-baseline gap-1.5">
        <span>Price trend:</span>
        <span className="font-[600] text-[var(--text-primary)] tabular-nums">
          ${oldestPrice.toFixed(2)}
        </span>
        <span style={{ color: trendColor }} className="font-[600]">
          {trendLabel}
        </span>
        <span className="font-[600] text-[var(--text-primary)] tabular-nums">
          ${newestPrice.toFixed(2)}
        </span>
        <span style={{ color: trendColor }} className="font-[600]">
          {pctChange >= 0 ? '+' : ''}{pctChange.toFixed(1)}%
        </span>
        <span className="text-[var(--text-4)]">
          ({history.length} quote{history.length !== 1 ? 's' : ''})
        </span>
      </div>
    </div>
  )
}
