import React from 'react'
import { ShieldExclamationIcon, ClockIcon, DocumentTextIcon } from '@heroicons/react/24/outline'
import type { HoldStatusIndicatorProps } from '@/types/retention'
import { format } from 'date-fns'
import { getHoldStatusLabel, getHoldStatusColor } from '@/types/retention'

export const HoldStatusIndicator: React.FC<HoldStatusIndicatorProps> = ({
  hold,
  holds,
  compact = false,
  showDetails = true,
  onClick,
}) => {
  // Single hold mode
  if (hold) {
    const statusColors = getHoldStatusColor(hold.status)
    const isActive = hold.status === 'active'

    if (compact) {
      return (
        <button
          onClick={onClick}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${statusColors.bg} ${statusColors.text} ${statusColors.border} ${onClick ? 'cursor-pointer hover:opacity-80' : ''}`}
          disabled={!onClick}
        >
          <ShieldExclamationIcon className="w-3.5 h-3.5" />
          <span>Legal Hold</span>
        </button>
      )
    }

    return (
      <div
        onClick={onClick}
        className={`bg-white dark:bg-gray-800 rounded-lg border p-4 ${onClick ? 'cursor-pointer hover:shadow-md' : ''} ${isActive ? 'border-red-300 dark:border-red-700' : 'border-gray-200 dark:border-gray-700'}`}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ShieldExclamationIcon
              className={`w-5 h-5 ${isActive ? 'text-red-600 dark:text-red-400' : 'text-gray-400'}`}
            />
            <span className="font-semibold text-gray-900 dark:text-white">Legal Hold</span>
          </div>
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors.bg} ${statusColors.text}`}
          >
            {getHoldStatusLabel(hold.status)}
          </span>
        </div>

        {showDetails && (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Case:</span>
              <span className="font-medium text-gray-900 dark:text-white">{hold.caseName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Case #:</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {hold.caseNumber}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Effective:</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {format(new Date(hold.effectiveDate), 'MMM d, yyyy')}
              </span>
            </div>
            {hold.status === 'active' && (
              <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-700">
                <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
                  <DocumentTextIcon className="w-4 h-4" />
                  Documents on Hold:
                </span>
                <span className="font-bold text-red-600 dark:text-red-400">
                  {hold.documentsOnHold.toLocaleString()}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // Multiple holds mode
  if (holds && holds.length > 0) {
    const activeHolds = holds.filter((h) => h.status === 'active')
    const totalDocs = activeHolds.reduce((sum, h) => sum + h.documentsOnHold, 0)

    if (compact) {
      return (
        <button
          onClick={onClick}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-300 dark:border-red-700 hover:opacity-80"
          disabled={!onClick}
        >
          <ShieldExclamationIcon className="w-3.5 h-3.5" />
          <span>
            {activeHolds.length} Hold{activeHolds.length !== 1 ? 's' : ''}
          </span>
        </button>
      )
    }

    return (
      <div
        onClick={onClick}
        className={`bg-white dark:bg-gray-800 rounded-lg border border-red-300 dark:border-red-700 p-4 ${onClick ? 'cursor-pointer hover:shadow-md' : ''}`}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ShieldExclamationIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
            <span className="font-semibold text-gray-900 dark:text-white">Legal Holds</span>
          </div>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
            {activeHolds.length} Active
          </span>
        </div>

        {showDetails && (
          <div className="space-y-3">
            <div className="flex justify-between items-center pb-3 border-b border-gray-200 dark:border-gray-700">
              <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                <DocumentTextIcon className="w-4 h-4" />
                Total Documents on Hold:
              </span>
              <span className="text-sm font-bold text-red-600 dark:text-red-400">
                {totalDocs.toLocaleString()}
              </span>
            </div>

            <div className="space-y-2">
              {activeHolds.slice(0, 3).map((h) => (
                <div key={h.id} className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400 truncate">{h.caseName}</span>
                  <span className="font-medium text-gray-900 dark:text-white ml-2">
                    {h.documentsOnHold.toLocaleString()}
                  </span>
                </div>
              ))}
              {activeHolds.length > 3 && (
                <div className="text-xs text-gray-500 dark:text-gray-400 text-center pt-1">
                  +{activeHolds.length - 3} more holds
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  // No holds
  return null
}
