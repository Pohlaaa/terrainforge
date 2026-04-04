import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/services/supabase'

export const AuthCallback: React.FC = () => {
  const navigate = useNavigate()
  const [status, setStatus] = useState<'loading' | 'error'>('loading')

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        navigate('/reset-password', { replace: true })
      } else if (event === 'SIGNED_IN') {
        navigate('/', { replace: true })
      } else if (event === 'TOKEN_REFRESHED') {
        navigate('/', { replace: true })
      }
    })

    const timeout = setTimeout(() => setStatus('error'), 5000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [navigate])

  if (status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-[var(--surface)]">
        <h1 className="text-xl font-semibold text-[var(--text)]">Something went wrong</h1>
        <p className="text-[var(--text-2)]">The link may have expired. Please try again.</p>
        <a href="/login" className="text-[var(--green-l)] hover:underline">Back to login</a>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-[var(--surface)]">
      <div className="animate-spin h-8 w-8 border-2 border-[var(--green-l)] border-t-transparent rounded-full" />
      <p className="text-[var(--text-2)]">Verifying your account...</p>
    </div>
  )
}

export default AuthCallback
