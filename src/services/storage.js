// Workbook persistence — LOCAL / DEMO implementation (localStorage).
//
// Every workbook is namespaced by ownerId so one browser can hold workbooks
// for multiple local accounts without them leaking into each other. In a
// production build, replace the body of these functions with calls to your
// backend (e.g. `fetch('/api/workbooks')`) and keep the same function
// signatures — nothing in the UI layer needs to know where the data lives.

const INDEX_KEY = 'datalens.workbooks.index'

function readIndex() {
  try {
    const raw = localStorage.getItem(INDEX_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function writeIndex(ids) {
  localStorage.setItem(INDEX_KEY, JSON.stringify(ids))
}

function workbookKey(id) {
  return `datalens.workbook.${id}`
}

export function listWorkbooks(ownerId) {
  const ids = readIndex()
  const workbooks = []
  for (const id of ids) {
    try {
      const raw = localStorage.getItem(workbookKey(id))
      if (!raw) continue
      const wb = JSON.parse(raw)
      if (wb.ownerId === ownerId) workbooks.push(wb)
    } catch {
      // skip corrupted entry
    }
  }
  return workbooks.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
}

export function getWorkbook(id) {
  try {
    const raw = localStorage.getItem(workbookKey(id))
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveWorkbook(workbook) {
  const ids = readIndex()
  if (!ids.includes(workbook.id)) {
    ids.push(workbook.id)
    writeIndex(ids)
  }
  try {
    localStorage.setItem(workbookKey(workbook.id), JSON.stringify(workbook))
    return { ok: true }
  } catch (err) {
    return { ok: false, error: 'Storage is full. Try deleting an older workbook.' }
  }
}

export function deleteWorkbook(id) {
  const ids = readIndex().filter((x) => x !== id)
  writeIndex(ids)
  localStorage.removeItem(workbookKey(id))
}

export function createWorkbookRecord({ ownerId, name, sheets, sourceType = 'upload' }) {
  const now = new Date().toISOString()
  return {
    id: `wb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    ownerId,
    name,
    sheets, // { [sheetName]: { columns, rows, profile } }
    sheetOrder: Object.keys(sheets),
    sourceType,
    favorite: false,
    dashboardConfig: {},
    versions: [{ version: 1, savedAt: now, note: 'Initial upload' }],
    createdAt: now,
    updatedAt: now,
  }
}
