import { useMemo, useState } from 'react'
import { ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { formatCellValue } from '../utils/format.js'

const PAGE_SIZE = 25

export default function DataTable({ columns, rows, columnProfiles }) {
  const [sortCol, setSortCol] = useState(null)
  const [sortDir, setSortDir] = useState('asc')
  const [page, setPage] = useState(0)

  const typeByColumn = useMemo(() => {
    const map = {}
    columnProfiles.forEach((c) => (map[c.name] = c.type))
    return map
  }, [columnProfiles])

  const sortedRows = useMemo(() => {
    if (!sortCol) return rows
    const copy = [...rows]
    copy.sort((a, b) => {
      const av = a[sortCol]
      const bv = b[sortCol]
      if (av === bv) return 0
      if (av === null || av === undefined) return 1
      if (bv === null || bv === undefined) return -1
      const aNum = typeof av === 'number' ? av : parseFloat(av)
      const bNum = typeof bv === 'number' ? bv : parseFloat(bv)
      let cmp
      if (!Number.isNaN(aNum) && !Number.isNaN(bNum) && typeByColumn[sortCol] === 'numeric') {
        cmp = aNum - bNum
      } else {
        cmp = String(av).localeCompare(String(bv))
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
    return copy
  }, [rows, sortCol, sortDir, typeByColumn])

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / PAGE_SIZE))
  const clampedPage = Math.min(page, totalPages - 1)
  const pageRows = sortedRows.slice(clampedPage * PAGE_SIZE, clampedPage * PAGE_SIZE + PAGE_SIZE)

  function toggleSort(col) {
    if (sortCol === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortCol(col)
      setSortDir('asc')
    }
    setPage(0)
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-xl2 border border-border bg-surface-raised p-10 text-center">
        <p className="text-sm text-ink-muted">No rows match the current filters.</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl2 border border-border bg-surface-raised overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-sunken">
              <th className="text-left px-3 py-2.5 text-xs text-ink-faint font-medium w-12">#</th>
              {columns.map((col) => (
                <th key={col} className="text-left px-3 py-2.5 whitespace-nowrap">
                  <button onClick={() => toggleSort(col)} className="flex items-center gap-1 text-xs font-medium text-ink-muted hover:text-ink">
                    {col}
                    {sortCol === col && (sortDir === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />)}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, i) => (
              <tr key={clampedPage * PAGE_SIZE + i} className="border-b border-border last:border-0 hover:bg-surface-sunken/60">
                <td className="px-3 py-2 text-xs text-ink-faint font-mono">{clampedPage * PAGE_SIZE + i + 1}</td>
                {columns.map((col) => (
                  <td key={col} className="px-3 py-2 whitespace-nowrap text-ink">
                    {formatCellValue(row[col], typeByColumn[col])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between px-4 py-3 border-t border-border text-xs text-ink-muted">
        <span>
          Showing {clampedPage * PAGE_SIZE + 1}–{Math.min(sortedRows.length, (clampedPage + 1) * PAGE_SIZE)} of {sortedRows.length.toLocaleString()} rows
        </span>
        <div className="flex items-center gap-2">
          <button
            disabled={clampedPage === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="h-7 w-7 rounded-md border border-border flex items-center justify-center disabled:opacity-30 hover:border-accent/40"
            aria-label="Previous page"
          >
            <ChevronLeft size={13} />
          </button>
          <span className="font-mono">
            {clampedPage + 1} / {totalPages}
          </span>
          <button
            disabled={clampedPage >= totalPages - 1}
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            className="h-7 w-7 rounded-md border border-border flex items-center justify-center disabled:opacity-30 hover:border-accent/40"
            aria-label="Next page"
          >
            <ChevronRight size={13} />
          </button>
        </div>
      </div>
    </div>
  )
}
