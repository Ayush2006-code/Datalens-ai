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
import {
  unlockUserEncryption,
} from '../services/encryptionService.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  // Encryption key stays only in browser memory.
  const [encryptionKey, setEncryptionKey] = useState(null)
  const [encryptionReady, setEncryptionReady] = useState(false)

  useEffect(() => {
    let mounted = true

    const loadSession = async () => {
      try {
        const currentSession =
          await authService.getSession()

        if (!mounted) return

        if (currentSession?.user) {
          const user = currentSession.user

          setSession({
            userId: user.id,
            name:
              user.user_metadata?.name ||
              user.user_metadata?.full_name ||
              '',
            email: user.email || '',
          })
        } else {
          setSession(null)
        }
      } catch (error) {
        console.error(
          'Failed to load auth session:',
          error,
        )

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

        const user =
          supabaseSession?.user ?? null

        if (user) {
          setSession({
            userId: user.id,
            name:
              user.user_metadata?.name ||
              user.user_metadata?.full_name ||
              '',
            email: user.email || '',
          })
        } else {
          setSession(null)
          setEncryptionKey(null)
          setEncryptionReady(false)
        }
      },
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  /* =====================================================
     LOGIN
  ===================================================== */

  const login = useCallback(
    async (email, password) => {
      setAuthLoading(true)
      setEncryptionReady(false)

      try {
        /*
         * 1. Authenticate with Supabase.
         */
        const result =
          await authService.login({
            email,
            password,
          })

        const user = result?.user

        if (!user) {
          throw new Error(
            'Login succeeded but user information was not returned.',
          )
        }

        /*
         * 2. Unlock the user's encryption key.
         *
         * Password is used only in this function.
         * It is NOT stored in localStorage,
         * sessionStorage, React state, or Supabase.
         */
        const dek =
          await unlockUserEncryption(
            user.id,
            password,
          )

        /*
         * 3. Keep DEK only in browser memory.
         */
        setEncryptionKey(dek)
        setEncryptionReady(true)

        const nextSession = {
          userId: user.id,
          name:
            user.user_metadata?.name ||
            user.user_metadata?.full_name ||
            '',
          email: user.email || '',
        }

        setSession(nextSession)

        return nextSession
      } catch (error) {
        /*
         * If encryption unlock fails, do not leave
         * a partially authenticated encryption state.
         */
        setEncryptionKey(null)
        setEncryptionReady(false)

        throw error
      } finally {
        setAuthLoading(false)
      }
    },
    [],
  )

  /* =====================================================
     REGISTER
  ===================================================== */

  const register = useCallback(
    async (payload) => {
      setAuthLoading(true)

      try {
        /*
         * payload normally contains:
         * email
         * password
         * fullName
         */
        const result =
          await authService.signup(payload)

        /*
         * If Supabase immediately creates a session,
         * unlock the DEK now.
         */
        if (
          result?.session?.user &&
          payload?.password
        ) {
          const user =
            result.session.user

          const dek =
            await unlockUserEncryption(
              user.id,
              payload.password,
            )

          setEncryptionKey(dek)
          setEncryptionReady(true)

          const nextSession = {
            userId: user.id,
            name:
              user.user_metadata?.name ||
              user.user_metadata?.full_name ||
              '',
            email:
              user.email || '',
          }

          setSession(nextSession)

          return {
            ...result,
            session: nextSession,
          }
        }

        /*
         * If email confirmation is enabled,
         * there may not be a session yet.
         */
        if (result?.user) {
          setSession({
            userId: result.user.id,
            name:
              result.user.user_metadata?.name ||
              result.user.user_metadata?.full_name ||
              '',
            email:
              result.user.email || '',
          })
        }

        return result
      } finally {
        setAuthLoading(false)
      }
    },
    [],
  )

  /* =====================================================
     LOGOUT
  ===================================================== */

  const logout = useCallback(
    async () => {
      setAuthLoading(true)

      try {
        await authService.logout()

        /*
         * Destroy the in-memory encryption key.
         */
        setEncryptionKey(null)
        setEncryptionReady(false)
        setSession(null)
      } finally {
        setAuthLoading(false)
      }
    },
    [],
  )

  /* =====================================================
     UPDATE PROFILE
  ===================================================== */

  const updateProfile = useCallback(
    async (updates) => {
      if (!session) return null

      /*
       * Keep compatibility with existing UI.
       *
       * Supabase profile update.
       */
      const {
        data,
        error,
      } = await supabase.auth.updateUser({
        data: updates,
      })

      if (error) {
        console.error(
          'Update profile error:',
          error,
        )

        throw error
      }

      const user = data.user

      const nextSession = {
        userId: user.id,
        name:
          user.user_metadata?.name ||
          user.user_metadata?.full_name ||
          '',
        email:
          user.email || '',
      }

      setSession(nextSession)

      return nextSession
    },
    [session],
  )

  /* =====================================================
     CONTEXT VALUE
  ===================================================== */

  const value = useMemo(
    () => ({
      session,
      user: session,

      authLoading,

      login,
      register,
      logout,
      updateProfile,

      /*
       * Encryption state.
       *
       * Components that need to encrypt/decrypt
       * data can use encryptionKey.
       */
      encryptionKey,
      encryptionReady,
    }),
    [
      session,
      authLoading,
      login,
      register,
      logout,
      updateProfile,
      encryptionKey,
      encryptionReady,
    ],
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
      'useAuth must be used within AuthProvider',
    )
  }

  return ctx
}