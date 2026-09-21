// Compares a workbook's existing sheets against a freshly parsed file so
// "Update Workbook" can report exactly what changed, and so the dashboard
// configuration can be preserved for sheets/columns that are unaffected.

export function diffWorkbooks(oldSheets, newSheets) {
  const oldNames = Object.keys(oldSheets)
  const newNames = Object.keys(newSheets)

  const addedSheets = newNames.filter((n) => !oldNames.includes(n))
  const removedSheets = oldNames.filter((n) => !newNames.includes(n))
  const sheetDiffs = {}

  for (const name of newNames) {
    if (!oldSheets[name]) continue
    const oldCols = oldSheets[name].columns
    const newCols = newSheets[name].columns
    const addedColumns = newCols.filter((c) => !oldCols.includes(c))
    const removedColumns = oldCols.filter((c) => !newCols.includes(c))
    const rowDelta = newSheets[name].rows.length - oldSheets[name].rows.length

    // Detect columns whose values look meaningfully different by comparing
    // simple aggregate signatures rather than diffing every cell.
    const changedColumns = []
    for (const col of newCols) {
      if (!oldCols.includes(col)) continue
      const oldSample = oldSheets[name].rows.slice(0, 50).map((r) => r[col])
      const newSample = newSheets[name].rows.slice(0, 50).map((r) => r[col])
      const oldJoined = oldSample.join('|')
      const newJoined = newSample.join('|')
      if (oldJoined !== newJoined && oldSample.length && newSample.length) {
        changedColumns.push(col)
      }
    }

    sheetDiffs[name] = { addedColumns, removedColumns, changedColumns, rowDelta }
  }

  return { addedSheets, removedSheets, sheetDiffs }
}

export function summarizeDiff(diff) {
  const lines = []
  if (diff.addedSheets.length) lines.push(`+${diff.addedSheets.length} new sheet${diff.addedSheets.length === 1 ? '' : 's'}: ${diff.addedSheets.join(', ')}`)
  if (diff.removedSheets.length) lines.push(`${diff.removedSheets.length} sheet${diff.removedSheets.length === 1 ? '' : 's'} removed: ${diff.removedSheets.join(', ')}`)
  for (const [sheet, d] of Object.entries(diff.sheetDiffs)) {
    if (d.rowDelta !== 0) lines.push(`${sheet}: ${d.rowDelta > 0 ? '+' : ''}${d.rowDelta.toLocaleString()} rows`)
    if (d.addedColumns.length) lines.push(`${sheet}: new column${d.addedColumns.length === 1 ? '' : 's'} — ${d.addedColumns.join(', ')}`)
    if (d.removedColumns.length) lines.push(`${sheet}: removed column${d.removedColumns.length === 1 ? '' : 's'} — ${d.removedColumns.join(', ')}`)
    if (d.changedColumns.length) lines.push(`${sheet}: values changed in — ${d.changedColumns.join(', ')}`)
  }
  if (lines.length === 0) lines.push('No structural changes detected — data refreshed.')
  return lines
}
