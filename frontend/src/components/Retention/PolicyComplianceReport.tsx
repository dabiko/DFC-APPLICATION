import React, { useState } from 'react'
import {
  ChartBarIcon,
  DocumentChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowDownTrayIcon,
  CalendarIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline'
import type {
  ComplianceReport,
  PolicyComplianceReportProps,
  PolicyViolation,
} from '@/types/retention'
import { format } from 'date-fns'
import { getViolationSeverityColor, getComplianceStatusColor } from '@/types/retention'

export const PolicyComplianceReport: React.FC<PolicyComplianceReportProps> = ({
  report,
  loading = false,
  onGenerateReport,
  onExport,
  onViolationClick,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'violations' | 'trends'>('overview')

  const getComplianceStatus = () => {
    if (report.complianceRate >= 95) return 'compliant'
    if (report.complianceRate >= 80) return 'warning'
    if (report.complianceRate >= 60) return 'at_risk'
    return 'non_compliant'
  }

  const statusColors = getComplianceStatusColor(getComplianceStatus())

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Total Documents
            </span>
            <DocumentChartBarIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {report.totalDocuments.toLocaleString()}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Compliance Rate
            </span>
            <ChartBarIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div className={`text-2xl font-bold ${statusColors.text}`}>
            {report.complianceRate.toFixed(1)}%
          </div>
          <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${
                report.complianceRate >= 95
                  ? 'bg-green-500'
                  : report.complianceRate >= 80
                    ? 'bg-yellow-500'
                    : report.complianceRate >= 60
                      ? 'bg-orange-500'
                      : 'bg-red-500'
              }`}
              style={{ width: `${report.complianceRate}%` }}
            />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">At Risk</span>
            <ExclamationTriangleIcon className="w-5 h-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
            {report.atRiskDocuments.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {((report.atRiskDocuments / report.totalDocuments) * 100).toFixed(1)}% of total
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Violations</span>
            <ExclamationTriangleIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">
            {report.policyViolations}
          </div>
        </div>
      </div>

      {/* Policy & Hold Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Policy Statistics
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Active Policies</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {report.activePolicies}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Policies Enforced</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {report.policiesEnforced}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Documents Archived</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {report.documentsArchived.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Documents Deleted</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {report.documentsDeleted.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Legal Hold Statistics
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Active Holds</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {report.activeHolds}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Documents on Hold</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {report.documentsOnHold.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Holds Released</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {report.holdsReleased}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Notifications Sent</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {report.notificationsSent.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Top Violation Types */}
      {report.topViolationTypes.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Top Violation Types
          </h3>
          <div className="space-y-3">
            {report.topViolationTypes.map((vType, index) => (
              <div key={vType.type} className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400 w-6">
                  {index + 1}.
                </span>
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-gray-900 dark:text-white capitalize">
                      {vType.type.replace(/_/g, ' ')}
                    </span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {vType.count}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-red-500 h-2 rounded-full"
                      style={{
                        width: `${(vType.count / Math.max(...report.topViolationTypes.map((v) => v.count))) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  const renderViolations = () => (
    <div className="space-y-4">
      {report.violations.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No Violations Found
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            All documents are compliant with retention policies
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Document
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Violation Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Severity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Detected
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {report.violations.map((violation) => {
                const severityColors = getViolationSeverityColor(violation.severity)
                return (
                  <tr
                    key={violation.id}
                    onClick={() => onViolationClick?.(violation)}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {violation.documentName}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {violation.policyName}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-900 dark:text-white capitalize">
                        {violation.violationType.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${severityColors.bg} ${severityColors.text}`}
                      >
                        {violation.severity}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-900 dark:text-white">
                        {format(new Date(violation.detectedAt), 'MMM d, yyyy')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {violation.resolvedAt ? (
                        <span className="inline-flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
                          <CheckCircleIcon className="w-4 h-4" />
                          Resolved
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-sm text-orange-600 dark:text-orange-400">
                          <ExclamationTriangleIcon className="w-4 h-4" />
                          Open
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )

  const renderTrends = () => (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Compliance Trend</h3>
      <div className="space-y-2">
        {report.complianceTrend.map((trend, index) => (
          <div key={trend.date} className="flex items-center gap-3">
            <span className="text-sm text-gray-600 dark:text-gray-400 w-24">
              {format(new Date(trend.date), 'MMM d')}
            </span>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      trend.rate >= 95
                        ? 'bg-green-500'
                        : trend.rate >= 80
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                    }`}
                    style={{ width: `${trend.rate}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white w-12 text-right">
                  {trend.rate.toFixed(0)}%
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Generating report...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Retention Policy Compliance Report
            </h2>
            <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-1">
                <CalendarIcon className="w-4 h-4" />
                <span>
                  {format(new Date(report.period.from), 'MMM d, yyyy')} -{' '}
                  {format(new Date(report.period.to), 'MMM d, yyyy')}
                </span>
              </div>
              <span>•</span>
              <span>Generated {format(new Date(report.generatedAt), 'MMM d, yyyy')}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onGenerateReport && (
              <button
                onClick={() =>
                  onGenerateReport({
                    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
                    to: new Date().toISOString(),
                  })
                }
                className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                <FunnelIcon className="w-5 h-5" />
                Regenerate
              </button>
            )}
            {onExport && (
              <button
                onClick={() => onExport('pdf')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <ArrowDownTrayIcon className="w-5 h-5" />
                Export
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="flex">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'violations', label: `Violations (${report.violations.length})` },
              { id: 'trends', label: 'Trends' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'violations' && renderViolations()}
          {activeTab === 'trends' && renderTrends()}
        </div>
      </div>
    </div>
  )
}
