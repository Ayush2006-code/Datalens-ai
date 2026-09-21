// Detects column types and computes per-column statistics for a sheet's
// { columns, rows } shape. This is the "understand the data" stage of the
// pipeline — every later stage (KPIs, charts, insights, filters) reads from
// the profile this module produces rather than re-guessing types itself.

const BOOLEAN_TRUE = new Set(['true', 'yes', 'y', '1'])
const BOOLEAN_FALSE = new Set(['false', 'no', 'n', '0'])

function isBlank(v) {
  return v === null || v === undefined || (typeof v === 'string' && v.trim() === '')
}

function coerceNumeric(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  if (typeof v !== 'string') return null
  const trimmed = v.trim()
  if (trimmed === '') return null
  // Strip currency symbols, thousands separators, percentage signs, parens-for-negative.
  const isParenNegative = /^\(.*\)$/.test(trimmed)
  const cleaned = trimmed
    .replace(/^\(|\)$/g, '')
    .replace(/[₹$€£,]/g, '')
    .replace(/%$/, '')
    .trim()
  if (cleaned === '' || !/^-?\d+(\.\d+)?$/.test(cleaned)) return null
  const num = parseFloat(cleaned)
  if (Number.isNaN(num)) return null
  return isParenNegative ? -num : num
}

function coerceDate(v) {
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v
  if (typeof v === 'number') return null // plain numbers shouldn't be guessed as dates
  if (typeof v !== 'string') return null
  const trimmed = v.trim()
  if (!/\d/.test(trimmed) || trimmed.length < 6) return null
  // Require a date-ish separator to avoid treating "12345" as a date.
  if (!/[-/]| \d{4}$|^[A-Za-z]{3,9} \d/.test(trimmed)) return null
  const parsed = new Date(trimmed)
  if (Number.isNaN(parsed.getTime())) return null
  if (parsed.getFullYear() < 1970 || parsed.getFullYear() > 2100) return null
  return parsed
}

function detectColumnType(values) {
  const nonBlank = values.filter((v) => !isBlank(v))
  if (nonBlank.length === 0) return 'text'

  const sample = nonBlank.slice(0, Math.min(nonBlank.length, 300))

  const boolHits = sample.filter(
    (v) => typeof v === 'boolean' || BOOLEAN_TRUE.has(String(v).toLowerCase()) || BOOLEAN_FALSE.has(String(v).toLowerCase())
  ).length
  if (boolHits / sample.length > 0.9 && new Set(sample.map((v) => String(v).toLowerCase())).size <= 2) {
    return 'boolean'
  }

  const dateHits = sample.filter((v) => coerceDate(v) !== null).length
  const numericHits = sample.filter((v) => coerceNumeric(v) !== null).length

  if (dateHits / sample.length > 0.85) return 'date'
  if (numericHits / sample.length > 0.85) return 'numeric'

  const uniqueCount = new Set(nonBlank.map((v) => String(v))).size
  const uniqueRatio = uniqueCount / nonBlank.length
  if (uniqueCount <= 50 && (uniqueRatio <= 0.5 || nonBlank.length < 20)) {
    return 'categorical'
  }
  return 'text'
}

function median(sortedNums) {
  const n = sortedNums.length
  if (n === 0) return null
  const mid = Math.floor(n / 2)
  return n % 2 === 0 ? (sortedNums[mid - 1] + sortedNums[mid]) / 2 : sortedNums[mid]
}

function profileNumericColumn(name, values) {
  const nums = values.map(coerceNumeric).filter((n) => n !== null)
  const sorted = [...nums].sort((a, b) => a - b)
  const sum = nums.reduce((a, b) => a + b, 0)
  return {
    min: sorted.length ? sorted[0] : null,
    max: sorted.length ? sorted[sorted.length - 1] : null,
    sum,
    average: nums.length ? sum / nums.length : null,
    median: median(sorted),
    isLikelyCurrency: detectCurrencyHint(name, values),
    isLikelyPercentage: /%|percent|rate|ratio|margin/i.test(name),
  }
}

function detectCurrencyHint(name, values) {
  if (/price|revenue|sales|cost|profit|amount|salary|income|budget|fee|₹|\$/i.test(name)) return true
  return values.some((v) => typeof v === 'string' && /[₹$€£]/.test(v))
}

function profileDateColumn(values) {
  const dates = values.map(coerceDate).filter(Boolean)
  if (dates.length === 0) return { min: null, max: null }
  const times = dates.map((d) => d.getTime())
  return {
    min: new Date(Math.min(...times)).toISOString(),
    max: new Date(Math.max(...times)).toISOString(),
  }
}

function profileCategoricalColumn(values) {
  const counts = new Map()
  for (const v of values) {
    if (isBlank(v)) continue
    const key = String(v).trim()
    counts.set(key, (counts.get(key) || 0) + 1)
  }
  const topValues = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([value, count]) => ({ value, count }))
  return { uniqueCount: counts.size, topValues }
}

export function profileColumn(name, values) {
  const total = values.length
  const blanks = values.filter(isBlank).length
  const nonBlankValues = values.filter((v) => !isBlank(v))
  const type = detectColumnType(values)
  const uniqueCount = new Set(nonBlankValues.map((v) => String(v))).size

  const base = {
    name,
    type,
    count: total,
    missing: blanks,
    missingPct: total ? (blanks / total) * 100 : 0,
    uniqueCount,
    duplicateCount: Math.max(0, nonBlankValues.length - uniqueCount),
  }

  if (type === 'numeric') return { ...base, ...profileNumericColumn(name, nonBlankValues) }
  if (type === 'date') return { ...base, ...profileDateColumn(nonBlankValues) }
  if (type === 'categorical') return { ...base, ...profileCategoricalColumn(nonBlankValues) }
  return base
}

/**
 * Profiles an entire sheet: { columns, rows } -> per-column profiles plus
 * sheet-level quality metrics (used by the Data Quality view).
 */
export function profileSheet({ columns, rows }) {
  const columnProfiles = columns.map((col) => profileColumn(col, rows.map((r) => r[col])))

  const seenRows = new Set()
  let duplicateRows = 0
  for (const row of rows) {
    const key = columns.map((c) => String(row[c] ?? '')).join('␟')
    if (seenRows.has(key)) duplicateRows++
    else seenRows.add(key)
  }

  const totalCells = rows.length * columns.length
  const missingCells = columnProfiles.reduce((sum, c) => sum + c.missing, 0)
  const completeness = totalCells ? 100 - (missingCells / totalCells) * 100 : 100

  return {
    rowCount: rows.length,
    columnCount: columns.length,
    duplicateRows,
    duplicateRowPct: rows.length ? (duplicateRows / rows.length) * 100 : 0,
    missingCells,
    completeness: Math.max(0, Math.round(completeness * 10) / 10),
    columns: columnProfiles,
  }
}

export { coerceNumeric, coerceDate, isBlank }
