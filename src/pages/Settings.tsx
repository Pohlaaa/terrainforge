import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useOrgStore } from '@/stores/orgStore';
import { useProjectStore } from '@/stores/projectStore';
import { useMaterialStore } from '@/stores/materialStore';
import { useCrewStore } from '@/stores/crewStore';
import { useEquipmentStore } from '@/stores/equipmentStore';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/layout/PageHeader';
import { toast } from '@/hooks/useToast';
import { insertSampleData, clearSampleData } from '@/services/supabaseData';
import { createPortalSession } from '@/services/stripe';
import { upsertUserPreferences } from '@/services/preferences';
import { supabase } from '@/services/supabase';

type SettingsSection = 'profile' | 'company' | 'preferences' | 'notifications' | 'billing' | 'danger'

const NAV_ITEMS: Array<{ id: SettingsSection; icon: string; label: string }> = [
  { id: 'profile', icon: '👤', label: 'Profile' },
  { id: 'company', icon: '🏢', label: 'Company' },
  { id: 'preferences', icon: '⚙️', label: 'Preferences' },
  { id: 'notifications', icon: '🔔', label: 'Notifications' },
  { id: 'billing', icon: '💳', label: 'Billing' },
  { id: 'danger', icon: '⚠️', label: 'Danger Zone' },
]

function applyTheme(newTheme: 'light' | 'dark' | 'system') {
  localStorage.setItem('tf-theme', newTheme)
  if (newTheme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light')
  } else {
    document.documentElement.setAttribute('data-theme', newTheme)
  }
}

