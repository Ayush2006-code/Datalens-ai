import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import * as authService from '../services/auth.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => authService.getSession())
  const [authLoading, setAuthLoading] = useState(false)

  const login = useCallback(async (email, password) => {
    setAuthLoading(true)
    try {
      const s = await authService.signIn({ email, password })
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
      setSession(s)
      return s
    } finally {
      setAuthLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    authService.signOut()
    setSession(null)
  }, [])

  const updateProfile = useCallback(async (updates) => {
    if (!session) return
    const s = await authService.updateProfile(session.userId, updates)
    setSession(s)
    return s
  }, [session])

  const value = useMemo(
    () => ({ session, user: session, authLoading, login, register, logout, updateProfile }),
    [session, authLoading, login, register, logout, updateProfile]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
