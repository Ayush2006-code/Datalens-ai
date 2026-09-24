import React, {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  useNavigate,
} from 'react-router-dom'

import DataTable from './DataTable'
import InsightsView from './InsightsView'
import ChartCard from './ChartCard'
import AskYourData from './AskYourData'

import {
  useWorkbook,
} from '../context/WorkbookContext.jsx'

export default function DashboardView() {
  const navigate =
    useNavigate()

  const {
    activeWorkbook,
    activeSheetName,
    activeSheet,
    setActiveSheet,
  } = useWorkbook()

  const [
    previewSubTab,
    setPreviewSubTab,
  ] = useState('insights')

  /* =====================================================
     SELECTED DATASET
  ===================================================== */

  const datasets =
    activeWorkbook?.datasets || []

  const [
    selectedDatasetId,
    setSelectedDatasetId,
  ] = useState(null)

  /* =====================================================
     KEEP DATASET IN SYNC WITH ACTIVE WORKBOOK
  ===================================================== */

  useEffect(() => {
    if (!activeWorkbook) {
      setSelectedDatasetId(null)
      return
    }

    const workbookDatasets =
      activeWorkbook.datasets || []

    if (
      workbookDatasets.length === 0
    ) {
      setSelectedDatasetId(null)
      return
    }

    const currentExists =
      workbookDatasets.some(
        (dataset) =>
          dataset.id ===
          selectedDatasetId,
      )

    if (!currentExists) {
      setSelectedDatasetId(
        workbookDatasets[0].id,
      )
    }
  }, [
    activeWorkbook,
    selectedDatasetId,
  ])

  /* =====================================================
     SELECTED DATASET OBJECT
  ===================================================== */

  const selectedDataset =
    useMemo(() => {
      if (!datasets.length) {
        return null
      }

      return (
        datasets.find(
          (dataset) =>
            dataset.id ===
            selectedDatasetId,
        ) ||
        datasets[0]
      )
    }, [
      datasets,
      selectedDatasetId,
    ])

  /* =====================================================
     FALLBACK
     
     If dashboard route is opened without an active
     workbook, send user back to workbook list.
  ===================================================== */

  useEffect(() => {
    if (!activeWorkbook) {
      const timer =
        setTimeout(() => {
          navigate(
            '/app/workbooks',
            {
              replace: true,
            },
          )
        }, 0)

      return () =>
        clearTimeout(timer)
    }
  }, [
    activeWorkbook,
    navigate,
  ])

  /* =====================================================
     NO ACTIVE WORKBOOK
  ===================================================== */

  if (!activeWorkbook) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-slate-950 text-slate-100 flex items-center justify-center">

        <div className="text-center">

          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-2xl">
            📊
          </div>

          <h2 className="text-lg font-semibold">
            No workbook is open
          </h2>

          <p className="mt-2 text-sm text-slate-400">
            Please select a workbook to view its dashboard.
          </p>

          <button
            type="button"
            onClick={() =>
              navigate(
                '/app/workbooks',
              )
            }
            className="mt-5 rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
          >
            Go to Workbooks
          </button>

        </div>

      </div>
    )
  }

  /* =====================================================
     ACTIVE SHEET
  ===================================================== */

  const sheetNames =
    activeWorkbook.sheetOrder?.length
      ? activeWorkbook.sheetOrder
      : Object.keys(
          activeWorkbook.sheets || {},
        )

  const currentSheetName =
    activeSheetName ||
    sheetNames[0] ||
    null

  /* =====================================================
     DASHBOARD
  ===================================================== */

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">

      {/* =================================================
          HEADER
      ================================================= */}

      <header className="border-b border-slate-800 bg-slate-900/60 px-6 py-4 flex items-center justify-between">

        <div className="min-w-0">

          <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-teal-200 bg-clip-text text-transparent">
            DataLens AI Dashboard
          </h1>

          <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">

            <span className="truncate max-w-[300px]">
              {activeWorkbook.name}
            </span>

            <span>
              •
            </span>

            <span>
              {sheetNames.length}{' '}
              {sheetNames.length === 1
                ? 'sheet'
                : 'sheets'}
            </span>

            <span className="text-emerald-400">
              • Encrypted
            </span>

          </div>

        </div>

        <div className="flex gap-2 bg-slate-950 p-1 rounded-lg border border-slate-800 text-sm">

          <button
            type="button"
            onClick={() =>
              navigate(
                '/app/workbooks',
              )
            }
            className="px-4 py-1.5 rounded-md font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            Workbooks
          </button>

          <button
            type="button"
            onClick={() =>
              navigate(
                '/app/upload',
              )
            }
            className="px-4 py-1.5 rounded-md font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            Upload File
          </button>

        </div>

      </header>

      {/* =================================================
          MAIN
      ================================================= */}

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">

        {/* =================================================
            TOP NAVIGATION
        ================================================= */}

        <div className="flex items-center justify-between flex-wrap gap-4">

          <button
            type="button"
            onClick={() =>
              navigate(
                '/app/workbooks',
              )
            }
            className="text-sm text-slate-400 hover:text-emerald-400 flex items-center gap-1 transition-colors"
          >
            ← Back to Workbooks
          </button>

          <div className="flex gap-4 items-center flex-wrap">

            {/* =================================================
                DASHBOARD TABS
            ================================================= */}

            <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs">

              <button
                type="button"
                onClick={() =>
                  setPreviewSubTab(
                    'insights',
                  )
                }
                className={`px-3 py-1 rounded-md transition-colors ${
                  previewSubTab ===
                  'insights'
                    ? 'bg-emerald-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                💡 Insights
              </button>

              <button
                type="button"
                onClick={() =>
                  setPreviewSubTab(
                    'charts',
                  )
                }
                className={`px-3 py-1 rounded-md transition-colors ${
                  previewSubTab ===
                  'charts'
                    ? 'bg-emerald-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                📈 Visual Charts
              </button>

              <button
                type="button"
                onClick={() =>
                  setPreviewSubTab(
                    'ask',
                  )
                }
                className={`px-3 py-1 rounded-md transition-colors ${
                  previewSubTab ===
                  'ask'
                    ? 'bg-emerald-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                🤖 Ask AI
              </button>

              <button
                type="button"
                onClick={() =>
                  setPreviewSubTab(
                    'data',
                  )
                }
                className={`px-3 py-1 rounded-md transition-colors ${
                  previewSubTab ===
                  'data'
                    ? 'bg-emerald-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                📋 Data Table
              </button>

            </div>

            {/* =================================================
                SHEETS
            ================================================= */}

            {datasets.length >
              0 && (
              <div className="flex gap-2 overflow-x-auto max-w-full">

                {datasets.map(
                  (dataset) => (
                    <button
                      key={
                        dataset.id ||
                        dataset.sheet_name
                      }
                      type="button"
                      onClick={() => {
                        setSelectedDatasetId(
                          dataset.id,
                        )

                        if (
                          dataset.sheet_name
                        ) {
                          setActiveSheet(
                            dataset.sheet_name,
                          )
                        }
                      }}
                      className={`px-3 py-1 text-xs rounded-lg font-mono border transition-colors whitespace-nowrap ${
                        selectedDataset?.id ===
                        dataset.id
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400 font-bold'
                          : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {
                        dataset.sheet_name
                      }
                    </button>
                  ),
                )}

              </div>
            )}

          </div>

        </div>

        {/* =================================================
            DATA CONTENT
        ================================================= */}

        <div className="mt-6">

          {previewSubTab ===
            'insights' && (
            <InsightsView
              dataset={
                selectedDataset
              }
            />
          )}

          {previewSubTab ===
            'charts' && (
            <ChartCard
              dataset={
                selectedDataset
              }
            />
          )}

          {previewSubTab ===
            'ask' && (
            <AskYourData
              dataset={
                selectedDataset
              }
            />
          )}

          {previewSubTab ===
            'data' && (
            <DataTable
              dataset={
                selectedDataset
              }
            />
          )}

        </div>

      </main>

    </div>
  )
}