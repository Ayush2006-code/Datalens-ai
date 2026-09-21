import * as XLSX from 'xlsx'
import Papa from 'papaparse'

export const SUPPORTED_EXTENSIONS = ['xlsx', 'xls', 'csv', 'ods']
export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024 // 25MB — safe ceiling for in-browser parsing
export const MAX_ROWS_PER_SHEET = 200_000 // hard safety ceiling to avoid locking the tab

export class SpreadsheetError extends Error {}

export function getExtension(filename) {
  const parts = filename.toLowerCase().split('.')
  return parts.length > 1 ? parts.pop() : ''
}

export function validateFile(file) {
  const ext = getExtension(file.name)
  if (!SUPPORTED_EXTENSIONS.includes(ext)) {
    throw new SpreadsheetError(
      `"${file.name}" isn't a supported file type. Upload an .xlsx, .xls, .csv, or .ods file.`
    )
  }
  if (file.size === 0) {
    throw new SpreadsheetError('This file is empty.')
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new SpreadsheetError(
      `This file is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). The limit is ${
        MAX_FILE_SIZE_BYTES / 1024 / 1024
      }MB.`
    )
  }
  return ext
}

// Converts a raw 2D array (header row + data rows) into { columns, rows }.
function rowsFromAOA(aoa, sheetLabel) {
  // Find the first non-empty row to use as headers.
  let headerIdx = aoa.findIndex((row) => row && row.some((cell) => cell !== '' && cell != null))
  if (headerIdx === -1) {
    return { columns: [], rows: [], warning: `Sheet "${sheetLabel}" is empty.` }
  }
  const rawHeader = aoa[headerIdx]
  const columns = rawHeader.map((h, i) =>
    h === '' || h == null ? `Column ${i + 1}` : String(h).trim()
  )

  // De-duplicate identical header names.
  const seen = new Map()
  const dedupedColumns = columns.map((c) => {
    const count = seen.get(c) || 0
    seen.set(c, count + 1)
    return count === 0 ? c : `${c} (${count + 1})`
  })

  const dataRows = aoa.slice(headerIdx + 1).filter((r) => r && r.some((cell) => cell !== '' && cell != null))

  if (dataRows.length === 0) {
    return { columns: dedupedColumns, rows: [], warning: `Sheet "${sheetLabel}" has headers but no data rows.` }
  }

  const truncated = dataRows.length > MAX_ROWS_PER_SHEET
  const limitedRows = truncated ? dataRows.slice(0, MAX_ROWS_PER_SHEET) : dataRows

  const rows = limitedRows.map((r) => {
    const obj = {}
    dedupedColumns.forEach((col, i) => {
      obj[col] = r[i] === undefined ? null : r[i]
    })
    return obj
  })

  return {
    columns: dedupedColumns,
    rows,
    warning: truncated
      ? `Sheet "${sheetLabel}" has more than ${MAX_ROWS_PER_SHEET.toLocaleString()} rows; only the first ${MAX_ROWS_PER_SHEET.toLocaleString()} were loaded.`
      : null,
  }
}

function parseCSVText(text, sheetLabel) {
  const result = Papa.parse(text.trim(), { skipEmptyLines: true })
  if (result.errors?.length) {
    const fatal = result.errors.find((e) => e.type !== 'FieldMismatch')
    if (fatal && result.data.length === 0) {
      throw new SpreadsheetError(`Couldn't read this CSV file: ${fatal.message}`)
    }
  }
  return rowsFromAOA(result.data, sheetLabel)
}

async function parseCSV(file) {
  const text = await file.text()
  const { columns, rows, warning } = parseCSVText(text, file.name.replace(/\.csv$/i, ''))
  const sheetName = 'Sheet1'
  return {
    fileName: file.name,
    sheets: { [sheetName]: { columns, rows } },
    warnings: warning ? [warning] : [],
  }
}

async function parseWorkbookBinary(file) {
  const buffer = await file.arrayBuffer()
  let workbook
  try {
    workbook = XLSX.read(buffer, { type: 'array', cellDates: true })
  } catch (err) {
    throw new SpreadsheetError(
      'This file looks corrupted or is not a valid spreadsheet. Try re-saving it and uploading again.'
    )
  }

  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new SpreadsheetError('This workbook does not contain any sheets.')
  }

  const sheets = {}
  const warnings = []

  for (const sheetName of workbook.SheetNames) {
    const ws = workbook.Sheets[sheetName]
    const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true })
    const { columns, rows, warning } = rowsFromAOA(aoa, sheetName)
    if (warning) warnings.push(warning)
    // Skip fully-empty sheets rather than showing an unusable tab, but keep
    // at least one sheet even if everything is empty (so we can explain why).
    if (columns.length > 0) {
      sheets[sheetName] = { columns, rows }
    }
  }

  if (Object.keys(sheets).length === 0) {
    throw new SpreadsheetError(
      "We couldn't find any structured data in this workbook. Every sheet appears to be empty."
    )
  }

  return { fileName: file.name, sheets, warnings }
}

/**
 * Parses a File (xlsx/xls/csv/ods) into the app's normalized shape:
 * { fileName, sheets: { [sheetName]: { columns: string[], rows: object[] } }, warnings: string[] }
 */
export async function parseSpreadsheetFile(file) {
  const ext = validateFile(file)
  if (ext === 'csv') {
    return parseCSV(file)
  }
  // xlsx, xls, and ods are all readable through the xlsx library's binary parser.
  return parseWorkbookBinary(file)
}
