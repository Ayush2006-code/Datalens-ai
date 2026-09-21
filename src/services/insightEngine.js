import { coerceNumeric, coerceDate } from './dataProfiler.js'

function pct(n) {
  return `${Math.round(n * 10) / 10}%`
}

function findMeasureColumn(columnProfiles) {
  const named = columnProfiles.find((c) => c.type === 'numeric' && /revenue|sales|profit|amount/i.test(c.name))
  return named || columnProfiles.find((c) => c.type === 'numeric')
}

function topCategoryShare(rows, catCol, measureCol) {
  const totals = new Map()
  let grandTotal = 0
  for (const row of rows) {
    const cat = row[catCol.name]
    const value = measureCol ? coerceNumeric(row[measureCol.name]) : 1
    if (cat === null || cat === undefined || cat === '' || value === null) continue
    const key = String(cat).trim()
    totals.set(key, (totals.get(key) || 0) + value)
    grandTotal += value
  }
  if (totals.size === 0 || grandTotal === 0) return null
  const [topName, topValue] = [...totals.entries()].sort((a, b) => b[1] - a[1])[0]
  return { name: topName, share: (topValue / grandTotal) * 100 }
}

function trendComparison(rows, dateCol, measureCol) {
  const withDates = rows
    .map((r) => ({ date: coerceDate(r[dateCol.name]), value: coerceNumeric(r[measureCol.name]) }))
    .filter((r) => r.date && r.value !== null)
    .sort((a, b) => a.date - b.date)
  if (withDates.length < 6) return null
  const mid = Math.floor(withDates.length / 2)
  const firstSum = withDates.slice(0, mid).reduce((a, b) => a + b.value, 0)
  const secondSum = withDates.slice(mid).reduce((a, b) => a + b.value, 0)
  if (firstSum === 0) return null
  const change = ((secondSum - firstSum) / Math.abs(firstSum)) * 100
  return { change, firstSum, secondSum }
}

function bestMonth(rows, dateCol, measureCol) {
  const buckets = new Map()
  for (const row of rows) {
    const date = coerceDate(row[dateCol.name])
    const value = coerceNumeric(row[measureCol.name])
    if (!date || value === null) continue
    const key = date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
    buckets.set(key, (buckets.get(key) || 0) + value)
  }
  if (buckets.size === 0) return null
  return [...buckets.entries()].sort((a, b) => b[1] - a[1])[0]
}

/**
 * Produces { key: [], trends: [], opportunities: [], warnings: [] } — each
 * an array of { text, tone } derived from the actual dataset. Returns
 * empty arrays rather than filler content when the dataset doesn't support
 * a category of insight.
 */
export function generateInsights({ rows }, columnProfiles, sheetProfile) {
  const result = { key: [], trends: [], opportunities: [], warnings: [] }
  const measureCol = findMeasureColumn(columnProfiles)
  const dateCol = columnProfiles.find((c) => c.type === 'date')
  const categoricalCols = columnProfiles.filter((c) => c.type === 'categorical' && c.uniqueCount >= 2 && c.uniqueCount <= 20)

  if (measureCol) {
    for (const cat of categoricalCols.slice(0, 3)) {
      const top = topCategoryShare(rows, cat, measureCol)
      if (top && top.share >= 15) {
        result.key.push({
          text: `"${top.name}" accounts for ${pct(top.share)} of total ${measureCol.name.toLowerCase()} in ${cat.name}.`,
        })
      }
    }
  }

  if (dateCol && measureCol) {
    const trend = trendComparison(rows, dateCol, measureCol)
    if (trend) {
      const direction = trend.change >= 0 ? 'increased' : 'decreased'
      result.trends.push({
        text: `${measureCol.name} ${direction} ${pct(Math.abs(trend.change))} between the first and second half of the tracked period.`,
        tone: trend.change >= 0 ? 'positive' : 'negative',
      })
    }
    const best = bestMonth(rows, dateCol, measureCol)
    if (best) {
      result.trends.push({ text: `${best[0]} had the highest total ${measureCol.name.toLowerCase()}.` })
    }
  }

  // Opportunities: a category that's small in count but strong in per-row measure.
  if (measureCol && categoricalCols.length) {
    for (const cat of categoricalCols.slice(0, 2)) {
      const perCategory = new Map()
      for (const row of rows) {
        const key = row[cat.name]
        const value = coerceNumeric(row[measureCol.name])
        if (key === null || key === undefined || key === '' || value === null) continue
        const k = String(key).trim()
        const bucket = perCategory.get(k) || { sum: 0, count: 0 }
        bucket.sum += value
        bucket.count += 1
        perCategory.set(k, bucket)
      }
      const entries = [...perCategory.entries()].filter(([, b]) => b.count >= 3)
      if (entries.length < 2) continue
      const avgAll = entries.reduce((s, [, b]) => s + b.sum, 0) / entries.reduce((s, [, b]) => s + b.count, 0)
      const withAvg = entries.map(([name, b]) => ({ name, avg: b.sum / b.count }))
      const best = withAvg.sort((a, b) => b.avg - a.avg)[0]
      if (best && avgAll > 0 && best.avg / avgAll > 1.3) {
        result.opportunities.push({
          text: `${best.name} performs ${pct((best.avg / avgAll - 1) * 100)} above the average ${measureCol.name.toLowerCase()} per record in ${cat.name} — worth investigating what's working.`,
        })
      }
    }
  }

  // Warnings from data quality.
  for (const col of columnProfiles) {
    if (col.missingPct >= 5) {
      result.warnings.push({
        text: `${pct(col.missingPct)} of records are missing a value for "${col.name}".`,
        tone: 'warning',
      })
    }
  }
  if (sheetProfile.duplicateRowPct >= 1) {
    result.warnings.push({
      text: `${pct(sheetProfile.duplicateRowPct)} of rows appear to be exact duplicates.`,
      tone: 'warning',
    })
  }

  return result
}
