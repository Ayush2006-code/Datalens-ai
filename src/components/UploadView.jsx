import { useCallback, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { UploadCloud, FileSpreadsheet, Sparkles, Link2 } from 'lucide-react'
import { useWorkbook } from '../context/WorkbookContext.jsx'
import { SUPPORTED_EXTENSIONS, MAX_FILE_SIZE_BYTES } from '../services/spreadsheetParser.js'
import { isGoogleSheetsConfigured, startGoogleOAuthFlow } from '../services/googleSheets.js'
import { useToast } from '../context/ToastContext.jsx'

export default function UploadView() {
  const { uploadFile, loadDemoWorkbook } = useWorkbook()
  const { notify } = useToast()
  const navigate = useNavigate()
  const inputRef = useRef(null)
  const [dragOver, setDragOver] = useState(false)
  const [selectedName, setSelectedName] = useState('')

  const handleFile = useCallback(
    async (file) => {
      if (!file) return
      setSelectedName(file.name)
      const wb = await uploadFile(file)
      if (wb) navigate('/app/dashboard')
    },
    [uploadFile, navigate]
  )

  function onDrop(e) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    handleFile(file)
  }

  async function handleDemo() {
    const wb = await loadDemoWorkbook()
    if (wb) navigate('/app/dashboard')
  }

  async function handleGoogleConnect() {
    try {
      await startGoogleOAuthFlow()
    } catch (err) {
      notify(err.message, 'info')
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-6 md:p-10">
      <h1 className="font-display text-2xl font-semibold text-ink mb-2">Upload a workbook</h1>
      <p className="text-sm text-ink-muted mb-8">Supports .xlsx, .xls, .csv, and .ods files up to {MAX_FILE_SIZE_BYTES / 1024 / 1024}MB.</p>

      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`rounded-xl2 border-2 border-dashed p-10 text-center transition-colors ${
          dragOver ? 'border-accent bg-accent-soft' : 'border-border bg-surface-raised'
        }`}
      >
        <div className="h-12 w-12 rounded-xl bg-accent-soft text-accent flex items-center justify-center mx-auto mb-4">
          <UploadCloud size={22} />
        </div>
        <p className="text-ink font-medium mb-1">Drag and drop your file here</p>
        <p className="text-sm text-ink-muted mb-5">or</p>
        <button
          onClick={() => inputRef.current?.click()}
          className="bg-accent hover:bg-accent-strong transition-colors text-white text-sm font-medium rounded-lg px-5 py-2.5"
        >
          Browse files
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={SUPPORTED_EXTENSIONS.map((e) => `.${e}`).join(',')}
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        {selectedName && (
          <p className="mt-4 text-xs text-ink-faint flex items-center justify-center gap-1.5">
            <FileSpreadsheet size={13} /> {selectedName}
          </p>
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-4 mt-6">
        <button
          onClick={handleDemo}
          className="flex items-center gap-3 rounded-xl border border-border bg-surface-raised p-4 text-left hover:border-accent/40 transition-colors"
        >
          <div className="h-9 w-9 rounded-lg bg-accent-soft text-accent flex items-center justify-center shrink-0">
            <Sparkles size={16} />
          </div>
          <div>
            <p className="text-sm font-medium text-ink">Try demo data</p>
            <p className="text-xs text-ink-muted">A realistic sales workbook with 3 sheets</p>
          </div>
        </button>

        <button
          onClick={handleGoogleConnect}
          className="flex items-center gap-3 rounded-xl border border-border bg-surface-raised p-4 text-left hover:border-accent/40 transition-colors"
        >
          <div className="h-9 w-9 rounded-lg bg-surface-sunken text-ink-muted flex items-center justify-center shrink-0">
            <Link2 size={16} />
          </div>
          <div>
            <p className="text-sm font-medium text-ink">Connect Google Sheets</p>
            <p className="text-xs text-ink-muted">
              {isGoogleSheetsConfigured() ? 'Sign in with Google to import a sheet' : 'Requires OAuth configuration'}
            </p>
          </div>
        </button>
      </div>
    </div>
  )
}
