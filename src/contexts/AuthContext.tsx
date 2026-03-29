import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/services/supabase'
import { useOrgStore } from '@/stores/orgStore'
import { useProjectStore } from '@/stores/projectStore'
import { useCrewStore } from '@/stores/crewStore'
import { useMaterialStore } from '@/stores/materialStore'
import { useEquipmentStore } from '@/stores/equipmentStore'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signUp: (email: string, password: string, metadata?: { full_name?: string; company_name?: string }) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for existing session on mount
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        setSession(session)
        setUser(session?.user || null)
      } catch (error) {
        console.error('Error checking session:', error)
      } finally {
        setLoading(false)
      }
    }

    checkSession()

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        console.log('[TF-DEBUG] onAuthStateChange:', _event, session?.user?.id)
        if (_event === 'SIGNED_OUT') {
          useProjectStore.getState().reset()
          useCrewStore.getState().reset()
          useMaterialStore.getState().reset()
          useEquipmentStore.getState().reset()
          useProjectStore.persist.clearStorage()
          useCrewStore.persist.clearStorage()
          useMaterialStore.persist.clearStorage()
          useEquipmentStore.persist.clearStorage()
        }
        if (_event === 'SIGNED_IN' && session) {
          useProjectStore.getState().fetchProjects()
          useCrewStore.getState().fetchCrew()
          useMaterialStore.getState().fetchMaterials()
          useEquipmentStore.getState().fetchEquipment()
        }
        setSession(session)
        setUser(session?.user || null)
        setLoading(false)
      }
    )

    return () => {
      subscription?.unsubscribe()
    }
  }, [])

  const signUp = async (
    email: string,
    password: string,
    metadata?: { full_name?: string; company_name?: string }
  ) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    })

    if (error) throw error

    // identities.length === 0 means the email is already registered (Supabase
    // silently accepts the request but creates no new identity when email
    // confirmation is enabled and the address is already in use).
    if (data.user?.identities?.length === 0) {
      throw new Error('This email is already registered. Check your inbox for a confirmation link or try signing in.')
    }
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) throw error
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    // Reset in-memory state and clear persisted store data
    useProjectStore.getState().reset()
    useCrewStore.getState().reset()
    useMaterialStore.getState().reset()
    useEquipmentStore.getState().reset()
    useProjectStore.persist.clearStorage()
    useCrewStore.persist.clearStorage()
    useMaterialStore.persist.clearStorage()
    useEquipmentStore.persist.clearStorage()
    useOrgStore.getState().clearOrg()
  }

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (error) throw error
  }

  const value: AuthContextType = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
