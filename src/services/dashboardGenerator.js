import { coerceNumeric, coerceDate, isBlank } from './dataProfiler.js'

const MEASURE_HINTS = [
  { re: /revenue|sales(?!person)/i, label: 'Revenue', icon: 'DollarSign' },
  { re: /profit/i, label: 'Profit', icon: 'TrendingUp' },
  { re: /cost|expense/i, label: 'Cost', icon: 'Receipt' },
  { re: /quantity|qty|units/i, label: 'Quantity', icon: 'Package' },
  { re: /discount/i, label: 'Discount', icon: 'Tag' },
  { re: /price/i, label: 'Price', icon: 'DollarSign' },
]

const ENTITY_HINTS = [
  { re: /customer/i, label: 'Customers', icon: 'Users' },
  { re: /product/i, label: 'Products', icon: 'Box' },
  { re: /order/i, label: 'Orders', icon: 'ShoppingCart' },
  { re: /region/i, label: 'Regions', icon: 'MapPin' },
  { re: /categor/i, label: 'Categories', icon: 'Tags' },
  { re: /employee|salesperson|agent|rep\b/i, label: 'Team members', icon: 'UserCheck' },
]

function formatCompactValue(value, { currency, percentage } = {}) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  if (percentage) return `${value.toFixed(1)}%`
  const abs = Math.abs(value)
  const prefix = currency ? '₹' : ''
  const sign = value < 0 ? '-' : ''
  if (abs >= 1e7) return `${sign}${prefix}${(abs / 1e7).toFixed(2)}Cr`
  if (abs >= 1e5) return `${sign}${prefix}${(abs / 1e5).toFixed(2)}L`
  if (abs >= 1e3) return `${sign}${prefix}${(abs / 1e3).toFixed(1)}K`
  return `${sign}${prefix}${Math.round(abs * 100) / 100}`
}

/** Splits rows into two halves by row order to compute a naive trend/comparison. */
function splitTrend(rows, column, dateColumn) {
  if (dateColumn) {
    const withDates = rows
      .map((r) => ({ date: coerceDate(r[dateColumn]), value: coerceNumeric(r[column]) }))
      .filter((r) => r.date && r.value !== null)
      .sort((a, b) => a.date - b.date)
    if (withDates.length < 4) return null
    const mid = Math.floor(withDates.length / 2)
    const first = withDates.slice(0, mid)
    const second = withDates.slice(mid)
    const sum = (arr) => arr.reduce((a, b) => a + b.value, 0)
    const firstSum = sum(first)
    const secondSum = sum(second)
    if (firstSum === 0) return null
    return ((secondSum - firstSum) / Math.abs(firstSum)) * 100
  }
  return null
}

export function generateKPIs({ columns, rows }, columnProfiles, options = {}) {
  const { limit = 8 } = options
  const dateCol = columnProfiles.find((c) => c.type === 'date')
  const kpis = []

  const numericCols = columnProfiles.filter((c) => c.type === 'numeric')
  const rankedNumeric = numericCols
    .map((c) => {
      const hint = MEASURE_HINTS.find((h) => h.re.test(c.name))
      return { col: c, hint, priority: hint ? 0 : 1 }
    })
    .sort((a, b) => a.priority - b.priority)

  for (const { col, hint } of rankedNumeric) {
    const trend = splitTrend(rows, col.name, dateCol?.name)
    kpis.push({
      id: `total-${col.name}`,
      title: `Total ${hint?.label || col.name}`,
      value: formatCompactValue(col.sum, { currency: col.isLikelyCurrency, percentage: col.isLikelyPercentage }),
      raw: col.sum,
      trendPct: trend,
      icon: hint?.icon || 'BarChart3',
    })
  }

  // Row-count based KPI (Orders / Records)
  const orderLikeCol = columns.find((c) => /order|transaction|invoice/i.test(c))
  kpis.push({
    id: 'total-records',
    title: orderLikeCol ? 'Total Orders' : 'Total Records',
    value: rows.length.toLocaleString(),
    raw: rows.length,
    trendPct: null,
    icon: 'ListOrdered',
  })

  // Entity unique-count KPIs (Customers, Products, Regions...)
  const categoricalCols = columnProfiles.filter((c) => c.type === 'categorical' || c.type === 'text')
  for (const hint of ENTITY_HINTS) {
    const col = categoricalCols.find((c) => hint.re.test(c.name))
    if (col && col.uniqueCount) {
      kpis.push({
        id: `unique-${col.name}`,
        title: `Total ${hint.label}`,
        value: col.uniqueCount.toLocaleString(),
        raw: col.uniqueCount,
        trendPct: null,
        icon: hint.icon,
      })
    }
  }

  // Average of the top revenue-like measure (Average Order Value style)
  const primaryMeasure = rankedNumeric[0]?.col
  if (primaryMeasure) {
    kpis.push({
      id: `avg-${primaryMeasure.name}`,
      title: `Average ${MEASURE_HINTS.find((h) => h.re.test(primaryMeasure.name))?.label || primaryMeasure.name}`,
      value: formatCompactValue(primaryMeasure.average, {
        currency: primaryMeasure.isLikelyCurrency,
        percentage: primaryMeasure.isLikelyPercentage,
      }),
      raw: primaryMeasure.average,
      trendPct: null,
      icon: 'Gauge',
    })
  }

  // De-duplicate by id, keep first-seen priority order, cap to limit.
  const seen = new Set()
  const deduped = kpis.filter((k) => (seen.has(k.id) ? false : (seen.add(k.id), true)))
  return deduped.slice(0, limit)
}

