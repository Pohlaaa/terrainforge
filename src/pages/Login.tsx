import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

export const Login: React.FC = () => {
  const { user, signIn } = useAuth()
  const navigate = useNavigate()

  // Redirect authenticated users away from login
  useEffect(() => {
    if (user) navigate('/', { replace: true })
  }, [user, navigate])

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (!email || !password) {
        throw new Error('Please enter both email and password')
      }

      await signIn(email, password)
      // Auth state change handler loads org + data; AppLayout handles
      // onboarding redirect for new users. Navigate to root and let
      // HomeRoute redirect to /dashboard.
      navigate('/', { replace: true })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to sign in'
      setError(message)
    } finally {
      setLoading(false)
    }
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
            Sign In
          </h2>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-900 bg-opacity-20 border border-[var(--red)] rounded text-[var(--red-l)] text-sm">
              {error}
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

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-6 py-3 px-4 rounded-lg font-semibold text-sm btn-primary btn-primary-gold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>

          {/* Forgot Password Link */}
          <div className="mt-4 text-center">
            <Link
              to="/forgot-password"
              className="text-sm text-[var(--blue-l)] hover:text-[var(--blue)] transition-colors"
            >
              Forgot password?
            </Link>
          </div>

          {/* Sign Up Link */}
          <div className="mt-6 text-center text-sm text-[var(--text-2)]">
            Don't have an account?{' '}
            <Link
              to="/signup"
              className="text-[var(--green-l)] hover:text-[var(--green-xl)] transition-colors font-semibold"
            >
              Start your free trial
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login
