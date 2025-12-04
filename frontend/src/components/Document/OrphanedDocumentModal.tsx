/**
 * OrphanedDocumentModal Component
 * Modal shown when a document's file is missing from storage (MinIO)
 * Allows users to delete the orphaned database record
 */

import { FC, useState } from 'react'
import { XMarkIcon, ExclamationTriangleIcon, TrashIcon } from '@heroicons/react/24/outline'

export interface OrphanedDocumentModalProps {
  isOpen: boolean
  documentId: string
  documentName?: string
  onClose: () => void
  onDelete: (documentId: string) => Promise<void>
}

export const OrphanedDocumentModal: FC<OrphanedDocumentModalProps> = ({
  isOpen,
  documentId,
  documentName,
  onClose,
  onDelete,
}) => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDelete = async () => {
    setIsLoading(true)
    setError(null)

    try {
      await onDelete(documentId)
      onClose()
    } catch (err: any) {
      const errorMessage =
        err?.response?.data?.detail || err?.message || 'Failed to delete orphaned record'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="orphaned-document-title"
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-full">
              <ExclamationTriangleIcon className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
            <h2
              id="orphaned-document-title"
              className="text-lg font-semibold text-gray-900 dark:text-gray-100"
            >
              File Not Found in Storage
            </h2>
          </div>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label="Close modal"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-4">
          {/* Warning message */}
          <div className="p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
            <div className="flex gap-3">
              <ExclamationTriangleIcon className="w-6 h-6 flex-shrink-0 text-orange-600 dark:text-orange-400" />
              <div className="flex-1">
                <h3 className="font-semibold mb-1 text-orange-800 dark:text-orange-200">
                  Orphaned Document Record
                </h3>
                <p className="text-sm text-orange-700 dark:text-orange-300">
                  The file for this document no longer exists in storage. This can happen if the
                  file was deleted directly from MinIO or due to a storage error.
                </p>
              </div>
            </div>
          </div>

          {/* Document info */}
          {documentName && (
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-600 dark:text-gray-400">Document: </span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{documentName}</span>
              </div>
            </div>
          )}

          {/* Explanation */}
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <p className="mb-2">You have two options:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>
                <strong>Delete the record</strong> - Remove this orphaned entry from the database
              </li>
              <li>
                <strong>Close</strong> - Keep the record (it will remain non-functional)
              </li>
            </ul>
          </div>

          {/* Error message */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 dark:bg-gray-900 rounded-b-lg">
          <button
            type="button"
            onClick={handleClose}
            disabled={isLoading}
            className="
              px-4 py-2 text-sm font-medium
              text-gray-700 dark:text-gray-300
              hover:bg-gray-100 dark:hover:bg-gray-800
              rounded-lg transition-colors
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isLoading}
            className="
              px-4 py-2 text-sm font-medium
              text-white bg-red-600 hover:bg-red-700
              rounded-lg transition-colors
              disabled:opacity-50 disabled:cursor-not-allowed
              flex items-center gap-2
            "
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Deleting...
              </>
            ) : (
              <>
                <TrashIcon className="w-4 h-4" />
                Delete Record
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
