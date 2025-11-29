/**
 * AnalyticsExport Component
 *
 * Export controls for workflow analytics data.
 */

import React, { useState } from 'react'
import { Download, FileSpreadsheet, FileText, FileJson, ChevronDown, Loader2 } from 'lucide-react'
import { cn } from '@/utils/cn'
import {
  exportReport,
  type ExportFormat,
  type ExportData,
  type ExportOptions,
  type ChartData,
} from '@/utils/reportExport'
import type {
  WorkflowAnalyticsSummary,
  CompletionTrend,
  BottleneckStep,
  SLAMetrics,
  UserPerformance,
  AnalyticsFilters,
} from './types'

interface AnalyticsExportProps {
  summary: WorkflowAnalyticsSummary
  trends: CompletionTrend[]
  bottlenecks: BottleneckStep[]
  slaMetrics: SLAMetrics[]
  userPerformance: UserPerformance[]
  filters: AnalyticsFilters
}

const EXPORT_FORMATS: {
  value: ExportFormat
  label: string
  icon: React.FC<{ className?: string }>
}[] = [
  { value: 'pdf', label: 'PDF Report', icon: FileText },
  { value: 'excel', label: 'Excel', icon: FileSpreadsheet },
  { value: 'csv', label: 'CSV', icon: FileText },
  { value: 'json', label: 'JSON', icon: FileJson },
]

export default function AnalyticsExport({
  summary,
  trends,
  bottlenecks,
  slaMetrics,
  userPerformance,
  filters,
}: AnalyticsExportProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async (format: ExportFormat) => {
    setIsExporting(true)
    setIsOpen(false)

    try {
      // Prepare export data based on format
      const exportData = prepareExportData(
        summary,
        trends,
        bottlenecks,
        slaMetrics,
        userPerformance,
        filters
      )

      const options: ExportOptions = {
        filename: `workflow-analytics-${new Date().toISOString().split('T')[0]}`,
        title: 'Workflow Analytics Report',
        subtitle: `Period: ${getPeriodLabel(filters.period)}`,
        author: 'Digital Filing Cabinet',
        includeTimestamp: true,
        includeFilters: true,
        includeSummary: true,
        orientation: 'landscape',
        pageSize: 'A4',
      }

      // Prepare charts for PDF export
      const charts: ChartData[] =
        format === 'pdf'
          ? [
              {
                type: 'bar',
                title: 'Workflow Status Distribution',
                data: [
                  { label: 'Completed', value: summary.completedWorkflows, color: '#22c55e' },
                  { label: 'Active', value: summary.activeWorkflows, color: '#3b82f6' },
                  { label: 'Cancelled', value: summary.cancelledWorkflows, color: '#ef4444' },
                ],
              },
              {
                type: 'bar',
                title: 'Top Bottlenecks',
                data: bottlenecks.slice(0, 5).map((b) => ({
                  label: b.stepName,
                  value: b.bottleneckScore,
                  color:
                    b.bottleneckScore >= 70
                      ? '#ef4444'
                      : b.bottleneckScore >= 40
                        ? '#f59e0b'
                        : '#eab308',
                })),
              },
            ]
          : []

      exportReport(format, exportData, options, charts)
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isExporting}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
      >
        {isExporting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Download className="w-4 h-4" />
        )}
        Export
        <ChevronDown className={cn('w-4 h-4 transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />

          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-20">
            {EXPORT_FORMATS.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => handleExport(value)}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <Icon className="w-4 h-4 text-gray-400" />
                {label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function prepareExportData(
  summary: WorkflowAnalyticsSummary,
  trends: CompletionTrend[],
  bottlenecks: BottleneckStep[],
  slaMetrics: SLAMetrics[],
  userPerformance: UserPerformance[],
  filters: AnalyticsFilters
): ExportData {
  // Combine all data into export format
  // Main focus is user performance as it's tabular
  const columns = [
    { field: 'userName', label: 'User Name', width: 150 },
    { field: 'department', label: 'Department', width: 100 },
    { field: 'tasksAssigned', label: 'Assigned', width: 80, align: 'right' as const },
    { field: 'tasksCompleted', label: 'Completed', width: 80, align: 'right' as const },
    {
      field: 'completionRate',
      label: 'Rate',
      width: 80,
      align: 'right' as const,
      format: (v: unknown) => `${(v as number).toFixed(1)}%`,
    },
    {
      field: 'avgResponseTime',
      label: 'Avg Time',
      width: 80,
      align: 'right' as const,
      format: (v: unknown) => formatDuration(v as number),
    },
    {
      field: 'slaCompliance',
      label: 'SLA',
      width: 80,
      align: 'right' as const,
      format: (v: unknown) => `${(v as number).toFixed(1)}%`,
    },
    { field: 'tasksOverdue', label: 'Overdue', width: 80, align: 'right' as const },
  ]

  const filtersList = [{ label: 'Period', value: getPeriodLabel(filters.period) }]

  if (filters.department) {
    filtersList.push({ label: 'Department', value: filters.department })
  }

  if (filters.templateId) {
    filtersList.push({ label: 'Template', value: filters.templateId })
  }

  return {
    columns,
    rows: userPerformance.map((u) => ({
      userName: u.userName,
      department: u.department,
      tasksAssigned: u.tasksAssigned,
      tasksCompleted: u.tasksCompleted,
      completionRate: u.completionRate,
      avgResponseTime: u.avgResponseTime,
      slaCompliance: u.slaCompliance,
      tasksOverdue: u.tasksOverdue,
    })),
    title: 'Workflow Analytics Report',
    subtitle: `Generated for ${getPeriodLabel(filters.period)}`,
    filters: filtersList,
    summary: {
      'Total Workflows': summary.totalWorkflows,
      'Completion Rate': `${summary.completionRate.toFixed(1)}%`,
      'SLA Compliance': `${summary.slaComplianceRate.toFixed(1)}%`,
      'Avg Completion': formatDuration(summary.avgCompletionTime),
      'Total Tasks': summary.totalTasks,
      'Overdue Rate': `${summary.overdueTasksRate.toFixed(1)}%`,
    },
  }
}

function getPeriodLabel(period: string): string {
  switch (period) {
    case '7d':
      return 'Last 7 Days'
    case '30d':
      return 'Last 30 Days'
    case '90d':
      return 'Last 90 Days'
    case '12m':
      return 'Last 12 Months'
    case 'custom':
      return 'Custom Range'
    default:
      return period
  }
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
