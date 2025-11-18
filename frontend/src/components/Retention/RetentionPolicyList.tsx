import React from 'react'
import {
  ClockIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  PlayIcon,
  PauseIcon,
} from '@heroicons/react/24/outline'
import type { RetentionPolicy, RetentionPolicyListProps } from '@/types/retention'
import { formatRetentionPeriod } from '@/types/retention'
import { format } from 'date-fns'

export const RetentionPolicyList: React.FC<RetentionPolicyListProps> = ({
  policies,
  selectedPolicyId,
  onPolicySelect,
  onCreatePolicy,
  onEditPolicy,
  onDeletePolicy,
  onToggleStatus,
  loading = false,
  view = 'list',
}) => {
  const getStatusBadge = (status: RetentionPolicy['status']) => {
    const styles = {
      active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
      draft: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      archived: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    }

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  const getActionIcon = (action: RetentionPolicy['primaryAction']) => {
    const icons = {
      archive: ClockIcon,
      delete: TrashIcon,
      review: DocumentTextIcon,
      notify: ExclamationTriangleIcon,
    }
    const Icon = icons[action]
    return <Icon className="w-4 h-4" />
  }

  const getComplianceRate = (policy: RetentionPolicy) => {
    if (policy.documentsAffected === 0) return 100
    return (policy.documentsCompliant / policy.documentsAffected) * 100
  }

  const renderGridView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {policies.map((policy) => (
        <div
          key={policy.id}
          onClick={() => onPolicySelect?.(policy.id)}
          className={`
            relative bg-white dark:bg-gray-800 rounded-lg border-2 p-4 cursor-pointer
            transition-all duration-200 hover:shadow-md
            ${
              selectedPolicyId === policy.id
                ? 'border-blue-500 dark:border-blue-400 shadow-md'
                : 'border-gray-200 dark:border-gray-700'
            }
          `}
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{policy.name}</h3>
              {getStatusBadge(policy.status)}
            </div>
            <div className="flex items-center gap-1 ml-2">
              {onEditPolicy && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onEditPolicy(policy.id)
                  }}
                  className="p-1.5 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                  title="Edit policy"
                >
                  <PencilIcon className="w-4 h-4" />
                </button>
              )}
              {onToggleStatus && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onToggleStatus(policy.id)
                  }}
                  className="p-1.5 text-gray-500 hover:text-green-600 dark:text-gray-400 dark:hover:text-green-400 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                  title={policy.status === 'active' ? 'Pause' : 'Activate'}
                >
                  {policy.status === 'active' ? (
                    <PauseIcon className="w-4 h-4" />
                  ) : (
                    <PlayIcon className="w-4 h-4" />
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Description */}
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
            {policy.description}
          </p>

          {/* Retention Info */}
          <div className="flex items-center gap-2 mb-3 text-sm">
            <div className="flex items-center gap-1 text-gray-700 dark:text-gray-300">
              {getActionIcon(policy.primaryAction)}
              <span>{formatRetentionPeriod(policy.retentionPeriod)}</span>
            </div>
            <span className="text-gray-400">•</span>
            <span className="text-gray-600 dark:text-gray-400">{policy.primaryAction}</span>
          </div>

          {/* Documents Affected */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Documents:</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {policy.documentsAffected.toLocaleString()}
              </span>
            </div>

            {/* Compliance Bar */}
            {policy.documentsAffected > 0 && (
              <div>
                <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                  <span>Compliance</span>
                  <span>{getComplianceRate(policy).toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      getComplianceRate(policy) >= 90
                        ? 'bg-green-500'
                        : getComplianceRate(policy) >= 70
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                    }`}
                    style={{ width: `${getComplianceRate(policy)}%` }}
                  />
                </div>
              </div>
            )}

            {/* At Risk Indicator */}
            {policy.documentsAtRisk > 0 && (
              <div className="flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400">
                <ExclamationTriangleIcon className="w-3.5 h-3.5" />
                <span>{policy.documentsAtRisk} at risk</span>
              </div>
            )}
          </div>

          {/* Compliance Standards */}
          {policy.complianceStandards.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              <div className="flex flex-wrap gap-1">
                {policy.complianceStandards.slice(0, 3).map((standard) => (
                  <span
                    key={standard}
                    className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded"
                  >
                    {standard}
                  </span>
                ))}
                {policy.complianceStandards.length > 3 && (
                  <span className="text-xs px-2 py-0.5 text-gray-600 dark:text-gray-400">
                    +{policy.complianceStandards.length - 3}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )

  const renderListView = () => (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-900">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Policy
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Retention
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Documents
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Compliance
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {policies.map((policy) => (
            <tr
              key={policy.id}
              onClick={() => onPolicySelect?.(policy.id)}
              className={`
                cursor-pointer transition-colors
                ${
                  selectedPolicyId === policy.id
                    ? 'bg-blue-50 dark:bg-blue-900/20'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }
              `}
            >
              <td className="px-6 py-4">
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">{policy.name}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">
                    {policy.description}
                  </div>
                  {policy.complianceStandards.length > 0 && (
                    <div className="flex gap-1 mt-1">
                      {policy.complianceStandards.slice(0, 2).map((standard) => (
                        <span
                          key={standard}
                          className="text-xs px-1.5 py-0.5 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded"
                        >
                          {standard}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </td>
              <td className="px-6 py-4">{getStatusBadge(policy.status)}</td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-2 text-sm">
                  {getActionIcon(policy.primaryAction)}
                  <div>
                    <div className="text-gray-900 dark:text-white">
                      {formatRetentionPeriod(policy.retentionPeriod)}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {policy.primaryAction}
                    </div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="text-sm">
                  <div className="text-gray-900 dark:text-white font-medium">
                    {policy.documentsAffected.toLocaleString()}
                  </div>
                  {policy.documentsAtRisk > 0 && (
                    <div className="flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400">
                      <ExclamationTriangleIcon className="w-3.5 h-3.5" />
                      <span>{policy.documentsAtRisk} at risk</span>
                    </div>
                  )}
                </div>
              </td>
              <td className="px-6 py-4">
                {policy.documentsAffected > 0 ? (
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            getComplianceRate(policy) >= 90
                              ? 'bg-green-500'
                              : getComplianceRate(policy) >= 70
                                ? 'bg-yellow-500'
                                : 'bg-red-500'
                          }`}
                          style={{ width: `${getComplianceRate(policy)}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-xs text-gray-600 dark:text-gray-400 w-10 text-right">
                      {getComplianceRate(policy).toFixed(0)}%
                    </span>
                  </div>
                ) : (
                  <span className="text-sm text-gray-400">N/A</span>
                )}
              </td>
              <td className="px-6 py-4 text-right">
                <div className="flex items-center justify-end gap-1">
                  {onEditPolicy && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onEditPolicy(policy.id)
                      }}
                      className="p-1.5 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                      title="Edit"
                    >
                      <PencilIcon className="w-4 h-4" />
                    </button>
                  )}
                  {onToggleStatus && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onToggleStatus(policy.id)
                      }}
                      className="p-1.5 text-gray-500 hover:text-green-600 dark:text-gray-400 dark:hover:text-green-400 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                      title={policy.status === 'active' ? 'Pause' : 'Activate'}
                    >
                      {policy.status === 'active' ? (
                        <PauseIcon className="w-4 h-4" />
                      ) : (
                        <PlayIcon className="w-4 h-4" />
                      )}
                    </button>
                  )}
                  {onDeletePolicy && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        if (window.confirm(`Are you sure you want to delete "${policy.name}"?`)) {
                          onDeletePolicy(policy.id)
                        }
                      }}
                      className="p-1.5 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                      title="Delete"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  const renderCompactView = () => (
    <div className="space-y-2">
      {policies.map((policy) => (
        <div
          key={policy.id}
          onClick={() => onPolicySelect?.(policy.id)}
          className={`
            flex items-center justify-between p-3 rounded-lg border cursor-pointer
            transition-all duration-200
            ${
              selectedPolicyId === policy.id
                ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }
          `}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium text-gray-900 dark:text-white truncate">{policy.name}</h4>
              {getStatusBadge(policy.status)}
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
              <span className="flex items-center gap-1">
                {getActionIcon(policy.primaryAction)}
                {formatRetentionPeriod(policy.retentionPeriod)}
              </span>
              <span>•</span>
              <span>{policy.documentsAffected.toLocaleString()} docs</span>
              {policy.documentsAtRisk > 0 && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-orange-600 dark:text-orange-400">
                    <ExclamationTriangleIcon className="w-3.5 h-3.5" />
                    {policy.documentsAtRisk} at risk
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 ml-4">
            {policy.documentsAffected > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full ${
                      getComplianceRate(policy) >= 90
                        ? 'bg-green-500'
                        : getComplianceRate(policy) >= 70
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                    }`}
                    style={{ width: `${getComplianceRate(policy)}%` }}
                  />
                </div>
                <span className="text-xs text-gray-600 dark:text-gray-400 w-8">
                  {getComplianceRate(policy).toFixed(0)}%
                </span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading policies...</p>
        </div>
      </div>
    )
  }

  if (policies.length === 0) {
    return (
      <div className="text-center py-12">
        <DocumentTextIcon className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          No Retention Policies
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Create your first retention policy to manage document lifecycle
        </p>
        {onCreatePolicy && (
          <button
            onClick={onCreatePolicy}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="w-5 h-5" />
            Create Policy
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Retention Policies
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {policies.length} {policies.length === 1 ? 'policy' : 'policies'} •{' '}
            {policies.reduce((sum, p) => sum + p.documentsAffected, 0).toLocaleString()} documents
            affected
          </p>
        </div>
        {onCreatePolicy && (
          <button
            onClick={onCreatePolicy}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="w-5 h-5" />
            Create Policy
          </button>
        )}
      </div>

      {/* Policies */}
      {view === 'grid' && renderGridView()}
      {view === 'list' && renderListView()}
      {view === 'compact' && renderCompactView()}
    </div>
  )
}
