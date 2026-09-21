import * as XLSX from 'xlsx'

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function exportRowsAsCSV(columns, rows, filename) {
  const escape = (v) => {
    if (v === null || v === undefined) return ''
    const s = String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines = [columns.map(escape).join(',')]
  for (const row of rows) {
    lines.push(columns.map((c) => escape(row[c])).join(','))
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  triggerDownload(blob, filename.endsWith('.csv') ? filename : `${filename}.csv`)
}

export function exportRowsAsExcel(columns, rows, filename, sheetName = 'Sheet1') {
  const worksheet = XLSX.utils.json_to_sheet(rows, { header: columns })
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31))
  XLSX.writeFile(workbook, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`)
}

export function exportWorkbookAsExcel(sheets, filename) {
  const workbook = XLSX.utils.book_new()
  for (const [name, sheet] of Object.entries(sheets)) {
    const worksheet = XLSX.utils.json_to_sheet(sheet.rows, { header: sheet.columns })
    XLSX.utils.book_append_sheet(workbook, worksheet, name.slice(0, 31))
  }
  XLSX.writeFile(workbook, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`)
}

/** Opens the browser print dialog scoped to the dashboard for a "PDF report". */
export function exportDashboardAsPDF() {
  window.print()
}
