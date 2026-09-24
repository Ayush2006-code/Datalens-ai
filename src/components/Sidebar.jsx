import {
  NavLink,
  useLocation,
  useNavigate,
} from 'react-router-dom'

import {
  LayoutDashboard,
  UploadCloud,
  FolderOpen,
  Settings,
  Sparkles,
  X,
} from 'lucide-react'

import {
  useWorkbook,
} from '../context/WorkbookContext.jsx'

const NAV_ITEMS = [
  {
    to: '/app',
    label: 'Home',
    icon: LayoutDashboard,
    end: true,
  },
  {
    to: '/app/upload',
    label: 'Upload',
    icon: UploadCloud,
  },
  {
    to: '/app/workbooks',
    label: 'Workbooks',
    icon: FolderOpen,
  },
  {
    to: '/app/settings',
    label: 'Settings',
    icon: Settings,
  },
]

export default function Sidebar({
  mobileOpen,
  onClose,
}) {
  const navigate =
    useNavigate()

  const location =
    useLocation()

  const {
    activeWorkbook,
    closeWorkbook,
  } = useWorkbook()

  /* =====================================================
     CLOSE WORKBOOK
  ===================================================== */

  const handleCloseWorkbook = (
    event,
  ) => {
    event.preventDefault()
    event.stopPropagation()

    closeWorkbook()

    sessionStorage.removeItem(
      'datalens.activeWorkbookId',
    )

    navigate(
      '/app/workbooks',
    )

    if (onClose) {
      onClose()
    }
  }

  /* =====================================================
     MOBILE NAVIGATION
  ===================================================== */

  const handleNavigation = () => {
    if (onClose) {
      onClose()
    }
  }

  return (
    <>
      {/* =================================================
          DESKTOP
      ================================================= */}

      <aside className="hidden md:flex md:w-64 shrink-0 border-r border-border bg-surface-raised">

        <div className="flex flex-col h-full w-full">

          {/* Logo */}

          <div className="flex items-center justify-between px-5 h-16 border-b border-border shrink-0">

            <div className="flex items-center gap-2 font-display font-semibold">

              <div className="h-7 w-7 rounded-md bg-accent/15 text-accent flex items-center justify-center">
                <Sparkles
                  size={16}
                />
              </div>

              <span>
                DataLens AI
              </span>

            </div>

          </div>

          {/* Navigation */}

          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">

            {NAV_ITEMS.map(
              (item) => (
                <NavLink
                  key={
                    item.to
                  }
                  to={
                    item.to
                  }
                  end={
                    item.end
                  }
                  onClick={
                    handleNavigation
                  }
                  className={({
                    isActive,
                  }) =>
                    `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                      isActive
                        ? 'bg-accent-soft text-accent font-medium'
                        : 'text-ink-muted hover:text-ink hover:bg-surface-sunken'
                    }`
                  }
                >

                  <item.icon
                    size={16}
                  />

                  <span>
                    {
                      item.label
                    }
                  </span>

                </NavLink>
              ),
            )}

            {/* =================================================
                ACTIVE WORKBOOK
            ================================================= */}

            {activeWorkbook && (
              <div className="mt-4">

                <div className="flex items-center gap-1">

                  <NavLink
                    to="/app/dashboard"
                    onClick={
                      handleNavigation
                    }
                    className={({ isActive }) =>
                      `flex-1 min-w-0 flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm border transition-colors ${
                        isActive
                          ? 'border-accent/40 bg-accent-soft text-accent font-medium'
                          : 'border-border text-ink-muted hover:text-ink hover:bg-surface-sunken'
                      }`
                    }
                  >

                    <span className="h-1.5 w-1.5 rounded-full bg-accent shrink-0" />

                    <span className="truncate">
                      {
                        activeWorkbook.name
                      }
                    </span>

                  </NavLink>

                  <button
                    type="button"
                    onClick={
                      handleCloseWorkbook
                    }
                    className="h-8 w-8 shrink-0 rounded-lg border border-border text-ink-faint flex items-center justify-center transition-colors hover:text-red-400 hover:border-red-400/40 hover:bg-red-400/10"
                    aria-label="Close workbook"
                    title="Close workbook"
                  >
                    <X
                      size={15}
                    />
                  </button>

                </div>

              </div>
            )}

          </nav>

          {/* Footer */}

          <div className="px-5 py-4 border-t border-border text-xs text-ink-faint">
            DataLens AI · v1.0
          </div>

        </div>

      </aside>

      {/* =================================================
          MOBILE
      ================================================= */}

      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">

          <div
            className="absolute inset-0 bg-black/50"
            onClick={
              onClose
            }
          />

          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-surface-raised border-r border-border">

            <div className="flex flex-col h-full">

              <div className="flex items-center justify-between px-5 h-16 border-b border-border">

                <div className="flex items-center gap-2 font-display font-semibold">

                  <div className="h-7 w-7 rounded-md bg-accent/15 text-accent flex items-center justify-center">
                    <Sparkles
                      size={16}
                    />
                  </div>

                  DataLens AI

                </div>

                <button
                  type="button"
                  onClick={
                    onClose
                  }
                  className="text-ink-faint hover:text-ink"
                >
                  <X
                    size={18}
                  />
                </button>

              </div>

              <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">

                {NAV_ITEMS.map(
                  (item) => (
                    <NavLink
                      key={
                        item.to
                      }
                      to={
                        item.to
                      }
                      end={
                        item.end
                      }
                      onClick={
                        handleNavigation
                      }
                      className={({
                        isActive,
                      }) =>
                        `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                          isActive
                            ? 'bg-accent-soft text-accent font-medium'
                            : 'text-ink-muted hover:text-ink hover:bg-surface-sunken'
                        }`
                      }
                    >

                      <item.icon
                        size={16}
                      />

                      {
                        item.label
                      }

                    </NavLink>
                  ),
                )}

                {activeWorkbook && (
                  <div className="mt-4">

                    <div className="flex items-center gap-1">

                      <NavLink
                        to="/app/dashboard"
                        onClick={
                          handleNavigation
                        }
                        className={({ isActive }) =>
                          `flex-1 min-w-0 flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm border transition-colors ${
                            isActive
                              ? 'border-accent/40 bg-accent-soft text-accent font-medium'
                              : 'border-border text-ink-muted'
                          }`
                        }
                      >

                        <span className="h-1.5 w-1.5 rounded-full bg-accent shrink-0" />

                        <span className="truncate">
                          {
                            activeWorkbook.name
                          }
                        </span>

                      </NavLink>

                      <button
                        type="button"
                        onClick={
                          handleCloseWorkbook
                        }
                        className="h-8 w-8 shrink-0 rounded-lg border border-border text-ink-faint flex items-center justify-center hover:text-red-400 hover:border-red-400/40"
                      >
                        <X
                          size={15}
                        />
                      </button>

                    </div>

                  </div>
                )}

              </nav>

            </div>

          </aside>

        </div>
      )}
    </>
  )
}