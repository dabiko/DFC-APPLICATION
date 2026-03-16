/**
 * DonutChart Component
 *
 * Recharts-powered donut/ring chart with center label.
 */

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

interface DonutChartProps {
  data: Array<{ name: string; value: number; color: string }>
  centerLabel?: string
  centerValue?: string | number
  height?: number
}

export function DonutChart({ data, centerLabel, centerValue, height = 200 }: DonutChartProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0)

  if (total === 0) {
    return (
      <div
        className="flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm"
        style={{ height }}
      >
        No data available
      </div>
    )
  }

  return (
    <div className="relative" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius="60%"
            outerRadius="85%"
            paddingAngle={2}
            dataKey="value"
            stroke="none"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--tooltip-bg, #1f2937)',
              border: 'none',
              borderRadius: '8px',
              color: 'var(--tooltip-text, #f3f4f6)',
              fontSize: '12px',
              padding: '8px 12px',
            }}
            formatter={(value: number, name: string) => [`${value}`, name]}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Center label */}
      {(centerLabel || centerValue) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          {centerValue !== undefined && (
            <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {centerValue}
            </span>
          )}
          {centerLabel && (
            <span className="text-xs text-gray-500 dark:text-gray-400">{centerLabel}</span>
          )}
        </div>
      )}
    </div>
  )
}
