import { useState } from 'react'
import { Search, X, SlidersHorizontal, ChevronDown } from 'lucide-react'
import { countActiveFilters } from '../services/filterEngine.js'

function CategoryDropdown({ column, options, selected, onChange }) {
  const [open, setOpen] = useState(false)
  const activeCount = selected?.length || 0

  function toggleValue(value) {
    const set = new Set(selected || [])
    if (set.has(value)) set.delete(value)
    else set.add(value)
    onChange([...set])
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 text-sm rounded-lg border px-3 py-2 transition-colors ${
          activeCount ? 'border-accent/50 text-accent bg-accent-soft' : 'border-border text-ink-muted hover:text-ink'
        }`}
      >
        {column}
        {activeCount > 0 && <span className="text-xs font-mono">({activeCount})</span>}
        <ChevronDown size={13} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1.5 w-56 max-h-64 overflow-y-auto rounded-lg border border-border bg-surface-raised shadow-panel z-20 p-2">
            {options.map((opt) => (
              <label key={opt.value} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-surface-sunken cursor-pointer text-sm text-ink">
                <input
                  type="checkbox"
                  checked={(selected || []).includes(opt.value)}
                  onChange={() => toggleValue(opt.value)}
                  className="accent-accent"
                />
                <span className="truncate flex-1">{opt.value}</span>
                <span className="text-xs text-ink-faint font-mono">{opt.count}</span>
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default function Filters({ columnProfiles, filters, onChange, onClear }) {
  const dateColumns = columnProfiles.filter((c) => c.type === 'date')
  const categoricalColumns = columnProfiles.filter((c) => c.type === 'categorical').slice(0, 4)
  const activeCount = countActiveFilters(filters)
  const primaryDateCol = dateColumns[0]

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <div className="flex items-center gap-1.5 text-ink-faint text-xs mr-1">
        <SlidersHorizontal size={13} /> Filters
      </div>

      <div className="relative">
        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint" />
        <input
          value={filters.search}
          onChange={(e) => onChange({ search: e.target.value })}
          placeholder="Search rows..."
          className="text-sm rounded-lg border border-border bg-surface-sunken pl-8 pr-3 py-2 w-40 focus:border-accent outline-none text-ink placeholder:text-ink-faint"
        />
      </div>

      {primaryDateCol && (
        <div className="flex items-center gap-1.5">
          <input
            type="date"
            value={filters.dateFrom || ''}
            onChange={(e) => onChange({ dateColumn: primaryDateCol.name, dateFrom: e.target.value || null })}
            className="text-sm rounded-lg border border-border bg-surface-sunken px-2.5 py-2 text-ink focus:border-accent outline-none"
            aria-label={`${primaryDateCol.name} from`}
          />
          <span className="text-ink-faint text-xs">to</span>
          <input
            type="date"
            value={filters.dateTo || ''}
            onChange={(e) => onChange({ dateColumn: primaryDateCol.name, dateTo: e.target.value || null })}
            className="text-sm rounded-lg border border-border bg-surface-sunken px-2.5 py-2 text-ink focus:border-accent outline-none"
            aria-label={`${primaryDateCol.name} to`}
          />
        </div>
      )}

      {categoricalColumns.map((col) => (
        <CategoryDropdown
          key={col.name}
          column={col.name}
          options={col.topValues || []}
          selected={filters.categoryFilters?.[col.name]}
          onChange={(values) =>
            onChange({ categoryFilters: { ...filters.categoryFilters, [col.name]: values } })
          }
        />
      ))}

      {activeCount > 0 && (
        <button onClick={onClear} className="flex items-center gap-1 text-sm text-ink-muted hover:text-ink ml-auto">
          <X size={13} /> Clear all ({activeCount})
        </button>
      )}
    </div>
  )
}
