import { coerceNumeric, coerceDate, isBlank } from './dataProfiler.js'
import { formatCompactValue } from './dashboardGenerator.js'

function findColumn(columnProfiles, pattern) {
  return columnProfiles.find((c) => pattern.test(c.name))
}

function findMeasure(columnProfiles, question) {
  const numeric = columnProfiles.filter((c) => c.type === 'numeric')
  if (numeric.length === 0) return null
  const named = numeric.find((c) => question.toLowerCase().includes(c.name.toLowerCase()))
  if (named) return named
  const byHint = numeric.find((c) => /revenue|sales|profit|amount/i.test(c.name))
  return byHint || numeric[0]
}

function findCategory(columnProfiles, question) {
  const cats = columnProfiles.filter((c) => c.type === 'categorical')
  const named = cats.find((c) => question.toLowerCase().includes(c.name.toLowerCase()))
  return named || null
}

function sumBy(rows, catCol, measureCol) {
  const totals = new Map()
  for (const row of rows) {
    const key = row[catCol.name]
    const value = coerceNumeric(row[measureCol.name])
    if (isBlank(key) || value === null) continue
    const k = String(key).trim()
    totals.set(k, (totals.get(k) || 0) + value)
  }
  return totals
}

function monthlyTotals(rows, dateCol, measureCol) {
  const buckets = new Map()
  for (const row of rows) {
    const date = coerceDate(row[dateCol.name])
    const value = coerceNumeric(row[measureCol.name])
    if (!date || value === null) continue
    const key = date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
    buckets.set(key, (buckets.get(key) || 0) + value)
  }
  return buckets
}

/**
 * Answers a plain-English question about a single sheet using only
 * deterministic calculation over the actual rows — no hallucinated numbers.
 * Returns null if the question isn't recognized so the caller can fall back
 * to a "not supported yet" message or, if configured, an LLM.
 */
export function answerLocally(question, { columns, rows }, columnProfiles) {
  const q = question.toLowerCase().trim()
  const dateCol = columnProfiles.find((c) => c.type === 'date')

  // "total / sum of X"
  if (/\b(total|sum)\b/.test(q)) {
    const measure = findMeasure(columnProfiles, q)
    if (measure) {
      return {
        answer: `Total ${measure.name}: ${formatCompactValue(measure.sum, {
          currency: measure.isLikelyCurrency,
          percentage: measure.isLikelyPercentage,
        })} across ${rows.length.toLocaleString()} rows.`,
        value: measure.sum,
      }
    }
  }

  // "average / mean of X"
  if (/\b(average|avg|mean)\b/.test(q)) {
    const measure = findMeasure(columnProfiles, q)
    if (measure) {
      return {
        answer: `Average ${measure.name}: ${formatCompactValue(measure.average, {
          currency: measure.isLikelyCurrency,
          percentage: measure.isLikelyPercentage,
        })}.`,
        value: measure.average,
      }
    }
  }

  // "how many <entity>" / "number of <entity>" / count
  if (/\bhow many\b|\bnumber of\b|\bcount\b/.test(q)) {
    const cat = findCategory(columnProfiles, q)
    if (cat) {
      return { answer: `There are ${cat.uniqueCount.toLocaleString()} unique values of "${cat.name}".`, value: cat.uniqueCount }
    }
    return { answer: `There are ${rows.length.toLocaleString()} rows in this sheet.`, value: rows.length }
  }

  // "which <category> ... most/highest/top/best ... <measure>"
  if (/\b(which|what)\b.*\b(most|highest|top|best)\b/.test(q) || /best[- ]perform/.test(q)) {
    const cat = findCategory(columnProfiles, q) || columnProfiles.find((c) => c.type === 'categorical')
    const measure = findMeasure(columnProfiles, q)
    if (cat && measure) {
      const totals = sumBy(rows, cat, measure)
      if (totals.size) {
        const [name, value] = [...totals.entries()].sort((a, b) => b[1] - a[1])[0]
        return {
          answer: `"${name}" leads by ${measure.name}, with ${formatCompactValue(value, {
            currency: measure.isLikelyCurrency,
          })}.`,
          value,
          chart: {
            type: 'bar',
            title: `${measure.name} by ${cat.name}`,
            xKey: 'label',
            series: [{ key: 'value', name: measure.name }],
            data: [...totals.entries()]
              .sort((a, b) => b[1] - a[1])
              .slice(0, 8)
              .map(([label, value]) => ({ label, value: Math.round(value * 100) / 100 })),
          },
        }
      }
    }
  }

  // "top N <category>"
  const topMatch = q.match(/top\s+(\d+)/)
  if (topMatch) {
    const n = Math.min(20, parseInt(topMatch[1], 10))
    const cat = findCategory(columnProfiles, q) || columnProfiles.find((c) => c.type === 'categorical')
    const measure = findMeasure(columnProfiles, q)
    if (cat && measure) {
      const totals = sumBy(rows, cat, measure)
      const sorted = [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, n)
      return {
        answer: `Top ${sorted.length} ${cat.name} by ${measure.name}: ${sorted
          .map(([name, value]) => `${name} (${formatCompactValue(value, { currency: measure.isLikelyCurrency })})`)
          .join(', ')}.`,
        chart: {
          type: 'bar',
          title: `Top ${cat.name} by ${measure.name}`,
          xKey: 'label',
          series: [{ key: 'value', name: measure.name }],
          data: sorted.map(([label, value]) => ({ label, value: Math.round(value * 100) / 100 })),
        },
      }
    }
  }

  // "monthly / by month"
  if (/month/.test(q) && dateCol) {
    const measure = findMeasure(columnProfiles, q)
    if (measure) {
      const buckets = monthlyTotals(rows, dateCol, measure)
      const entries = [...buckets.entries()]
      if (entries.length) {
        const best = entries.sort((a, b) => b[1] - a[1])[0]
        return {
          answer: `${best[0]} had the highest ${measure.name} at ${formatCompactValue(best[1], {
            currency: measure.isLikelyCurrency,
          })}. Chart below shows every month.`,
          chart: {
            type: 'line',
            title: `${measure.name} by month`,
            xKey: 'label',
            series: [{ key: 'value', name: measure.name }],
            data: entries.map(([label, value]) => ({ label, value: Math.round(value * 100) / 100 })),
          },
        }
      }
    }
  }

  return null
}
