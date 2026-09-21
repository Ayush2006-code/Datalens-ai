import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Menu, Search, Sun, Moon, LogOut, User, ChevronDown } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { useTheme } from '../context/ThemeContext.jsx'
import { useWorkbook } from '../context/WorkbookContext.jsx'
import { initialsFromName } from '../utils/format.js'

export default function Topbar({ onMenuClick, searchQuery, onSearchChange }) {
  const { session, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { activeWorkbook } = useWorkbook()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  function handleLogout() {
    logout()
    navigate('/', { replace: true })
  }

  return (
    <header className="h-16 shrink-0 border-b border-border bg-surface-raised flex items-center gap-3 px-4 md:px-6">
      <button onClick={onMenuClick} className="md:hidden text-ink-muted hover:text-ink" aria-label="Open menu">
        <Menu size={20} />
      </button>

      <div className="flex-1 flex items-center gap-2 min-w-0">
        {activeWorkbook && (
          <span className="hidden md:inline text-sm text-ink-muted truncate max-w-[220px]">{activeWorkbook.name}</span>
        )}
        <div className="relative flex-1 max-w-sm ml-auto md:ml-0">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
            placeholder="Search workbooks..."
            aria-label="Search workbooks"
            className="w-full rounded-lg border border-border bg-surface-sunken pl-9 pr-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-accent outline-none"
          />
        </div>
      </div>

      <button
        onClick={toggleTheme}
        aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        className="h-9 w-9 shrink-0 rounded-lg border border-border text-ink-muted hover:text-ink hover:border-accent/40 flex items-center justify-center transition-colors"
      >
        {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
      </button>

      <div className="relative shrink-0">
        <button
          onClick={() => setMenuOpen((o) => !o)}
          className="flex items-center gap-2 rounded-lg border border-border px-2 py-1.5 hover:border-accent/40 transition-colors"
        >
          <div className="h-7 w-7 rounded-full bg-accent/15 text-accent flex items-center justify-center text-xs font-medium">
            {initialsFromName(session?.name)}
          </div>
          <ChevronDown size={14} className="text-ink-faint hidden sm:block" />
        </button>
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
            <div className="absolute right-0 top-full mt-2 w-52 rounded-xl border border-border bg-surface-raised shadow-panel z-20 overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <p className="text-sm font-medium text-ink truncate">{session?.name}</p>
                <p className="text-xs text-ink-faint truncate">{session?.email}</p>
              </div>
              <button
                onClick={() => {
                  setMenuOpen(false)
                  navigate('/app/settings')
                }}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-ink-muted hover:text-ink hover:bg-surface-sunken transition-colors"
              >
                <User size={14} /> Profile & settings
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-rose-400 hover:bg-surface-sunken transition-colors"
              >
                <LogOut size={14} /> Log out
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  )
}
