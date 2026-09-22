import React, { useEffect, useMemo, useState } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'

const COLORS = [
  '#10b981',
  '#14b8a6',
  '#06b6d4',
  '#3b82f6',
  '#8b5cf6',
  '#f59e0b',
  '#ef4444',
  '#ec4899',
]

const isNumeric = (value) => {
  if (value === null || value === undefined || value === '') return false
  return Number.isFinite(Number(value))
}

const isDateLike = (value) => {
  if (!value) return false
  const parsed = Date.parse(String(value))
  return !Number.isNaN(parsed)
}

const formatNumber = (value) =>
  Number(value || 0).toLocaleString(undefined, {
    maximumFractionDigits: 2,
  })

function aggregate(rows, labelCol, valueCol) {
  const map = {}

  rows.forEach((row) => {
    const label =
      row?.[labelCol] === null ||
      row?.[labelCol] === undefined ||
      String(row?.[labelCol]).trim() === ''
        ? 'Unknown'
        : String(row[labelCol])

    const value = Number(row?.[valueCol])

    if (!Number.isFinite(value)) return

    map[label] = (map[label] || 0) + value
  })

  return Object.entries(map)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 20)
}

function buildTimeSeries(rows, dateCol, valueCol) {
  return rows
    .map((row) => {
      const date = new Date(row?.[dateCol])
      const value = Number(row?.[valueCol])

      if (Number.isNaN(date.getTime()) || !Number.isFinite(value)) {
        return null
      }

      return {
        label: date.toLocaleDateString(undefined, {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }),
        value,
        timestamp: date.getTime(),
      }
    })
    .filter(Boolean)
    .sort((a, b) => a.timestamp - b.timestamp)
    .map(({ label, value }) => ({ label, value }))
}

function buildScatter(rows, xCol, yCol) {
  return rows
    .map((row) => ({
      x: Number(row?.[xCol]),
      y: Number(row?.[yCol]),
    }))
    .filter((item) => Number.isFinite(item.x) && Number.isFinite(item.y))
    .slice(0, 500)
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null

  return (
    <div className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 shadow-xl">
      {label !== undefined && (
        <p className="text-xs text-slate-400 mb-1">{label}</p>
      )}

      {payload.map((item, index) => (
        <p key={index} className="text-sm text-slate-100">
          <span className="text-emerald-400">
            {item.name || 'Value'}:
          </span>{' '}
          {formatNumber(item.value)}
        </p>
      ))}
    </div>
  )
}

