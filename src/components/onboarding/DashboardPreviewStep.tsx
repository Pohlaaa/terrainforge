import React, { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { callClaude } from '@/services/anthropic'

const DEFAULT_KPIS = ['Project Tracking', 'Budget & Estimates', 'Crew Management', 'Material Inventory']

const KPI_MAP: Record<string, { label: string; icon: string }> = {
  'Project Tracking':   { label: 'Active Projects',     icon: '\uD83D\uDCCB' },
  'Budget & Estimates': { label: 'Pipeline Value',      icon: '\uD83D\uDCB0' },
  'Crew Management':    { label: 'Crew Available',      icon: '\uD83D\uDC77' },
  'Material Inventory': { label: 'Low Stock Alerts',    icon: '\uD83E\uDDF1' },
  'Equipment Tracking': { label: 'Fleet Status',        icon: '\uD83D\uDE9C' },
  'Client Comms':       { label: 'Pending Responses',   icon: '\uD83D\uDCAC' },
  'Invoicing':          { label: 'Outstanding Invoices', icon: '\uD83E\uDDFE' },
  'Weather Planning':   { label: 'Weather Alerts',      icon: '\uD83C\uDF24\uFE0F' },
}

const AI_CHIPS = ['Jobs overdue this week', 'Profit margin by project', 'Crew utilization rate']

interface AiSuggestion { name: string; description: string; mockValue: string }

interface DashboardPreviewStepProps {
  priorities: string[]
  customKpis: Array<{ name: string; description: string }>
  onAddCustomKpi: (kpi: { name: string; description: string }) => void
  onBack: () => void
  onFinish: () => void
  isSaving: boolean
}

export const DashboardPreviewStep: React.FC<DashboardPreviewStepProps> = ({
  priorities, customKpis, onAddCustomKpi, onBack, onFinish, isSaving,
}) => {
  const [aiKpiInput, setAiKpiInput] = useState('')
  const [aiSuggestion, setAiSuggestion] = useState<AiSuggestion | null>(null)
  const [isAiLoading, setIsAiLoading] = useState(false)

  const derivedKpis = priorities.length >= 4 ? priorities.slice(0, 4) : [
    ...priorities,
    ...DEFAULT_KPIS.filter(k => !priorities.includes(k)),
  ].slice(0, 4)

  const handleAskAi = async (input?: string) => {
    const query = input ?? aiKpiInput
    if (!query.trim()) return
    setIsAiLoading(true)
    setAiSuggestion(null)
    try {
      const response = await callClaude(`
You are configuring a dashboard for a landscaping contractor's project management tool.
The user wants to track this metric: "${query}"

Return JSON with:
{
  "name": string (short KPI name, max 25 chars),
  "description": string (one sentence explaining what this tracks),
  "mockValue": string (a realistic example value, e.g. "3", "$12,450", "87%", "2 overdue")
}

Return only valid JSON, no markdown.`, 'claude-haiku-4-5-20251001')
      const cleaned = response.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
      setAiSuggestion(JSON.parse(cleaned) as AiSuggestion)
    } catch {
      // AI features are optional
    } finally {
      setIsAiLoading(false)
    }
  }

  return (
    <div>
      <h1 className="text-[24px] font-[700] text-[var(--text-primary)] tracking-[-0.01em]">
        Here's your personalised dashboard
      </h1>
      <p className="text-[14px] text-[var(--text-secondary)] mt-2 mb-6">
        Based on your selections, we've configured these KPIs
      </p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {derivedKpis.map(kpiId => {
          const kpi = KPI_MAP[kpiId] ?? { label: kpiId, icon: '\uD83D\uDCCA' }
          return (
            <div key={kpiId} className="p-4 rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] shadow-[var(--shadow-sm)]">
              <div className="text-[20px] mb-2">{kpi.icon}</div>
              <div className="text-[12px] uppercase tracking-[0.05em] font-[600] text-[var(--text-tertiary)] mb-1">{kpi.label}</div>
              <div className="text-[28px] font-[700] text-[var(--text-primary)]">&mdash;</div>
            </div>
          )
        })}
      </div>

      {/* AI KPI input */}
      <div className="mt-8 p-5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)]">
        <div className="text-[14px] font-[600] text-[var(--text-primary)] mb-3">Want to track something specific?</div>
        <div className="flex gap-2">
          <input
            type="text"
            className="flex-1 h-[44px] px-3 rounded-lg border border-[var(--border-default)] bg-[var(--surface-bg)] text-[var(--text-primary)] text-[14px] outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
            placeholder="Describe a metric \u2014 e.g., 'average project profit margin'"
            value={aiKpiInput}
            onChange={e => setAiKpiInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAskAi()}
          />
          <Button variant="primary" className="h-[44px] px-6" disabled={isAiLoading} onClick={() => handleAskAi()}>
            {isAiLoading ? '...' : 'Ask AI'}
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          {AI_CHIPS.map(chip => (
            <button
              key={chip}
              onClick={() => { setAiKpiInput(chip); handleAskAi(chip) }}
              className="text-[12px] px-3 py-1.5 rounded-full cursor-pointer bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:bg-[var(--brand-primary-bg)] hover:text-[var(--brand-primary)] transition-colors"
            >
              {chip}
            </button>
          ))}
        </div>
        {aiSuggestion && (
          <div className="mt-4 p-4 rounded-xl border-2 border-[var(--brand-primary)] bg-[var(--brand-primary-bg)]">
            <div className="flex justify-between items-center">
              <span className="text-[14px] font-[600] text-[var(--text-primary)]">{aiSuggestion.name}</span>
              <span className="text-[14px] font-[700] text-[var(--brand-primary)]">{aiSuggestion.mockValue}</span>
            </div>
            <p className="text-[13px] text-[var(--text-secondary)] mt-1">{aiSuggestion.description}</p>
            <div className="flex gap-2 mt-3">
              <Button variant="primary" size="sm" onClick={() => { onAddCustomKpi({ name: aiSuggestion.name, description: aiSuggestion.description }); setAiSuggestion(null) }}>
                Add to Dashboard
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setAiSuggestion(null)}>Dismiss</Button>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-3 mt-6">
        <Button variant="ghost" onClick={onBack} className="h-[44px]">Back</Button>
        <Button variant="primary" className="h-[44px] flex-1" disabled={isSaving} onClick={onFinish}>
          {isSaving ? 'Setting up...' : 'Get Started'}
        </Button>
      </div>
    </div>
  )
}
