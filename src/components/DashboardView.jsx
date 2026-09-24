import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import WorkbooksView from './WorkbooksView'
import UploadView from './UploadView'
import DataTable from './DataTable'
import InsightsView from './InsightsView'
import ChartCard from './ChartCard'
import AskYourData from './AskYourData'

import { useWorkbook } from '../context/WorkbookContext.jsx'

export default function DashboardView() {
  const navigate = useNavigate()

  const {
    activeWorkbook,
    openWorkbook,
    closeWorkbook,
  } = useWorkbook()

  const [activeTab, setActiveTab] =
    useState('workbooks')

  const [previewSubTab, setPreviewSubTab] =
    useState('insights')

  const [loading, setLoading] =
    useState(false)

  const [selectedDatasetId, setSelectedDatasetId] =
    useState(null)

  const datasets =
    activeWorkbook?.datasets || []

  const selectedDataset =
    activeWorkbook?.datasets?.find(
      (dataset) =>
        dataset.id === selectedDatasetId,
    ) ||
    activeWorkbook?.datasets?.[0] ||
    null

  /* =====================================================
     SELECT WORKBOOK
  ===================================================== */

  const handleSelectWorkbook = async (
    workbookId,
  ) => {
    try {
      setLoading(true)

      const workbook =
        await openWorkbook(workbookId)

      if (!workbook) {
        return
      }

      setSelectedDatasetId(
        workbook.datasets?.[0]?.id ||
          null,
      )

      setPreviewSubTab('insights')
      setActiveTab('preview')

      /*
       * IMPORTANT:
       *
       * Change URL after workbook has successfully
       * opened.
       *
       * This makes the Dashboard route active, so
       * the sidebar/dashboard navigation state is
       * correct.
       */
      navigate('/app/dashboard')
    } catch (error) {
      console.error(
        'Failed to open workbook:',
        error,
      )
    } finally {
      setLoading(false)
    }
  }

  /* =====================================================
     UPLOAD SUCCESS
  ===================================================== */

  const handleUploadSuccess = async (
    workbookId,
  ) => {
    await handleSelectWorkbook(
      workbookId,
    )
  }

  /* =====================================================
     CLOSE WORKBOOK
  ===================================================== */

  const handleCloseWorkbook = () => {
    closeWorkbook()

    setSelectedDatasetId(null)
    setPreviewSubTab('insights')
    setActiveTab('workbooks')

    navigate('/app/workbooks')
  }

  /* =====================================================
     WORKBOOK DASHBOARD
  ===================================================== */

  if (
    activeTab === 'preview' &&
    activeWorkbook
  ) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">

        {/* =================================================
            HEADER
        ================================================= */}

        <header className="border-b border-slate-800 bg-slate-900/60 px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-teal-200 bg-clip-text text-transparent">
            DataLens AI Dashboard
          </h1>

          <div className="flex gap-2 bg-slate-950 p-1 rounded-lg border border-slate-800 text-sm">

            <button
              onClick={() =>
                setActiveTab('workbooks')
              }
              className="px-4 py-1.5 rounded-md font-medium text-slate-400 hover:text-slate-200 transition-colors"
            >
              Workbooks
            </button>

            <button
              onClick={() =>
                setActiveTab('upload')
              }
              className="px-4 py-1.5 rounded-md font-medium text-slate-400 hover:text-slate-200 transition-colors"
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
              TOP BAR
          ================================================= */}

          <div className="flex items-center justify-between flex-wrap gap-4 mb-6">

            <button
              onClick={
                handleCloseWorkbook
              }
              className="text-sm text-slate-400 hover:text-emerald-400 flex items-center gap-1 transition-colors"
            >
              ← Back to Workbooks
            </button>

            <div className="flex gap-4 items-center flex-wrap">

              {/* =================================================
                  PREVIEW TABS
              ================================================= */}

              <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs">

                <button
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
                  onClick={() =>
                    setPreviewSubTab(
                      'ask',
                    )
                  }
                  className={`px-3 py-1 rounded-md transition-colors ${
                    previewSubTab === 'ask'
                      ? 'bg-emerald-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  🤖 Ask AI
                </button>

                <button
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
                  SHEET SELECTOR
              ================================================= */}

              {datasets.length > 1 && (
                <div className="flex gap-2 overflow-x-auto">

                  {datasets.map(
                    (dataset) => (
                      <button
                        key={
                          dataset.id
                        }
                        onClick={() =>
                          setSelectedDatasetId(
                            dataset.id,
                          )
                        }
                        className={`px-3 py-1 text-xs rounded-lg font-mono border transition-colors ${
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
              WORKBOOK TITLE
          ================================================= */}

          <div className="mb-6 flex items-center justify-between gap-4">

            <div>
              <h2 className="text-2xl font-bold text-slate-100">
                {activeWorkbook.name}
              </h2>

              <p className="text-sm text-slate-500 mt-1">
                {datasets.length}{' '}
                {datasets.length === 1
                  ? 'sheet'
                  : 'sheets'}{' '}
                · Encrypted
              </p>
            </div>

            {/* =================================================
                CLOSE WORKBOOK
            ================================================= */}

            <button
              type="button"
              onClick={
                handleCloseWorkbook
              }
              className="px-4 py-2 rounded-lg border border-slate-700 text-slate-400 hover:text-red-400 hover:border-red-400/40 hover:bg-red-400/10 transition-colors"
            >
              ✕ Close Workbook
            </button>

          </div>

          {/* =================================================
              DATA CONTENT
          ================================================= */}

          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !selectedDataset ? (
            <div className="flex justify-center items-center py-20">
              <div className="text-center">
                <p className="text-slate-300 font-medium">
                  No dataset available.
                </p>

                <p className="text-slate-500 text-sm mt-1">
                  This workbook does not
                  contain readable data.
                </p>
              </div>
            </div>
          ) : previewSubTab ===
            'insights' ? (
            <InsightsView
              dataset={
                selectedDataset
              }
            />
          ) : previewSubTab ===
            'charts' ? (
            <ChartCard
              dataset={
                selectedDataset
              }
            />
          ) : previewSubTab ===
            'ask' ? (
            <AskYourData
              dataset={
                selectedDataset
              }
            />
          ) : (
            <DataTable
              dataset={
                selectedDataset
              }
            />
          )}

        </main>
      </div>
    )
  }

  /* =====================================================
     WORKBOOK LIST
  ===================================================== */

  if (
    activeTab === 'workbooks'
  ) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">

        <header className="border-b border-slate-800 bg-slate-900/60 px-6 py-4 flex items-center justify-between">

          <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-teal-200 bg-clip-text text-transparent">
            DataLens AI Dashboard
          </h1>

          <div className="flex gap-2 bg-slate-950 p-1 rounded-lg border border-slate-800 text-sm">

            <button
              onClick={() =>
                setActiveTab(
                  'workbooks',
                )
              }
              className="px-4 py-1.5 rounded-md font-medium bg-emerald-500 text-slate-950"
            >
              Workbooks
            </button>

            <button
              onClick={() =>
                setActiveTab(
                  'upload',
                )
              }
              className="px-4 py-1.5 rounded-md font-medium text-slate-400 hover:text-slate-200"
            >
              Upload File
            </button>

          </div>
        </header>

        <main className="flex-1 p-6 max-w-7xl mx-auto w-full">

          <WorkbooksView
            onSelectWorkbook={
              handleSelectWorkbook
            }
            onUploadNew={() =>
              setActiveTab(
                'upload',
              )
            }
          />

        </main>
      </div>
    )
  }

  /* =====================================================
     UPLOAD
  ===================================================== */

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">

      <header className="border-b border-slate-800 bg-slate-900/60 px-6 py-4 flex items-center justify-between">

        <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-teal-200 bg-clip-text text-transparent">
          DataLens AI Dashboard
        </h1>

        <div className="flex gap-2 bg-slate-950 p-1 rounded-lg border border-slate-800 text-sm">

          <button
            onClick={() =>
              setActiveTab(
                'workbooks',
              )
            }
            className="px-4 py-1.5 rounded-md font-medium text-slate-400 hover:text-slate-200"
          >
            Workbooks
          </button>

          <button
            onClick={() =>
              setActiveTab(
                'upload',
              )
            }
            className="px-4 py-1.5 rounded-md font-medium bg-emerald-500 text-slate-950"
          >
            Upload File
          </button>

        </div>
      </header>

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">

        <UploadView
          onUploadSuccess={
            handleUploadSuccess
          }
        />

      </main>
    </div>
  )
}