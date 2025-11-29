/**
 * TrendChart Component
 *
 * Line/area chart for displaying workflow completion trends over time.
 * Uses pure CSS/Tailwind for visualization (no external chart library).
 */

import React, { useMemo } from 'react'
import { cn } from '@/utils/cn'
import type { CompletionTrend } from './types'

interface TrendChartProps {
  data: CompletionTrend[]
  height?: number
  showLegend?: boolean
  showGrid?: boolean
}

export default function TrendChart({
  data,
  height = 200,
  showLegend = true,
  showGrid = true,
}: TrendChartProps) {
  const chartData = useMemo(() => {
    if (data.length === 0)
      return { maxValue: 0, points: { completed: '', started: '' }, labels: [] }

    const maxCompleted = Math.max(...data.map((d) => d.completed))
    const maxStarted = Math.max(...data.map((d) => d.started))
    const maxValue = Math.max(maxCompleted, maxStarted, 1)

    const width = 100 / Math.max(data.length - 1, 1)

    // Generate SVG polyline points
    const completedPoints = data
      .map((d, i) => {
        const x = i * width
        const y = 100 - (d.completed / maxValue) * 100
        return `${x},${y}`
      })
      .join(' ')

    const startedPoints = data
      .map((d, i) => {
        const x = i * width
        const y = 100 - (d.started / maxValue) * 100
        return `${x},${y}`
      })
      .join(' ')

    // Get labels (show every nth label to avoid crowding)
    const labelInterval = Math.ceil(data.length / 7)
    const labels = data.filter((_, i) => i % labelInterval === 0 || i === data.length - 1)

    return { maxValue, points: { completed: completedPoints, started: startedPoints }, labels }
  }, [data])

  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center bg-gray-50 dark:bg-gray-900/50 rounded-lg"
        style={{ height }}
      >
        <p className="text-sm text-gray-500 dark:text-gray-400">No trend data available</p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          Workflow Completion Trend
        </h3>
        {showLegend && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-xs text-gray-500 dark:text-gray-400">Completed</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-xs text-gray-500 dark:text-gray-400">Started</span>
            </div>
          </div>
        )}
      </div>

      <div className="relative" style={{ height }}>
        {/* Grid lines */}
        {showGrid && (
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="w-full border-t border-gray-100 dark:border-gray-700/50" />
            ))}
          </div>
        )}

        {/* Y-axis labels */}
        <div className="absolute left-0 inset-y-0 flex flex-col justify-between text-xs text-gray-400 dark:text-gray-500 pr-2">
          <span>{chartData.maxValue}</span>
          <span>{Math.round(chartData.maxValue * 0.75)}</span>
          <span>{Math.round(chartData.maxValue * 0.5)}</span>
          <span>{Math.round(chartData.maxValue * 0.25)}</span>
          <span>0</span>
        </div>

        {/* Chart SVG */}
        <div className="absolute left-8 right-0 top-0 bottom-6">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
            {/* Area fills */}
            <defs>
              <linearGradient id="completedGradient" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="rgb(34, 197, 94)" stopOpacity="0.3" />
                <stop offset="100%" stopColor="rgb(34, 197, 94)" stopOpacity="0.05" />
              </linearGradient>
              <linearGradient id="startedGradient" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="rgb(59, 130, 246)" stopOpacity="0.3" />
                <stop offset="100%" stopColor="rgb(59, 130, 246)" stopOpacity="0.05" />
              </linearGradient>
            </defs>

            {/* Completed area */}
            <polygon
              points={`0,100 ${chartData.points.completed} 100,100`}
              fill="url(#completedGradient)"
            />

            {/* Started area */}
            <polygon
              points={`0,100 ${chartData.points.started} 100,100`}
              fill="url(#startedGradient)"
            />

            {/* Completed line */}
            <polyline
              points={chartData.points.completed}
              fill="none"
              stroke="rgb(34, 197, 94)"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />

            {/* Started line */}
            <polyline
              points={chartData.points.started}
              fill="none"
              stroke="rgb(59, 130, 246)"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />

            {/* Data points - Completed */}
            {data.map((d, i) => {
              const x = (i / Math.max(data.length - 1, 1)) * 100
              const y = 100 - (d.completed / chartData.maxValue) * 100
              return (
                <circle
                  key={`completed-${i}`}
                  cx={x}
                  cy={y}
                  r="2"
                  fill="rgb(34, 197, 94)"
                  className="hover:r-3 transition-all"
                />
              )
            })}

            {/* Data points - Started */}
            {data.map((d, i) => {
              const x = (i / Math.max(data.length - 1, 1)) * 100
              const y = 100 - (d.started / chartData.maxValue) * 100
              return (
                <circle
                  key={`started-${i}`}
                  cx={x}
                  cy={y}
                  r="2"
                  fill="rgb(59, 130, 246)"
                  className="hover:r-3 transition-all"
                />
              )
            })}
          </svg>
        </div>

        {/* X-axis labels */}
        <div className="absolute left-8 right-0 bottom-0 flex justify-between text-xs text-gray-400 dark:text-gray-500">
          {chartData.labels.map((item, i) => (
            <span key={i}>{formatDate(item.date)}</span>
          ))}
        </div>
      </div>

      {/* Summary row */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-lg font-bold text-green-600 dark:text-green-400">
            {data.reduce((sum, d) => sum + d.completed, 0)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Total Completed</p>
        </div>
        <div>
          <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
            {data.reduce((sum, d) => sum + d.started, 0)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Total Started</p>
        </div>
        <div>
          <p className="text-lg font-bold text-gray-600 dark:text-gray-300">
            {data.reduce((sum, d) => sum + d.cancelled, 0)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Total Cancelled</p>
        </div>
      </div>
    </div>
  )
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
