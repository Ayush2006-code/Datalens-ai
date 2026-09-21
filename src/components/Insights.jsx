import { Lightbulb, TrendingUp, Target, AlertTriangle, Zap } from 'lucide-react'

const SECTIONS = [
  { key: 'key', label: 'Key insights', icon: Lightbulb },
  { key: 'trends', label: 'Trends', icon: TrendingUp },
  { key: 'opportunities', label: 'Opportunities', icon: Target },
  { key: 'warnings', label: 'Warnings', icon: AlertTriangle },
]

export default function Insights({ insights, anomalies }) {
  const hasAny = SECTIONS.some((s) => insights[s.key]?.length) || anomalies?.length

  if (!hasAny) {
    return (
      <div className="rounded-xl2 border border-border bg-surface-raised p-5">
        <h3 className="text-sm font-medium text-ink mb-2">Insights</h3>
        <p className="text-sm text-ink-muted">Not enough structured data yet to generate reliable insights for this sheet.</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl2 border border-border bg-surface-raised p-5">
      <h3 className="text-sm font-medium text-ink mb-4">Insights</h3>
      <div className="grid md:grid-cols-2 gap-5">
        {SECTIONS.map((section) => {
          const items = insights[section.key]
          if (!items?.length) return null
          return (
            <div key={section.key}>
              <div className="flex items-center gap-1.5 mb-2 text-xs uppercase tracking-wide text-ink-faint">
                <section.icon size={12} /> {section.label}
              </div>
              <ul className="space-y-2">
                {items.map((item, i) => (
                  <li key={i} className="text-sm text-ink-muted leading-snug">
                    {item.text}
                  </li>
                ))}
              </ul>
            </div>
          )
        })}

        {anomalies?.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2 text-xs uppercase tracking-wide text-ink-faint">
              <Zap size={12} /> Potential anomalies
            </div>
            <ul className="space-y-2">
              {anomalies.map((a, i) => (
                <li key={i} className="text-sm text-ink-muted leading-snug">
                  {a.message}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