export default function ChartCard({ dataset }) {
  const headers = dataset?.headers || []
  const rows = dataset?.rows || []

  // IMPORTANT:
  // All hooks are called BEFORE any conditional return.
  const columnStats = useMemo(() => {
    return headers.map((header) => {
      const values = rows
        .map((row) => row?.[header])
        .filter(
          (value) =>
            value !== null &&
            value !== undefined &&
            String(value).trim() !== '',
        )

      const numericCount = values.filter(isNumeric).length
      const dateCount = values.filter(isDateLike).length

      return {
        header,
        numericRatio:
          values.length > 0 ? numericCount / values.length : 0,
        dateRatio:
          values.length > 0 ? dateCount / values.length : 0,
      }
    })
  }, [headers, rows])

  const numericColumns = useMemo(
    () =>
      columnStats
        .filter((column) => column.numericRatio >= 0.6)
        .map((column) => column.header),
    [columnStats],
  )

  const categoricalColumns = useMemo(
    () =>
      columnStats
        .filter((column) => column.numericRatio < 0.6)
        .map((column) => column.header),
    [columnStats],
  )

  const dateColumns = useMemo(
    () =>
      columnStats
        .filter((column) => column.dateRatio >= 0.6)
        .map((column) => column.header),
    [columnStats],
  )

  const [chartType, setChartType] = useState('bar')
  const [labelCol, setLabelCol] = useState('')
  const [valueCol, setValueCol] = useState('')
  const [secondValueCol, setSecondValueCol] = useState('')

  useEffect(() => {
    if (dateColumns.length > 0) {
      setLabelCol(dateColumns[0])
      setChartType('line')
    } else if (categoricalColumns.length > 0) {
      setLabelCol(categoricalColumns[0])
      setChartType('bar')
    } else if (headers.length > 0) {
      setLabelCol(headers[0])
    }

    if (numericColumns.length > 0) {
      setValueCol(numericColumns[0])
    }

    if (numericColumns.length > 1) {
      setSecondValueCol(numericColumns[1])
    }
  }, [dateColumns, categoricalColumns, numericColumns, headers])

  const chartData = useMemo(() => {
    if (!rows.length || !valueCol) return []

    if (chartType === 'line' && labelCol) {
      return buildTimeSeries(rows, labelCol, valueCol)
    }

    if (
      chartType === 'scatter' &&
      valueCol &&
      secondValueCol
    ) {
      return buildScatter(rows, valueCol, secondValueCol)
    }

    if (labelCol) {
      return aggregate(rows, labelCol, valueCol)
    }

    return []
  }, [
    rows,
    chartType,
    labelCol,
    valueCol,
    secondValueCol,
  ])

  // Conditional UI returns AFTER all hooks.
  if (!dataset || rows.length === 0) {
    return (
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl text-center text-slate-400">
        No data available for charts.
      </div>
    )
  }

  if (numericColumns.length === 0) {
    return (
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl text-center text-slate-400">
        No numerical columns available for charts.
      </div>
    )
  }

  const hasCategories = categoricalColumns.length > 0
  const hasTwoNumbers = numericColumns.length >= 2

  const renderChart = () => {
    if (!chartData.length) {
      return (
        <div className="h-full flex items-center justify-center text-slate-500">
          Not enough compatible data for this chart.
        </div>
      )
    }

    if (chartType === 'bar') {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{
              top: 10,
              right: 20,
              left: 10,
              bottom: 50,
            }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#1e293b"
            />

            <XAxis
              dataKey="label"
              stroke="#64748b"
              tick={{
                fill: '#94a3b8',
                fontSize: 11,
              }}
              angle={chartData.length > 6 ? -35 : 0}
              textAnchor={chartData.length > 6 ? 'end' : 'middle'}
            />

            <YAxis
              stroke="#64748b"
              tick={{
                fill: '#94a3b8',
                fontSize: 11,
              }}
            />

            <Tooltip content={<CustomTooltip />} />

            <Legend />

            <Bar
              dataKey="value"
              name={valueCol}
              fill="#10b981"
              radius={[6, 6, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      )
    }

    if (chartType === 'line') {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{
              top: 10,
              right: 20,
              left: 10,
              bottom: 20,
            }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#1e293b"
            />

            <XAxis
              dataKey="label"
              stroke="#64748b"
              tick={{
                fill: '#94a3b8',
                fontSize: 11,
              }}
            />

            <YAxis
              stroke="#64748b"
              tick={{
                fill: '#94a3b8',
                fontSize: 11,
              }}
            />

            <Tooltip content={<CustomTooltip />} />

            <Legend />

            <Line
              type="monotone"
              dataKey="value"
              name={valueCol}
              stroke="#10b981"
              strokeWidth={3}
              dot={{
                r: 4,
                fill: '#10b981',
              }}
              activeDot={{
                r: 7,
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      )
    }

    if (chartType === 'pie') {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData.slice(0, 8)}
              dataKey="value"
              nameKey="label"
              cx="50%"
              cy="50%"
              outerRadius={145}
              innerRadius={65}
              paddingAngle={2}
              label={({ label, percent }) =>
                `${label}: ${(percent * 100).toFixed(1)}%`
              }
            >
              {chartData.slice(0, 8).map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>

            <Tooltip content={<CustomTooltip />} />

            <Legend />
          </PieChart>
        </ResponsiveContainer>
      )
    }

    return (
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart
          margin={{
            top: 10,
            right: 20,
            left: 10,
            bottom: 20,
          }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#1e293b"
          />

          <XAxis
            type="number"
            dataKey="x"
            name={valueCol}
            stroke="#64748b"
            tick={{
              fill: '#94a3b8',
              fontSize: 11,
            }}
          />

          <YAxis
            type="number"
            dataKey="y"
            name={secondValueCol}
            stroke="#64748b"
            tick={{
              fill: '#94a3b8',
              fontSize: 11,
            }}
          />

          <Tooltip />

          <Scatter
            name={`${valueCol} vs ${secondValueCol}`}
            data={chartData}
            fill="#14b8a6"
          />
        </ScatterChart>
      </ResponsiveContainer>
    )
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-6">

      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h3 className="text-lg font-semibold text-slate-100">
            Visual Data Analysis
          </h3>

          <p className="text-xs text-slate-400 mt-1">
            Choose the best visualization for your data.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setChartType('bar')}
            className={`px-3 py-2 rounded-lg text-xs font-semibold ${
              chartType === 'bar'
                ? 'bg-emerald-500 text-slate-950'
                : 'bg-slate-950 border border-slate-800 text-slate-400'
            }`}
          >
            📊 Bar
          </button>

          <button
            onClick={() => {
              if (dateColumns.length > 0) {
                setLabelCol(dateColumns[0])
              }
              setChartType('line')
            }}
            className={`px-3 py-2 rounded-lg text-xs font-semibold ${
              chartType === 'line'
                ? 'bg-emerald-500 text-slate-950'
                : 'bg-slate-950 border border-slate-800 text-slate-400'
            }`}
          >
            📈 Line
          </button>

          <button
            onClick={() => setChartType('pie')}
            disabled={!hasCategories}
            className={`px-3 py-2 rounded-lg text-xs font-semibold ${
              chartType === 'pie'
                ? 'bg-emerald-500 text-slate-950'
                : 'bg-slate-950 border border-slate-800 text-slate-400'
            } ${
              !hasCategories
                ? 'opacity-40 cursor-not-allowed'
                : ''
            }`}
          >
            🥧 Pie
          </button>

          <button
            onClick={() => setChartType('scatter')}
            disabled={!hasTwoNumbers}
            className={`px-3 py-2 rounded-lg text-xs font-semibold ${
              chartType === 'scatter'
                ? 'bg-emerald-500 text-slate-950'
                : 'bg-slate-950 border border-slate-800 text-slate-400'
            } ${
              !hasTwoNumbers
                ? 'opacity-40 cursor-not-allowed'
                : ''
            }`}
          >
            🔵 Scatter
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

        {chartType !== 'scatter' && (
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">
              Category / Date
            </label>

            <select
              value={labelCol}
              onChange={(e) => setLabelCol(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200"
            >
              {headers.map((header) => (
                <option key={header} value={header}>
                  {header}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-xs text-slate-400 mb-1.5">
            Metric
          </label>

          <select
            value={valueCol}
            onChange={(e) => setValueCol(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200"
          >
            {numericColumns.map((header) => (
              <option key={header} value={header}>
                {header}
              </option>
            ))}
          </select>
        </div>

        {chartType === 'scatter' && (
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">
              Y Axis
            </label>

            <select
              value={secondValueCol}
              onChange={(e) =>
                setSecondValueCol(e.target.value)
              }
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200"
            >
              {numericColumns.map((header) => (
                <option key={header} value={header}>
                  {header}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Chart */}
      <div className="w-full h-[430px]">
        {renderChart()}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
          <p className="text-[11px] text-slate-500 uppercase">
            Rows
          </p>

          <p className="text-lg font-semibold text-slate-200 mt-1">
            {rows.length.toLocaleString()}
          </p>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
          <p className="text-[11px] text-slate-500 uppercase">
            Numeric Columns
          </p>

          <p className="text-lg font-semibold text-emerald-400 mt-1">
            {numericColumns.length}
          </p>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
          <p className="text-[11px] text-slate-500 uppercase">
            Chart Type
          </p>

          <p className="text-lg font-semibold text-slate-200 mt-1 capitalize">
            {chartType}
          </p>
        </div>
      </div>
    </div>
  )
}