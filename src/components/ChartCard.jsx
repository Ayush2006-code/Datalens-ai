import { useState } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { EyeOff, BarChart3, LineChart as LineChartIcon } from 'lucide-react'

const PALETTE = ['#14b8a6', '#38bdf8', '#a78bfa', '#fb923c', '#f472b6', '#facc15', '#4ade80', '#f87171']

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-surface-raised px-3 py-2 shadow-panel text-xs">
      <p className="text-ink-muted mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="text-ink font-mono">
          {p.name}: {typeof p.value === 'number' ? p.value.toLocaleString() : p.value}
        </p>
      ))}
    </div>
  )
}

export default function ChartCard({ chart, onHide }) {
  const [typeOverride, setTypeOverride] = useState(null)
  const effectiveType = typeOverride || chart.type
  const canToggleType = chart.type !== 'pie'

  if (!chart.data?.length) {
    return (
      <div className="rounded-xl2 border border-border bg-surface-raised p-5 flex flex-col items-center justify-center text-center h-64">
        <p className="text-sm text-ink-muted">Not enough data to build "{chart.title}".</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl2 border border-border bg-surface-raised p-5 dl-enter">
      <div className="flex items-start justify-between mb-4 gap-2">
        <h3 className="text-sm font-medium text-ink">{chart.title}</h3>
        <div className="flex items-center gap-1 shrink-0">
          {canToggleType && (
            <button
              onClick={() => setTypeOverride(effectiveType === 'line' ? 'bar' : 'line')}
              className="text-ink-faint hover:text-ink p-1"
              aria-label="Toggle chart type"
              title="Toggle chart type"
            >
              {effectiveType === 'line' ? <BarChart3 size={14} /> : <LineChartIcon size={14} />}
            </button>
          )}
          {onHide && (
            <button onClick={() => onHide(chart.id)} className="text-ink-faint hover:text-ink p-1" aria-label="Hide chart" title="Hide chart">
              <EyeOff size={14} />
            </button>
          )}
        </div>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          {effectiveType === 'pie' ? (
            <PieChart>
              <Pie data={chart.data} dataKey="value" nameKey="label" innerRadius={50} outerRadius={85} paddingAngle={2}>
                {chart.data.map((_, i) => (
                  <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          ) : effectiveType === 'line' ? (
            <LineChart data={chart.data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border) / var(--border-alpha))" />
              <XAxis dataKey={chart.xKey} tick={{ fontSize: 11, fill: 'rgb(var(--ink-faint))' }} />
              <YAxis tick={{ fontSize: 11, fill: 'rgb(var(--ink-faint))' }} />
              <Tooltip content={<ChartTooltip />} />
              {chart.series.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
              {chart.series.map((s, i) => (
                <Line key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={PALETTE[i % PALETTE.length]} strokeWidth={2} dot={false} />
              ))}
            </LineChart>
          ) : (
            <BarChart data={chart.data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border) / var(--border-alpha))" />
              <XAxis dataKey={chart.xKey} tick={{ fontSize: 11, fill: 'rgb(var(--ink-faint))' }} interval={0} angle={-20} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 11, fill: 'rgb(var(--ink-faint))' }} />
              <Tooltip content={<ChartTooltip />} />
              {chart.series.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
              {chart.series.map((s, i) => (
                <Bar key={s.key} dataKey={s.key} name={s.name} fill={PALETTE[i % PALETTE.length]} radius={[4, 4, 0, 0]} />
              ))}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  )
}
