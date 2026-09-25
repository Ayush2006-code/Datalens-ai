// src/context/AuthContext.jsx

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

const DB_NAME = 'datalens-secure-storage'
const STORE_NAME = 'encryption-keys'
const DB_VERSION = 1

/* =========================================================
   SESSION NORMALIZER
========================================================= */

function normalizeUser(user) {
  if (!user) {
    return null
  }

  return {
    userId: user.id,
    name:
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      '',
    email: user.email || '',
  }
}

function normalizeSession(session) {
  if (!session?.user) {
    return null
  }

  return normalizeUser(session.user)
}

/* =========================================================
   INDEXED DB
========================================================= */

function openEncryptionDB() {
  return new Promise((resolve, reject) => {
    if (
      typeof window === 'undefined' ||
      !window.indexedDB
    ) {
      reject(
        new Error(
          'IndexedDB is not available in this browser.',
        ),
      )

      return
    }

    const request = window.indexedDB.open(
      DB_NAME,
      DB_VERSION,
    )

    request.onupgradeneeded = () => {
      const db = request.result

      if (
        !db.objectStoreNames.contains(
          STORE_NAME,
        )
      ) {
        db.createObjectStore(
          STORE_NAME,
        )
      }
    }

    request.onsuccess = () => {
      resolve(request.result)
    }

    request.onerror = () => {
      reject(
        request.error ||
          new Error(
            'Could not open secure browser storage.',
          ),
      )
    }
  })
}

async function savePersistentEncryptionKey(
  userId,
  encryptionKey,
) {
  if (!userId || !encryptionKey) {
    throw new Error(
      'Encryption key cannot be saved.',
    )
  }

  const db =
    await openEncryptionDB()

  return new Promise(
    (resolve, reject) => {
      const transaction =
        db.transaction(
          STORE_NAME,
          'readwrite',
        )

      const store =
        transaction.objectStore(
          STORE_NAME,
        )

      const request =
        store.put(
          encryptionKey,
          userId,
        )

      request.onsuccess = () => {
        db.close()
        resolve(true)
      }

      request.onerror = () => {
        db.close()

        reject(
          request.error ||
            new Error(
              'Could not save encryption key.',
            ),
        )
      }
    },
  )
}

async function getPersistentEncryptionKey(
  userId,
) {
  if (!userId) {
    return null
  }

  const db =
    await openEncryptionDB()

  return new Promise(
    (resolve, reject) => {
      const transaction =
        db.transaction(
          STORE_NAME,
          'readonly',
        )

      const store =
        transaction.objectStore(
          STORE_NAME,
        )

      const request =
        store.get(userId)

      request.onsuccess = () => {
        db.close()
        resolve(
          request.result || null,
        )
      }

      request.onerror = () => {
        db.close()

        reject(
          request.error ||
            new Error(
              'Could not read encryption key.',
            ),
        )
      }
    },
  )
}

async function deletePersistentEncryptionKey(
  userId,
) {
  if (!userId) {
    return
  }

  try {
    const db =
      await openEncryptionDB()

    await new Promise(
      (resolve, reject) => {
        const transaction =
          db.transaction(
            STORE_NAME,
            'readwrite',
          )

        const store =
          transaction.objectStore(
            STORE_NAME,
          )

        const request =
          store.delete(userId)

        request.onsuccess = () => {
          db.close()
          resolve()
        }

        request.onerror = () => {
          db.close()
          reject(
            request.error,
          )
        }
      },
    )
  } catch (error) {
    console.error(
      'Failed to delete persistent encryption key:',
      error,
    )
  }
}

/* =========================================================
   PROVIDER
========================================================= */

