import React, { useState } from 'react'
import { useOrgStore } from '@/stores/orgStore'
import { PageHeader } from '@/components/layout/PageHeader'
import { ProfileSection } from '@/components/settings/ProfileSection'
import { CompanySection } from '@/components/settings/CompanySection'
import { PreferencesSection } from '@/components/settings/PreferencesSection'
import { NotificationSection } from '@/components/settings/NotificationSection'
import { BillingSection } from '@/components/settings/BillingSection'
import { DangerZoneSection } from '@/components/settings/DangerZoneSection'

type SettingsSection = 'profile' | 'company' | 'preferences' | 'notifications' | 'billing' | 'danger'

interface NavItem { id: SettingsSection; icon: string; label: string }

const ALL_NAV_ITEMS: NavItem[] = [
  { id: 'profile', icon: '\uD83D\uDC64', label: 'Profile' },
  { id: 'company', icon: '\uD83C\uDFE2', label: 'Company' },
  { id: 'preferences', icon: '\u2699\uFE0F', label: 'Preferences' },
  { id: 'notifications', icon: '\uD83D\uDD14', label: 'Notifications' },
  { id: 'billing', icon: '\uD83D\uDCB3', label: 'Billing' },
  { id: 'danger', icon: '\u26A0\uFE0F', label: 'Danger Zone' },
]

// Role-based visibility: which sections each role can see
const SECTION_ACCESS: Record<SettingsSection, { roles: string[]; readOnly?: string[] }> = {
  profile:       { roles: ['admin', 'designer', 'foreman', 'client'] },
  company:       { roles: ['admin', 'designer'], readOnly: ['designer'] },
  preferences:   { roles: ['admin', 'designer', 'foreman', 'client'] },
  notifications: { roles: ['admin', 'designer', 'foreman', 'client'] },
  billing:       { roles: ['admin'] },
  danger:        { roles: ['admin'] },
}

export const Settings: React.FC = () => {
  const { org } = useOrgStore()
  const userRole = ((org as unknown as Record<string, unknown>)?.userRole as string) || 'admin'
  const [activeSection, setActiveSection] = useState<SettingsSection>('profile')

  const navItems = ALL_NAV_ITEMS.filter(item => SECTION_ACCESS[item.id].roles.includes(userRole))
  const isReadOnly = SECTION_ACCESS[activeSection]?.readOnly?.includes(userRole) ?? false

  return (
    <div>
      <PageHeader title="Settings" subtitle="Manage your account, company, and preferences." />
      {/* F-CW-54: layout was `flex gap-0 h-full` (row direction unconditionally),
          which on narrow viewports rendered the mobile tab pills as a tall
          vertical bar next to the content. Stack on mobile, side-by-side on
          md+ where the desktop sidebar nav takes over. */}
      <div className="flex flex-col md:flex-row gap-0">
        {/* Left nav */}
        <nav className="hidden md:block w-[220px] border-r border-[var(--border-default)] bg-[var(--surface-card)] py-4 flex-shrink-0">
          {navItems.map(item => (
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

        {/* Mobile tabs */}
        <div className="md:hidden overflow-x-auto flex gap-1 px-3 py-2 border-b border-[var(--border-default)]">
          {navItems.map(item => (
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 max-w-[640px]">
          {activeSection === 'profile' && <ProfileSection readOnly={isReadOnly} />}
          {activeSection === 'company' && <CompanySection readOnly={isReadOnly} />}
          {activeSection === 'preferences' && <PreferencesSection />}
          {activeSection === 'notifications' && <NotificationSection />}
          {activeSection === 'billing' && <BillingSection />}
          {activeSection === 'danger' && <DangerZoneSection />}
        </div>
      </div>
    </div>
  )
}

export default Settings
