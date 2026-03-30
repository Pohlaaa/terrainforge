import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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

type SettingsSection = 'profile' | 'appearance' | 'notifications' | 'integrations' | 'team' | 'billing'

const NAV_ITEMS: Array<{ id: SettingsSection; icon: string; label: string }> = [
  { id: 'profile', icon: '👤', label: 'Profile' },
  { id: 'appearance', icon: '🎨', label: 'Appearance' },
  { id: 'notifications', icon: '🔔', label: 'Notifications' },
  { id: 'integrations', icon: '🔌', label: 'Integrations' },
  { id: 'team', icon: '👥', label: 'Team Members' },
  { id: 'billing', icon: '💳', label: 'Billing' },
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
  const { projects, setProjects, setActiveProject } = useProjectStore()
  const { setMaterials } = useMaterialStore()
  const { setCrew } = useCrewStore()
  const { setEquipment } = useEquipmentStore()
  const navigate = useNavigate()

  const [activeSection, setActiveSection] = useState<SettingsSection>('profile')

  // Profile state
  const [orgName, setOrgName] = useState(org?.name ?? '')
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle')
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const hasDemoData = projects.some(p => p.isDemo === true)

  // Sync org name when loaded async
  useEffect(() => {
    if (org?.name && !orgName) setOrgName(org.name)
  }, [org?.name])

  // Appearance state
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(() =>
    (localStorage.getItem('tf-theme') as 'light' | 'dark' | 'system') || 'light'
  )

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


  useEffect(() => {
    setOrgName(org?.name ?? '')
  }, [org?.name])

  async function handleSaveOrgName() {
    if (isSaving) return
    setIsSaving(true)
    setSaveStatus('idle')
    try {
      await updateOrgName(orgName.trim())
      setSaveStatus('saved')
      toast.success('Company name saved')
      setTimeout(() => setSaveStatus('idle'), 2500)
    } catch {
      setSaveStatus('error')
      toast.error('Failed to save company name')
    } finally {
      setIsSaving(false)
    }
  }

  function handleClearDemoData() {
    setProjects(projects.filter(p => !p.isDemo))
    setActiveProject(null)
    setMaterials([])
    setCrew([])
    setEquipment([])
    setShowClearConfirm(false)
    navigate('/')
  }

  function handleThemeChange(newTheme: 'light' | 'dark' | 'system') {
    setTheme(newTheme)
    applyTheme(newTheme)
  }

  function toggleNotification(key: string) {
    const updated = { ...notifications, [key]: !notifications[key] }
    setNotifications(updated)
    localStorage.setItem('tf-notifications', JSON.stringify(updated))
  }

  const SubHeader = ({ label }: { label: string }) => (
    <div className="text-[11px] font-[600] uppercase tracking-[0.1em] text-[var(--text-tertiary)] mt-8 mb-3">{label}</div>
  )

  const SectionHeading = ({ title, subtitle }: { title: string; subtitle?: string }) => (
    <div className="mb-6">
      <h2 className="text-[18px] font-[600] text-[var(--text-primary)]">{title}</h2>
      {subtitle && <p className="text-[13px] text-[var(--text-secondary)] mt-1">{subtitle}</p>}
    </div>
  )

  // ── Section renderers ──────────────────────────────────────────────────────

  const ProfileSection = () => (
    <div>
      <SectionHeading title="Profile" subtitle="Manage your account and organisation details" />

      {/* Email */}
      <div className="flex items-center justify-between py-4 border-b border-[var(--border-light)]">
        <div>
          <div className="text-[14px] font-[500] text-[var(--text-primary)]">Email address</div>
          <div className="text-[13px] text-[var(--text-secondary)] mt-0.5">{user?.email ?? '—'}</div>
        </div>
        <span className="text-[18px] opacity-40">🔒</span>
      </div>

      {/* Role */}
      <div className="flex items-center justify-between py-4 border-b border-[var(--border-light)]">
        <div>
          <div className="text-[14px] font-[500] text-[var(--text-primary)]">Role</div>
          <div className="text-[13px] text-[var(--text-secondary)] mt-0.5">Admin</div>
        </div>
      </div>

      {/* Org name */}
      <div className="py-4 border-b border-[var(--border-light)]">
        <div className="text-[14px] font-[500] text-[var(--text-primary)] mb-2">Company / Org name</div>
        <div className="flex gap-2">
          <input
            type="text"
            value={orgName}
            onChange={e => { setOrgName(e.target.value); setSaveStatus('idle') }}
            onKeyDown={e => { if (e.key === 'Enter') handleSaveOrgName() }}
            placeholder="Your company name"
            className="flex-1 h-[44px] px-3 rounded-lg border border-[var(--border-default)] bg-[var(--surface-bg)] text-[var(--text-primary)] text-[14px] outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
          />
          <Button
            variant="primary"
            className="h-[44px]"
            disabled={isSaving || orgName.trim() === (org?.name ?? '')}
            onClick={handleSaveOrgName}
          >
            {isSaving ? 'Saving…' : 'Save'}
          </Button>
        </div>
        {saveStatus === 'saved' && <div className="text-[12px] text-[var(--status-green)] mt-2">Saved successfully</div>}
        {saveStatus === 'error' && <div className="text-[12px] text-[var(--status-red)] mt-2">Failed to save — please try again</div>}
      </div>

      <SubHeader label="Data Management" />
      {hasDemoData ? (
        <div>
          <div className="text-[13px] text-[var(--text-secondary)] mb-3 leading-relaxed">
            Demo projects, materials, crew, and equipment were loaded automatically. Clear them when you're ready to use your own data.
          </div>
          <button
            onClick={() => setShowClearConfirm(true)}
            className="px-4 py-2 text-[13px] font-[600] rounded-lg transition-colors"
            style={{ color: '#FB923C', backgroundColor: 'rgba(251,146,60,.1)', border: '1px solid rgba(251,146,60,.3)' }}
          >
            ⚠ Clear Demo Data
          </button>
        </div>
      ) : (
        <div className="text-[13px] text-[var(--text-tertiary)]">No demo data found — you're working with your own data.</div>
      )}
    </div>
  )

  const AppearanceSection = () => (
    <div>
      <SectionHeading title="Appearance" subtitle="Choose your preferred colour theme" />
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
        ℹ️ Notification delivery coming soon — your preferences are saved for when it launches.
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
    </div>
  )

  const IntegrationsSection = () => {
    const INTEGRATIONS = [
      {
        icon: '💳', name: 'Stripe', desc: 'Payment processing & subscriptions',
        status: org?.stripeCustomerId ? 'connected' : 'not_connected',
        action: () => navigate('/billing'),
      },
      { icon: '📊', name: 'QuickBooks', desc: 'Accounting & bookkeeping sync', status: 'coming_soon', action: () => {} },
      { icon: '📅', name: 'Google Calendar', desc: 'Schedule & deadline sync', status: 'coming_soon', action: () => {} },
      { icon: '🌤️', name: 'Weather API', desc: 'Job site weather forecasts', status: 'coming_soon', action: () => {} },
      { icon: '🗺️', name: 'Mapbox', desc: 'Project location mapping', status: 'coming_soon', action: () => {} },
      {
        icon: '🤖', name: 'Claude AI', desc: 'Smart suggestions & estimates',
        status: import.meta.env.VITE_ANTHROPIC_API_KEY ? 'connected' : 'not_connected',
        action: () => {},
      },
    ]

    return (
      <div>
        <SectionHeading title="Integrations" subtitle="Connect external services to your workspace" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {INTEGRATIONS.map(integ => (
            <div
              key={integ.name}
              className={`p-5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] shadow-[var(--shadow-sm)] ${integ.status === 'coming_soon' ? 'opacity-60' : ''}`}
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="text-[24px]">{integ.icon}</span>
                <span className="text-[14px] font-[600] text-[var(--text-primary)]">{integ.name}</span>
                <span className={`ml-auto text-[11px] font-[500] px-2 py-1 rounded-full ${
                  integ.status === 'connected'
                    ? 'bg-[var(--status-green-bg)] text-[var(--status-green)]'
                    : integ.status === 'coming_soon'
                    ? 'bg-[var(--status-gray-bg)] text-[var(--status-gray)]'
                    : 'bg-[var(--status-amber-bg)] text-[var(--status-amber)]'
                }`}>
                  {integ.status === 'connected' ? 'Connected' : integ.status === 'coming_soon' ? 'Coming Soon' : 'Not Connected'}
                </span>
              </div>
              <p className="text-[13px] text-[var(--text-secondary)] mb-4">{integ.desc}</p>
              {integ.status === 'connected' && (
                <Button variant="secondary" size="sm" onClick={integ.action}>Manage</Button>
              )}
              {integ.status === 'not_connected' && (
                <Button variant="primary" size="sm" onClick={integ.action}>Connect</Button>
              )}
              {integ.status === 'coming_soon' && (
                <Button variant="secondary" size="sm" disabled>Coming Soon</Button>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  const TeamSection = () => (
    <div>
      <SectionHeading title="Team Members" />
      <div className="text-center py-12">
        <div className="text-[48px] mb-4 opacity-30">👥</div>
        <div className="text-[16px] font-[600] text-[var(--text-primary)] mb-2">Team Management</div>
        <div className="text-[13px] text-[var(--text-tertiary)] mb-6">
          You're the only member. Invite your crew when you're ready.
        </div>
        <Button
          variant="primary"
          onClick={() => toast.info('Team invitations coming in Phase 2')}
        >
          Invite Member
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
        <Button variant="primary" onClick={() => navigate('/billing')}>
          Manage Subscription →
        </Button>
      </div>
    </div>
  )

  return (
    <div>
      <PageHeader title="Settings" subtitle="Manage your account, appearance, and team preferences." />
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
        {activeSection === 'profile' && <ProfileSection />}
        {activeSection === 'appearance' && <AppearanceSection />}
        {activeSection === 'notifications' && <NotificationsSection />}
        {activeSection === 'integrations' && <IntegrationsSection />}
        {activeSection === 'team' && <TeamSection />}
        {activeSection === 'billing' && <BillingSection />}
      </div>

      <ConfirmDialog
        isOpen={showClearConfirm}
        title="Clear Demo Data"
        message="This will remove all demo projects, materials, crew, and equipment. Your account settings and billing will not be affected. This cannot be undone."
        confirmText="Start Fresh"
        confirmVariant="danger"
        onConfirm={handleClearDemoData}
        onCancel={() => setShowClearConfirm(false)}
      />
    </div>
    </div>
  )
}

export default Settings
