/**
 * FileUploadProgress Component
 * Display upload progress for a single file
 */

import { FC, useState } from 'react'
import {
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  XMarkIcon,
  PauseIcon,
  TrashIcon,
  ExclamationTriangleIcon,
  DocumentDuplicateIcon,
  LinkIcon,
  FolderIcon,
} from '@heroicons/react/24/outline'
import { cn } from '@utils/cn'
import type { FileUploadProgressProps } from '@/types/upload'
import { FileIcon } from '@/components/FileIcon'
import { formatFileSize } from '@/utils/versionUtils'
import { formatUploadSpeed, formatTimeRemaining } from '@/utils/fileValidation'

export const FileUploadProgress: FC<FileUploadProgressProps> = ({
  upload,
  onCancel,
  onRetry,
  onRemove,
  onCreateShortcut,
  currentFolderId,
  showDetails = true,
  className,
}) => {
  const { file, status, progress, error, uploadSpeed, timeRemaining, duplicateInfo } = upload

  // Check if duplicate is in the same folder (can't create shortcut in same folder)
  // Compare as strings to handle type differences
  const isDuplicateInSameFolder =
    duplicateInfo &&
    (() => {
      const dupFolderId = duplicateInfo.folderId ? String(duplicateInfo.folderId) : null
      const currFolderId = currentFolderId ? String(currentFolderId) : null
      return dupFolderId === currFolderId
    })()
  const [isRemoving, setIsRemoving] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)

  const handleRemove = () => {
    // For failed uploads, show confirmation first
    if (status === 'error' && !showConfirmation) {
      setShowConfirmation(true)
      return
    }

    setIsRemoving(true)
    // Small delay for animation
    setTimeout(() => {
      onRemove?.(upload.id)
    }, 200)
  }

  const handleCancelConfirmation = () => {
    setShowConfirmation(false)
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="w-5 h-5 text-success-600 dark:text-success-400" />
      case 'error':
        return <XCircleIcon className="w-5 h-5 text-error-600 dark:text-error-400" />
      case 'duplicate':
        return <DocumentDuplicateIcon className="w-5 h-5 text-warning-600 dark:text-warning-400" />
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
      case 'duplicate':
        return 'Duplicate file detected'
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
      case 'duplicate':
        return 'text-warning-600 dark:text-warning-400'
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
        'flex items-start gap-3 p-4 rounded-lg border transition-all duration-200',
        status === 'completed'
          ? 'border-success-200 dark:border-success-800 bg-success-50 dark:bg-success-900/10'
          : status === 'error'
            ? 'border-error-200 dark:border-error-800 bg-error-50 dark:bg-error-900/10'
            : status === 'duplicate'
              ? 'border-warning-200 dark:border-warning-800 bg-warning-50 dark:bg-warning-900/10'
              : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900',
        isRemoving && 'opacity-0 scale-95 -translate-x-2',
        className
      )}
    >
      {/* File icon and info */}
      <div className="flex-shrink-0">
        <FileIcon fileName={file.name} mimeType={file.type} size="lg" />
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

        {/* Error action buttons - shown inline for better UX */}
        {status === 'error' && showDetails && (
          <div className="mt-3">
            {/* Confirmation dialog */}
            {showConfirmation ? (
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                <ExclamationTriangleIcon className="w-5 h-5 text-warning-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    Dismiss this failed upload?
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    You can retry the upload instead.
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={handleCancelConfirmation}
                    className="px-2.5 py-1 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRemove}
                    className="px-2.5 py-1 text-xs font-medium text-white bg-error-600 hover:bg-error-700 rounded transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {onRetry && (
                  <button
                    onClick={() => onRetry(upload.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary-700 dark:text-primary-300 bg-primary-100 dark:bg-primary-900/30 hover:bg-primary-200 dark:hover:bg-primary-900/50 rounded-md transition-colors"
                  >
                    <ArrowPathIcon className="w-3.5 h-3.5" />
                    Retry Upload
                  </button>
                )}
                {onRemove && (
                  <button
                    onClick={handleRemove}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors"
                  >
                    <TrashIcon className="w-3.5 h-3.5" />
                    Dismiss
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Duplicate file action - show info about existing file and shortcut option */}
        {status === 'duplicate' && duplicateInfo && showDetails && (
          <div className="mt-3 space-y-3">
            {/* Info about existing file */}
            <div className="p-3 bg-warning-50 dark:bg-warning-900/20 rounded-lg border border-warning-200 dark:border-warning-800">
              <div className="flex items-start gap-2">
                <DocumentDuplicateIcon className="w-5 h-5 text-warning-600 dark:text-warning-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-warning-800 dark:text-warning-200">
                    This file already exists in the system
                  </p>
                  <div className="mt-2 space-y-1">
                    <p className="text-xs text-warning-700 dark:text-warning-300">
                      <span className="font-medium">Title:</span> {duplicateInfo.title}
                    </p>
                    {duplicateInfo.folderName && (
                      <p className="text-xs text-warning-700 dark:text-warning-300 flex items-center gap-1">
                        <FolderIcon className="w-3.5 h-3.5" />
                        <span className="font-medium">Location:</span>{' '}
                        {duplicateInfo.folderPath || duplicateInfo.folderName}
                      </p>
                    )}
                    <p className="text-xs text-warning-700 dark:text-warning-300">
                      <span className="font-medium">Type:</span> {duplicateInfo.documentType}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              {onCreateShortcut && !isDuplicateInSameFolder && (
                <button
                  onClick={() => onCreateShortcut(upload.id, duplicateInfo.documentId)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary-700 dark:text-primary-300 bg-primary-100 dark:bg-primary-900/30 hover:bg-primary-200 dark:hover:bg-primary-900/50 rounded-md transition-colors"
                >
                  <LinkIcon className="w-3.5 h-3.5" />
                  Create Shortcut Instead
                </button>
              )}
              {isDuplicateInSameFolder && (
                <span className="text-xs text-gray-500 dark:text-gray-400 italic">
                  File already exists in this folder
                </span>
              )}
              {onRemove && (
                <button
                  onClick={handleRemove}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors"
                >
                  <TrashIcon className="w-3.5 h-3.5" />
                  Skip This File
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Actions - icon buttons for non-error states */}
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

        {/* Show small icon buttons only when not in error state or showDetails is false */}
        {status === 'error' && !showDetails && (
          <>
            {onRetry && (
              <button
                onClick={() => onRetry(upload.id)}
                className="p-1.5 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded transition-colors"
                title="Retry upload"
              >
                <ArrowPathIcon className="w-4 h-4" />
              </button>
            )}
            {onRemove && (
              <button
                onClick={handleRemove}
                className="p-1.5 text-gray-400 hover:text-error-600 dark:hover:text-error-400 hover:bg-error-50 dark:hover:bg-error-900/20 rounded transition-colors"
                title="Remove from list"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            )}
          </>
        )}

        {(status === 'completed' || status === 'cancelled') && onRemove && (
          <button
            onClick={handleRemove}
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
