/**
 * AssignmentDashboard — Summary metrics cards and completion rate bar.
 */

import { BarChart3 } from 'lucide-react'
import type { AssignmentDashboard as DashboardData } from '@/services/assignmentService'
import { cn } from '@/utils/cn'

interface AssignmentDashboardProps {
  dashboard: DashboardData
}

const STAT_CARDS = [
  { key: 'total' as const, label: 'Total', color: 'text-gray-600' },
  { key: 'assigned' as const, label: 'Assigned', color: 'text-gray-500' },
  { key: 'in_progress' as const, label: 'In Progress', color: 'text-blue-600' },
  { key: 'completed' as const, label: 'Completed', color: 'text-green-600' },
  { key: 'failed' as const, label: 'Failed', color: 'text-red-600' },
  { key: 'overdue' as const, label: 'Overdue', color: 'text-orange-600' },
]

export function AssignmentDashboard({ dashboard }: AssignmentDashboardProps) {
  return (
    <div className="space-y-4">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {STAT_CARDS.map((card) => (
          <div
            key={card.key}
            className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800"
          >
            <p className="text-xs text-gray-500 dark:text-gray-400">{card.label}</p>
            <p className={cn('text-2xl font-bold', card.color)}>{dashboard[card.key]}</p>
          </div>
        ))}
      </div>

      {/* Completion Rate */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-blue-500" />
            Completion Rate
          </span>
          <span className="text-sm font-bold text-gray-900 dark:text-white">
            {dashboard.completion_rate.toFixed(1)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className="bg-green-500 h-2 rounded-full transition-all"
            style={{ width: `${dashboard.completion_rate}%` }}
          />
        </div>
        {dashboard.average_score !== null && (
          <p className="text-xs text-gray-500 mt-2">
            Average score: {dashboard.average_score.toFixed(1)}%
          </p>
        )}
      </div>
    </div>
  )
}
