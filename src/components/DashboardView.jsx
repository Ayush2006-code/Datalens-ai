import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Download, RefreshCw, Settings, FolderOpen, LayoutGrid } from 'lucide-react'
import { useWorkbook } from '../context/WorkbookContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { profileSheet } from '../services/dataProfiler.js'
import { generateKPIs, generateCharts } from '../services/dashboardGenerator.js'
import { generateInsights } from '../services/insightEngine.js'
import { detectAnomalies } from '../services/anomalyDetector.js'
import { applyFilters, isFiltersActive } from '../services/filterEngine.js'
import { exportRowsAsCSV, exportRowsAsExcel, exportWorkbookAsExcel, exportDashboardAsPDF } from '../services/exportService.js'
import { relativeTime } from '../utils/format.js'

import Filters from './Filters.jsx'
import KPIGrid from './KPIGrid.jsx'
import ChartCard from './ChartCard.jsx'
import DataTable from './DataTable.jsx'
import DataQuality from './DataQuality.jsx'
import Insights from './Insights.jsx'
import AskYourData from './AskYourData.jsx'
import EmptyState from './EmptyState.jsx'

export default function DashboardView() {
  // --- ALL hooks are declared unconditionally, before any early return. ---
  const {
    activeWorkbook,
    activeSheetName,
    activeSheet,
    activeSheetProfile,
    setActiveSheet,
    filters,
    updateFiltersForSheet,
    clearFiltersForSheet,
    toggleChartVisibility,
    resetDashboardConfig,
    updateWorkbookWithFile,
  } = useWorkbook()
  const { notify } = useToast()
  const navigate = useNavigate()
  const updateInputRef = useRef(null)
  const [exportMenuOpen, setExportMenuOpen] = useState(false)

  const filteredRows = useMemo(() => {
    if (!activeSheet) return []
    return applyFilters(activeSheet.rows, activeSheet.columns, filters)
  }, [activeSheet, filters])

  const filteredProfile = useMemo(() => {
    if (!activeSheet) return null
    const active = isFiltersActive(filters)
    return active ? profileSheet({ columns: activeSheet.columns, rows: filteredRows }) : activeSheetProfile
  }, [activeSheet, filteredRows, filters, activeSheetProfile])

  const kpis = useMemo(() => {
    if (!activeSheet || !filteredProfile) return []
    return generateKPIs({ columns: activeSheet.columns, rows: filteredRows }, filteredProfile.columns)
  }, [activeSheet, filteredRows, filteredProfile])

  const charts = useMemo(() => {
    if (!activeSheet || !filteredProfile) return []
    const hidden = new Set(activeWorkbook?.dashboardConfig?.hiddenCharts || [])
    return generateCharts({ rows: filteredRows }, filteredProfile.columns).filter((c) => !hidden.has(c.id))
  }, [activeSheet, filteredRows, filteredProfile, activeWorkbook])

  const insights = useMemo(() => {
    if (!activeSheet || !filteredProfile) return { key: [], trends: [], opportunities: [], warnings: [] }
    return generateInsights({ rows: filteredRows }, filteredProfile.columns, filteredProfile)
  }, [activeSheet, filteredRows, filteredProfile])

  const anomalies = useMemo(() => {
    if (!activeSheet || !filteredProfile) return []
    return detectAnomalies({ columns: activeSheet.columns, rows: filteredRows }, filteredProfile.columns)
  }, [activeSheet, filteredRows, filteredProfile])

  // --- Conditional rendering only, no further hooks below this point. ---

  if (!activeWorkbook) {
    return (
      <EmptyState
        icon={LayoutGrid}
        title="No workbook is open"
        body="Open a saved workbook or upload a new one to see its dashboard."
        actions={
          <button
            onClick={() => navigate('/app/workbooks')}
            className="bg-accent hover:bg-accent-strong transition-colors text-white text-sm font-medium rounded-lg px-4 py-2.5 flex items-center gap-2"
          >
            <FolderOpen size={15} /> Browse workbooks
          </button>
        }
      />
    )
  }

  const filtersActiveNow = isFiltersActive(filters)

  async function onUpdateFileSelected(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    await updateWorkbookWithFile(activeWorkbook.id, file)
  }

  function handleExportTable() {
    exportRowsAsCSV(activeSheet.columns, filteredRows, `${activeWorkbook.name}-${activeSheetName}`)
    notify(filtersActiveNow ? 'Exported filtered data.' : 'Exported complete dataset.', 'success')
    setExportMenuOpen(false)
  }

  function handleExportExcelSheet() {
    exportRowsAsExcel(activeSheet.columns, filteredRows, `${activeWorkbook.name}-${activeSheetName}`, activeSheetName)
    notify(filtersActiveNow ? 'Exported filtered data (Excel).' : 'Exported complete dataset (Excel).', 'success')
    setExportMenuOpen(false)
  }

  function handleExportWorkbook() {
    exportWorkbookAsExcel(activeWorkbook.sheets, activeWorkbook.name)
    notify('Exported full workbook.', 'success')
    setExportMenuOpen(false)
  }

  function handleExportPDF() {
    exportDashboardAsPDF()
    setExportMenuOpen(false)
  }

  return (
    <div className="p-6 md:p-10 space-y-6">
      <input ref={updateInputRef} type="file" accept=".xlsx,.xls,.csv,.ods" className="hidden" onChange={onUpdateFileSelected} />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">{activeWorkbook.name}</h1>
          <p className="text-sm text-ink-muted">Updated {relativeTime(activeWorkbook.updatedAt)} · v{activeWorkbook.versions.length}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => updateInputRef.current?.click()}
            className="text-sm rounded-lg border border-border text-ink-muted hover:text-ink px-3 py-2 flex items-center gap-1.5"
          >
            <RefreshCw size={14} /> Update workbook
          </button>
          <div className="relative">
            <button
              onClick={() => setExportMenuOpen((o) => !o)}
              className="text-sm rounded-lg bg-accent hover:bg-accent-strong transition-colors text-white px-3 py-2 flex items-center gap-1.5"
            >
              <Download size={14} /> Export
            </button>
            {exportMenuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setExportMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-1.5 w-64 rounded-lg border border-border bg-surface-raised shadow-panel z-20 overflow-hidden">
                  <div className="px-3.5 py-2 text-[11px] text-ink-faint border-b border-border">
                    {filtersActiveNow ? 'Exporting filtered data' : 'Exporting complete dataset'}
                  </div>
                  <button onClick={handleExportTable} className="w-full text-left px-3.5 py-2.5 text-sm text-ink-muted hover:text-ink hover:bg-surface-sunken">
                    This sheet as CSV
                  </button>
                  <button onClick={handleExportExcelSheet} className="w-full text-left px-3.5 py-2.5 text-sm text-ink-muted hover:text-ink hover:bg-surface-sunken">
                    This sheet as Excel
                  </button>
                  <button onClick={handleExportWorkbook} className="w-full text-left px-3.5 py-2.5 text-sm text-ink-muted hover:text-ink hover:bg-surface-sunken">
                    Full workbook as Excel
                  </button>
                  <button onClick={handleExportPDF} className="w-full text-left px-3.5 py-2.5 text-sm text-ink-muted hover:text-ink hover:bg-surface-sunken">
                    Dashboard as PDF (print)
                  </button>
                </div>
              </>
            )}
          </div>
          <button
            onClick={() => navigate('/app/settings')}
            className="h-9 w-9 rounded-lg border border-border text-ink-muted hover:text-ink flex items-center justify-center"
            aria-label="Settings"
          >
            <Settings size={15} />
          </button>
        </div>
      </div>

      {activeWorkbook.sheetOrder.length > 1 && (
        <div className="flex items-center gap-1 border-b border-border overflow-x-auto">
          {activeWorkbook.sheetOrder.map((name) => (
            <button
              key={name}
              onClick={() => setActiveSheet(name)}
              className={`px-4 py-2.5 text-sm whitespace-nowrap border-b-2 transition-colors ${
                name === activeSheetName ? 'border-accent text-ink font-medium' : 'border-transparent text-ink-muted hover:text-ink'
              }`}
            >
              {name}
            </button>
          ))}
        </div>
      )}

      {!activeSheet || activeSheet.rows.length === 0 ? (
        <EmptyState
          title="This sheet has no usable data"
          body="We couldn't find enough structured data to build a dashboard for this sheet."
        />
      ) : (
        <>
          <div className="rounded-xl2 border border-border bg-surface-raised p-4">
            <Filters
              columnProfiles={activeSheetProfile.columns}
              filters={filters}
              onChange={(updates) => updateFiltersForSheet(activeSheetName, updates)}
              onClear={() => clearFiltersForSheet(activeSheetName)}
            />
          </div>

          <KPIGrid kpis={kpis} />

          {charts.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-medium text-ink-muted">Charts</h2>
                <button onClick={resetDashboardConfig} className="text-xs text-ink-faint hover:text-ink">
                  Reset dashboard layout
                </button>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                {charts.map((chart) => (
                  <ChartCard key={chart.id} chart={chart} onHide={toggleChartVisibility} />
                ))}
              </div>
            </div>
          )}

          <Insights insights={insights} anomalies={anomalies} />

          <DataQuality sheetProfile={filteredProfile} />

          <div>
            <h2 className="text-sm font-medium text-ink-muted mb-3">Raw data</h2>
            <DataTable columns={activeSheet.columns} rows={filteredRows} columnProfiles={activeSheetProfile.columns} />
          </div>

          <AskYourData sheet={{ columns: activeSheet.columns, rows: filteredRows }} columnProfiles={filteredProfile.columns} />
        </>
      )}
    </div>
  )
}
