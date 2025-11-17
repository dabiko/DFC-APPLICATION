/**
 * FileUploadProgress Component
 * Display upload progress for a single file
 */

import { FC } from 'react'
import {
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  XMarkIcon,
  PauseIcon,
} from '@heroicons/react/24/outline'
import { cn } from '@utils/cn'
import type { FileUploadProgressProps } from '@/types/upload'
import { getFileIcon } from '@/utils/fileValidation'
import { formatFileSize } from '@/utils/versionUtils'
import { formatUploadSpeed, formatTimeRemaining } from '@/utils/fileValidation'

export const FileUploadProgress: FC<FileUploadProgressProps> = ({
  upload,
  onCancel,
  onRetry,
  onRemove,
  showDetails = true,
  className,
}) => {
  const { file, status, progress, error, uploadSpeed, timeRemaining } = upload

  const getStatusIcon = () => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="w-5 h-5 text-success-600 dark:text-success-400" />
      case 'error':
        return <XCircleIcon className="w-5 h-5 text-error-600 dark:text-error-400" />
      case 'uploading':
      case 'processing':
        return (
          <div className="w-5 h-5 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
        )
      case 'cancelled':
        return <PauseIcon className="w-5 h-5 text-gray-400" />
      default:
        return <div className="w-5 h-5 bg-gray-200 dark:bg-gray-700 rounded-full" />
    }
  }

  const getStatusText = () => {
    switch (status) {
      case 'completed':
        return 'Completed'
      case 'error':
        return error || 'Upload failed'
      case 'uploading':
        return `Uploading... ${progress}%`
      case 'processing':
        return 'Processing...'
      case 'cancelled':
        return 'Cancelled'
      case 'pending':
        return 'Waiting...'
      default:
        return ''
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case 'completed':
        return 'text-success-600 dark:text-success-400'
      case 'error':
        return 'text-error-600 dark:text-error-400'
      case 'uploading':
      case 'processing':
        return 'text-primary-600 dark:text-primary-400'
      case 'cancelled':
        return 'text-gray-500 dark:text-gray-400'
      default:
        return 'text-gray-600 dark:text-gray-400'
    }
  }

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-4 rounded-lg border transition-colors',
        status === 'completed'
          ? 'border-success-200 dark:border-success-800 bg-success-50 dark:bg-success-900/10'
          : status === 'error'
            ? 'border-error-200 dark:border-error-800 bg-error-50 dark:bg-error-900/10'
            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900',
        className
      )}
    >
      {/* File icon and info */}
      <div className="flex-shrink-0">
        <span className="text-3xl">{getFileIcon(file)}</span>
      </div>

      <div className="flex-1 min-w-0">
        {/* File name */}
        <div className="flex items-center gap-2 mb-1">
          {getStatusIcon()}
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
            {file.name}
          </h4>
        </div>

        {/* File size and status */}
        <p className={cn('text-xs mb-2', getStatusColor())}>{getStatusText()}</p>

        {/* Progress bar */}
        {(status === 'uploading' || status === 'processing') && (
          <div className="mb-2">
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary-600 dark:bg-primary-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Additional details */}
        {showDetails && (
          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
            <span>{formatFileSize(file.size)}</span>

            {status === 'uploading' && uploadSpeed && (
              <>
                <span>•</span>
                <span>{formatUploadSpeed(uploadSpeed)}</span>
              </>
            )}

            {status === 'uploading' && timeRemaining !== undefined && (
              <>
                <span>•</span>
                <span>{formatTimeRemaining(timeRemaining)}</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {status === 'uploading' && onCancel && (
          <button
            onClick={() => onCancel(upload.id)}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
            title="Cancel upload"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        )}

        {status === 'error' && onRetry && (
          <button
            onClick={() => onRetry(upload.id)}
            className="p-1.5 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded transition-colors"
            title="Retry upload"
          >
            <ArrowPathIcon className="w-4 h-4" />
          </button>
        )}

        {(status === 'completed' || status === 'error' || status === 'cancelled') && onRemove && (
          <button
            onClick={() => onRemove(upload.id)}
            className="p-1.5 text-gray-400 hover:text-error-600 dark:hover:text-error-400 hover:bg-error-50 dark:hover:bg-error-900/20 rounded transition-colors"
            title="Remove from list"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}
