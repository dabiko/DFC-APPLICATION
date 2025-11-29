/**
 * SLAComplianceReport Component
 *
 * Displays SLA compliance metrics by workflow template with visual indicators.
 */

import React from 'react'
import {
  Shield,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import type { SLAMetrics } from './types'

interface SLAComplianceReportProps {
  data: SLAMetrics[]
  overallCompliance: number
  isLoading?: boolean
}

export default function SLAComplianceReport({
  data,
  overallCompliance,
  isLoading,
}: SLAComplianceReportProps) {
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
          <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  const getComplianceColor = (rate: number): string => {
    if (rate >= 90) return 'text-green-600 dark:text-green-400'
    if (rate >= 75) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getComplianceBg = (rate: number): string => {
    if (rate >= 90) return 'bg-green-100 dark:bg-green-900/30'
    if (rate >= 75) return 'bg-yellow-100 dark:bg-yellow-900/30'
    return 'bg-red-100 dark:bg-red-900/30'
  }

  const getComplianceBarColor = (rate: number): string => {
    if (rate >= 90) return 'bg-green-500'
    if (rate >= 75) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      {/* Header with overall compliance */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-blue-500" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            SLA Compliance Report
          </h3>
        </div>
      </div>

      {/* Overall Compliance Card */}
      <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Overall SLA Compliance</p>
            <p className={cn('text-4xl font-bold', getComplianceColor(overallCompliance))}>
              {overallCompliance.toFixed(1)}%
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Based on {data.reduce((sum, d) => sum + d.totalInstances, 0)} workflow instances
            </p>
          </div>

          <div className="relative w-24 h-24">
            {/* Circular progress */}
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="currentColor"
                strokeWidth="10"
                className="text-gray-200 dark:text-gray-700"
              />
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="currentColor"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={`${overallCompliance * 2.51} 251`}
                className={getComplianceColor(overallCompliance)}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              {overallCompliance >= 90 ? (
                <CheckCircle className="w-8 h-8 text-green-500" />
              ) : overallCompliance >= 75 ? (
                <AlertTriangle className="w-8 h-8 text-yellow-500" />
              ) : (
                <XCircle className="w-8 h-8 text-red-500" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Template-level breakdown */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            By Workflow Template
          </h4>
          <span className="text-xs text-gray-500 dark:text-gray-400">{data.length} templates</span>
        </div>

        {data.length === 0 ? (
          <div className="text-center py-8">
            <Shield className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400">No SLA data available</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-900/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                    Template
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                    Total
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                    Within SLA
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                    Breached
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                    Compliance
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                    Avg Time
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {data.map((item) => (
                  <tr key={item.templateId} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {item.templateName}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {item.totalInstances}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                        {item.withinSLA}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm text-red-600 dark:text-red-400 font-medium">
                        {item.breachedSLA}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              'h-full rounded-full',
                              getComplianceBarColor(item.complianceRate)
                            )}
                            style={{ width: `${item.complianceRate}%` }}
                          />
                        </div>
                        <span
                          className={cn(
                            'text-sm font-medium min-w-[48px] text-right',
                            getComplianceColor(item.complianceRate)
                          )}
                        >
                          {item.complianceRate.toFixed(0)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {formatDuration(item.avgResolutionTime)}
                        </span>
                        {item.avgResolutionTime > item.targetSLA && (
                          <span className="text-xs text-red-500">
                            (+{formatDuration(item.avgResolutionTime - item.targetSLA)})
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Summary stats */}
      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            {data.reduce((sum, d) => sum + d.withinSLA, 0)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Within SLA</p>
        </div>
        <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">
            {data.reduce((sum, d) => sum + d.breachedSLA, 0)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">SLA Breached</p>
        </div>
        <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {data.length > 0
              ? formatDuration(data.reduce((sum, d) => sum + d.avgResolutionTime, 0) / data.length)
              : '-'}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Avg Resolution</p>
        </div>
      </div>
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
