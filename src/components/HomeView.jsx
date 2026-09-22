import { useNavigate } from 'react-router-dom'
import {
  UploadCloud,
  Sparkles,
  FolderOpen,
  ArrowRight,
} from 'lucide-react'

import { useWorkbook } from '../context/WorkbookContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { relativeTime } from '../utils/format.js'
import EmptyState from './EmptyState.jsx'

export default function HomeView() {
  const {
    workbooks = [],
    loadDemoWorkbook,
    openWorkbook,
  } = useWorkbook()

  const { session } = useAuth()
  const navigate = useNavigate()

  async function handleDemo() {
    const wb = await loadDemoWorkbook()

    if (wb) {
      navigate('/app/dashboard')
    }
  }

  async function handleOpen(id) {
    const wb = await openWorkbook(id)

    if (wb) {
      navigate('/app/dashboard')
    }
  }

  const firstName = session?.name?.split(' ')[0]

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto">

      {/* Header */}
      <h1 className="font-display text-2xl font-semibold text-ink mb-1">
        Welcome back
        {firstName ? `, ${firstName}` : ''}
      </h1>

      <p className="text-sm text-ink-muted mb-8">
        Turn any spreadsheet into a dashboard, instantly.
      </p>

      {/* Quick Actions */}
      <div className="grid sm:grid-cols-3 gap-4 mb-10">

        {/* Upload */}
        <button
          onClick={() => navigate('/app/upload')}
          className="flex flex-col items-start gap-3 rounded-xl2 border border-border bg-surface-raised p-5 text-left hover:border-accent/40 transition-colors"
        >
          <div className="h-10 w-10 rounded-lg bg-accent-soft text-accent flex items-center justify-center">
            <UploadCloud size={18} />
          </div>

          <div>
            <p className="font-medium text-ink mb-0.5">
              Upload workbook
            </p>

            <p className="text-xs text-ink-muted">
              xlsx, xls, csv, or ods
            </p>
          </div>
        </button>

        {/* Demo */}
        <button
          onClick={handleDemo}
          className="flex flex-col items-start gap-3 rounded-xl2 border border-border bg-surface-raised p-5 text-left hover:border-accent/40 transition-colors"
        >
          <div className="h-10 w-10 rounded-lg bg-accent-soft text-accent flex items-center justify-center">
            <Sparkles size={18} />
          </div>

          <div>
            <p className="font-medium text-ink mb-0.5">
              Try demo data
            </p>

            <p className="text-xs text-ink-muted">
              Explore a sample sales workbook
            </p>
          </div>
        </button>

        {/* Workbooks */}
        <button
          onClick={() => navigate('/app/workbooks')}
          className="flex flex-col items-start gap-3 rounded-xl2 border border-border bg-surface-raised p-5 text-left hover:border-accent/40 transition-colors"
        >
          <div className="h-10 w-10 rounded-lg bg-accent-soft text-accent flex items-center justify-center">
            <FolderOpen size={18} />
          </div>

          <div>
            <p className="font-medium text-ink mb-0.5">
              Open workbooks
            </p>

            <p className="text-xs text-ink-muted">
              {workbooks.length} saved
            </p>
          </div>
        </button>
      </div>

      {/* Recent Workbooks */}
      <div>
        <h2 className="text-sm font-medium text-ink-muted mb-3">
          Recent workbooks
        </h2>

        {workbooks.length === 0 ? (
          <EmptyState
            title="Your analytics workspace is empty"
            body="Upload a workbook or try the demo data to build your first dashboard."
          />
        ) : (
          <div className="space-y-2">

            {workbooks.slice(0, 5).map((wb) => {

              /*
               * Supabase workbook records do not always contain
               * sheetOrder until the workbook is opened and its
               * datasets are loaded.
               */
              const sheetCount = Array.isArray(wb.sheetOrder)
                ? wb.sheetOrder.length
                : Array.isArray(wb.datasets)
                  ? wb.datasets.length
                  : null

              const updatedAt =
                wb.updatedAt ||
                wb.updated_at ||
                wb.createdAt ||
                wb.created_at

              return (
                <button
                  key={wb.id}
                  onClick={() => handleOpen(wb.id)}
                  className="w-full flex items-center justify-between rounded-xl border border-border bg-surface-raised px-4 py-3.5 hover:border-accent/40 transition-colors text-left"
                >
                  <div className="min-w-0">

                    <p className="text-sm font-medium text-ink truncate">
                      {wb.name}
                    </p>

                    <p className="text-xs text-ink-muted">
                      {sheetCount !== null
                        ? `${sheetCount} sheet${sheetCount === 1 ? '' : 's'}`
                        : 'Workbook'}
                      {' · '}
                      Updated{' '}
                      {updatedAt
                        ? relativeTime(updatedAt)
                        : 'recently'}
                    </p>

                  </div>

                  <ArrowRight
                    size={15}
                    className="text-ink-faint shrink-0"
                  />
                </button>
              )
            })}

          </div>
        )}
      </div>
    </div>
  )
}