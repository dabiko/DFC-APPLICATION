/**
 * ComplianceReportGenerator Component
 * Generate and manage compliance reports from audit logs
 */

import { FC, useState } from 'react'
import {
  DocumentTextIcon,
  ArrowDownTrayIcon,
  ClockIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline'
import { cn } from '@utils/cn'
import type { ComplianceReportGeneratorProps, ComplianceReportType, ComplianceReportParams } from '@/types/audit'
import { format } from 'date-fns'

const REPORT_TYPES: Array<{ type: ComplianceReportType; label: string; description: string }> = [
  {
    type: 'access_report',
    label: 'Access Report',
    description: 'Who accessed what resources and when',
  },
  {
    type: 'change_history',
    label: 'Change History',
    description: 'Document and folder modification history',
  },
  {
    type: 'user_activity',
    label: 'User Activity',
    description: 'User activity summary and statistics',
  },
  {
    type: 'permission_changes',
    label: 'Permission Changes',
    description: 'Permission grant and revoke history',
  },
  {
    type: 'retention_compliance',
    label: 'Retention Compliance',
    description: 'Retention policy compliance status',
  },
  {
    type: 'legal_hold_report',
    label: 'Legal Hold Report',
    description: 'Legal hold status and history',
  },
  {
    type: 'failed_access_attempts',
    label: 'Failed Access Attempts',
    description: 'Failed login and access attempts',
  },
  {
    type: 'privileged_actions',
    label: 'Privileged Actions',
    description: 'Admin and manager actions log',
  },
]

export const ComplianceReportGenerator: FC<ComplianceReportGeneratorProps> = ({
  onGenerateReport,
  onDownloadReport,
  recentReports = [],
  isGenerating = false,
  className,
}) => {
  const [reportType, setReportType] = useState<ComplianceReportType>('access_report')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [includeMetadata, setIncludeMetadata] = useState(true)

  const handleGenerate = () => {
    if (!dateFrom || !dateTo) {
      alert('Please select both start and end dates')
      return
    }

    const params: ComplianceReportParams = {
      reportType,
      dateFrom,
      dateTo,
      includeMetadata,
      format: 'json',
    }

    onGenerateReport(params)
  }

  const getReportTypeInfo = (type: ComplianceReportType) => {
    return REPORT_TYPES.find((r) => r.type === type)
  }

  return (
    <div className={cn('bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700', className)}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <ChartBarIcon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Compliance Reports</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Generate audit and compliance reports
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Report Generator Form */}
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Generate New Report
          </h3>

          <div className="space-y-4">
            {/* Report Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Report Type
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {REPORT_TYPES.map((report) => (
                  <label
                    key={report.type}
                    className={cn(
                      'relative flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all',
                      reportType === report.type
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    )}
                  >
                    <input
                      type="radio"
                      name="reportType"
                      value={report.type}
                      checked={reportType === report.type}
                      onChange={(e) => setReportType(e.target.value as ComplianceReportType)}
                      className="sr-only"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {report.label}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {report.description}
                      </p>
                    </div>
                    {reportType === report.type && (
                      <div className="flex-shrink-0 ml-3">
                        <div className="w-5 h-5 rounded-full bg-primary-600 flex items-center justify-center">
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 12 12">
                            <path d="M10 3l-5.5 5.5L2 6" stroke="currentColor" strokeWidth="2" fill="none" />
                          </svg>
                        </div>
                      </div>
                    )}
                  </label>
                ))}
              </div>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            {/* Options */}
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeMetadata}
                  onChange={(e) => setIncludeMetadata(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Include detailed metadata
                </span>
              </label>
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !dateFrom || !dateTo}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-lg font-medium transition-colors disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Generating Report...
                </>
              ) : (
                <>
                  <DocumentTextIcon className="w-5 h-5" />
                  Generate Report
                </>
              )}
            </button>
          </div>
        </div>

        {/* Recent Reports */}
        {recentReports.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Recent Reports
            </h3>

            <div className="space-y-3">
              {recentReports.map((report) => {
                const reportInfo = getReportTypeInfo(report.reportType)

                return (
                  <div
                    key={report.id}
                    className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <DocumentTextIcon className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {reportInfo?.label || report.reportType}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 dark:text-gray-400">
                          <ClockIcon className="w-3 h-3" />
                          <span>
                            {format(new Date(report.generatedAt), 'MMM d, yyyy h:mm a')}
                          </span>
                          <span>•</span>
                          <span>
                            {format(new Date(report.dateFrom), 'MMM d')} -{' '}
                            {format(new Date(report.dateTo), 'MMM d, yyyy')}
                          </span>
                          <span>•</span>
                          <span>{report.summary.totalEntries} entries</span>
                        </div>
                      </div>
                    </div>

                    {/* Download Buttons */}
                    <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                      <button
                        onClick={() => onDownloadReport(report.id, 'csv')}
                        className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        title="Download CSV"
                      >
                        <ArrowDownTrayIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDownloadReport(report.id, 'pdf')}
                        className="px-3 py-1.5 text-sm text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                      >
                        PDF
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Empty State */}
        {recentReports.length === 0 && !isGenerating && (
          <div className="py-12 text-center">
            <DocumentTextIcon className="w-12 h-12 mx-auto text-gray-400 mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No reports generated yet
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Generate your first compliance report above
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
