export default function EmptyState({ icon: Icon, title, body, actions }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      {Icon && (
        <div className="h-12 w-12 rounded-xl bg-accent-soft text-accent flex items-center justify-center mb-4">
          <Icon size={22} />
        </div>
      )}
      <h3 className="font-display text-lg font-semibold text-ink mb-1.5">{title}</h3>
      {body && <p className="text-sm text-ink-muted max-w-sm mb-6">{body}</p>}
      {actions && <div className="flex flex-wrap items-center justify-center gap-3">{actions}</div>}
    </div>
  )
}
