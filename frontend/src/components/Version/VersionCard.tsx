/**
 * VersionCard Component
 * Displays a single version with actions
 */

import { FC } from 'react'
import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  TrashIcon,
  EyeIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline'
import { cn } from '@utils/cn'
import type { VersionCardProps } from '@/types/version'
import {
  formatVersionNumber,
  formatRelativeTime,
  formatFileSize,
  getFileIcon,
} from '@/utils/versionUtils'

export const VersionCard: FC<VersionCardProps> = ({
  version,
  isCurrent = false,
  isSelected = false,
  onView,
  onDownload,
  onRestore,
  onDelete,
  onSelectForComparison,
  canRestore = true,
  canDelete = true,
  className,
}) => {
  return (
    <div
      className={cn(
        'relative border rounded-lg p-4 transition-all',
        isCurrent
          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900',
        isSelected && 'ring-2 ring-primary-500',
        'hover:shadow-md',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{getFileIcon(version.mimeType)}</span>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                {formatVersionNumber(version.versionNumber)}
              </span>
              {isCurrent && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-200 rounded">
                  <CheckCircleIcon className="w-3 h-3" />
                  Current
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {formatRelativeTime(version.createdAt)}
            </p>
          </div>
        </div>

        {/* Version checkbox for comparison */}
        {onSelectForComparison && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onSelectForComparison(version)}
            className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
            aria-label="Select for comparison"
          />
        )}
      </div>

      {/* File Info */}
      <div className="space-y-2 mb-3">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-600 dark:text-gray-400">File:</span>
          <span className="font-mono text-gray-900 dark:text-gray-100 truncate">
            {version.fileName}
          </span>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-600 dark:text-gray-400">Size:</span>
          <span className="text-gray-900 dark:text-gray-100">{formatFileSize(version.fileSize)}</span>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-600 dark:text-gray-400">By:</span>
          <span className="text-gray-900 dark:text-gray-100">{version.createdBy}</span>
        </div>
      </div>

      {/* Change Description */}
      {version.changeDescription && (
        <div className="mb-3 p-2 bg-gray-50 dark:bg-gray-800 rounded text-sm">
          <p className="text-gray-700 dark:text-gray-300 italic">{version.changeDescription}</p>
        </div>
      )}

      {/* Tags */}
      {version.tags && version.tags.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1">
          {version.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
        {onView && (
          <button
            onClick={() => onView(version)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
            title="View version"
          >
            <EyeIcon className="w-4 h-4" />
            View
          </button>
        )}

        {onDownload && (
          <button
            onClick={() => onDownload(version)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
            title="Download version"
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
            Download
          </button>
        )}

        {onRestore && canRestore && !isCurrent && (
          <button
            onClick={() => onRestore(version)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
            title="Restore this version"
          >
            <ArrowPathIcon className="w-4 h-4" />
            Restore
          </button>
        )}

        {onDelete && canDelete && !isCurrent && (
          <button
            onClick={() => onDelete(version)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-error-600 dark:text-error-400 hover:bg-error-50 dark:hover:bg-error-900/20 rounded transition-colors ml-auto"
            title="Delete version"
          >
            <TrashIcon className="w-4 h-4" />
            Delete
          </button>
        )}
      </div>
    </div>
  )
}
