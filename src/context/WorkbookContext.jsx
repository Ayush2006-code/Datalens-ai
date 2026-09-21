import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useAuth } from './AuthContext.jsx'
import { useToast } from './ToastContext.jsx'
import * as storage from '../services/storage.js'
import { parseSpreadsheetFile, SpreadsheetError } from '../services/spreadsheetParser.js'
import { profileSheet } from '../services/dataProfiler.js'
import { buildDemoWorkbook } from '../services/demoData.js'
import { diffWorkbooks, summarizeDiff } from '../services/workbookDiff.js'
import { emptyFilters } from '../services/filterEngine.js'

const WorkbookContext = createContext(null)

const PROCESSING_STEPS = [
  'Reading workbook',
  'Detecting sheets',
  'Profiling columns',
  'Checking data quality',
  'Calculating metrics',
  'Generating KPIs',
  'Building visualizations',
  'Finding insights',
]

function buildSheetsFromParsed(parsed) {
  const sheets = {}
  for (const [name, sheet] of Object.entries(parsed.sheets)) {
    sheets[name] = { columns: sheet.columns, rows: sheet.rows }
  }
  return sheets
}

export function WorkbookProvider({ children }) {
  const { session } = useAuth()
  const { notify } = useToast()

  const [workbooks, setWorkbooks] = useState([])
  const [activeWorkbookId, setActiveWorkbookId] = useState(null)
  const [activeSheetName, setActiveSheetName] = useState(null)
  const [filtersBySheet, setFiltersBySheet] = useState({})
  const [processing, setProcessing] = useState({ active: false, steps: [], label: '' })

  const ownerId = session?.userId || null

  const refreshWorkbooks = useCallback(() => {
    if (!ownerId) {
      setWorkbooks([])
      return
    }
    setWorkbooks(storage.listWorkbooks(ownerId))
  }, [ownerId])

  useEffect(() => {
    refreshWorkbooks()
    setActiveWorkbookId(null)
    setActiveSheetName(null)
    setFiltersBySheet({})
  }, [ownerId, refreshWorkbooks])

  const runProcessingAnimation = useCallback(async (label) => {
    setProcessing({ active: true, label, steps: PROCESSING_STEPS.map((s) => ({ label: s, done: false })) })
    for (let i = 0; i < PROCESSING_STEPS.length; i++) {
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, 140))
      setProcessing((p) => ({
        ...p,
        steps: p.steps.map((s, idx) => (idx <= i ? { ...s, done: true } : s)),
      }))
    }
    await new Promise((r) => setTimeout(r, 220))
    setProcessing({ active: false, steps: [], label: '' })
  }, [])

  const openWorkbookInternal = useCallback((wb) => {
    setActiveWorkbookId(wb.id)
    setActiveSheetName(wb.sheetOrder?.[0] || Object.keys(wb.sheets)[0])
    setFiltersBySheet({})
  }, [])

  const createAndOpenWorkbook = useCallback(
    async (parsed, sourceType) => {
      if (!ownerId) return
      await runProcessingAnimation(`Analyzing ${parsed.fileName}`)
      const sheets = buildSheetsFromParsed(parsed)
      const record = storage.createWorkbookRecord({
        ownerId,
        name: parsed.fileName.replace(/\.(xlsx|xls|csv|ods)$/i, ''),
        sheets,
        sourceType,
      })
      const result = storage.saveWorkbook(record)
      if (!result.ok) {
        notify(result.error || 'Could not save this workbook.', 'error')
        return
      }
      refreshWorkbooks()
      openWorkbookInternal(record)
      notify('Dashboard ready.', 'success')
      if (parsed.warnings?.length) {
        parsed.warnings.forEach((w) => notify(w, 'warning'))
      }
      return record
    },
    [ownerId, runProcessingAnimation, refreshWorkbooks, openWorkbookInternal, notify]
  )

  const uploadFile = useCallback(
    async (file) => {
      try {
        const parsed = await parseSpreadsheetFile(file)
        return await createAndOpenWorkbook(parsed, 'upload')
      } catch (err) {
        const message =
          err instanceof SpreadsheetError
            ? err.message
            : "We couldn't analyze this workbook. Please check the file and try again."
        notify(message, 'error')
        return null
      }
    },
    [createAndOpenWorkbook, notify]
  )

  const loadDemoWorkbook = useCallback(async () => {
    const parsed = buildDemoWorkbook()
    return createAndOpenWorkbook(parsed, 'demo')
  }, [createAndOpenWorkbook])

  const openWorkbook = useCallback(
    (id) => {
      const wb = storage.getWorkbook(id)
      if (!wb) {
        notify('This workbook could not be found.', 'error')
        return
      }
      openWorkbookInternal(wb)
    },
    [openWorkbookInternal, notify]
  )

  const closeWorkbook = useCallback(() => {
    setActiveWorkbookId(null)
    setActiveSheetName(null)
    setFiltersBySheet({})
  }, [])

  const deleteWorkbookById = useCallback(
    (id) => {
      storage.deleteWorkbook(id)
      if (activeWorkbookId === id) closeWorkbook()
      refreshWorkbooks()
      notify('Workbook deleted.', 'success')
    },
    [activeWorkbookId, closeWorkbook, refreshWorkbooks, notify]
  )

  const toggleFavorite = useCallback(
    (id) => {
      const wb = storage.getWorkbook(id)
      if (!wb) return
      wb.favorite = !wb.favorite
      wb.updatedAt = new Date().toISOString()
      storage.saveWorkbook(wb)
      refreshWorkbooks()
    },
    [refreshWorkbooks]
  )

  const renameWorkbookById = useCallback(
    (id, name) => {
      const wb = storage.getWorkbook(id)
      if (!wb || !name?.trim()) return
      wb.name = name.trim()
      wb.updatedAt = new Date().toISOString()
      storage.saveWorkbook(wb)
      refreshWorkbooks()
    },
    [refreshWorkbooks]
  )

  const updateWorkbookWithFile = useCallback(
    async (id, file) => {
      const existing = storage.getWorkbook(id)
      if (!existing) return null
      try {
        const parsed = await parseSpreadsheetFile(file)
        await runProcessingAnimation(`Updating ${existing.name}`)
        const newSheets = buildSheetsFromParsed(parsed)
        const diff = diffWorkbooks(existing.sheets, newSheets)
        const summaryLines = summarizeDiff(diff)

        const mergedSheetOrder = [
          ...existing.sheetOrder.filter((s) => newSheets[s]),
          ...Object.keys(newSheets).filter((s) => !existing.sheetOrder.includes(s)),
        ]

        const updated = {
          ...existing,
          sheets: newSheets,
          sheetOrder: mergedSheetOrder,
          updatedAt: new Date().toISOString(),
          versions: [
            ...existing.versions,
            { version: existing.versions.length + 1, savedAt: new Date().toISOString(), note: summaryLines.join('; ') },
          ],
        }
        storage.saveWorkbook(updated)
        refreshWorkbooks()
        openWorkbookInternal(updated)
        notify('Workbook updated successfully.', 'success')
        return { updated, summaryLines }
      } catch (err) {
        const message = err instanceof SpreadsheetError ? err.message : "We couldn't process the new file."
        notify(message, 'error')
        return null
      }
    },
    [runProcessingAnimation, refreshWorkbooks, openWorkbookInternal, notify]
  )

  const setActiveSheet = useCallback((name) => {
    setActiveSheetName(name)
  }, [])

  const getFiltersForSheet = useCallback(
    (sheetName) => filtersBySheet[sheetName] || emptyFilters(),
    [filtersBySheet]
  )

  const updateFiltersForSheet = useCallback((sheetName, updates) => {
    setFiltersBySheet((prev) => ({
      ...prev,
      [sheetName]: { ...(prev[sheetName] || emptyFilters()), ...updates },
    }))
  }, [])

  const clearFiltersForSheet = useCallback((sheetName) => {
    setFiltersBySheet((prev) => ({ ...prev, [sheetName]: emptyFilters() }))
  }, [])

  const toggleChartVisibility = useCallback(
    (chartId) => {
      if (!activeWorkbookId) return
      const wb = storage.getWorkbook(activeWorkbookId)
      if (!wb) return
      const hidden = new Set(wb.dashboardConfig?.hiddenCharts || [])
      if (hidden.has(chartId)) hidden.delete(chartId)
      else hidden.add(chartId)
      wb.dashboardConfig = { ...wb.dashboardConfig, hiddenCharts: [...hidden] }
      wb.updatedAt = new Date().toISOString()
      storage.saveWorkbook(wb)
      refreshWorkbooks()
    },
    [activeWorkbookId, refreshWorkbooks]
  )

  const resetDashboardConfig = useCallback(() => {
    if (!activeWorkbookId) return
    const wb = storage.getWorkbook(activeWorkbookId)
    if (!wb) return
    wb.dashboardConfig = {}
    storage.saveWorkbook(wb)
    refreshWorkbooks()
    notify('Dashboard reset to the auto-generated layout.', 'success')
  }, [activeWorkbookId, refreshWorkbooks, notify])

  const activeWorkbook = useMemo(
    () => workbooks.find((w) => w.id === activeWorkbookId) || (activeWorkbookId ? storage.getWorkbook(activeWorkbookId) : null),
    [workbooks, activeWorkbookId]
  )

  const activeSheet = useMemo(() => {
    if (!activeWorkbook || !activeSheetName) return null
    return activeWorkbook.sheets[activeSheetName] || null
  }, [activeWorkbook, activeSheetName])

  const activeSheetProfile = useMemo(() => {
    if (!activeSheet) return null
    return profileSheet(activeSheet)
  }, [activeSheet])

  const value = useMemo(
    () => ({
      workbooks,
      activeWorkbook,
      activeSheetName,
      activeSheet,
      activeSheetProfile,
      processing,
      filters: activeSheetName ? getFiltersForSheet(activeSheetName) : emptyFilters(),
      uploadFile,
      loadDemoWorkbook,
      openWorkbook,
      closeWorkbook,
      deleteWorkbookById,
      toggleFavorite,
      renameWorkbookById,
      updateWorkbookWithFile,
      setActiveSheet,
      updateFiltersForSheet,
      clearFiltersForSheet,
      toggleChartVisibility,
      resetDashboardConfig,
      refreshWorkbooks,
    }),
    [
      workbooks,
      activeWorkbook,
      activeSheetName,
      activeSheet,
      activeSheetProfile,
      processing,
      getFiltersForSheet,
      uploadFile,
      loadDemoWorkbook,
      openWorkbook,
      closeWorkbook,
      deleteWorkbookById,
      toggleFavorite,
      renameWorkbookById,
      updateWorkbookWithFile,
      setActiveSheet,
      updateFiltersForSheet,
      clearFiltersForSheet,
      toggleChartVisibility,
      resetDashboardConfig,
      refreshWorkbooks,
    ]
  )

  return <WorkbookContext.Provider value={value}>{children}</WorkbookContext.Provider>
}

export function useWorkbook() {
  const ctx = useContext(WorkbookContext)
  if (!ctx) throw new Error('useWorkbook must be used within WorkbookProvider')
  return ctx
}
