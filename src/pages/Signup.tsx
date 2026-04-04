import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/services/supabase'

export const Signup: React.FC = () => {
  const { user, signUp } = useAuth()
  const navigate = useNavigate()

  // Redirect authenticated users away from signup
  useEffect(() => {
    if (user) navigate('/', { replace: true })
  }, [user, navigate])

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showVerification, setShowVerification] = useState(false)
  const [resendCount, setResendCount] = useState(0)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [resendMessage, setResendMessage] = useState('')
  const validateForm = (): boolean => {
    if (!fullName.trim()) {
      setError('Full name is required')
      return false
    }
    if (!email.trim()) {
      setError('Email is required')
      return false
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address')
      return false
    }
    if (!password) {
      setError('Password is required')
      return false
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return false
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return false
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)

    if (!validateForm()) {
      return
    }

    setLoading(true)

    try {
      await signUp(email, password, {
        full_name: fullName,
      })
      // Check if email confirmation is required
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        // No session = email confirmation required
        setShowVerification(true)
      } else {
        // Auto-confirmed — go to onboarding
        setSuccess(true)
        setTimeout(() => navigate('/onboarding'), 2000)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create account'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) { clearInterval(timer); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [resendCooldown])

  const handleResend = useCallback(async () => {
    if (resendCooldown > 0) return
    setResendMessage('')
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email })
      if (error) {
        // Fallback: re-call signUp which resends confirmation
        const { error: fallbackError } = await supabase.auth.signUp({ email, password })
        if (fallbackError) throw fallbackError
      }
      setResendMessage('Verification email resent!')
      setResendCount(prev => prev + 1)
      setResendCooldown(60)
    } catch (err) {
      setResendMessage(`Failed to resend: ${(err as Error).message}`)
    }
  }, [email, password, resendCooldown])

  if (showVerification) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-xl p-8 text-center shadow-[var(--shadow-panel)]">
            <div className="text-5xl mb-4">&#9993;</div>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">
              Check your email
            </h2>
            <p className="text-[var(--text-secondary)] mb-6">
              We sent a verification link to <strong className="text-[var(--text)]">{email}</strong>. Click the link to activate your account.
            </p>
            {resendMessage && (
              <p className="text-[var(--green-l)] text-sm mb-4">{resendMessage}</p>
            )}
            {resendCount >= 2 ? (
              <p className="text-[var(--text-3)] text-sm mb-4">
                Still not receiving emails? Check your spam folder or try a different email address.
              </p>
            ) : (
              <button
                onClick={handleResend}
                disabled={resendCooldown > 0}
                className="text-sm text-[var(--blue-l)] hover:text-[var(--blue)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {resendCooldown > 0 ? `Resend available in ${resendCooldown}s` : "Didn't receive it? Resend"}
              </button>
            )}
            <div className="mt-6">
              <Link
                to="/login"
                className="text-sm text-[var(--text-3)] hover:text-[var(--text-2)] transition-colors"
              >
                Back to login
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-xl p-8 text-center shadow-[var(--shadow-panel)]">
            <div className="text-4xl text-[var(--brand-primary)] mb-4">✓</div>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">
              Account Created Successfully!
            </h2>
            <p className="text-[var(--text-secondary)] mb-6">
              You'll be redirected to set up your account in a moment.
            </p>
            <Link
              to="/onboarding"
              className="inline-block px-6 py-2 bg-[var(--green)] hover:bg-[var(--green-l)] text-[var(--surface)] font-semibold rounded transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-transparent flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Brand Section */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <span className="text-4xl text-[var(--brand-primary)]">⬡</span>
            <h1 className="text-3xl font-serif text-[var(--text-primary)]">TerrainForge</h1>
          </div>
          <p className="text-xs text-[var(--text-tertiary)] font-mono tracking-[0.05em]">
            Landscaping Project Management
          </p>
        </div>

        {/* Card */}
        <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-xl p-8 shadow-[var(--shadow-panel)]">
          <h2 className="text-xl font-semibold text-[var(--text)] mb-6 text-center">
            Create Account
          </h2>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-900 bg-opacity-20 border border-[var(--red)] rounded text-[var(--red-l)] text-sm">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name Input */}
            <div>
              <label htmlFor="fullName" className="block text-sm text-[var(--text-2)] mb-2">
                Full Name
              </label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Doe"
                className="w-full px-4 py-2 bg-[var(--surface)] border border-[var(--border)] rounded text-[var(--text)] placeholder-[var(--text-3)] focus:outline-none focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)] focus:ring-opacity-30 transition-colors"
                disabled={loading}
              />
            </div>

            {/* Email Input */}
            <div>
              <label htmlFor="email" className="block text-sm text-[var(--text-2)] mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-2 bg-[var(--surface)] border border-[var(--border)] rounded text-[var(--text)] placeholder-[var(--text-3)] focus:outline-none focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)] focus:ring-opacity-30 transition-colors"
                disabled={loading}
              />
            </div>

            {/* Password Input */}
            <div>
              <label htmlFor="password" className="block text-sm text-[var(--text-2)] mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2 bg-[var(--surface)] border border-[var(--border)] rounded text-[var(--text)] placeholder-[var(--text-3)] focus:outline-none focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)] focus:ring-opacity-30 transition-colors"
                disabled={loading}
              />
            </div>

            {/* Confirm Password Input */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm text-[var(--text-2)] mb-2">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2 bg-[var(--surface)] border border-[var(--border)] rounded text-[var(--text)] placeholder-[var(--text-3)] focus:outline-none focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)] focus:ring-opacity-30 transition-colors"
                disabled={loading}
              />
            </div>

            {/* Create Account Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-6 py-3 px-4 btn-primary btn-primary-gold font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed border-none cursor-pointer"
            >
              {loading ? 'Creating Account...' : 'Start Free Trial'}
            </button>
          </form>

          {/* Trial note */}
          <p className="mt-4 text-center text-sm text-[var(--text-tertiary)]">
            Start your 14-day free trial. No credit card required.
          </p>

          {/* Sign In Link */}
          <div className="mt-4 text-center text-sm text-[var(--text-2)]">
            Already have an account?{' '}
            <Link
              to="/login"
              className="text-[var(--green-l)] hover:text-[var(--green-xl)] transition-colors font-semibold"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Signup
