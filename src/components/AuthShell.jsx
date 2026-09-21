import { Sparkles } from 'lucide-react'

export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="min-h-screen bg-surface text-ink flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm dl-enter">
        <div className="flex items-center gap-2 font-display font-semibold text-lg mb-8 justify-center">
          <div className="h-7 w-7 rounded-md bg-accent/15 text-accent flex items-center justify-center">
            <Sparkles size={16} />
          </div>
          DataLens AI
        </div>
        <div className="rounded-xl2 border border-border bg-surface-raised shadow-panel p-7">
          <h1 className="font-display text-xl font-semibold text-ink mb-1">{title}</h1>
          {subtitle && <p className="text-sm text-ink-muted mb-6">{subtitle}</p>}
          {children}
        </div>
        {footer && <div className="text-center text-sm text-ink-muted mt-5">{footer}</div>}
      </div>
    </div>
  )
}
