import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

export const Signup: React.FC = () => {
  const [fullName, setFullName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { signUp } = useAuth()

  const validateForm = (): boolean => {
    if (!fullName.trim()) {
      setError('Full name is required')
      return false
    }
    if (!companyName.trim()) {
      setError('Company name is required')
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
        company_name: companyName,
      })
      setSuccess(true)
      setTimeout(() => {
        navigate('/onboarding')
      }, 2000)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create account'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[var(--surface)] flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-[var(--surface2)] border border-[var(--border)] rounded-lg p-8 text-center">
            <div className="text-4xl text-[var(--green-l)] mb-4">✓</div>
            <h2 className="text-xl font-semibold text-[var(--text)] mb-4">
              Account Created Successfully!
            </h2>
            <p className="text-[var(--text-2)] mb-6">
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
    <div className="min-h-screen bg-[var(--surface)] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Brand Section */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <span className="text-4xl text-[var(--green-l)]">⬡</span>
            <h1 className="text-3xl font-serif text-[var(--text)]">TerrainForge</h1>
          </div>
          <p className="text-xs text-[var(--text-4)] font-mono tracking-[0.05em]">
            PHASE 1 · MVP
          </p>
        </div>

        {/* Card */}
        <div className="bg-[var(--surface2)] border border-[var(--border)] rounded-lg p-8">
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

            {/* Company Name Input */}
            <div>
              <label htmlFor="companyName" className="block text-sm text-[var(--text-2)] mb-2">
                Company Name
              </label>
              <input
                id="companyName"
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Your Company"
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
              className="w-full mt-6 py-2 px-4 bg-[var(--green)] hover:bg-[var(--green-l)] text-[var(--surface)] font-semibold rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          {/* Sign In Link */}
          <div className="mt-6 text-center text-sm text-[var(--text-2)]">
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
