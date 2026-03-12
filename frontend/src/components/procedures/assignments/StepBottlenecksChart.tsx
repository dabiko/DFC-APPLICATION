/**
 * StepBottlenecksChart — Visualizes which steps take the longest and have the highest failure rates.
 */

import { Clock, AlertTriangle } from 'lucide-react'
import { cn } from '@/utils/cn'
import type { StepBottleneck } from '@/services/assignmentService'

interface StepBottlenecksChartProps {
  data: StepBottleneck[]
}

function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  if (mins < 60) return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`
  const hrs = Math.floor(mins / 60)
  const remainMins = mins % 60
  return `${hrs}h ${remainMins}m`
}

export function StepBottlenecksChart({ data }: StepBottlenecksChartProps) {
  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-3">
          <Clock className="h-4 w-4 text-amber-500" />
          Step Bottlenecks
        </h3>
        <p className="text-sm text-gray-500">No step completion data available yet.</p>
      </div>
    )
  }

  // Sort by step order for display
  const sorted = [...data].sort((a, b) => a.step_order - b.step_order)
  const maxTime = Math.max(...sorted.map((s) => s.avg_time_seconds), 1)

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-4">
        <Clock className="h-4 w-4 text-amber-500" />
        Step Bottlenecks
      </h3>
      <div className="space-y-3">
        {sorted.map((step) => {
          const timePct = (step.avg_time_seconds / maxTime) * 100
          const hasIssue = step.failure_rate > 20 || step.completion_rate < 70
          return (
            <div key={step.step_id}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-gray-700 dark:text-gray-300 font-medium flex items-center gap-1 max-w-[55%] truncate">
                  {hasIssue && <AlertTriangle className="h-3 w-3 text-amber-500 flex-shrink-0" />}
                  Step {step.step_order}. {step.step_title}
                </span>
                <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
                  <span>{step.total_trainees} trainees</span>
                  <span className="font-mono">{formatTime(step.avg_time_seconds)}</span>
                </div>
              </div>
              {/* Time bar */}
              <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2 mb-1">
                <div
                  className={cn(
                    'h-2 rounded-full transition-all',
                    step.failure_rate > 30
                      ? 'bg-red-400'
                      : step.failure_rate > 15
                        ? 'bg-orange-400'
                        : 'bg-blue-400'
                  )}
                  style={{ width: `${timePct}%` }}
                />
              </div>
              {/* Rates */}
              <div className="flex items-center gap-3 text-[10px] text-gray-500">
                <span className={cn(step.completion_rate < 70 && 'text-orange-600 font-medium')}>
                  {step.completion_rate}% completed
                </span>
                {step.failure_rate > 0 && (
                  <span className={cn(step.failure_rate > 20 && 'text-red-600 font-medium')}>
                    {step.failure_rate}% failed
                  </span>
                )}
                {step.skip_rate > 0 && <span>{step.skip_rate}% skipped</span>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
