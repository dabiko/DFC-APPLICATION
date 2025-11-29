/**
 * UsageTab Component
 *
 * Displays resource usage statistics for the organization.
 * Shows users, storage, and documents usage with progress bars.
 */

import { Users, HardDrive, FileText, AlertTriangle, TrendingUp, Info } from 'lucide-react'
import type { UsageStats, Organization } from '@/services/organizationSettingsService'
import { cn } from '@/utils/cn'

interface UsageTabProps {
  usage: UsageStats
  organization: Organization
}

// Format bytes to human-readable format
function formatBytes(gb: number): string {
  if (gb < 1) {
    return `${Math.round(gb * 1024)} MB`
  }
  return `${gb.toFixed(1)} GB`
}

// Format large numbers
function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`
  }
  return num.toString()
}

// Get progress bar color based on percentage
function getProgressColor(percentage: number): string {
  if (percentage >= 90) return 'bg-red-500'
  if (percentage >= 75) return 'bg-orange-500'
  if (percentage >= 50) return 'bg-yellow-500'
  return 'bg-green-500'
}

// Get status indicator color
function getStatusColor(percentage: number): string {
  if (percentage >= 90) return 'text-red-600 dark:text-red-400'
  if (percentage >= 75) return 'text-orange-600 dark:text-orange-400'
  return 'text-green-600 dark:text-green-400'
}

export function UsageTab({ usage, organization }: UsageTabProps) {
  const usageCards = [
    {
      title: 'Users',
      icon: Users,
      current: usage.current_users,
      max: usage.max_users,
      percentage: usage.users_percentage,
      limitReached: usage.users_limit_reached,
      formatCurrent: (n: number) => n.toString(),
      formatMax: (n: number) => n.toString(),
    },
    {
      title: 'Storage',
      icon: HardDrive,
      current: usage.current_storage_gb,
      max: usage.max_storage_gb,
      percentage: usage.storage_percentage,
      limitReached: usage.storage_limit_reached,
      formatCurrent: formatBytes,
      formatMax: formatBytes,
    },
    {
      title: 'Documents',
      icon: FileText,
      current: usage.current_documents,
      max: usage.max_documents,
      percentage: usage.documents_percentage,
      limitReached: usage.documents_limit_reached,
      formatCurrent: formatNumber,
      formatMax: formatNumber,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Usage Overview */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Resource Usage
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {organization.subscription_display} Plan
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <Info className="w-4 h-4" />
            Usage updates in real-time
          </div>
        </div>

        {/* Usage Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {usageCards.map((card) => (
            <div
              key={card.title}
              className={cn(
                'relative p-5 rounded-xl border transition-all',
                card.limitReached
                  ? 'border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/10'
                  : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'
              )}
            >
              {/* Limit Warning Badge */}
              {card.limitReached && (
                <div className="absolute -top-2 -right-2 flex items-center gap-1 px-2 py-1 bg-red-500 text-white text-xs font-medium rounded-full">
                  <AlertTriangle className="w-3 h-3" />
                  Limit Reached
                </div>
              )}

              <div className="flex items-center gap-3 mb-4">
                <div
                  className={cn(
                    'p-2 rounded-lg',
                    card.limitReached
                      ? 'bg-red-100 dark:bg-red-900/30'
                      : 'bg-gray-100 dark:bg-gray-700'
                  )}
                >
                  <card.icon
                    className={cn(
                      'w-5 h-5',
                      card.limitReached
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-gray-600 dark:text-gray-400'
                    )}
                  />
                </div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {card.title}
                </span>
              </div>

              {/* Usage Numbers */}
              <div className="mb-3">
                <span className="text-2xl font-bold text-gray-900 dark:text-white">
                  {card.formatCurrent(card.current)}
                </span>
                <span className="text-gray-500 dark:text-gray-400">
                  {' '}
                  / {card.formatMax(card.max)}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-500',
                      getProgressColor(card.percentage)
                    )}
                    style={{ width: `${Math.min(card.percentage, 100)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className={getStatusColor(card.percentage)}>
                    {card.percentage.toFixed(1)}% used
                  </span>
                  <span className="text-gray-500 dark:text-gray-400">
                    {card.formatCurrent(card.max - card.current)} remaining
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Detailed Breakdown */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Usage Details</h3>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {/* Users Detail */}
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Team Members</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Active users in your organization
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {usage.current_users}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  of {usage.max_users} seats
                </p>
              </div>
            </div>
            <div className="mt-3 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full', getProgressColor(usage.users_percentage))}
                style={{ width: `${Math.min(usage.users_percentage, 100)}%` }}
              />
            </div>
          </div>

          {/* Storage Detail */}
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <HardDrive className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Storage Space</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Total file storage used
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {formatBytes(usage.current_storage_gb)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  of {formatBytes(usage.max_storage_gb)}
                </p>
              </div>
            </div>
            <div className="mt-3 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full', getProgressColor(usage.storage_percentage))}
                style={{ width: `${Math.min(usage.storage_percentage, 100)}%` }}
              />
            </div>
          </div>

          {/* Documents Detail */}
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <FileText className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Documents</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Total documents stored</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {formatNumber(usage.current_documents)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  of {formatNumber(usage.max_documents)}
                </p>
              </div>
            </div>
            <div className="mt-3 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full', getProgressColor(usage.documents_percentage))}
                style={{ width: `${Math.min(usage.documents_percentage, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Upgrade Prompt if any limits are near */}
      {(usage.users_percentage >= 75 ||
        usage.storage_percentage >= 75 ||
        usage.documents_percentage >= 75) &&
        organization.subscription_plan !== 'enterprise' && (
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl p-6 text-white">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-white/20 rounded-lg">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-1">Approaching Usage Limits</h3>
                <p className="text-sm text-amber-100 mb-4">
                  You're nearing your plan limits. Upgrade to get more capacity and unlock
                  additional features.
                </p>
                <button className="px-4 py-2 bg-white text-orange-600 font-medium rounded-lg hover:bg-orange-50 transition-colors">
                  View Upgrade Options
                </button>
              </div>
            </div>
          </div>
        )}

      {/* Plan Limits Reference */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
          Plan Limits Reference
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                <th className="pb-3 font-medium">Plan</th>
                <th className="pb-3 font-medium">Users</th>
                <th className="pb-3 font-medium">Storage</th>
                <th className="pb-3 font-medium">Documents</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              <tr
                className={cn(
                  organization.subscription_plan === 'free' && 'bg-blue-50 dark:bg-blue-900/10'
                )}
              >
                <td className="py-3 font-medium text-gray-900 dark:text-white">
                  Free Trial
                  {organization.subscription_plan === 'free' && (
                    <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">Current</span>
                  )}
                </td>
                <td className="py-3 text-gray-600 dark:text-gray-400">5</td>
                <td className="py-3 text-gray-600 dark:text-gray-400">5 GB</td>
                <td className="py-3 text-gray-600 dark:text-gray-400">500</td>
              </tr>
              <tr
                className={cn(
                  organization.subscription_plan === 'starter' && 'bg-blue-50 dark:bg-blue-900/10'
                )}
              >
                <td className="py-3 font-medium text-gray-900 dark:text-white">
                  Starter
                  {organization.subscription_plan === 'starter' && (
                    <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">Current</span>
                  )}
                </td>
                <td className="py-3 text-gray-600 dark:text-gray-400">25</td>
                <td className="py-3 text-gray-600 dark:text-gray-400">50 GB</td>
                <td className="py-3 text-gray-600 dark:text-gray-400">5,000</td>
              </tr>
              <tr
                className={cn(
                  organization.subscription_plan === 'professional' &&
                    'bg-blue-50 dark:bg-blue-900/10'
                )}
              >
                <td className="py-3 font-medium text-gray-900 dark:text-white">
                  Professional
                  {organization.subscription_plan === 'professional' && (
                    <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">Current</span>
                  )}
                </td>
                <td className="py-3 text-gray-600 dark:text-gray-400">100</td>
                <td className="py-3 text-gray-600 dark:text-gray-400">500 GB</td>
                <td className="py-3 text-gray-600 dark:text-gray-400">50,000</td>
              </tr>
              <tr
                className={cn(
                  organization.subscription_plan === 'enterprise' &&
                    'bg-blue-50 dark:bg-blue-900/10'
                )}
              >
                <td className="py-3 font-medium text-gray-900 dark:text-white">
                  Enterprise
                  {organization.subscription_plan === 'enterprise' && (
                    <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">Current</span>
                  )}
                </td>
                <td className="py-3 text-gray-600 dark:text-gray-400">Unlimited</td>
                <td className="py-3 text-gray-600 dark:text-gray-400">Unlimited</td>
                <td className="py-3 text-gray-600 dark:text-gray-400">Unlimited</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default UsageTab
