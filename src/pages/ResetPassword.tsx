import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/services/supabase'
import { Button } from '@/components/ui/Button'

export const ResetPassword: React.FC = () => {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (updateError) {
      setError(updateError.message)
    } else {
      setSuccess(true)
      setTimeout(() => navigate('/login', { replace: true }), 2000)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[var(--surface)] flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-[var(--surface2)] border border-[var(--border)] rounded-lg p-8 text-center">
            <div className="text-4xl text-[var(--green-l)] mb-4">&#10003;</div>
            <h2 className="text-xl font-semibold text-[var(--text)] mb-4">Password Updated!</h2>
            <p className="text-[var(--text-2)]">Redirecting to login...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--surface)] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <span className="text-4xl text-[var(--green-l)]">&#x2B21;</span>
            <h1 className="text-3xl font-serif text-[var(--text)]">TerrainForge</h1>
          </div>
        </div>

        <div className="bg-[var(--surface2)] border border-[var(--border)] rounded-lg p-8">
          <h2 className="text-xl font-semibold text-[var(--text)] mb-6 text-center">
            Set New Password
          </h2>

          {error && (
            <div className="mb-6 p-4 bg-red-900 bg-opacity-20 border border-[var(--red)] rounded text-[var(--red-l)] text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm text-[var(--text-2)] mb-2">
                New Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                className="w-full px-4 py-2 bg-[var(--surface)] border border-[var(--border)] rounded text-[var(--text)] placeholder-[var(--text-3)] focus:outline-none focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)] focus:ring-opacity-30 transition-colors"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm text-[var(--text-2)] mb-2">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                className="w-full px-4 py-2 bg-[var(--surface)] border border-[var(--border)] rounded text-[var(--text)] placeholder-[var(--text-3)] focus:outline-none focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)] focus:ring-opacity-30 transition-colors"
                disabled={loading}
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              disabled={loading}
              className="w-full mt-6 py-2 px-4"
            >
              {loading ? 'Updating...' : 'Update Password'}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <Link
              to="/login"
              className="text-sm text-[var(--blue-l)] hover:text-[var(--blue)] transition-colors"
            >
              Back to login
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ResetPassword
