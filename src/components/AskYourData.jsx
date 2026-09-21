import React, { useState } from 'react';

export default function AskYourData({ dataset }) {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState(null);

  if (!dataset || !dataset.rows || dataset.rows.length === 0) {
    return null;
  }

  const handleSearch = (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    const searchTerm = query.toLowerCase().trim();
    const headers = dataset.headers || Object.keys(dataset.rows[0] || {});

    // Basic AI NLP simulation: Match intent (sum/total, average, top, filter)
    let answerText = '';
    let matchedRows = [];

    if (searchTerm.includes('total') || searchTerm.includes('sum')) {
      // Find numeric column mentioned in query or use first numeric
      const targetCol = headers.find((h) => searchTerm.includes(h.toLowerCase())) ||
        headers.find((h) => dataset.rows.some((r) => !isNaN(Number(r[h]))));

      if (targetCol) {
        const sum = dataset.rows.reduce((acc, r) => acc + (Number(r[targetCol]) || 0), 0);
        answerText = `Total sum of '${targetCol}' is ${sum.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
      }
    } else if (searchTerm.includes('average') || searchTerm.includes('avg')) {
      const targetCol = headers.find((h) => searchTerm.includes(h.toLowerCase())) ||
        headers.find((h) => dataset.rows.some((r) => !isNaN(Number(r[h]))));

      if (targetCol) {
        const total = dataset.rows.reduce((acc, r) => acc + (Number(r[targetCol]) || 0), 0);
        const avg = total / dataset.rows.length;
        answerText = `Average of '${targetCol}' is ${avg.toFixed(2)}`;
      }
    } else if (searchTerm.includes('top') || searchTerm.includes('highest')) {
      const targetCol = headers.find((h) => dataset.rows.some((r) => !isNaN(Number(r[h]))));
      if (targetCol) {
        matchedRows = [...dataset.rows]
          .sort((a, b) => (Number(b[targetCol]) || 0) - (Number(a[targetCol]) || 0))
          .slice(0, 5);
        answerText = `Showing Top 5 records sorted by '${targetCol}':`;
      }
    }

    // Default fallback: Filter rows by term
    if (matchedRows.length === 0) {
      matchedRows = dataset.rows.filter((row) =>
        headers.some((h) =>
          row[h] !== null && row[h] !== undefined && String(row[h]).toLowerCase().includes(searchTerm)
        )
      );

      if (!answerText) {
        answerText = `Found ${matchedRows.length} matching record(s) for "${query}":`;
      }
    }

    setResult({ answerText, matchedRows: matchedRows.slice(0, 10), headers });
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-5">
      <div>
        <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
          <span>🤖</span> Ask Your Data
        </h3>
        <p className="text-xs text-slate-400">Ask natural questions about your spreadsheet</p>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. Total sales, Average age, or Top 5 items..."
          className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
        />
        <button
          type="submit"
          className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-lg text-sm transition-colors"
        >
          Ask AI
        </button>
      </form>

      {result && (
        <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg space-y-3">
          <p className="text-sm font-semibold text-emerald-400">{result.answerText}</p>

          {result.matchedRows.length > 0 && (
            <div className="overflow-x-auto pt-2">
              <table className="w-full text-left text-xs font-mono text-slate-300">
                <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                  <tr>
                    {result.headers.map((h, idx) => (
                      <th key={idx} className="p-2 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {result.matchedRows.map((r, rIdx) => (
                    <tr key={rIdx} className="hover:bg-slate-900/50">
                      {result.headers.map((h, cIdx) => (
                        <td key={cIdx} className="p-2 whitespace-nowrap">
                          {r[h] !== null && r[h] !== undefined ? String(r[h]) : '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}