function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}
function monthLabel(key) {
  const [y, m] = key.split('-')
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString(undefined, {
    month: 'short',
    year: '2-digit',
  })
}

function buildTimeSeriesChart(rows, dateCol, numericCol) {
  const buckets = new Map()
  for (const row of rows) {
    const date = coerceDate(row[dateCol.name])
    const value = coerceNumeric(row[numericCol.name])
    if (!date || value === null) continue
    const key = monthKey(date)
    buckets.set(key, (buckets.get(key) || 0) + value)
  }
  if (buckets.size < 2) return null
  const sortedKeys = [...buckets.keys()].sort()
  return {
    id: `trend-${numericCol.name}`,
    type: 'line',
    title: `${numericCol.name} over time`,
    xKey: 'label',
    series: [{ key: 'value', name: numericCol.name }],
    data: sortedKeys.map((k) => ({ label: monthLabel(k), value: Math.round(buckets.get(k) * 100) / 100 })),
  }
}

function buildCategoryBarChart(rows, catCol, numericCol) {
  const totals = new Map()
  for (const row of rows) {
    const cat = row[catCol.name]
    const value = coerceNumeric(row[numericCol.name])
    if (isBlank(cat) || value === null) continue
    const key = String(cat).trim()
    totals.set(key, (totals.get(key) || 0) + value)
  }
  if (totals.size < 2) return null
  const sorted = [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)
  return {
    id: `bar-${catCol.name}-${numericCol.name}`,
    type: 'bar',
    title: `${numericCol.name} by ${catCol.name}`,
    xKey: 'label',
    series: [{ key: 'value', name: numericCol.name }],
    data: sorted.map(([label, value]) => ({ label, value: Math.round(value * 100) / 100 })),
  }
}

function buildDistributionChart(catCol) {
  if (!catCol.topValues || catCol.topValues.length < 2) return null
  const top = catCol.topValues.slice(0, 6)
  const others = catCol.topValues.slice(6).reduce((s, v) => s + v.count, 0)
  const data = top.map((t) => ({ label: t.value, value: t.count }))
  if (others > 0) data.push({ label: 'Other', value: others })
  return {
    id: `dist-${catCol.name}`,
    type: 'pie',
    title: `${catCol.name} distribution`,
    xKey: 'label',
    series: [{ key: 'value', name: 'Count' }],
    data,
  }
}

/**
 * Chooses chart specs from the profiled sheet. Returns an array of
 * { id, type: 'line'|'bar'|'pie', title, xKey, series, data } ready for
 * ChartCard to render with Recharts.
 */
export function generateCharts({ rows }, columnProfiles, options = {}) {
  const { limit = 6 } = options
  const dateCols = columnProfiles.filter((c) => c.type === 'date')
  const numericCols = columnProfiles.filter((c) => c.type === 'numeric')
  const categoricalCols = columnProfiles.filter((c) => c.type === 'categorical')

  const rankedNumeric = [...numericCols].sort((a, b) => (b.sum ? Math.abs(b.sum) : 0) - (a.sum ? Math.abs(a.sum) : 0))
  const charts = []

  if (dateCols.length && rankedNumeric.length) {
    const chart = buildTimeSeriesChart(rows, dateCols[0], rankedNumeric[0])
    if (chart) charts.push(chart)
  }

  const rankedCategorical = [...categoricalCols].sort((a, b) => a.uniqueCount - b.uniqueCount)
  for (const cat of rankedCategorical) {
    if (charts.length >= limit) break
    if (cat.uniqueCount < 2 || cat.uniqueCount > 30) continue
    if (rankedNumeric.length) {
      const measure = rankedNumeric.find((m) => !charts.some((c) => c.id === `bar-${cat.name}-${m.name}`)) || rankedNumeric[0]
      const chart = buildCategoryBarChart(rows, cat, measure)
      if (chart) charts.push(chart)
    }
  }

  for (const cat of rankedCategorical) {
    if (charts.length >= limit) break
    if (cat.uniqueCount >= 2 && cat.uniqueCount <= 8) {
      const chart = buildDistributionChart(cat)
      if (chart && !charts.some((c) => c.id === chart.id)) charts.push(chart)
    }
  }

  // Second time-series for a secondary measure, if there's room and it adds signal.
  if (dateCols.length && rankedNumeric.length > 1 && charts.length < limit) {
    const chart = buildTimeSeriesChart(rows, dateCols[0], rankedNumeric[1])
    if (chart) charts.push(chart)
  }

  return charts.slice(0, limit)
}

export { formatCompactValue }