export const Settings: React.FC = () => {
  const { user } = useAuth()
  const { org, updateOrgName } = useOrgStore()
  const { projects, setProjects, setActiveProject, fetchProjects } = useProjectStore()
  const { setMaterials, fetchMaterials } = useMaterialStore()
  const { setCrew, fetchCrew } = useCrewStore()
  const { setEquipment, fetchEquipment } = useEquipmentStore()

  const [activeSection, setActiveSection] = useState<SettingsSection>('profile')

  // Profile state
  const [displayName, setDisplayName] = useState('')
  const [nameSaving, setNameSaving] = useState(false)
  const [nameStatus, setNameStatus] = useState<'idle' | 'saved' | 'error'>('idle')

  // Company state
  const [orgName, setOrgName] = useState(org?.name ?? '')
  const [orgSaving, setOrgSaving] = useState(false)
  const [orgStatus, setOrgStatus] = useState<'idle' | 'saved' | 'error'>('idle')

  // Danger zone
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [sampleLoading, setSampleLoading] = useState(false)
  const hasDemoData = projects.some(p => p.isDemo === true)
  const hasSampleData = localStorage.getItem('tf-sample-ids') !== null

  // Appearance state
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(() =>
    (localStorage.getItem('tf-theme') as 'light' | 'dark' | 'system') || 'light'
  )

  // Project view preference
  const [projectView, setProjectView] = useState<'cards' | 'list'>(() => {
    const saved = localStorage.getItem('tf-projects-view')
    return (saved === 'list' || saved === 'cards') ? saved : 'cards'
  })

  // Notification state
  const [notifications, setNotifications] = useState(() => {
    try {
      const saved = localStorage.getItem('tf-notifications')
      return saved ? JSON.parse(saved) as Record<string, boolean> : {
        deadlineReminders: true,
        lowStockAlerts: true,
        certExpiry: true,
        maintenanceDue: true,
        weeklyDigest: false,
      }
    } catch {
      return {
        deadlineReminders: true,
        lowStockAlerts: true,
        certExpiry: true,
        maintenanceDue: true,
        weeklyDigest: false,
      }
    }
  })
  const [notifSaving, setNotifSaving] = useState(false)

  // Billing state
  const [portalLoading, setPortalLoading] = useState(false)

  // Sync org name when loaded async
  useEffect(() => {
    if (org?.name) setOrgName(org.name)
  }, [org?.name])

  // Load display name from user metadata
  useEffect(() => {
    if (user?.user_metadata?.full_name) {
      setDisplayName(user.user_metadata.full_name as string)
    }
  }, [user?.user_metadata?.full_name])

  // ── Handlers ────────────────────────────────────────────────────────────────

  async function handleSaveDisplayName() {
    if (nameSaving) return
    setNameSaving(true)
    setNameStatus('idle')
    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: displayName.trim() }
      })
      if (error) throw error
      setNameStatus('saved')
      toast.success('Display name saved')
      setTimeout(() => setNameStatus('idle'), 2500)
    } catch {
      setNameStatus('error')
      toast.error('Failed to save display name')
    } finally {
      setNameSaving(false)
    }
  }

  async function handleSaveOrgName() {
    if (orgSaving) return
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

  function handleClearDemoData() {
    setProjects(projects.filter(p => !p.isDemo))
    setActiveProject(null)
    setMaterials([])
    setCrew([])
    setEquipment([])
    setShowClearConfirm(false)
  }

  async function handleClearSampleData() {
    if (!org?.id) return
    setSampleLoading(true)
    const result = await clearSampleData(org.id)
    if (result.success) {
      await Promise.all([fetchProjects(), fetchCrew(), fetchEquipment(), fetchMaterials()])
      localStorage.setItem('tf-setup-dismissed', 'true')
      toast.success('Sample data cleared')
    } else {
      toast.error(`Failed to clear sample data: ${result.error}`)
    }
    setSampleLoading(false)
    setShowClearConfirm(false)
  }

  function handleThemeChange(newTheme: 'light' | 'dark' | 'system') {
    setTheme(newTheme)
    applyTheme(newTheme)
  }

  function handleProjectViewChange(mode: 'cards' | 'list') {
    setProjectView(mode)
    localStorage.setItem('tf-projects-view', mode)
  }

  function toggleNotification(key: string) {
    const updated = { ...notifications, [key]: !notifications[key] }
    setNotifications(updated)
    localStorage.setItem('tf-notifications', JSON.stringify(updated))
  }

  async function handleSaveNotifications() {
    if (!user?.id || !org?.id) return
    setNotifSaving(true)
    try {
      await upsertUserPreferences(user.id, org.id, {
        notificationSettings: notifications
      })
      toast.success('Notification preferences saved')
    } catch {
      toast.error('Failed to save notification preferences')
    } finally {
      setNotifSaving(false)
    }
  }

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

  // ── Sub-components ──────────────────────────────────────────────────────────

  const SectionHeading = ({ title, subtitle }: { title: string; subtitle?: string }) => (
    <div className="mb-6">
      <h2 className="text-[18px] font-[600] text-[var(--text-primary)]">{title}</h2>
      {subtitle && <p className="text-[13px] text-[var(--text-secondary)] mt-1">{subtitle}</p>}
    </div>
  )

  // ── Section renderers ──────────────────────────────────────────────────────

  const ProfileSection = () => (
    <div>
      <SectionHeading title="Profile" subtitle="Your personal account details" />

      {/* Display Name */}
      <div className="py-4 border-b border-[var(--border-light)]">
        <div className="text-[14px] font-[500] text-[var(--text-primary)] mb-2">Display name</div>
        <div className="flex gap-2">
          <input
            type="text"
            value={displayName}
            onChange={e => { setDisplayName(e.target.value); setNameStatus('idle') }}
            onKeyDown={e => { if (e.key === 'Enter') handleSaveDisplayName() }}
            placeholder="Your name"
            className="flex-1 h-[44px] px-3 rounded-lg border border-[var(--border-default)] bg-[var(--surface-bg)] text-[var(--text-primary)] text-[14px] outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
          />
          <Button
            variant="primary"
            className="h-[44px]"
            disabled={nameSaving || displayName.trim() === ((user?.user_metadata?.full_name as string) ?? '')}
            onClick={handleSaveDisplayName}
          >
            {nameSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
        {nameStatus === 'saved' && <div className="text-[12px] text-[var(--status-green)] mt-2">Saved successfully</div>}
        {nameStatus === 'error' && <div className="text-[12px] text-[var(--status-red)] mt-2">Failed to save</div>}
      </div>

      {/* Email */}
      <div className="flex items-center justify-between py-4 border-b border-[var(--border-light)]">
        <div>
          <div className="text-[14px] font-[500] text-[var(--text-primary)]">Email address</div>
          <div className="text-[13px] text-[var(--text-secondary)] mt-0.5">{user?.email ?? '—'}</div>
        </div>
        <span className="text-[12px] text-[var(--text-tertiary)] px-2 py-1 rounded bg-[var(--surface-hover)]">Read-only</span>
      </div>

      {/* Role */}
      <div className="flex items-center justify-between py-4 border-b border-[var(--border-light)]">
        <div>
          <div className="text-[14px] font-[500] text-[var(--text-primary)]">Role</div>
          <div className="text-[13px] text-[var(--text-secondary)] mt-0.5">Admin</div>
        </div>
        <span className="text-[12px] text-[var(--text-tertiary)] px-2 py-1 rounded bg-[var(--surface-hover)]">Read-only</span>
      </div>
    </div>
  )

  const CompanySection = () => (
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
            onKeyDown={e => { if (e.key === 'Enter') handleSaveOrgName() }}
            placeholder="Your company name"
            className="flex-1 h-[44px] px-3 rounded-lg border border-[var(--border-default)] bg-[var(--surface-bg)] text-[var(--text-primary)] text-[14px] outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
          />
          <Button
            variant="primary"
            className="h-[44px]"
            disabled={orgSaving || orgName.trim() === (org?.name ?? '')}
            onClick={handleSaveOrgName}
          >
            {orgSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
        {orgStatus === 'saved' && <div className="text-[12px] text-[var(--status-green)] mt-2">Saved successfully</div>}
        {orgStatus === 'error' && <div className="text-[12px] text-[var(--status-red)] mt-2">Failed to save</div>}
      </div>

      {/* Org Shortcode */}
      <div className="flex items-center justify-between py-4 border-b border-[var(--border-light)]">
        <div>
          <div className="text-[14px] font-[500] text-[var(--text-primary)]">Company code</div>
          <div className="text-[13px] text-[var(--text-secondary)] mt-0.5">
            {org?.shortcode ?? '—'}
          </div>
          <div className="text-[12px] text-[var(--text-tertiary)] mt-1">
            Used by crew members to log in via the crew app
          </div>
        </div>
        <span className="text-[12px] text-[var(--text-tertiary)] px-2 py-1 rounded bg-[var(--surface-hover)]">Read-only</span>
      </div>
    </div>
  )

  const PreferencesSection = () => (
    <div>
      <SectionHeading title="Preferences" subtitle="Customize your experience" />

      {/* Theme */}
      <div className="mb-8">
        <div className="text-[14px] font-[500] text-[var(--text-primary)] mb-4">Theme</div>
        <div className="grid grid-cols-3 gap-4">
          {[
            { id: 'light' as const, icon: '☀️', label: 'Light', gradient: 'from-[#FAFAFA] to-[#FFFFFF]', dir: 'b' },
            { id: 'dark' as const, icon: '🌙', label: 'Dark', gradient: 'from-[#0F172A] to-[#1E293B]', dir: 'b' },
            { id: 'system' as const, icon: '💻', label: 'System', gradient: 'from-[#FAFAFA] via-[#FAFAFA] to-[#0F172A]', dir: 'r' },
          ].map(t => (
            <div
              key={t.id}
              onClick={() => handleThemeChange(t.id)}
              className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all text-center ${
                theme === t.id
                  ? 'border-[var(--brand-primary)] bg-[var(--surface-selected)] shadow-[var(--shadow-card)]'
                  : 'border-[var(--border-default)] bg-[var(--surface-card)] shadow-[var(--shadow-sm)]'
              }`}
            >
              {theme === t.id && (
                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[var(--brand-primary)] flex items-center justify-center">
                  <span className="text-white text-[10px]">✓</span>
                </div>
              )}
              <div
                className={`w-full h-[60px] rounded-lg mb-3 border border-[var(--border-light)] bg-gradient-to-${t.dir} ${t.gradient}`}
              />
              <div className="text-[20px] mb-1">{t.icon}</div>
              <div className="text-[13px] font-[500] text-[var(--text-primary)]">{t.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Default project view */}
      <div>
        <div className="text-[14px] font-[500] text-[var(--text-primary)] mb-4">Default project view</div>
        <div className="grid grid-cols-2 gap-4">
          {[
            { id: 'cards' as const, icon: '▦', label: 'Card view' },
            { id: 'list' as const, icon: '☰', label: 'List view' },
          ].map(v => (
            <div
              key={v.id}
              onClick={() => handleProjectViewChange(v.id)}
              className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all text-center ${
                projectView === v.id
                  ? 'border-[var(--brand-primary)] bg-[var(--surface-selected)] shadow-[var(--shadow-card)]'
                  : 'border-[var(--border-default)] bg-[var(--surface-card)] shadow-[var(--shadow-sm)]'
              }`}
            >
              {projectView === v.id && (
                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[var(--brand-primary)] flex items-center justify-center">
                  <span className="text-white text-[10px]">✓</span>
                </div>
              )}
              <div className="text-[24px] mb-2 text-[var(--text-secondary)]">{v.icon}</div>
              <div className="text-[13px] font-[500] text-[var(--text-primary)]">{v.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  const NOTIFICATION_ITEMS = [
    { key: 'deadlineReminders', icon: '⏰', label: 'Deadline reminders', desc: '3 days before project target date' },
    { key: 'lowStockAlerts', icon: '📦', label: 'Low stock alerts', desc: 'When material drops below minimum' },
    { key: 'certExpiry', icon: '📜', label: 'Cert expiry warnings', desc: '30 days before crew certification expires' },
    { key: 'maintenanceDue', icon: '🔧', label: 'Maintenance due', desc: 'When equipment hours approach service interval' },
    { key: 'weeklyDigest', icon: '📧', label: 'Weekly email digest', desc: 'Summary of project activity every Monday' },
  ]

  const NotificationsSection = () => (
    <div>
      <SectionHeading title="Notifications" />
      <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-[var(--status-blue-bg)] text-[var(--status-blue)] text-[13px] mb-6">
        Email notifications coming soon. These preferences will apply once notifications are enabled.
      </div>
      {NOTIFICATION_ITEMS.map(item => (
        <div key={item.key} className="flex items-center justify-between py-4 border-b border-[var(--border-light)]">
          <div>
            <div className="text-[14px] font-[500] text-[var(--text-primary)]">{item.icon} {item.label}</div>
            <div className="text-[12px] text-[var(--text-tertiary)] mt-0.5">{item.desc}</div>
          </div>
          <button
            onClick={() => toggleNotification(item.key)}
            className={`w-[48px] h-[28px] rounded-full transition-colors flex items-center px-[2px] ${
              notifications[item.key] ? 'bg-[var(--brand-primary)] justify-end' : 'bg-[var(--border-strong)] justify-start'
            }`}
          >
            <div className="w-[24px] h-[24px] rounded-full bg-white shadow-[var(--shadow-sm)]" />
          </button>
        </div>
      ))}
      <div className="mt-6">
        <Button
          variant="primary"
          size="sm"
          loading={notifSaving}
          onClick={handleSaveNotifications}
        >
          Save Preferences
        </Button>
      </div>
    </div>
  )

  const BillingSection = () => (
    <div>
      <SectionHeading title="Billing" subtitle="Manage your subscription and payment details" />
      <div className="p-5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] shadow-[var(--shadow-sm)]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-[14px] font-[500] text-[var(--text-primary)]">Current Plan</div>
            <div className="text-[13px] text-[var(--text-secondary)] mt-0.5 capitalize">
              {org?.subscriptionTier ?? 'starter'} · {org?.subscriptionStatus ?? 'trialing'}
            </div>
          </div>
          <span className="text-[24px]">💳</span>
        </div>
        <Button
          variant="primary"
          loading={portalLoading}
          onClick={handleManageBilling}
        >
          Manage Billing
        </Button>
      </div>
    </div>
  )

  const DangerZoneSection = () => (
    <div>
      <SectionHeading title="Danger Zone" subtitle="Irreversible actions" />
      <div className="p-5 rounded-xl border border-[var(--status-red)] bg-[var(--surface-card)] shadow-[var(--shadow-sm)]">
        {hasDemoData && (
          <div className="mb-4 pb-4 border-b border-[var(--border-light)]">
            <div className="text-[14px] font-[500] text-[var(--text-primary)] mb-1">Clear Demo Data</div>
            <div className="text-[13px] text-[var(--text-secondary)] mb-3 leading-relaxed">
              Remove demo projects, materials, crew, and equipment that were loaded automatically.
            </div>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setShowClearConfirm(true)}
            >
              Clear Demo Data
            </Button>
          </div>
        )}
        {hasSampleData ? (
          <div>
            <div className="text-[14px] font-[500] text-[var(--text-primary)] mb-1">Delete Sample Data</div>
            <div className="text-[13px] text-[var(--text-secondary)] mb-3 leading-relaxed">
              Remove all sample company data (projects, crew, equipment, materials). Your account settings and billing will not be affected.
            </div>
            <Button
              variant="danger"
              size="sm"
              loading={sampleLoading}
              onClick={() => setShowClearConfirm(true)}
            >
              Delete Sample Data
            </Button>
          </div>
        ) : !hasDemoData ? (
          <div className="text-[13px] text-[var(--text-secondary)]">
            No sample or demo data to remove.
          </div>
        ) : null}
      </div>
    </div>
  )

  return (
    <div>
      <PageHeader title="Settings" subtitle="Manage your account, company, and preferences." />
    <div className="flex gap-0 h-full">
      {/* Left nav — hidden on phone */}
      <nav className="hidden md:block w-[220px] border-r border-[var(--border-default)] bg-[var(--surface-card)] py-4 flex-shrink-0">
        {NAV_ITEMS.map(item => (
          <div
            key={item.id}
            onClick={() => setActiveSection(item.id)}
            className={`flex items-center gap-3 px-4 py-3 mx-2 rounded-lg cursor-pointer transition-colors text-[14px] ${
              activeSection === item.id
                ? 'bg-[var(--surface-selected)] text-[var(--brand-primary)] font-[500] border-l-2 border-[var(--brand-primary)]'
                : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'
            }`}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </div>
        ))}
      </nav>

      {/* Mobile tabs — phone only */}
      <div className="md:hidden overflow-x-auto flex gap-1 px-3 py-2 border-b border-[var(--border-default)]">
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            onClick={() => setActiveSection(item.id)}
            className={`px-3 py-1.5 rounded-full text-[12px] whitespace-nowrap transition-colors ${
              activeSection === item.id
                ? 'bg-[var(--brand-primary)] text-white'
                : 'bg-[var(--surface-hover)] text-[var(--text-secondary)]'
            }`}
          >
            {item.icon} {item.label}
          </button>
        ))}
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto px-6 py-6 max-w-[640px]">
        {activeSection === 'profile' && ProfileSection()}
        {activeSection === 'company' && CompanySection()}
        {activeSection === 'preferences' && PreferencesSection()}
        {activeSection === 'notifications' && NotificationsSection()}
        {activeSection === 'billing' && BillingSection()}
        {activeSection === 'danger' && DangerZoneSection()}
      </div>

      <ConfirmDialog
        isOpen={showClearConfirm}
        title={hasSampleData ? 'Delete Sample Data' : 'Clear Demo Data'}
        message="This will remove all sample/demo projects, materials, crew, and equipment. Your account settings and billing will not be affected. This cannot be undone."
        confirmText="Delete"
        confirmVariant="danger"
        onConfirm={hasSampleData ? handleClearSampleData : handleClearDemoData}
        onCancel={() => setShowClearConfirm(false)}
      />
    </div>
    </div>
  )
}

export default Settings
