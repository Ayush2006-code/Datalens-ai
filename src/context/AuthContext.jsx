import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

import * as authService from '../services/auth.js'
import { supabase } from '../services/supabaseClient.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    const loadSession = async () => {
      try {
        const currentSession = await authService.getSession()

        if (mounted) {
          setSession(currentSession)
        }
      } catch (error) {
        console.error('Failed to load auth session:', error)

        if (mounted) {
          setSession(null)
        }
      } finally {
        if (mounted) {
          setAuthLoading(false)
        }
      }
    }

    loadSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, supabaseSession) => {
        if (!mounted) return

        const user = supabaseSession?.user ?? null

        setSession(
          user
            ? {
                userId: user.id,
                name: user.user_metadata?.name || '',
                email: user.email || '',
              }
            : null
        )
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const login = useCallback(async (email, password) => {
    setAuthLoading(true)

    try {
      const s = await authService.signIn({
        email,
        password,
      })

      setSession(s)
      return s
    } finally {
      setAuthLoading(false)
    }
  }, [])

  const register = useCallback(async (payload) => {
    setAuthLoading(true)

    try {
      const s = await authService.signUp(payload)

      if (s) {
        setSession(s)
      }

      return s
    } finally {
      setAuthLoading(false)
    }
  }, [])

  const logout = useCallback(async () => {
    setAuthLoading(true)

    try {
      await authService.signOut()
      setSession(null)
    } finally {
      setAuthLoading(false)
    }
  }, [])

  const updateProfile = useCallback(
    async (updates) => {
      if (!session) return null

      const s = await authService.updateProfile(
        session.userId,
        updates
      )

      setSession(s)
      return s
    },
    [session]
  )

  const value = useMemo(
    () => ({
      session,
      user: session,
      authLoading,
      login,
      register,
      logout,
      updateProfile,
    }),
    [
      session,
      authLoading,
      login,
      register,
      logout,
      updateProfile,
    ]
  )

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)

  if (!ctx) {
    throw new Error(
      'useAuth must be used within AuthProvider'
    )
  }

  return ctx
}