import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Loader2 } from 'lucide-react'

import AuthShell from '../components/AuthShell.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { requestPasswordReset } from '../services/auth.js'
import { useToast } from '../context/ToastContext.jsx'

export default function Login() {
  const { login, authLoading } = useAuth()
  const { notify } = useToast()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [showReset, setShowReset] = useState(false)
  const [resetEmail, setResetEmail] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()

    setError('')

    const normalizedEmail = email.trim().toLowerCase()

    try {
      /*
       * Login + encryption unlock
       */
      const loggedInUser = await login(
        normalizedEmail,
        password
      )

      /*
       * Decide whether this is the first login
       * for this account on this browser.
       *
       * IMPORTANT:
       * This stores only a tiny boolean flag.
       *
       * We DO NOT store:
       * - password
       * - encryption key
       * - workbook data
       */
      const loginKey =
        `datalens.firstLogin.${normalizedEmail}`

      const hasLoggedInBefore =
        localStorage.getItem(loginKey)

      const displayName =
        loggedInUser?.name?.trim() ||
        normalizedEmail.split('@')[0] ||
        'there'

      if (!hasLoggedInBefore) {
        /*
         * First successful login
         */
        notify(
          `Welcome, ${displayName}! 👋`,
          'success'
        )

        localStorage.setItem(
          loginKey,
          'true'
        )
      } else {
        /*
         * Returning user
         */
        notify(
          `Welcome back, ${displayName}! 👋`,
          'success'
        )
      }

      /*
       * Go to workspace
       */
      navigate('/app', {
        replace: true,
      })
    } catch (err) {
      console.error(
        'Login error:',
        err
      )

      setError(
        err?.message ||
          'Could not sign in.'
      )
    }
  }

  async function handleReset(e) {
    e.preventDefault()

    try {
      await requestPasswordReset(
        resetEmail
      )

      /*
       * Always show the same message so we don't
       * reveal whether an account exists.
       */
      notify(
        'If an account exists for this email, a password reset link has been sent.',
        'info'
      )

      setShowReset(false)
    } catch (err) {
      console.error(
        'Password reset error:',
        err
      )

      notify(
        err?.message ||
          'Could not process the password reset request.',
        'error'
      )
    }
  }

  /*
   * Password reset screen
   */
  if (showReset) {
    return (
      <AuthShell
        title="Reset your password"
        subtitle="Enter your account email."
      >
        <form
          onSubmit={handleReset}
          className="space-y-4"
        >
          <div>
            <label
              htmlFor="reset-email"
              className="block text-sm text-ink-muted mb-1.5"
            >
              Email
            </label>

            <input
              id="reset-email"
              type="email"
              autoComplete="email"
              required
              value={resetEmail}
              onChange={(e) =>
                setResetEmail(
                  e.target.value
                )
              }
              className="w-full rounded-lg border border-border bg-surface-sunken px-3 py-2.5 text-sm text-ink focus:border-accent outline-none"
              placeholder="you@company.com"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-accent hover:bg-accent-strong transition-colors text-white text-sm font-medium rounded-lg py-2.5"
          >
            Send reset link
          </button>

          <button
            type="button"
            onClick={() =>
              setShowReset(false)
            }
            className="w-full text-sm text-ink-muted hover:text-ink transition-colors"
          >
            Back to sign in
          </button>
        </form>
      </AuthShell>
    )
  }

  /*
   * Login screen
   */
  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to your DataLens workspace."
      footer={
        <span>
          Don't have an account?{' '}
          <Link
            to="/signup"
            className="text-accent hover:text-accent-strong font-medium"
          >
            Create one
          </Link>
        </span>
      }
    >
      <form
        onSubmit={handleSubmit}
        className="space-y-4"
      >
        {/* Email */}
        <div>
          <label
            htmlFor="email"
            className="block text-sm text-ink-muted mb-1.5"
          >
            Email
          </label>

          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) =>
              setEmail(
                e.target.value
              )
            }
            className="w-full rounded-lg border border-border bg-surface-sunken px-3 py-2.5 text-sm text-ink focus:border-accent outline-none"
            placeholder="you@company.com"
          />
        </div>

        {/* Password */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor="password"
              className="block text-sm text-ink-muted"
            >
              Password
            </label>

            <button
              type="button"
              onClick={() =>
                setShowReset(true)
              }
              className="text-xs text-accent hover:text-accent-strong"
            >
              Forgot password?
            </button>
          </div>

          <div className="relative">
            <input
              id="password"
              type={
                showPassword
                  ? 'text'
                  : 'password'
              }
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) =>
                setPassword(
                  e.target.value
                )
              }
              className="w-full rounded-lg border border-border bg-surface-sunken px-3 py-2.5 pr-10 text-sm text-ink focus:border-accent outline-none"
              placeholder="••••••••"
            />

            <button
              type="button"
              onClick={() =>
                setShowPassword(
                  (current) =>
                    !current
                )
              }
              aria-label={
                showPassword
                  ? 'Hide password'
                  : 'Show password'
              }
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink"
            >
              {showPassword ? (
                <EyeOff size={16} />
              ) : (
                <Eye size={16} />
              )}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <p className="text-sm text-rose-400">
            {error}
          </p>
        )}

        {/* Login button */}
        <button
          type="submit"
          disabled={authLoading}
          className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent-strong disabled:opacity-60 transition-colors text-white text-sm font-medium rounded-lg py-2.5"
        >
          {authLoading && (
            <Loader2
              size={15}
              className="animate-spin"
            />
          )}

          {authLoading
            ? 'Signing in...'
            : 'Sign in'}
        </button>
      </form>
    </AuthShell>
  )
}