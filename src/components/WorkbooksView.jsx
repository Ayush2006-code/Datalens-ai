import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Star, MoreVertical, Trash2, Pencil, RefreshCw, FolderOpen, UploadCloud } from 'lucide-react'
import { useWorkbook } from '../context/WorkbookContext.jsx'
import { relativeTime } from '../utils/format.js'
import EmptyState from './EmptyState.jsx'

export default function WorkbooksView({ searchQuery = '' }) {
  const { workbooks, openWorkbook, deleteWorkbookById, toggleFavorite, renameWorkbookById, updateWorkbookWithFile } = useWorkbook()
  const navigate = useNavigate()
  const [menuId, setMenuId] = useState(null)
  const [renamingId, setRenamingId] = useState(null)
  const [renameValue, setRenameValue] = useState('')
  const [onlyFavorites, setOnlyFavorites] = useState(false)
  const updateInputRef = useRef(null)
  const [updateTargetId, setUpdateTargetId] = useState(null)

  const filtered = useMemo(() => {
    let list = workbooks
    if (onlyFavorites) list = list.filter((w) => w.favorite)
    const q = searchQuery.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (w) =>
          w.name.toLowerCase().includes(q) ||
          w.sheetOrder.some((s) => s.toLowerCase().includes(q)) ||
          w.sheetOrder.some((s) => (w.sheets[s]?.columns || []).some((c) => c.toLowerCase().includes(q)))
      )
    }
    return list
  }, [workbooks, onlyFavorites, searchQuery])

  function openInDashboard(id) {
    openWorkbook(id)
    navigate('/app/dashboard')
  }

  function startRename(wb) {
    setMenuId(null)
    setRenamingId(wb.id)
    setRenameValue(wb.name)
  }

  function commitRename(id) {
    renameWorkbookById(id, renameValue)
    setRenamingId(null)
  }

  function triggerUpdate(id) {
    setMenuId(null)
    setUpdateTargetId(id)
    updateInputRef.current?.click()
  }

  async function onUpdateFileSelected(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !updateTargetId) return
    const result = await updateWorkbookWithFile(updateTargetId, file)
    if (result) navigate('/app/dashboard')
  }

  return (
    <div className="p-6 md:p-10">
      <input ref={updateInputRef} type="file" accept=".xlsx,.xls,.csv,.ods" className="hidden" onChange={onUpdateFileSelected} />
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Workbooks</h1>
          <p className="text-sm text-ink-muted">{workbooks.length} saved workbook{workbooks.length === 1 ? '' : 's'}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setOnlyFavorites((f) => !f)}
            className={`text-sm rounded-lg border px-3 py-2 flex items-center gap-1.5 transition-colors ${
              onlyFavorites ? 'border-accent/50 text-accent bg-accent-soft' : 'border-border text-ink-muted hover:text-ink'
            }`}
          >
            <Star size={14} className={onlyFavorites ? 'fill-current' : ''} /> Favorites
          </button>
          <button
            onClick={() => navigate('/app/upload')}
            className="text-sm bg-accent hover:bg-accent-strong transition-colors text-white rounded-lg px-3 py-2 flex items-center gap-1.5"
          >
            <UploadCloud size={14} /> Upload
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title={workbooks.length === 0 ? 'No workbooks yet' : 'No workbooks match your search'}
          body={workbooks.length === 0 ? 'Upload a spreadsheet or try the demo data to create your first dashboard.' : undefined}
          actions={
            workbooks.length === 0 && (
              <button
                onClick={() => navigate('/app/upload')}
                className="bg-accent hover:bg-accent-strong transition-colors text-white text-sm font-medium rounded-lg px-4 py-2.5"
              >
                Upload workbook
              </button>
            )
          }
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((wb) => (
            <div key={wb.id} className="rounded-xl2 border border-border bg-surface-raised p-5 flex flex-col dl-enter">
              <div className="flex items-start justify-between mb-3">
                <button onClick={() => toggleFavorite(wb.id)} aria-label={wb.favorite ? 'Remove from favorites' : 'Add to favorites'}>
                  <Star size={16} className={wb.favorite ? 'fill-accent text-accent' : 'text-ink-faint hover:text-ink'} />
                </button>
                <div className="relative">
                  <button onClick={() => setMenuId(menuId === wb.id ? null : wb.id)} className="text-ink-faint hover:text-ink" aria-label="Workbook options">
                    <MoreVertical size={16} />
                  </button>
                  {menuId === wb.id && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setMenuId(null)} />
                      <div className="absolute right-0 top-full mt-1 w-44 rounded-lg border border-border bg-surface-raised shadow-panel z-20 overflow-hidden">
                        <button onClick={() => startRename(wb)} className="w-full flex items-center gap-2 px-3.5 py-2.5 text-sm text-ink-muted hover:text-ink hover:bg-surface-sunken">
                          <Pencil size={13} /> Rename
                        </button>
                        <button onClick={() => triggerUpdate(wb.id)} className="w-full flex items-center gap-2 px-3.5 py-2.5 text-sm text-ink-muted hover:text-ink hover:bg-surface-sunken">
                          <RefreshCw size={13} /> Update workbook
                        </button>
                        <button
                          onClick={() => {
                            setMenuId(null)
                            deleteWorkbookById(wb.id)
                          }}
                          className="w-full flex items-center gap-2 px-3.5 py-2.5 text-sm text-rose-400 hover:bg-surface-sunken"
                        >
                          <Trash2 size={13} /> Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {renamingId === wb.id ? (
                <input
                  autoFocus
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={() => commitRename(wb.id)}
                  onKeyDown={(e) => e.key === 'Enter' && commitRename(wb.id)}
                  className="text-sm font-medium bg-surface-sunken border border-border rounded-md px-2 py-1 mb-1 text-ink outline-none focus:border-accent"
                />
              ) : (
                <h3 className="font-medium text-ink mb-1 truncate">{wb.name}</h3>
              )}

              <p className="text-xs text-ink-muted mb-4">
                {wb.sheetOrder.length} sheet{wb.sheetOrder.length === 1 ? '' : 's'} · Updated {relativeTime(wb.updatedAt)}
              </p>

              <button
                onClick={() => openInDashboard(wb.id)}
                className="mt-auto text-sm font-medium text-accent hover:text-accent-strong flex items-center gap-1.5"
              >
                Open workbook →
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
