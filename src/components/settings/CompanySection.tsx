import React, { useState, useEffect } from 'react'
import { useOrgStore } from '@/stores/orgStore'
import { Button } from '@/components/ui/Button'
import { SectionHeading } from './SectionHeading'
import { toast } from '@/hooks/useToast'

interface CompanySectionProps {
  readOnly?: boolean
}

export const CompanySection: React.FC<CompanySectionProps> = ({ readOnly }) => {
  const { org, updateOrgName } = useOrgStore()
  const [orgName, setOrgName] = useState(org?.name ?? '')
  const [orgSaving, setOrgSaving] = useState(false)
  const [orgStatus, setOrgStatus] = useState<'idle' | 'saved' | 'error'>('idle')

  // Additional org fields — stored in org store via updateOrg
  const [businessType, setBusinessType] = useState('')
  const [teamSize, setTeamSize] = useState('')
  const [serviceArea, setServiceArea] = useState('')
  const [licenseNumber, setLicenseNumber] = useState('')
  const [detailsSaving, setDetailsSaving] = useState(false)

  useEffect(() => {
    if (org?.name) setOrgName(org.name)
  }, [org?.name])

  async function handleSaveOrgName() {
    if (orgSaving || readOnly) return
    setOrgSaving(true)
    setOrgStatus('idle')
    try {
      await updateOrgName(orgName.trim())
      setOrgStatus('saved')
      toast.success('Company name saved')
      setTimeout(() => setOrgStatus('idle'), 2500)
    } catch {
      setOrgStatus('error')
      toast.error('Failed to save company name')
    } finally {
      setOrgSaving(false)
    }
  }

  async function handleSaveDetails() {
    if (readOnly) return
    setDetailsSaving(true)
    try {
      // These fields would require additional columns on organizations table.
      // For now, save what we can through existing updateOrgSettings.
      const { updateOrgSettings } = useOrgStore.getState()
      await updateOrgSettings({
        defaultLaborRate: org?.defaultLaborRate ?? null,
        defaultEquipmentRate: org?.defaultEquipmentRate ?? null,
      })
      toast.success('Company details saved')
    } catch {
      toast.error('Failed to save company details')
    } finally {
      setDetailsSaving(false)
    }
  }

  return (
    <div>
      <SectionHeading title="Company" subtitle="Your organization details" />

      {/* Org Name */}
      <div className="py-4 border-b border-[var(--border-light)]">
        <div className="text-[14px] font-[500] text-[var(--text-primary)] mb-2">Organization name</div>
        <div className="flex gap-2">
          <input
            type="text"
            value={orgName}
            onChange={e => { setOrgName(e.target.value); setOrgStatus('idle') }}
            onKeyDown={e => { if (e.key === 'Enter' && !readOnly) handleSaveOrgName() }}
            placeholder="Your company name"
            disabled={readOnly}
            className="flex-1 h-[44px] px-3 rounded-lg border border-[var(--border-default)] bg-[var(--surface-bg)] text-[var(--text-primary)] text-[14px] outline-none focus:ring-2 focus:ring-[var(--brand-primary)] disabled:opacity-60"
          />
          {!readOnly && (
            <Button
              variant="primary"
              className="h-[44px]"
              disabled={orgSaving || orgName.trim() === (org?.name ?? '')}
              onClick={handleSaveOrgName}
            >
              {orgSaving ? 'Saving...' : 'Save'}
            </Button>
          )}
        </div>
        {orgStatus === 'saved' && <div className="text-[12px] text-[var(--status-green)] mt-2">Saved successfully</div>}
        {orgStatus === 'error' && <div className="text-[12px] text-[var(--status-red)] mt-2">Failed to save</div>}
      </div>

      {/* Org Shortcode */}
      <div className="flex items-center justify-between py-4 border-b border-[var(--border-light)]">
        <div>
          <div className="text-[14px] font-[500] text-[var(--text-primary)]">Company code</div>
          <div className="text-[13px] text-[var(--text-secondary)] mt-0.5">
            {org?.shortcode ?? '\u2014'}
          </div>
          <div className="text-[12px] text-[var(--text-tertiary)] mt-1">
            Used by crew members to log in via the crew app
          </div>
        </div>
        <span className="text-[12px] text-[var(--text-tertiary)] px-2 py-1 rounded bg-[var(--surface-hover)]">Read-only</span>
      </div>

      {/* Business Type */}
      <div className="py-4 border-b border-[var(--border-light)]">
        <div className="text-[14px] font-[500] text-[var(--text-primary)] mb-2">Business type</div>
        <select
          value={businessType}
          onChange={e => setBusinessType(e.target.value)}
          disabled={readOnly}
          className="w-full h-[44px] px-3 rounded-lg border border-[var(--border-default)] bg-[var(--surface-bg)] text-[var(--text-primary)] text-[14px] outline-none focus:ring-2 focus:ring-[var(--brand-primary)] disabled:opacity-60"
        >
          <option value="">Select type</option>
          <option value="residential">Residential</option>
          <option value="commercial">Commercial</option>
          <option value="hardscaping">Hardscaping</option>
          <option value="full-service">Full-Service</option>
        </select>
        {/* Note: business_type column may not exist on organizations table yet */}
      </div>

      {/* Team Size */}
      <div className="py-4 border-b border-[var(--border-light)]">
        <div className="text-[14px] font-[500] text-[var(--text-primary)] mb-2">Team size</div>
        <select
          value={teamSize}
          onChange={e => setTeamSize(e.target.value)}
          disabled={readOnly}
          className="w-full h-[44px] px-3 rounded-lg border border-[var(--border-default)] bg-[var(--surface-bg)] text-[var(--text-primary)] text-[14px] outline-none focus:ring-2 focus:ring-[var(--brand-primary)] disabled:opacity-60"
        >
          <option value="">Select size</option>
          <option value="Just me">Just me</option>
          <option value="2-5">2-5</option>
          <option value="6-15">6-15</option>
          <option value="16-25">16-25</option>
          <option value="25+">25+</option>
        </select>
        {/* Note: team_size column may not exist on organizations table yet */}
      </div>

      {/* Service Area */}
      <div className="py-4 border-b border-[var(--border-light)]">
        <div className="text-[14px] font-[500] text-[var(--text-primary)] mb-2">Service area</div>
        <input
          type="text"
          value={serviceArea}
          onChange={e => setServiceArea(e.target.value)}
          placeholder="e.g., Greater Austin area, 50-mile radius"
          disabled={readOnly}
          className="w-full h-[44px] px-3 rounded-lg border border-[var(--border-default)] bg-[var(--surface-bg)] text-[var(--text-primary)] text-[14px] outline-none focus:ring-2 focus:ring-[var(--brand-primary)] disabled:opacity-60"
        />
        {/* Note: service_area column may not exist on organizations table yet */}
      </div>

      {/* License Number */}
      <div className="py-4 border-b border-[var(--border-light)]">
        <div className="text-[14px] font-[500] text-[var(--text-primary)] mb-2">License number</div>
        <input
          type="text"
          value={licenseNumber}
          onChange={e => setLicenseNumber(e.target.value)}
          placeholder="Contractor license number"
          disabled={readOnly}
          className="w-full h-[44px] px-3 rounded-lg border border-[var(--border-default)] bg-[var(--surface-bg)] text-[var(--text-primary)] text-[14px] outline-none focus:ring-2 focus:ring-[var(--brand-primary)] disabled:opacity-60"
        />
        {/* Note: license_number column may not exist on organizations table yet */}
      </div>

      {/* Default Rates */}
      <div className="py-4 border-b border-[var(--border-light)]">
        <div className="text-[14px] font-[500] text-[var(--text-primary)] mb-2">Default hourly rate</div>
        <div className="flex items-center gap-2">
          <span className="text-[var(--text-secondary)]">$</span>
          <input
            type="number"
            value={org?.defaultLaborRate ?? ''}
            disabled
            className="w-[120px] h-[44px] px-3 rounded-lg border border-[var(--border-default)] bg-[var(--surface-bg)] text-[var(--text-primary)] text-[14px] outline-none disabled:opacity-60"
          />
          <span className="text-[12px] text-[var(--text-tertiary)]">Set on Budget & Finance tab</span>
        </div>
      </div>

      {!readOnly && (
        <div className="mt-6">
          <Button
            variant="primary"
            loading={detailsSaving}
            onClick={handleSaveDetails}
          >
            Save Company Details
          </Button>
        </div>
      )}
    </div>
  )
}
