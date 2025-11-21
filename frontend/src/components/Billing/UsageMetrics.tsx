/**
 * UsageMetrics Component
 * Displays usage statistics with progress bars and alerts
 */

import React from 'react'
import { Progress } from '../Feedback/Progress'
import { Alert } from '../Feedback/Alert'
import { Badge } from '../Badge/Badge'
import { Button } from '../Button/Button'
import { formatLimit } from '../../config/subscriptionPlans'
import type { UsageMetrics as UsageMetricsType, UsageAlert } from '../../types/billing'
import { cn } from '../../utils/cn'

export interface UsageMetricsProps {
  usage: UsageMetricsType
  alerts?: UsageAlert[]
  onUpgrade?: () => void
  onDismissAlert?: (alertId: string) => void
  showUpgradePrompt?: boolean
  className?: string
}

export const UsageMetrics: React.FC<UsageMetricsProps> = ({
  usage,
  alerts = [],
  onUpgrade,
  onDismissAlert,
  showUpgradePrompt = true,
  className,
}) => {
  const getUsageColor = (percentage: number) => {
    if (percentage >= 95) return 'error'
    if (percentage >= 80) return 'warning'
    return 'success'
  }

  const getUsageStatus = (percentage: number) => {
    if (percentage >= 95) return { text: 'Critical', variant: 'error' as const }
    if (percentage >= 80) return { text: 'High', variant: 'warning' as const }
    if (percentage >= 50) return { text: 'Moderate', variant: 'info' as const }
    return { text: 'Low', variant: 'success' as const }
  }

  const isUnlimited = (limit: number) => limit === -1

  const hasHighUsage =
    usage.storage.percentage >= 80 ||
    usage.documents.percentage >= 80 ||
    usage.apiCalls.percentage >= 80

  const criticalUsage = alerts.filter((alert) => alert.severity === 'critical' && !alert.dismissed)
  const warningUsage = alerts.filter((alert) => alert.severity === 'warning' && !alert.dismissed)

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-gray-900">Usage Overview</h3>
          <p className="mt-1 text-sm text-gray-600">Track your current usage against plan limits</p>
        </div>
      </div>

      {/* Alerts */}
      {criticalUsage.length > 0 && (
        <div className="space-y-3">
          {criticalUsage.map((alert) => (
            <Alert
              key={alert.id}
              variant="error"
              title="Critical Usage Alert"
              onClose={onDismissAlert ? () => onDismissAlert(alert.id) : undefined}
            >
              {alert.message}
            </Alert>
          ))}
        </div>
      )}

      {warningUsage.length > 0 && (
        <div className="space-y-3">
          {warningUsage.map((alert) => (
            <Alert
              key={alert.id}
              variant="warning"
              title="Usage Warning"
              onClose={onDismissAlert ? () => onDismissAlert(alert.id) : undefined}
            >
              {alert.message}
            </Alert>
          ))}
        </div>
      )}

      {/* Usage Metrics Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Storage Usage */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-900">Storage</h4>
            <Badge variant={getUsageStatus(usage.storage.percentage).variant}>
              {getUsageStatus(usage.storage.percentage).text}
            </Badge>
          </div>

          <div className="mt-4">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold text-gray-900">
                {usage.storage.currentGB.toFixed(2)} GB
              </span>
              <span className="text-sm text-gray-600">
                / {formatLimit(usage.storage.limitGB, 'GB')}
              </span>
            </div>
            <Progress
              value={usage.storage.percentage}
              variant={getUsageColor(usage.storage.percentage)}
              size="md"
              className="mt-3"
            />
            <p className="mt-2 text-xs text-gray-600">
              {usage.storage.percentage.toFixed(1)}% used
            </p>
          </div>

          {usage.storage.percentage >= 80 && (
            <div className="mt-4 rounded-lg bg-yellow-50 p-3">
              <p className="text-xs text-yellow-800">
                You're running low on storage. Consider upgrading your plan or removing unused
                files.
              </p>
            </div>
          )}
        </div>

        {/* Documents Usage */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-900">Documents</h4>
            {!isUnlimited(usage.documents.limit) && (
              <Badge variant={getUsageStatus(usage.documents.percentage).variant}>
                {getUsageStatus(usage.documents.percentage).text}
              </Badge>
            )}
          </div>

          <div className="mt-4">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold text-gray-900">
                {usage.documents.current.toLocaleString()}
              </span>
              <span className="text-sm text-gray-600">/ {formatLimit(usage.documents.limit)}</span>
            </div>
            {!isUnlimited(usage.documents.limit) && (
              <>
                <Progress
                  value={usage.documents.percentage}
                  variant={getUsageColor(usage.documents.percentage)}
                  size="md"
                  className="mt-3"
                />
                <p className="mt-2 text-xs text-gray-600">
                  {usage.documents.percentage.toFixed(1)}% used
                </p>
              </>
            )}
          </div>

          {!isUnlimited(usage.documents.limit) && usage.documents.percentage >= 80 && (
            <div className="mt-4 rounded-lg bg-yellow-50 p-3">
              <p className="text-xs text-yellow-800">
                You're approaching your document limit. Upgrade for unlimited documents.
              </p>
            </div>
          )}
        </div>

        {/* Users Usage */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-900">Team Members</h4>
            {!isUnlimited(usage.users.limit) && (
              <Badge
                variant={getUsageStatus((usage.users.current / usage.users.limit) * 100).variant}
              >
                {getUsageStatus((usage.users.current / usage.users.limit) * 100).text}
              </Badge>
            )}
          </div>

          <div className="mt-4">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold text-gray-900">{usage.users.current}</span>
              <span className="text-sm text-gray-600">/ {formatLimit(usage.users.limit)}</span>
            </div>
            {!isUnlimited(usage.users.limit) && (
              <>
                <Progress
                  value={(usage.users.current / usage.users.limit) * 100}
                  variant={getUsageColor((usage.users.current / usage.users.limit) * 100)}
                  size="md"
                  className="mt-3"
                />
                <p className="mt-2 text-xs text-gray-600">
                  {((usage.users.current / usage.users.limit) * 100).toFixed(1)}% used
                </p>
              </>
            )}
          </div>
        </div>

        {/* API Calls Usage */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-900">API Calls</h4>
            {!isUnlimited(usage.apiCalls.limit) && (
              <Badge variant={getUsageStatus(usage.apiCalls.percentage).variant}>
                {getUsageStatus(usage.apiCalls.percentage).text}
              </Badge>
            )}
          </div>

          <div className="mt-4">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold text-gray-900">
                {usage.apiCalls.currentMonth.toLocaleString()}
              </span>
              <span className="text-sm text-gray-600">/ {formatLimit(usage.apiCalls.limit)}</span>
            </div>
            {!isUnlimited(usage.apiCalls.limit) && (
              <>
                <Progress
                  value={usage.apiCalls.percentage}
                  variant={getUsageColor(usage.apiCalls.percentage)}
                  size="md"
                  className="mt-3"
                />
                <p className="mt-2 text-xs text-gray-600">
                  {usage.apiCalls.percentage.toFixed(1)}% used this month
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Upgrade Prompt */}
      {showUpgradePrompt && hasHighUsage && onUpgrade && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-blue-900">Need More Resources?</h4>
              <p className="mt-2 text-sm text-blue-800">
                You're using{' '}
                {usage.storage.percentage >= 80 ? 'a lot of storage' : 'many resources'}. Upgrade
                your plan to get more capacity and avoid service interruptions.
              </p>
            </div>
            <Button variant="primary" size="sm" onClick={onUpgrade} className="ml-4">
              Upgrade Plan
            </Button>
          </div>
        </div>
      )}

      {/* Additional Info */}
      <div className="rounded-lg bg-gray-50 p-4">
        <p className="text-xs text-gray-600">
          Usage statistics are updated hourly. Limits reset at the beginning of each billing period.
        </p>
      </div>
    </div>
  )
}

export default UsageMetrics
