import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import AuthShell from '../components/AuthShell.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { passwordStrength } from '../services/auth.js'

const STRENGTH_COLORS = ['bg-rose-500', 'bg-rose-400', 'bg-amber-400', 'bg-amber-300', 'bg-accent', 'bg-emerald-400']

export default function Signup() {
  const { register, authLoading } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const wantsDemo = searchParams.get('demo') === '1'

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  const strength = passwordStrength(password)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    try {
      await register({ name, email, password, confirmPassword })
      navigate(wantsDemo ? '/app?demo=1' : '/app', { replace: true })
    } catch (err) {
      setError(err.message || 'Could not create your account.')
    }
  }

  return (
    <AuthShell
      title="Create your workspace"
      subtitle="Start turning spreadsheets into dashboards."
      footer={
        <span>
          Already have an account?{' '}
          <Link to="/login" className="text-accent hover:text-accent-strong font-medium">Sign in</Link>
        </span>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm text-ink-muted mb-1.5">Full name</label>
          <input
            id="name"
            type="text"
            required
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface-sunken px-3 py-2.5 text-sm text-ink focus:border-accent outline-none"
            placeholder="Jordan Lee"
          />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm text-ink-muted mb-1.5">Email</label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface-sunken px-3 py-2.5 text-sm text-ink focus:border-accent outline-none"
            placeholder="you@company.com"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm text-ink-muted mb-1.5">Password</label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface-sunken px-3 py-2.5 pr-10 text-sm text-ink focus:border-accent outline-none"
              placeholder="At least 8 characters"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {password && (
            <div className="mt-2">
              <div className="flex gap-1">
                {Array.from({ length: strength.max }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded-full ${i <= strength.score ? STRENGTH_COLORS[strength.score] : 'bg-surface-sunken'}`}
                  />
                ))}
              </div>
              <p className="text-xs text-ink-faint mt-1">{strength.level}</p>
            </div>
          )}
        </div>
        <div>
          <label htmlFor="confirm" className="block text-sm text-ink-muted mb-1.5">Confirm password</label>
          <input
            id="confirm"
            type={showPassword ? 'text' : 'password'}
            required
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface-sunken px-3 py-2.5 text-sm text-ink focus:border-accent outline-none"
            placeholder="Repeat your password"
          />
        </div>

        {error && <p className="text-sm text-rose-400">{error}</p>}

        <button
          type="submit"
          disabled={authLoading}
          className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent-strong disabled:opacity-60 transition-colors text-white text-sm font-medium rounded-lg py-2.5"
        >
          {authLoading && <Loader2 size={15} className="animate-spin" />}
          Create account
        </button>
      </form>
    </AuthShell>
  )
}
