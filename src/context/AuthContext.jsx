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

/* =========================================================
   PERSISTENT ENCRYPTION KEY STORAGE

   The encryption key is stored as a CryptoKey inside
   IndexedDB.

   We NEVER store:
   - user password
   - password-derived key
   - plaintext workbook data

   Supabase never receives the DEK.
========================================================= */

const DB_NAME = 'datalens-secure-storage'
const DB_VERSION = 1
const STORE_NAME = 'encryption-keys'

const openEncryptionDB = () => {
  return new Promise((resolve, reject) => {
    if (
      typeof window === 'undefined' ||
      !window.indexedDB
    ) {
      reject(
        new Error(
          'Secure browser storage is not available.',
        ),
      )

      return
    }

    const request =
      window.indexedDB.open(
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
      resolve(
        request.result,
      )
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

/* =========================================================
   SAVE ENCRYPTION KEY
========================================================= */

const savePersistentEncryptionKey =
  async (
    userId,
    encryptionKey,
  ) => {
    if (
      !userId ||
      !encryptionKey
    ) {
      return
    }

    const db =
      await openEncryptionDB()

    return new Promise(
      (
        resolve,
        reject,
      ) => {
        const transaction =
          db.transaction(
            STORE_NAME,
            'readwrite',
          )

        const store =
          transaction.objectStore(
            STORE_NAME,
          )

        /*
         * CryptoKey is structured-cloneable and can
         * be stored by IndexedDB without converting
         * it to plaintext.
         */
        store.put(
          encryptionKey,
          userId,
        )

        transaction.oncomplete =
          () => {
            db.close()
            resolve()
          }

        transaction.onerror =
          () => {
            db.close()

            reject(
              transaction.error ||
                new Error(
                  'Could not save encryption key.',
                ),
            )
          }
      },
    )
  }

/* =========================================================
   GET PERSISTENT ENCRYPTION KEY
========================================================= */

const getPersistentEncryptionKey =
  async (
    userId,
  ) => {
    if (!userId) {
      return null
    }

    try {
      const db =
        await openEncryptionDB()

      return await new Promise(
        (
          resolve,
          reject,
        ) => {
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
            store.get(
              userId,
            )

          request.onsuccess =
            () => {
              db.close()

              resolve(
                request.result ||
                  null,
              )
            }

          request.onerror =
            () => {
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
    } catch (error) {
      console.error(
        'Could not restore persistent encryption key:',
        error,
      )

      return null
    }
  }

/* =========================================================
   DELETE PERSISTENT ENCRYPTION KEY
========================================================= */

const deletePersistentEncryptionKey =
  async (
    userId,
  ) => {
    if (!userId) {
      return
    }

    try {
      const db =
        await openEncryptionDB()

      await new Promise(
        (
          resolve,
          reject,
        ) => {
          const transaction =
            db.transaction(
              STORE_NAME,
              'readwrite',
            )

          const store =
            transaction.objectStore(
              STORE_NAME,
            )

          store.delete(
            userId,
          )

          transaction.oncomplete =
            () => {
              db.close()
              resolve()
            }

          transaction.onerror =
            () => {
              db.close()

              reject(
                transaction.error ||
                  new Error(
                    'Could not delete encryption key.',
                  ),
              )
            }
        },
      )
    } catch (error) {
      console.error(
        'Could not delete persistent encryption key:',
        error,
      )
    }
  }

/* =========================================================
   USER SESSION NORMALIZER
========================================================= */

const buildSession = (
  user,
) => {
  if (!user) {
    return null
  }

  return {
    userId: user.id,

    name:
      user.user_metadata?.name ||
      user.user_metadata?.full_name ||
      '',

    email:
      user.email || '',
  }
}

/* =========================================================
   AUTH PROVIDER
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

  /*
   * Actual AES DEK currently available
   * to the application.
   */
  const [
    encryptionKey,
    setEncryptionKey,
  ] = useState(null)

  /*
   * true = application can safely use encrypted data.
   */
  const [
    encryptionReady,
    setEncryptionReady,
  ] = useState(false)

  /* =======================================================
     RESTORE SESSION + ENCRYPTION KEY
  ======================================================= */

  useEffect(() => {
    let mounted = true

    const loadSession =
      async () => {
        try {
          const currentSession =
            await authService.getSession()

          if (!mounted) {
            return
          }

          const user =
            currentSession?.user

          if (!user) {
            setSession(null)
            setEncryptionKey(null)
            setEncryptionReady(false)
            return
          }

          /*
           * Restore normal Supabase session.
           */
          const nextSession =
            buildSession(
              user,
            )

          setSession(
            nextSession,
          )

          /*
           * IMPORTANT:
           *
           * We do NOT ask for the password again.
           *
           * Try restoring the already unlocked DEK
           * from browser IndexedDB.
           */
          const savedKey =
            await getPersistentEncryptionKey(
              user.id,
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
          } else if (
            mounted
          ) {
            /*
             * User is authenticated but this browser
             * does not have the local encryption key.
             *
             * This can happen on:
             * - new browser
             * - new device
             * - cleared site data
             */
            setEncryptionKey(
              null,
            )

            setEncryptionReady(
              false,
            )
          }
        } catch (error) {
          console.error(
            'Failed to restore auth/encryption session:',
            error,
          )

          if (mounted) {
            setSession(null)
            setEncryptionKey(null)
            setEncryptionReady(false)
          }
        } finally {
          if (mounted) {
            setAuthLoading(
              false,
            )
          }
        }
      }

    loadSession()

    /* =====================================================
       SUPABASE AUTH STATE
    ===================================================== */

    const {
      data: {
        subscription,
      },
    } =
      supabase.auth.onAuthStateChange(
        (
          event,
          supabaseSession,
        ) => {
          if (!mounted) {
            return
          }

          const user =
            supabaseSession?.user ||
            null

          if (user) {
            setSession(
              buildSession(
                user,
              ),
            )

            /*
             * Do NOT clear encryptionKey here.
             *
             * SIGNED_IN can fire during session
             * restoration and clearing the key here
             * would cause the exact problem we are
             * fixing.
             */
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

  /* =======================================================
     LOGIN
  ======================================================= */

  const login = useCallback(
    async (
      email,
      password,
    ) => {
      setAuthLoading(
        true,
      )

      setEncryptionReady(
        false,
      )

      try {
        /*
         * 1. Authenticate user.
         */
        const result =
          await authService.login(
            {
              email,
              password,
            },
          )

        const user =
          result?.user

        if (!user) {
          throw new Error(
            'Login succeeded but user information was not returned.',
          )
        }

        /*
         * 2. Unlock DEK using password.
         */
        const dek =
          await unlockUserEncryption(
            user.id,
            password,
          )

        /*
         * 3. Keep key in memory.
         */
        setEncryptionKey(
          dek,
        )

        /*
         * 4. IMPORTANT:
         *
         * Persist the CryptoKey locally so that
         * page refresh / npm restart does not
         * require another login.
         */
        await savePersistentEncryptionKey(
          user.id,
          dek,
        )

        setEncryptionReady(
          true,
        )

        const nextSession =
          buildSession(
            user,
          )

        setSession(
          nextSession,
        )

        return nextSession
      } catch (error) {
        console.error(
          'Login/encryption unlock error:',
          error,
        )

        setEncryptionKey(
          null,
        )

        setEncryptionReady(
          false,
        )

        throw error
      } finally {
        setAuthLoading(
          false,
        )
      }
    },
    [],
  )

  /* =======================================================
     REGISTER
  ======================================================= */

  const register =
    useCallback(
      async (
        payload,
      ) => {
        setAuthLoading(
          true,
        )

        try {
          const result =
            await authService.signup(
              payload,
            )

          /*
           * If Supabase immediately provides a session,
           * unlock encryption immediately.
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

            setEncryptionKey(
              dek,
            )

            await savePersistentEncryptionKey(
              user.id,
              dek,
            )

            setEncryptionReady(
              true,
            )

            const nextSession =
              buildSession(
                user,
              )

            setSession(
              nextSession,
            )

            return {
              ...result,
              session:
                nextSession,
            }
          }

          /*
           * Email confirmation enabled.
           *
           * User has no active session yet.
           */
          if (
            result?.user
          ) {
            setSession(
              buildSession(
                result.user,
              ),
            )
          }

          return result
        } finally {
          setAuthLoading(
            false,
          )
        }
      },
      [],
    )

  /* =======================================================
     LOGOUT
  ======================================================= */

  const logout =
    useCallback(
      async () => {
        setAuthLoading(
          true,
        )

        const userId =
          session?.userId

        try {
          /*
           * Supabase logout.
           */
          await authService.logout()

          /*
           * IMPORTANT:
           *
           * Remove the persistent DEK when the user
           * explicitly logs out.
           */
          if (userId) {
            await deletePersistentEncryptionKey(
              userId,
            )
          }

          /*
           * Clear memory.
           */
          setEncryptionKey(
            null,
          )

          setEncryptionReady(
            false,
          )

          setSession(
            null,
          )
        } finally {
          setAuthLoading(
            false,
          )
        }
      },
      [session],
    )

  /* =======================================================
     UPDATE PROFILE
  ======================================================= */

  const updateProfile =
    useCallback(
      async (
        updates,
      ) => {
        if (!session) {
          return null
        }

        const {
          data,
          error,
        } =
          await supabase.auth.updateUser(
            {
              data: updates,
            },
          )

        if (error) {
          console.error(
            'Update profile error:',
            error,
          )

          throw error
        }

        const user =
          data.user

        const nextSession =
          buildSession(
            user,
          )

        setSession(
          nextSession,
        )

        return nextSession
      },
      [session],
    )

  /* =======================================================
     CONTEXT VALUE
  ======================================================= */

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
   USE AUTH
========================================================= */

export function useAuth() {
  const ctx =
    useContext(
      AuthContext,
    )

  if (!ctx) {
    throw new Error(
      'useAuth must be used within AuthProvider',
    )
  }

  return ctx
}