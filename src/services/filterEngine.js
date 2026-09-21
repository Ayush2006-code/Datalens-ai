import { coerceNumeric, coerceDate } from './dataProfiler.js'

export function emptyFilters() {
  return {
    search: '',
    dateColumn: null,
    dateFrom: null,
    dateTo: null,
    categoryFilters: {}, // { [columnName]: string[] selected values }
    numericFilters: {}, // { [columnName]: { min, max } }
  }
}

export function isFiltersActive(filters) {
  if (!filters) return false
  if (filters.search?.trim()) return true
  if (filters.dateFrom || filters.dateTo) return true
  if (Object.values(filters.categoryFilters || {}).some((v) => v?.length)) return true
  if (Object.values(filters.numericFilters || {}).some((v) => v?.min != null || v?.max != null)) return true
  return false
}

export function countActiveFilters(filters) {
  if (!filters) return 0
  let n = 0
  if (filters.search?.trim()) n++
  if (filters.dateFrom || filters.dateTo) n++
  n += Object.values(filters.categoryFilters || {}).filter((v) => v?.length).length
  n += Object.values(filters.numericFilters || {}).filter((v) => v?.min != null || v?.max != null).length
  return n
}

export function applyFilters(rows, columns, filters) {
  if (!filters || !isFiltersActive(filters)) return rows

  let result = rows

  if (filters.dateColumn && (filters.dateFrom || filters.dateTo)) {
    const from = filters.dateFrom ? new Date(filters.dateFrom) : null
    const to = filters.dateTo ? new Date(filters.dateTo) : null
    result = result.filter((row) => {
      const d = coerceDate(row[filters.dateColumn])
      if (!d) return false
      if (from && d < from) return false
      if (to && d > to) return false
      return true
    })
  }

  for (const [col, selected] of Object.entries(filters.categoryFilters || {})) {
    if (!selected?.length) continue
    const selectedSet = new Set(selected)
    result = result.filter((row) => selectedSet.has(String(row[col])))
  }

  for (const [col, range] of Object.entries(filters.numericFilters || {})) {
    if (range?.min == null && range?.max == null) continue
    result = result.filter((row) => {
      const v = coerceNumeric(row[col])
      if (v === null) return false
      if (range.min != null && v < range.min) return false
      if (range.max != null && v > range.max) return false
      return true
    })
  }

  if (filters.search?.trim()) {
    const needle = filters.search.trim().toLowerCase()
    result = result.filter((row) => columns.some((c) => String(row[c] ?? '').toLowerCase().includes(needle)))
  }

  return result
}
