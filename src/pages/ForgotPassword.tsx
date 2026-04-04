import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

export const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const { resetPassword } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)
    setLoading(true)

    try {
      if (!email) {
        throw new Error('Please enter your email address')
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        throw new Error('Please enter a valid email address')
      }

      await resetPassword(email)
      setSuccess(true)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send reset link'
      setError(message)
    } finally {
      setLoading(false)
    }
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
        <div className="bg-[var(--surface2)] border border-[var(--border)] rounded-xl p-8 shadow-[var(--shadow-panel)]">
          <h2 className="text-xl font-semibold text-[var(--text)] mb-2 text-center">
            Reset Password
          </h2>
          <p className="text-sm text-[var(--text-2)] text-center mb-6">
            Enter your email and we'll send you a link to reset your password.
          </p>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-900 bg-opacity-20 border border-[var(--red)] rounded text-[var(--red-l)] text-sm">
              {error}
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="mb-6 p-4 bg-green-900 bg-opacity-20 border border-[var(--green)] rounded text-[var(--green-l)] text-sm">
              <div className="font-semibold mb-1">Check your email</div>
              <div>We've sent a password reset link to {email}</div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
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
                disabled={loading || success}
              />
            </div>

            {/* Send Reset Link Button */}
            <button
              type="submit"
              disabled={loading || success}
              className="w-full mt-6 py-3 px-4 rounded-lg font-semibold text-sm btn-primary btn-primary-gold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>

          {/* Back to Sign In Link */}
          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="text-sm text-[var(--blue-l)] hover:text-[var(--blue)] transition-colors"
            >
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ForgotPassword
