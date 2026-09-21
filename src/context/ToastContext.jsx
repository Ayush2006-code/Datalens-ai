import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from 'lucide-react'

const ToastContext = createContext(null)

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const idRef = useRef(0)

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id))
  }, [])

  const notify = useCallback(
    (message, type = 'info', duration = 4200) => {
      const id = ++idRef.current
      setToasts((list) => [...list, { id, message, type }])
      if (duration > 0) {
        setTimeout(() => dismiss(id), duration)
      }
      return id
    },
    [dismiss]
  )

  return (
    <ToastContext.Provider value={{ notify, dismiss }}>
      {children}
      <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 w-[min(360px,calc(100vw-2.5rem))]">
        {toasts.map((t) => {
          const Icon = ICONS[t.type] || Info
          return (
            <div
              key={t.id}
              role="status"
              className="dl-enter flex items-start gap-3 rounded-xl border border-border bg-surface-raised px-4 py-3 shadow-panel"
            >
              <Icon
                size={18}
                className={
                  t.type === 'success'
                    ? 'text-accent mt-0.5 shrink-0'
                    : t.type === 'error'
                    ? 'text-rose-400 mt-0.5 shrink-0'
                    : t.type === 'warning'
                    ? 'text-amber-400 mt-0.5 shrink-0'
                    : 'text-ink-muted mt-0.5 shrink-0'
                }
              />
              <p className="text-sm text-ink leading-snug flex-1">{t.message}</p>
              <button
                aria-label="Dismiss notification"
                onClick={() => dismiss(t.id)}
                className="text-ink-faint hover:text-ink transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
