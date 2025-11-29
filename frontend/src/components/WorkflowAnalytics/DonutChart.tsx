/**
 * DonutChart Component
 *
 * SVG-based donut chart for displaying status distributions.
 */

import React, { useMemo } from 'react'
import { cn } from '@/utils/cn'
import type { StatusDistribution } from './types'

interface DonutChartProps {
  data: StatusDistribution[]
  title: string
  size?: number
  showLegend?: boolean
  centerLabel?: string
  centerValue?: string | number
}

const DEFAULT_COLORS = [
  '#3b82f6', // blue
  '#22c55e', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#06b6d4', // cyan
  '#f97316', // orange
  '#ec4899', // pink
]

export default function DonutChart({
  data,
  title,
  size = 160,
  showLegend = true,
  centerLabel,
  centerValue,
}: DonutChartProps) {
  const chartData = useMemo(() => {
    const total = data.reduce((sum, d) => sum + d.count, 0)
    if (total === 0) return { segments: [], total: 0 }

    let currentAngle = -90 // Start from top
    const segments = data.map((item, index) => {
      const percentage = (item.count / total) * 100
      const angle = (item.count / total) * 360
      const startAngle = currentAngle
      currentAngle += angle

      return {
        ...item,
        percentage,
        startAngle,
        endAngle: currentAngle,
        color: item.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length],
      }
    })

    return { segments, total }
  }, [data])

  // SVG arc path calculation
  const describeArc = (
    cx: number,
    cy: number,
    radius: number,
    startAngle: number,
    endAngle: number
  ): string => {
    const start = polarToCartesian(cx, cy, radius, endAngle)
    const end = polarToCartesian(cx, cy, radius, startAngle)
    const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1

    return ['M', start.x, start.y, 'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y].join(' ')
  }

  const polarToCartesian = (
    centerX: number,
    centerY: number,
    radius: number,
    angleInDegrees: number
  ) => {
    const angleInRadians = (angleInDegrees * Math.PI) / 180
    return {
      x: centerX + radius * Math.cos(angleInRadians),
      y: centerY + radius * Math.sin(angleInRadians),
    }
  }

  if (data.length === 0 || chartData.total === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">{title}</h3>
        <div
          className="flex items-center justify-center bg-gray-50 dark:bg-gray-900/50 rounded-lg"
          style={{ height: size }}
        >
          <p className="text-sm text-gray-500 dark:text-gray-400">No data available</p>
        </div>
      </div>
    )
  }

  const cx = size / 2
  const cy = size / 2
  const outerRadius = size / 2 - 10
  const innerRadius = outerRadius * 0.6
  const strokeWidth = outerRadius - innerRadius

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">{title}</h3>

      <div className="flex items-center gap-6">
        {/* Chart */}
        <div className="relative" style={{ width: size, height: size }}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            {/* Background circle */}
            <circle
              cx={cx}
              cy={cy}
              r={(outerRadius + innerRadius) / 2}
              fill="none"
              stroke="#e5e7eb"
              strokeWidth={strokeWidth}
              className="dark:stroke-gray-700"
            />

            {/* Data segments */}
            {chartData.segments.map((segment, index) => {
              // Handle full circle case
              if (segment.percentage >= 99.9) {
                return (
                  <circle
                    key={index}
                    cx={cx}
                    cy={cy}
                    r={(outerRadius + innerRadius) / 2}
                    fill="none"
                    stroke={segment.color}
                    strokeWidth={strokeWidth}
                    className="transition-all duration-300"
                  />
                )
              }

              return (
                <path
                  key={index}
                  d={describeArc(
                    cx,
                    cy,
                    (outerRadius + innerRadius) / 2,
                    segment.startAngle,
                    segment.endAngle - 0.5 // Small gap between segments
                  )}
                  fill="none"
                  stroke={segment.color}
                  strokeWidth={strokeWidth}
                  strokeLinecap="round"
                  className="transition-all duration-300 hover:opacity-80"
                />
              )
            })}
          </svg>

          {/* Center content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {centerValue !== undefined && (
              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                {centerValue}
              </span>
            )}
            {centerLabel && (
              <span className="text-xs text-gray-500 dark:text-gray-400">{centerLabel}</span>
            )}
          </div>
        </div>

        {/* Legend */}
        {showLegend && (
          <div className="flex-1 space-y-2">
            {chartData.segments.map((segment, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: segment.color }}
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-400">{segment.status}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {segment.count}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    ({segment.percentage.toFixed(1)}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
