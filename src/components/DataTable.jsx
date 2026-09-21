import React, { useState } from 'react';

export default function DataTable({ dataset }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  if (!dataset || !dataset.rows || dataset.rows.length === 0) {
    return (
      <div className="p-8 text-center text-slate-400 bg-slate-900/50 rounded-xl border border-slate-800">
        No dataset rows available to display.
      </div>
    );
  }

  const headers = dataset.headers || Object.keys(dataset.rows[0] || {});

  // Search filtering
  const filteredRows = dataset.rows.filter((row) =>
    headers.some((header) => {
      const val = row[header];
      return val !== null && val !== undefined && String(val).toLowerCase().includes(searchTerm.toLowerCase());
    })
  );

  // Pagination logic
  const totalPages = Math.ceil(filteredRows.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const currentRows = filteredRows.slice(startIndex, startIndex + rowsPerPage);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
      {/* Table Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-800">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">
            Sheet: {dataset.sheet_name || 'Sheet1'}
          </h2>
          <p className="text-xs text-slate-400">
            Showing {filteredRows.length} total rows ({headers.length} columns)
          </p>
        </div>

        <input
          type="text"
          placeholder="Search in dataset..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1);
          }}
          className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-emerald-500 w-full sm:w-64"
        />
      </div>

      {/* Table Data View */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-950 text-slate-400 uppercase text-xs font-mono border-b border-slate-800">
            <tr>
              {headers.map((header, idx) => (
                <th key={idx} className="px-4 py-3 whitespace-nowrap">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {currentRows.map((row, rowIdx) => (
              <tr key={rowIdx} className="hover:bg-slate-800/40 transition-colors">
                {headers.map((header, colIdx) => (
                  <td key={colIdx} className="px-4 py-3 whitespace-nowrap font-mono text-xs">
                    {row[header] !== null && row[header] !== undefined
                      ? String(row[header])
                      : '-'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs text-slate-400">
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 rounded transition-colors"
            >
              Previous
            </button>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 rounded transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}