import React from 'react';
import { generateDatasetInsights } from '../services/insightService';

export default function InsightsView({ dataset }) {
  if (!dataset) return null;

  const { columnStats, kpis } = generateDatasetInsights(dataset);

  return (
    <div className="space-y-6">
      {/* Key Metrics / KPIs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, idx) => (
          <div
            key={idx}
            className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex items-center gap-4"
          >
            <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-lg flex items-center justify-center text-xl">
              {kpi.icon}
            </div>
            <div>
              <p className="text-xs text-slate-400">{kpi.label}</p>
              <h3 className="text-xl font-bold text-slate-100">{kpi.value}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* Automated Column Summaries */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h3 className="text-lg font-semibold text-slate-100 mb-4">
          Automated Column Insights
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {columnStats.map((stat, idx) => (
            <div
              key={idx}
              className="p-4 bg-slate-950 border border-slate-800/80 rounded-lg space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-200 text-sm truncate">
                  {stat.column}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                  {stat.type}
                </span>
              </div>

              {stat.type === 'Numeric' ? (
                <div className="grid grid-cols-2 gap-2 text-xs font-mono text-slate-400 pt-2 border-t border-slate-800/50">
                  <div>
                    <span className="text-slate-500 block">Average</span>
                    <span className="text-emerald-400 font-semibold">{stat.avg}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Sum</span>
                    <span className="text-slate-300">{stat.sum}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Min</span>
                    <span className="text-slate-300">{stat.min}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Max</span>
                    <span className="text-slate-300">{stat.max}</span>
                  </div>
                </div>
              ) : (
                <div className="text-xs font-mono text-slate-400 pt-2 border-t border-slate-800/50">
                  <span className="text-slate-500 block">Unique Values</span>
                  <span className="text-emerald-400 font-semibold">{stat.uniqueCount}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}