import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useOrgStore } from '@/stores/orgStore'
import { Button } from '@/components/ui/Button'
import { SectionHeading } from './SectionHeading'
import { toast } from '@/hooks/useToast'
import { upsertUserPreferences, fetchUserPreferences } from '@/services/preferences'

const NOTIFICATION_ITEMS = [
  { key: 'projectUpdates', icon: '\uD83D\uDCCB', label: 'Project updates', desc: 'New project assigned, status change, budget threshold exceeded' },
  { key: 'crewUpdates', icon: '\uD83D\uDC77', label: 'Crew', desc: 'Crew member checked in/out, new crew assignment' },
  { key: 'equipmentAlerts', icon: '\uD83D\uDE9C', label: 'Equipment', desc: 'Maintenance due, equipment status change' },
  { key: 'deadlineReminders', icon: '\u23F0', label: 'Deadline reminders', desc: '3 days before project target date' },
  { key: 'lowStockAlerts', icon: '\uD83D\uDCE6', label: 'Low stock alerts', desc: 'When material drops below minimum' },
  { key: 'certExpiry', icon: '\uD83D\uDCDC', label: 'Cert expiry warnings', desc: '30 days before crew certification expires' },
  { key: 'maintenanceDue', icon: '\uD83D\uDD27', label: 'Maintenance due', desc: 'When equipment hours approach service interval' },
  { key: 'weeklyDigest', icon: '\uD83D\uDCE7', label: 'Weekly email digest', desc: 'Summary of project activity every Monday' },
  { key: 'securityAlerts', icon: '\uD83D\uDD12', label: 'Account security', desc: 'Login from new device, password changes' },
]

export const NotificationSection: React.FC = () => {
  const { user } = useAuth()
  const { org } = useOrgStore()
  const [notifications, setNotifications] = useState<Record<string, boolean>>({
    projectUpdates: true,
    crewUpdates: true,
    equipmentAlerts: true,
    deadlineReminders: true,
    lowStockAlerts: true,
    certExpiry: true,
    maintenanceDue: true,
    weeklyDigest: false,
    securityAlerts: true,
  })
  const [saving, setSaving] = useState(false)
  const [loaded, setLoaded] = useState(false)

  // Load notification settings from Supabase on mount
  useEffect(() => {
    if (!user?.id) return
    fetchUserPreferences(user.id).then(prefs => {
      if (prefs?.notificationSettings) {
        setNotifications(prev => ({ ...prev, ...prefs.notificationSettings }))
      }
      setLoaded(true)
    })
  }, [user?.id])

  function toggleNotification(key: string) {
    setNotifications(prev => ({ ...prev, [key]: !prev[key] }))
  }

  async function handleSave() {
    if (!user?.id || !org?.id) return
    setSaving(true)
    try {
      await upsertUserPreferences(user.id, org.id, {
        notificationSettings: notifications
      })
      toast.success('Notification preferences saved')
    } catch {
      toast.error('Failed to save notification preferences')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <SectionHeading title="Notifications" />
      <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-[var(--status-blue-bg)] text-[var(--status-blue)] text-[13px] mb-6">
        Email notifications coming soon. These preferences will apply once notifications are enabled.
      </div>
      {!loaded ? (
        <div className="text-[13px] text-[var(--text-tertiary)] py-4">Loading preferences...</div>
      ) : (
        <>
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
            <Button variant="primary" size="sm" loading={saving} onClick={handleSave}>
              Save Preferences
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
