import * as Icons from 'lucide-react'
import { TrendingUp, TrendingDown } from 'lucide-react'

export default function KPIGrid({ kpis }) {
  if (!kpis.length) return null
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {kpis.map((kpi) => {
        const Icon = Icons[kpi.icon] || Icons.BarChart3
        return (
          <div key={kpi.id} className="rounded-xl2 border border-border bg-surface-raised p-4 dl-enter">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs uppercase tracking-wide text-ink-faint">{kpi.title}</span>
              <div className="h-7 w-7 rounded-lg bg-accent-soft text-accent flex items-center justify-center shrink-0">
                <Icon size={14} />
              </div>
            </div>
            <p className="font-mono text-xl text-ink font-medium">{kpi.value}</p>
            {kpi.trendPct !== null && kpi.trendPct !== undefined && (
              <p className={`text-xs mt-1.5 flex items-center gap-1 ${kpi.trendPct >= 0 ? 'text-accent' : 'text-rose-400'}`}>
                {kpi.trendPct >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {Math.abs(kpi.trendPct).toFixed(1)}% vs. earlier period
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}
