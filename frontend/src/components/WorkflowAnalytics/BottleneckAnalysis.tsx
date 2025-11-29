/**
 * BottleneckAnalysis Component
 *
 * Displays workflow bottleneck analysis with step-level performance metrics.
 */

import React from 'react'
import { AlertTriangle, Clock, Users, ArrowRight, TrendingUp } from 'lucide-react'
import { cn } from '@/utils/cn'
import type { BottleneckStep } from './types'

interface BottleneckAnalysisProps {
  data: BottleneckStep[]
  isLoading?: boolean
}

export default function BottleneckAnalysis({ data, isLoading }: BottleneckAnalysisProps) {
  // Sort by bottleneck score (highest first)
  const sortedData = [...data].sort((a, b) => b.bottleneckScore - a.bottleneckScore)
  const topBottlenecks = sortedData.slice(0, 5)

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
          Bottleneck Analysis
        </h3>
        <div className="flex flex-col items-center justify-center py-8">
          <TrendingUp className="w-12 h-12 text-green-500 mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No bottlenecks detected. All workflows are running smoothly!
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-orange-500" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            Bottleneck Analysis
          </h3>
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          Top {topBottlenecks.length} identified issues
        </span>
      </div>

      <div className="space-y-3">
        {topBottlenecks.map((item, index) => (
          <div
            key={item.stepId}
            className={cn(
              'p-3 rounded-lg border transition-colors',
              item.bottleneckScore >= 70
                ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                : item.bottleneckScore >= 40
                  ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
                  : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
            )}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white',
                    item.bottleneckScore >= 70
                      ? 'bg-red-500'
                      : item.bottleneckScore >= 40
                        ? 'bg-orange-500'
                        : 'bg-yellow-500'
                  )}
                >
                  {index + 1}
                </span>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {item.stepName}
                  </p>
                  <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                    <span>{item.workflowName}</span>
                  </div>
                </div>
              </div>

              {/* Severity Indicator */}
              <div
                className={cn(
                  'px-2 py-1 rounded text-xs font-medium',
                  item.bottleneckScore >= 70
                    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    : item.bottleneckScore >= 40
                      ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                      : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                )}
              >
                {item.bottleneckScore >= 70
                  ? 'Critical'
                  : item.bottleneckScore >= 40
                    ? 'High'
                    : 'Medium'}
              </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-4 gap-3 mt-3">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Avg Time</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {formatDuration(item.avgDuration)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Max Time</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {formatDuration(item.maxDuration)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Pending</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {item.pendingTasks} tasks
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Overdue</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {item.overdueRate.toFixed(0)}%
                  </p>
                </div>
              </div>
            </div>

            {/* Score bar */}
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-gray-500 dark:text-gray-400">Bottleneck Score</span>
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  {item.bottleneckScore}/100
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className={cn(
                    'h-2 rounded-full transition-all duration-500',
                    item.bottleneckScore >= 70
                      ? 'bg-red-500'
                      : item.bottleneckScore >= 40
                        ? 'bg-orange-500'
                        : 'bg-yellow-500'
                  )}
                  style={{ width: `${item.bottleneckScore}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recommendations */}
      {topBottlenecks.length > 0 && topBottlenecks[0].bottleneckScore >= 40 && (
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">
            Recommendations
          </h4>
          <ul className="text-xs text-blue-700 dark:text-blue-400 space-y-1 list-disc list-inside">
            <li>Consider adding more assignees to high-volume steps</li>
            <li>Review SLA settings for steps with high overdue rates</li>
            <li>Automate repetitive approval steps where possible</li>
            <li>Set up escalation rules for long-pending tasks</li>
          </ul>
        </div>
      )}
    </div>
  )
}

function formatDuration(hours: number): string {
  if (hours < 1) {
    return `${Math.round(hours * 60)}m`
  }
  if (hours < 24) {
    return `${hours.toFixed(1)}h`
  }
  const days = hours / 24
  return `${days.toFixed(1)}d`
}
