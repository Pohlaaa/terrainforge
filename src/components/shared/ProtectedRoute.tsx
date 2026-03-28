import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useBillingGate } from '@/hooks/useBillingGate'

interface ProtectedRouteProps {
  children: React.ReactNode
}

/** Routes that a gated user may still access (billing + auth pages). */
const BILLING_EXEMPT_PATHS = new Set(['/billing'])

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuth()
  const { isGated } = useBillingGate()
  const location = useLocation()

  // Wait for Supabase auth to resolve before making any routing decisions
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[var(--surface)]">
        <div className="text-center">
          <div className="inline-block animate-spin">⌛</div>
          <p className="text-[var(--text-2)] mt-4">Loading...</p>
        </div>
      </div>
    )
  }

  // Not authenticated → send to login, preserving intended destination
  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Billing gate — trial expired or subscription lapsed.
  // Redirect to /billing for all pages except the exempt set.
  // Note: org is null while loading (isGated defaults to false), so there is
  // no flash-redirect before org data arrives.
  if (isGated && !BILLING_EXEMPT_PATHS.has(location.pathname)) {
    return <Navigate to="/billing" replace />
  }

  return <>{children}</>
}

export default ProtectedRoute
