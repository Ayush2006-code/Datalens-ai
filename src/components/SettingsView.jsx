import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sun, Moon, LogOut, Save, HardDrive } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { useTheme } from '../context/ThemeContext.jsx'
import { useWorkbook } from '../context/WorkbookContext.jsx'
import { useToast } from '../context/ToastContext.jsx'

function estimateStorageBytes() {
  let total = 0
  try {
    for (const key in localStorage) {
      if (Object.prototype.hasOwnProperty.call(localStorage, key)) {
        total += (localStorage[key]?.length || 0) * 2
      }
    }
  } catch {
    // localStorage may be unavailable
  }
  return total
}

export default function SettingsView() {
  const { session, logout, updateProfile } = useAuth()
  const { theme, setTheme } = useTheme()
  const { workbooks } = useWorkbook()
  const { notify } = useToast()
  const navigate = useNavigate()

  const [name, setName] = useState(session?.name || '')
  const storageBytes = estimateStorageBytes()

  async function handleSaveProfile(e) {
    e.preventDefault()
    try {
      await updateProfile({ name })
      notify('Profile updated.', 'success')
    } catch (err) {
      notify(err.message || 'Could not update profile.', 'error')
    }
  }

  function handleLogout() {
    logout()
    navigate('/', { replace: true })
  }

  return (
    <div className="p-6 md:p-10 max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink mb-1">Settings</h1>
        <p className="text-sm text-ink-muted">Manage your account, appearance, and data.</p>
      </div>

      <section className="rounded-xl2 border border-border bg-surface-raised p-6">
        <h2 className="text-sm font-medium text-ink mb-4">Account</h2>
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div>
            <label htmlFor="settings-name" className="block text-sm text-ink-muted mb-1.5">Full name</label>
            <input
              id="settings-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface-sunken px-3 py-2.5 text-sm text-ink focus:border-accent outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-ink-muted mb-1.5">Email</label>
            <input
              disabled
              value={session?.email || ''}
              className="w-full rounded-lg border border-border bg-surface-sunken px-3 py-2.5 text-sm text-ink-faint cursor-not-allowed"
            />
          </div>
          <button
            type="submit"
            className="flex items-center gap-2 bg-accent hover:bg-accent-strong transition-colors text-white text-sm font-medium rounded-lg px-4 py-2.5"
          >
            <Save size={14} /> Save changes
          </button>
        </form>
        <button
          onClick={handleLogout}
          className="mt-4 flex items-center gap-2 text-sm text-rose-400 hover:text-rose-300 transition-colors"
        >
          <LogOut size={14} /> Log out
        </button>
      </section>

      <section className="rounded-xl2 border border-border bg-surface-raised p-6">
        <h2 className="text-sm font-medium text-ink mb-4">Appearance</h2>
        <div className="flex gap-3">
          <button
            onClick={() => setTheme('dark')}
            className={`flex-1 flex items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm transition-colors ${
              theme === 'dark' ? 'border-accent/50 text-accent bg-accent-soft' : 'border-border text-ink-muted hover:text-ink'
            }`}
          >
            <Moon size={15} /> Dark mode
          </button>
          <button
            onClick={() => setTheme('light')}
            className={`flex-1 flex items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm transition-colors ${
              theme === 'light' ? 'border-accent/50 text-accent bg-accent-soft' : 'border-border text-ink-muted hover:text-ink'
            }`}
          >
            <Sun size={15} /> Light mode
          </button>
        </div>
      </section>

      <section className="rounded-xl2 border border-border bg-surface-raised p-6">
        <h2 className="text-sm font-medium text-ink mb-4 flex items-center gap-2">
          <HardDrive size={15} /> Data & storage
        </h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg bg-surface-sunken border border-border px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-wide text-ink-faint">Saved workbooks</p>
            <p className="font-mono text-ink mt-0.5">{workbooks.length}</p>
          </div>
          <div className="rounded-lg bg-surface-sunken border border-border px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-wide text-ink-faint">Local storage used</p>
            <p className="font-mono text-ink mt-0.5">{(storageBytes / 1024 / 1024).toFixed(2)} MB</p>
          </div>
        </div>
        <p className="text-xs text-ink-faint mt-3">
          This demo stores everything in your browser's local storage. Clearing your browser data will remove your account and
          workbooks. A production deployment would store this in a real database instead.
        </p>
      </section>

      <section className="rounded-xl2 border border-border bg-surface-raised p-6">
        <h2 className="text-sm font-medium text-ink mb-3">Application</h2>
        <p className="text-sm text-ink-muted">DataLens AI — version 1.0.0 (local demo build)</p>
        <p className="text-xs text-ink-faint mt-1">
          An intelligent spreadsheet analytics platform: upload a workbook and DataLens profiles every column and builds KPIs,
          charts, insights, and filters automatically.
        </p>
      </section>
    </div>
  )
}
