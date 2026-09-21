import React, { useState } from 'react';

export default function ChartCard({ dataset }) {
  if (!dataset || !dataset.rows || dataset.rows.length === 0) {
    return null;
  }

  const { headers, rows } = dataset;

  // Identify numeric and categorical columns
  const numericColumns = headers.filter((header) => {
    return rows.some((row) => {
      const val = row[header];
      return val !== null && val !== undefined && !isNaN(Number(val));
    });
  });

  const categoricalColumns = headers.filter((header) => !numericColumns.includes(header));

  const [labelCol, setLabelCol] = useState(categoricalColumns[0] || headers[0]);
  const [valCol, setValCol] = useState(numericColumns[0] || headers[1] || headers[0]);

  if (numericColumns.length === 0) {
    return (
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl text-center text-slate-400">
        No numerical columns available in this dataset to generate charts.
      </div>
    );
  }

  // Aggregate data for top 10 items
  const chartDataMap = {};
  rows.forEach((row) => {
    const label = String(row[labelCol] || 'Unknown');
    const val = Number(row[valCol]) || 0;
    chartDataMap[label] = (chartDataMap[label] || 0) + val;
  });

  const chartItems = Object.entries(chartDataMap)
    .map(([label, val]) => ({ label, value: val }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  const maxValue = Math.max(...chartItems.map((item) => item.value), 1);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-6">
      {/* Chart Controls Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h3 className="text-lg font-semibold text-slate-100">Visual Data Breakdown</h3>
          <p className="text-xs text-slate-400">Compare metrics across top categories</p>
        </div>

        <div className="flex flex-wrap gap-3">
          {/* Label Selector */}
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>Category (X):</span>
            <select
              value={labelCol}
              onChange={(e) => setLabelCol(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
            >
              {headers.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </div>

          {/* Value Selector */}
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>Metric (Y):</span>
            <select
              value={valCol}
              onChange={(e) => setValCol(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
            >
              {numericColumns.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Horizontal Bar Chart Representation */}
      <div className="space-y-3 pt-2">
        {chartItems.map((item, idx) => {
          const percentage = Math.min((item.value / maxValue) * 100, 100);
          return (
            <div key={idx} className="space-y-1">
              <div className="flex justify-between text-xs text-slate-300 font-mono">
                <span className="truncate max-w-[200px]">{item.label}</span>
                <span className="text-emerald-400 font-semibold">
                  {item.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-3 overflow-hidden border border-slate-800/60">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}