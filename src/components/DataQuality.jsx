import { AlertTriangle, CheckCircle2 } from 'lucide-react'

function healthColor(pct) {
  if (pct >= 90) return 'text-accent'
  if (pct >= 75) return 'text-amber-400'
  return 'text-rose-400'
}

export default function DataQuality({ sheetProfile }) {
  const problemColumns = sheetProfile.columns.filter((c) => c.missingPct >= 5 || c.duplicateCount > sheetProfile.rowCount * 0.3)

  return (
    <div className="rounded-xl2 border border-border bg-surface-raised p-5">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-medium text-ink">Data quality</h3>
        <span className={`font-mono text-lg font-semibold ${healthColor(sheetProfile.completeness)}`}>
          {sheetProfile.completeness}% healthy
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-5">
        <Stat label="Total rows" value={sheetProfile.rowCount.toLocaleString()} />
        <Stat label="Total columns" value={sheetProfile.columnCount.toLocaleString()} />
        <Stat label="Missing values" value={sheetProfile.missingCells.toLocaleString()} />
        <Stat label="Duplicate rows" value={`${sheetProfile.duplicateRowPct.toFixed(1)}%`} />
      </div>

      {problemColumns.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-ink-faint mb-1">Columns to review</p>
          {problemColumns.map((c) => (
            <div key={c.name} className="flex items-start gap-2 text-sm">
              <AlertTriangle size={14} className="text-amber-400 mt-0.5 shrink-0" />
              <span className="text-ink-muted">
                <span className="text-ink font-medium">{c.name}</span>{' '}
                {c.missingPct >= 5 && `— ${c.missingPct.toFixed(1)}% missing`}
                {c.missingPct >= 5 && c.duplicateCount > sheetProfile.rowCount * 0.3 && ', '}
                {c.duplicateCount > sheetProfile.rowCount * 0.3 && `high duplicate values`}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-2 text-sm text-ink-muted">
          <CheckCircle2 size={14} className="text-accent" /> No significant data-quality issues detected.
        </div>
      )}
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div className="rounded-lg bg-surface-sunken border border-border px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-wide text-ink-faint">{label}</p>
      <p className="text-sm font-mono text-ink mt-0.5">{value}</p>
    </div>
  )
}
