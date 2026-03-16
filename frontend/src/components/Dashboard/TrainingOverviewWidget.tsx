/**
 * TrainingOverviewWidget Component
 *
 * Shows training assignment status breakdown with progress bars
 * and key training metrics.
 */

import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  BarChart3,
} from 'lucide-react'
import { cn } from '@utils/cn'
import type { AssignmentDashboard } from '@/services/assignmentService'

interface TrainingOverviewWidgetProps {
  data: AssignmentDashboard | null
}

interface StatusRow {
  label: string
  value: number
  color: string
  bgColor: string
  icon: React.ReactNode
}

export function TrainingOverviewWidget({ data }: TrainingOverviewWidgetProps) {
  const navigate = useNavigate()

  if (!data) {
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Training & Assignments
        </h3>
        <div className="flex items-center justify-center py-12 text-gray-400 dark:text-gray-500 text-sm">
          No training data available
        </div>
      </div>
    )
  }

  const total = data.total || 1 // prevent division by zero

  const statusRows: StatusRow[] = [
    {
      label: 'Assigned',
      value: data.assigned,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
      icon: <BookOpen className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />,
    },
    {
      label: 'In Progress',
      value: data.in_progress,
      color: 'bg-amber-500',
      bgColor: 'bg-amber-100 dark:bg-amber-900/30',
      icon: <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />,
    },
    {
      label: 'Completed',
      value: data.completed,
      color: 'bg-green-500',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />,
    },
    {
      label: 'Failed',
      value: data.failed,
      color: 'bg-red-500',
      bgColor: 'bg-red-100 dark:bg-red-900/30',
      icon: <XCircle className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />,
    },
    {
      label: 'Overdue',
      value: data.overdue,
      color: 'bg-orange-500',
      bgColor: 'bg-orange-100 dark:bg-orange-900/30',
      icon: <AlertTriangle className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />,
    },
  ]

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Training & Assignments
        </h3>
        <button
          onClick={() => navigate('/procedures/assignments')}
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
        >
          View All <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      {/* Summary Metrics Row */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{data.total}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
        </div>
        <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <p className="text-xl font-bold text-green-600 dark:text-green-400">
            {Math.round(data.completion_rate)}%
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Completion</p>
        </div>
        <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
            {data.average_score !== null ? `${Math.round(data.average_score)}%` : '—'}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Avg Score</p>
        </div>
      </div>

      {/* Status Breakdown */}
      <div className="space-y-3">
        {statusRows.map((row) => {
          const pct = total > 0 ? (row.value / total) * 100 : 0
          return (
            <div key={row.label}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  {row.icon}
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    {row.label}
                  </span>
                </div>
                <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                  {row.value}
                </span>
              </div>
              <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
                <div
                  className={cn('h-full rounded-full transition-all duration-500', row.color)}
                  style={{ width: `${Math.max(pct, row.value > 0 ? 2 : 0)}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* Quick Link */}
      <button
        onClick={() => navigate('/procedures/assignments')}
        className="mt-5 w-full flex items-center justify-center gap-2 py-2 px-4 text-xs font-medium text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-lg transition-colors"
      >
        <BarChart3 className="w-3.5 h-3.5" />
        View Full Analytics
      </button>
    </div>
  )
}
