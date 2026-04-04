import React, { useState } from 'react'
import { useOrgStore } from '@/stores/orgStore'
import { Button } from '@/components/ui/Button'
import { SectionHeading } from './SectionHeading'
import { toast } from '@/hooks/useToast'
import { createPortalSession } from '@/services/stripe'

export const BillingSection: React.FC = () => {
  const { org } = useOrgStore()
  const [portalLoading, setPortalLoading] = useState(false)

  async function handleManageBilling() {
    if (!org?.id) return
    setPortalLoading(true)
    try {
      await createPortalSession(org.id)
    } catch {
      toast.error('Stripe billing portal is not configured yet. This will be available once billing is set up.')
      setPortalLoading(false)
    }
  }

  return (
    <div>
      <SectionHeading title="Billing" subtitle="Manage your subscription and payment details" />
      <div className="p-5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] shadow-[var(--shadow-sm)]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-[14px] font-[500] text-[var(--text-primary)]">Current Plan</div>
            <div className="text-[13px] text-[var(--text-secondary)] mt-0.5 capitalize">
              {org?.subscriptionTier ?? 'starter'} &middot; {org?.subscriptionStatus ?? 'trialing'}
            </div>
          </div>
          <span className="text-[24px]">&#128179;</span>
        </div>
        <Button variant="primary" loading={portalLoading} onClick={handleManageBilling}>
          Manage Billing
        </Button>
      </div>
    </div>
  )
}
