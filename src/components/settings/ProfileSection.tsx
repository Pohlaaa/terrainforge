import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/services/supabase'
import { Button } from '@/components/ui/Button'
import { SectionHeading } from './SectionHeading'
import { toast } from '@/hooks/useToast'

interface ProfileSectionProps {
  readOnly?: boolean
}

export const ProfileSection: React.FC<ProfileSectionProps> = ({ readOnly }) => {
  const { user } = useAuth()
  const [displayName, setDisplayName] = useState('')
  const [nameSaving, setNameSaving] = useState(false)
  const [nameStatus, setNameStatus] = useState<'idle' | 'saved' | 'error'>('idle')

  // Password change state
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)

  // Email change state
  const [showEmailForm, setShowEmailForm] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [emailSaving, setEmailSaving] = useState(false)

  useEffect(() => {
    if (user?.user_metadata?.full_name) {
      setDisplayName(user.user_metadata.full_name as string)
    }
  }, [user?.user_metadata?.full_name])

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

  async function handleChangePassword() {
    setPasswordError('')
    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match')
      return
    }
    setPasswordSaving(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      toast.success('Password updated')
      setShowPasswordForm(false)
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Failed to update password')
    } finally {
      setPasswordSaving(false)
    }
  }

  async function handleChangeEmail() {
    if (!newEmail.trim()) return
    setEmailSaving(true)
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail.trim() })
      if (error) throw error
      toast.success('Verification email sent to new address')
      setShowEmailForm(false)
      setNewEmail('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update email')
    } finally {
      setEmailSaving(false)
    }
  }

  const charCount = displayName.length

  return (
    <div>
      <SectionHeading title="Profile" subtitle="Your personal account details" />

      {/* Display Name */}
      <div className="py-4 border-b border-[var(--border-light)]">
        <div className="text-[14px] font-[500] text-[var(--text-primary)] mb-2">Display name</div>
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={displayName}
              onChange={e => { if (e.target.value.length <= 50) { setDisplayName(e.target.value); setNameStatus('idle') } }}
              onKeyDown={e => { if (e.key === 'Enter' && !readOnly) handleSaveDisplayName() }}
              placeholder="Your name"
              maxLength={50}
              disabled={readOnly}
              className="w-full h-[44px] px-3 rounded-lg border border-[var(--border-default)] bg-[var(--surface-bg)] text-[var(--text-primary)] text-[14px] outline-none focus:ring-2 focus:ring-[var(--brand-primary)] disabled:opacity-60"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-[var(--text-tertiary)]">
              {charCount}/50
            </span>
          </div>
          {!readOnly && (
            <Button
              variant="primary"
              className="h-[44px]"
              disabled={nameSaving || displayName.trim() === ((user?.user_metadata?.full_name as string) ?? '')}
              onClick={handleSaveDisplayName}
            >
              {nameSaving ? 'Saving...' : 'Save'}
            </Button>
          )}
        </div>
        {nameStatus === 'saved' && <div className="text-[12px] text-[var(--status-green)] mt-2">Saved successfully</div>}
        {nameStatus === 'error' && <div className="text-[12px] text-[var(--status-red)] mt-2">Failed to save</div>}
      </div>

      {/* Email */}
      <div className="py-4 border-b border-[var(--border-light)]">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[14px] font-[500] text-[var(--text-primary)]">Email address</div>
            <div className="text-[13px] text-[var(--text-secondary)] mt-0.5">{user?.email ?? '\u2014'}</div>
          </div>
          {!readOnly && !showEmailForm && (
            <button
              onClick={() => setShowEmailForm(true)}
              className="text-[12px] text-[var(--brand-primary)] hover:underline cursor-pointer bg-transparent border-none"
            >
              Change email
            </button>
          )}
        </div>
        {showEmailForm && (
          <div className="mt-3 flex gap-2">
            <input
              type="email"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              placeholder="New email address"
              className="flex-1 h-[40px] px-3 rounded-lg border border-[var(--border-default)] bg-[var(--surface-bg)] text-[var(--text-primary)] text-[14px] outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
            />
            <Button variant="primary" size="sm" loading={emailSaving} onClick={handleChangeEmail}>
              Send verification
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { setShowEmailForm(false); setNewEmail('') }}>
              Cancel
            </Button>
          </div>
        )}
      </div>

      {/* Role */}
      <div className="flex items-center justify-between py-4 border-b border-[var(--border-light)]">
        <div>
          <div className="text-[14px] font-[500] text-[var(--text-primary)]">Role</div>
          <div className="text-[13px] text-[var(--text-secondary)] mt-0.5">Admin</div>
        </div>
        <span className="text-[12px] text-[var(--text-tertiary)] px-2 py-1 rounded bg-[var(--surface-hover)]">Read-only</span>
      </div>

      {/* Password Change */}
      <div className="py-4 border-b border-[var(--border-light)]">
        <div className="flex items-center justify-between">
          <div className="text-[14px] font-[500] text-[var(--text-primary)]">Password</div>
          {!readOnly && !showPasswordForm && (
            <button
              onClick={() => setShowPasswordForm(true)}
              className="text-[12px] text-[var(--brand-primary)] hover:underline cursor-pointer bg-transparent border-none"
            >
              Change password
            </button>
          )}
        </div>
        {showPasswordForm && (
          <div className="mt-3 space-y-3">
            {passwordError && (
              <div className="text-[12px] text-[var(--status-red)]">{passwordError}</div>
            )}
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="New password (min 8 characters)"
              className="w-full h-[40px] px-3 rounded-lg border border-[var(--border-default)] bg-[var(--surface-bg)] text-[var(--text-primary)] text-[14px] outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
            />
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className="w-full h-[40px] px-3 rounded-lg border border-[var(--border-default)] bg-[var(--surface-bg)] text-[var(--text-primary)] text-[14px] outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
            />
            <div className="flex gap-2">
              <Button variant="primary" size="sm" loading={passwordSaving} onClick={handleChangePassword}>
                Update Password
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { setShowPasswordForm(false); setNewPassword(''); setConfirmPassword(''); setPasswordError('') }}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
