import React from 'react'
import {
  ShieldExclamationIcon,
  PlusIcon,
  PencilIcon,
  CheckCircleIcon,
  DocumentTextIcon,
  ClockIcon,
  UserGroupIcon,
  BellIcon,
  ArrowRightStartOnRectangleIcon,
} from '@heroicons/react/24/outline'
import type { LegalHold, LegalHoldManagerProps } from '@/types/retention'
import { format, formatDistance } from 'date-fns'
import { getHoldStatusLabel, getHoldStatusColor } from '@/types/retention'

export const LegalHoldManager: React.FC<LegalHoldManagerProps> = ({
  holds,
  selectedHoldId,
  onHoldSelect,
  onCreateHold,
  onEditHold,
  onReleaseHold,
  onViewAudit,
  onManageCustodians,
  onManageNotifications,
  onInitiateRelease,
  loading = false,
}) => {
  const getReasonLabel = (reason: LegalHold['reason']) => {
    const labels: Record<LegalHold['reason'], string> = {
      litigation: 'Litigation',
      investigation: 'Investigation',
      audit: 'Audit',
      regulatory: 'Regulatory',
      compliance: 'Compliance',
      other: 'Other',
    }
    return labels[reason]
  }

  const getReasonIcon = (reason: LegalHold['reason']) => {
    return ShieldExclamationIcon
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading legal holds...</p>
        </div>
      </div>
    )
  }

  if (holds.length === 0) {
    return (
      <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <ShieldExclamationIcon className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          No Legal Holds Active
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Create a legal hold to preserve documents for litigation or investigation
        </p>
        {onCreateHold && (
          <button
            onClick={onCreateHold}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="w-5 h-5" />
            Create Legal Hold
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
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Legal Holds</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {holds.length} {holds.length === 1 ? 'hold' : 'holds'} •{' '}
            {holds.reduce((sum, h) => sum + h.documentsOnHold, 0).toLocaleString()} documents
            preserved
          </p>
        </div>
        {onCreateHold && (
          <button
            onClick={onCreateHold}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="w-5 h-5" />
            New Hold
          </button>
        )}
      </div>

      {/* Holds Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {holds.map((hold) => {
          const statusColors = getHoldStatusColor(hold.status)
          const ReasonIcon = getReasonIcon(hold.reason)
          const isActive = hold.status === 'active'

          return (
            <div
              key={hold.id}
              onClick={() => onHoldSelect?.(hold.id)}
              className={`
                bg-white dark:bg-gray-800 rounded-lg border-2 p-6 cursor-pointer
                transition-all duration-200 hover:shadow-md
                ${
                  selectedHoldId === hold.id
                    ? 'border-blue-500 dark:border-blue-400 shadow-md'
                    : 'border-gray-200 dark:border-gray-700'
                }
              `}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <ShieldExclamationIcon
                      className={`w-5 h-5 ${isActive ? 'text-red-600 dark:text-red-400' : 'text-gray-400'}`}
                    />
                    <h3 className="font-semibold text-gray-900 dark:text-white">{hold.caseName}</h3>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Case #{hold.caseNumber}
                  </div>
                </div>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors.bg} ${statusColors.text}`}
                >
                  {getHoldStatusLabel(hold.status)}
                </span>
              </div>

              {/* Description */}
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                {hold.description}
              </p>

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Reason</div>
                  <div className="flex items-center gap-1 text-sm text-gray-900 dark:text-white">
                    <ReasonIcon className="w-4 h-4" />
                    <span>{getReasonLabel(hold.reason)}</span>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Documents</div>
                  <div className="flex items-center gap-1 text-sm text-gray-900 dark:text-white">
                    <DocumentTextIcon className="w-4 h-4" />
                    <span>{hold.documentsOnHold.toLocaleString()}</span>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Created</div>
                  <div className="flex items-center gap-1 text-sm text-gray-900 dark:text-white">
                    <ClockIcon className="w-4 h-4" />
                    <span>{format(new Date(hold.createdAt), 'MMM d, yyyy')}</span>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Custodians</div>
                  <div className="flex items-center gap-1 text-sm text-gray-900 dark:text-white">
                    <UserGroupIcon className="w-4 h-4" />
                    <span>{hold.custodians.length}</span>
                  </div>
                </div>
              </div>

              {/* Duration */}
              {isActive && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                  <div className="flex items-center gap-2 text-sm text-red-800 dark:text-red-300">
                    <ClockIcon className="w-4 h-4" />
                    <span>
                      Active for{' '}
                      {formatDistance(new Date(hold.effectiveDate), new Date(), {
                        addSuffix: false,
                      })}
                    </span>
                  </div>
                </div>
              )}

              {/* Released Info */}
              {hold.status === 'released' && hold.releasedAt && (
                <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2 text-sm text-green-800 dark:text-green-300">
                    <CheckCircleIcon className="w-4 h-4" />
                    <span>Released on {format(new Date(hold.releasedAt), 'MMM d, yyyy')}</span>
                  </div>
                  {hold.documentsReleased > 0 && (
                    <div className="text-xs text-green-700 dark:text-green-400 mt-1">
                      {hold.documentsReleased} documents released
                    </div>
                  )}
                </div>
              )}

              {/* Notifications Status */}
              {isActive && hold.pendingAcknowledgment.length > 0 && (
                <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <div className="text-sm text-yellow-800 dark:text-yellow-300">
                    {hold.pendingAcknowledgment.length} custodian
                    {hold.pendingAcknowledgment.length !== 1 ? 's' : ''} pending acknowledgment
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                {onManageCustodians && isActive && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onManageCustodians(hold.id)
                    }}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                    title="Manage Custodians"
                  >
                    <UserGroupIcon className="w-4 h-4" />
                    Custodians
                  </button>
                )}
                {onManageNotifications && isActive && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onManageNotifications(hold.id)
                    }}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                    title="Manage Notifications"
                  >
                    <BellIcon className="w-4 h-4" />
                    Notifications
                  </button>
                )}
                {onEditHold && isActive && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onEditHold(hold.id)
                    }}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                    title="Edit Hold"
                  >
                    <PencilIcon className="w-4 h-4" />
                    Edit
                  </button>
                )}
                {onInitiateRelease && isActive && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onInitiateRelease(hold.id)
                    }}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    title="Initiate Release Workflow"
                  >
                    <ArrowRightStartOnRectangleIcon className="w-4 h-4" />
                    Release
                  </button>
                )}
                {onViewAudit && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onViewAudit(hold.id)
                    }}
                    className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                    title="View Audit Log"
                  >
                    View Audit
                  </button>
                )}
              </div>

              {/* Departments */}
              {hold.departments.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex flex-wrap gap-1">
                    {hold.departments.slice(0, 3).map((dept) => (
                      <span
                        key={dept}
                        className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded"
                      >
                        {dept}
                      </span>
                    ))}
                    {hold.departments.length > 3 && (
                      <span className="text-xs px-2 py-0.5 text-gray-600 dark:text-gray-400">
                        +{hold.departments.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
