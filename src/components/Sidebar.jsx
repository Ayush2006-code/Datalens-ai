import { NavLink } from 'react-router-dom'
import { LayoutDashboard, UploadCloud, FolderOpen, Settings, Sparkles, X } from 'lucide-react'
import { useWorkbook } from '../context/WorkbookContext.jsx'

const NAV_ITEMS = [
  { to: '/app', label: 'Home', icon: LayoutDashboard, end: true },
  { to: '/app/upload', label: 'Upload', icon: UploadCloud },
  { to: '/app/workbooks', label: 'Workbooks', icon: FolderOpen },
  { to: '/app/settings', label: 'Settings', icon: Settings },
]

export default function Sidebar({ mobileOpen, onClose }) {
  const { activeWorkbook } = useWorkbook()

  const content = (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-5 h-16 border-b border-border shrink-0">
        <div className="flex items-center gap-2 font-display font-semibold">
          <div className="h-7 w-7 rounded-md bg-accent/15 text-accent flex items-center justify-center">
            <Sparkles size={16} />
          </div>
          DataLens AI
        </div>
        <button onClick={onClose} className="md:hidden text-ink-faint hover:text-ink" aria-label="Close menu">
          <X size={18} />
        </button>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive ? 'bg-accent-soft text-accent font-medium' : 'text-ink-muted hover:text-ink hover:bg-surface-sunken'
              }`
            }
          >
            <item.icon size={16} />
            {item.label}
          </NavLink>
        ))}

        {activeWorkbook && (
          <NavLink
            to="/app/dashboard"
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm mt-4 border transition-colors ${
                isActive ? 'border-accent/40 bg-accent-soft text-accent font-medium' : 'border-border text-ink-muted hover:text-ink'
              }`
            }
          >
            <span className="h-1.5 w-1.5 rounded-full bg-accent shrink-0" />
            <span className="truncate">{activeWorkbook.name}</span>
          </NavLink>
        )}
      </nav>
      <div className="px-5 py-4 border-t border-border text-xs text-ink-faint">DataLens AI · v1.0 (local demo)</div>
    </div>
  )

  return (
    <>
      <aside className="hidden md:flex md:w-64 shrink-0 border-r border-border bg-surface-raised">{content}</aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={onClose} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-surface-raised border-r border-border">{content}</aside>
        </div>
      )}
    </>
  )
}
