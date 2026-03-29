import React, { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useBillingGate } from '@/hooks/useBillingGate'
import { hasCompletedOnboarding } from '@/services/preferences'

interface ProtectedRouteProps {
  children: React.ReactNode
  skipOnboardingCheck?: boolean
}

/** Routes that a gated user may still access (billing + auth pages). */
const BILLING_EXEMPT_PATHS = new Set(['/billing'])

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  skipOnboardingCheck = false,
}) => {
  const { user, loading } = useAuth()
  const { isGated } = useBillingGate()
  const location = useLocation()
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null)

  // Check onboarding status once per session when the user first becomes available.
  // onboardingDone is never reset to null after being set — subsequent navigations
  // use the cached result to avoid flash-redirects while the async check runs.
  useEffect(() => {
    if (!user || skipOnboardingCheck || onboardingDone !== null) return
    hasCompletedOnboarding(user.id).then(done => {
      setOnboardingDone(done)
    })
  }, [user, skipOnboardingCheck, onboardingDone])

  // Wait for Supabase auth to resolve before making any routing decisions
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[var(--surface-bg)]">
        <div className="text-center">
          <div className="inline-block animate-spin">⌛</div>
          <p className="text-[var(--text-secondary)] mt-4">Loading...</p>
        </div>
      </div>
    )
  }

  // Not authenticated → send to login, preserving intended destination
  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Billing gate — trial expired or subscription lapsed.
  if (isGated && !BILLING_EXEMPT_PATHS.has(location.pathname)) {
    return <Navigate to="/billing" replace />
  }

  // Onboarding gate — redirect new users to /onboarding
  if (!skipOnboardingCheck) {
    // Still checking
    if (onboardingDone === null) {
      return (
        <div className="flex items-center justify-center h-screen bg-[var(--surface-bg)]">
          <div className="text-center">
            <div className="inline-block animate-spin">⌛</div>
            <p className="text-[var(--text-secondary)] mt-4">Loading...</p>
          </div>
        </div>
      )
    }
    if (!onboardingDone) {
      return <Navigate to="/onboarding" replace />
    }
  }

  return <>{children}</>
}

export default ProtectedRoute