export function AuthProvider({
  children,
}) {
  const [
    session,
    setSession,
  ] = useState(null)

  const [
    authLoading,
    setAuthLoading,
  ] = useState(true)

  const [
    encryptionKey,
    setEncryptionKey,
  ] = useState(null)

  const [
    encryptionReady,
    setEncryptionReady,
  ] = useState(false)

  /* =======================================================
     RESTORE SESSION + ENCRYPTION KEY
  ======================================================= */

  useEffect(() => {
    let mounted = true

    const restoreAuthentication =
      async () => {
        try {
          setAuthLoading(true)

          const supabaseSession =
            await authService.getSession()

          if (!mounted) {
            return
          }

          const normalized =
            normalizeSession(
              supabaseSession,
            )

          setSession(normalized)

          if (!normalized?.userId) {
            setEncryptionKey(null)
            setEncryptionReady(false)
            return
          }

          /*
           * Try restoring the already-unlocked
           * encryption key from IndexedDB.
           *
           * We NEVER store the password.
           */
          try {
            const savedKey =
              await getPersistentEncryptionKey(
                normalized.userId,
              )

            if (
              mounted &&
              savedKey
            ) {
              setEncryptionKey(
                savedKey,
              )

              setEncryptionReady(
                true,
              )
            } else if (mounted) {
              setEncryptionKey(null)
              setEncryptionReady(false)
            }
          } catch (error) {
            console.error(
              'Failed to restore encryption key:',
              error,
            )

            if (mounted) {
              setEncryptionKey(null)
              setEncryptionReady(false)
            }
          }
        } catch (error) {
          console.error(
            'Failed to restore authentication:',
            error,
          )

          if (mounted) {
            setSession(null)
            setEncryptionKey(null)
            setEncryptionReady(false)
          }
        } finally {
          if (mounted) {
            setAuthLoading(false)
          }
        }
      }

    restoreAuthentication()

    /*
     * Listen for Supabase authentication changes.
     */
    const {
      data: {
        subscription,
      },
    } =
      supabase.auth.onAuthStateChange(
        async (
          event,
          supabaseSession,
        ) => {
          if (!mounted) {
            return
          }

          /*
           * SIGNED_OUT is special:
           * completely clear the local encryption state.
           */
          if (
            event ===
            'SIGNED_OUT'
          ) {
            setSession(null)
            setEncryptionKey(null)
            setEncryptionReady(false)
            return
          }

          const normalized =
            normalizeSession(
              supabaseSession,
            )

          setSession(normalized)

          /*
           * Do NOT clear an already-unlocked
           * encryption key on SIGNED_IN/TOKEN_REFRESH.
           *
           * Login() is responsible for unlocking it.
           */
        },
      )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  /* =========================================================
     LOGIN
  ========================================================= */

  const login = useCallback(
    async (
      email,
      password,
    ) => {
      setAuthLoading(true)

      try {
        /*
         * Step 1:
         * Authenticate with Supabase.
         */
        const result =
          await authService.login({
            email,
            password,
          })

        const user =
          result?.user

        if (!user?.id) {
          throw new Error(
            'Login succeeded but user information is missing.',
          )
        }

        const normalized =
          normalizeUser(user)

        setSession(normalized)

        /*
         * Step 2:
         * Unlock the user's encryption profile
         * using the password entered during login.
         *
         * IMPORTANT:
         * Password is never stored.
         */
        const dek =
          await unlockUserEncryption(
            user.id,
            password,
          )

        if (!dek) {
          throw new Error(
            'Could not unlock your encrypted data.',
          )
        }

        /*
         * Step 3:
         * Keep DEK in React memory.
         */
        setEncryptionKey(dek)

        /*
         * Step 4:
         * Persist the CryptoKey in IndexedDB
         * so a normal page refresh does not
         * immediately lose the unlocked state.
         */
        await savePersistentEncryptionKey(
          user.id,
          dek,
        )

        setEncryptionReady(
          true,
        )

        return normalized
      } catch (error) {
        console.error(
          'Login/encryption error:',
          error,
        )

        setEncryptionKey(null)
        setEncryptionReady(false)

        throw error
      } finally {
        setAuthLoading(false)
      }
    },
    [],
  )

  /* =========================================================
     REGISTER
  ========================================================= */

  const register = useCallback(
    async (payload) => {
      setAuthLoading(true)

      try {
        const result =
          await authService.signup(
            payload,
          )

        /*
         * Email confirmation may be enabled.
         *
         * In that case Supabase returns no active
         * session and encryption cannot be unlocked yet.
         */
        if (
          !result?.session ||
          !result?.user
        ) {
          setSession(null)
          setEncryptionKey(null)
          setEncryptionReady(false)

          return result
        }

        const user =
          result.user

        const normalized =
          normalizeUser(user)

        setSession(normalized)

        /*
         * Unlock encryption immediately
         * if signup returned an active session.
         */
        const dek =
          await unlockUserEncryption(
            user.id,
            payload.password,
          )

        if (!dek) {
          throw new Error(
            'Account created, but encrypted data could not be unlocked.',
          )
        }

        setEncryptionKey(dek)

        await savePersistentEncryptionKey(
          user.id,
          dek,
        )

        setEncryptionReady(
          true,
        )

        return {
          ...result,
          user: normalized,
        }
      } catch (error) {
        console.error(
          'Registration/encryption error:',
          error,
        )

        setEncryptionKey(null)
        setEncryptionReady(false)

        throw error
      } finally {
        setAuthLoading(false)
      }
    },
    [],
  )

  /* =========================================================
     LOGOUT
  ========================================================= */

  const logout = useCallback(
    async () => {
      setAuthLoading(true)

      const currentUserId =
        session?.userId

      try {
        await authService.logout()

        if (currentUserId) {
          await deletePersistentEncryptionKey(
            currentUserId,
          )
        }

        setSession(null)
        setEncryptionKey(null)
        setEncryptionReady(false)
      } finally {
        setAuthLoading(false)
      }
    },
    [session?.userId],
  )

  /* =========================================================
     UPDATE PROFILE
  ========================================================= */

  const updateProfile =
    useCallback(
      async (updates) => {
        if (!session?.userId) {
          return null
        }

        const result =
          await supabase.auth.updateUser({
            data: updates,
          })

        if (result.error) {
          throw result.error
        }

        const normalized =
          normalizeUser(
            result.data.user,
          )

        setSession(
          normalized,
        )

        return normalized
      },
      [session?.userId],
    )

  /* =========================================================
     CONTEXT VALUE
  ========================================================= */

  const value =
    useMemo(
      () => ({
        session,

        user: session,

        authLoading,

        login,

        register,

        logout,

        updateProfile,

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
    <AuthContext.Provider
      value={value}
    >
      {children}
    </AuthContext.Provider>
  )
}

/* =========================================================
   HOOK
========================================================= */

export function useAuth() {
  const context =
    useContext(
      AuthContext,
    )

  if (!context) {
    throw new Error(
      'useAuth must be used within AuthProvider',
    )
  }

  return context
}