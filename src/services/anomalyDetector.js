import { coerceNumeric, isBlank } from './dataProfiler.js'

function quantile(sorted, q) {
  const pos = (sorted.length - 1) * q
  const base = Math.floor(pos)
  const rest = pos - base
  if (sorted[base + 1] !== undefined) {
    return sorted[base] + rest * (sorted[base + 1] - sorted[base])
  }
  return sorted[base]
}

/**
 * Flags unusual values in numeric columns using the IQR method (robust to
 * skewed business data, e.g. revenue), falling back to z-score only when a
 * column has too few distinct values for IQR to be meaningful.
 * Returns up to `limit` anomalies across the whole sheet, ranked by severity.
 */
export function detectAnomalies({ columns, rows }, columnProfiles, options = {}) {
  const { limit = 8, labelColumn } = options
  const numericCols = columnProfiles.filter((c) => c.type === 'numeric' && c.uniqueCount >= 8)
  const anomalies = []

  const idLabel =
    labelColumn ||
    columns.find((c) => /^(id|order id|order_?id|transaction id|invoice)/i.test(c)) ||
    null

  for (const col of numericCols) {
    const withIdx = rows
      .map((row, idx) => ({ idx, value: coerceNumeric(row[col.name]) }))
      .filter((r) => r.value !== null)
    if (withIdx.length < 8) continue

    const sorted = [...withIdx].sort((a, b) => a.value - b.value)
    const q1 = quantile(sorted.map((r) => r.value), 0.25)
    const q3 = quantile(sorted.map((r) => r.value), 0.75)
    const iqr = q3 - q1
    if (iqr === 0) continue
    const lowerBound = q1 - 1.5 * iqr
    const upperBound = q3 + 1.5 * iqr

    for (const { idx, value } of withIdx) {
      if (value < lowerBound || value > upperBound) {
        const direction = value > upperBound ? 'high' : 'low'
        const distance = direction === 'high' ? (value - upperBound) / (iqr || 1) : (lowerBound - value) / (iqr || 1)
        const row = rows[idx]
        const label = idLabel && !isBlank(row[idLabel]) ? String(row[idLabel]) : `Row ${idx + 2}`
        anomalies.push({
          column: col.name,
          rowIndex: idx,
          label,
          value,
          direction,
          severity: distance,
          message: `${label} has an unusually ${direction} value for "${col.name}" (${formatNum(value)} vs. a typical range of ${formatNum(
            lowerBound
          )}–${formatNum(upperBound)}).`,
        })
      }
    }
  }

  return anomalies.sort((a, b) => b.severity - a.severity).slice(0, limit)
}

function formatNum(n) {
  return Math.abs(n) >= 1000 ? n.toLocaleString(undefined, { maximumFractionDigits: 0 }) : Math.round(n * 100) / 100
}
