/**
 * DeleteDocumentModal Component
 * Modal for deleting documents and shortcuts with confirmation
 * Includes permission checks and legal hold protection
 */

import { FC, useState, useEffect } from 'react'
import { XMarkIcon, TrashIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import type { FileListItem } from '@/types/fileManagement'

export interface DeleteDocumentModalProps {
  isOpen: boolean
  item: FileListItem | null
  onClose: () => void
  onDelete: (documentId: string, isShortcut: boolean) => Promise<void>
}

export const DeleteDocumentModal: FC<DeleteDocumentModalProps> = ({
  isOpen,
  item,
  onClose,
  onDelete,
}) => {
  const [confirmationText, setConfirmationText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setConfirmationText('')
      setError(null)
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!item) return

    // Validate confirmation for non-shortcut documents
    if (!item.isShortcut && confirmationText !== item.name) {
      setError('Document name does not match. Please type the exact name to confirm.')
      return
    }

    // Check permissions
    if (!item.permissions?.canDelete) {
      setError('You do not have permission to delete this document')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      await onDelete(item.id, item.isShortcut || false)
      onClose()
    } catch (err: any) {
      // Check for legal hold error from backend
      const errorMessage =
        err?.response?.data?.detail || err?.message || 'Failed to delete document'
      if (errorMessage.includes('legal hold')) {
        setError(errorMessage)
      } else {
        setError(errorMessage)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      onClose()
    }
  }

  if (!isOpen || !item) return null

  const isShortcut = item.isShortcut || false
  const isConfirmationValid = isShortcut || confirmationText === item.name

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-document-title"
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
              <TrashIcon className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <h2
              id="delete-document-title"
              className="text-lg font-semibold text-gray-900 dark:text-gray-100"
            >
              {isShortcut ? 'Remove Shortcut' : 'Delete Document'}
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
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-4 space-y-4">
            {/* Warning */}
            <div
              className={`p-4 border rounded-lg ${
                isShortcut
                  ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                  : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
              }`}
            >
              <div className="flex gap-3">
                <ExclamationTriangleIcon
                  className={`w-6 h-6 flex-shrink-0 ${
                    isShortcut
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-yellow-600 dark:text-yellow-400'
                  }`}
                />
                <div className="flex-1">
                  <h3
                    className={`font-semibold mb-1 ${
                      isShortcut
                        ? 'text-blue-800 dark:text-blue-200'
                        : 'text-yellow-800 dark:text-yellow-200'
                    }`}
                  >
                    {isShortcut ? 'Remove Shortcut' : 'Move to Trash'}
                  </h3>
                  <p
                    className={`text-sm ${
                      isShortcut
                        ? 'text-blue-700 dark:text-blue-300'
                        : 'text-yellow-700 dark:text-yellow-300'
                    }`}
                  >
                    {isShortcut
                      ? 'This will only remove the shortcut. The original document will not be affected.'
                      : 'This document will be moved to trash. You can restore it later from the trash.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Document details */}
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-600 dark:text-gray-400">
                  {isShortcut ? 'Shortcut' : 'Document'}:{' '}
                </span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{item.name}</span>
              </div>
              {isShortcut && item.originalFolderName && (
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Original location: </span>
                  <span className="text-gray-900 dark:text-gray-100">
                    {item.originalFolderName}
                  </span>
                </div>
              )}
              {item.fileSize && (
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Size: </span>
                  <span className="text-gray-900 dark:text-gray-100">
                    {(item.fileSize / 1024 / 1024).toFixed(2)} MB
                  </span>
                </div>
              )}
            </div>

            {/* Confirmation input - only for non-shortcuts */}
            {!isShortcut && (
              <div>
                <label
                  htmlFor="confirmation"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Type{' '}
                  <span className="font-mono font-semibold text-red-600 dark:text-red-400">
                    {item.name}
                  </span>{' '}
                  to confirm
                </label>
                <input
                  id="confirmation"
                  type="text"
                  value={confirmationText}
                  onChange={(e) => {
                    setConfirmationText(e.target.value)
                    setError(null)
                  }}
                  disabled={isLoading}
                  placeholder="Type document name here"
                  className={`
                    w-full px-3 py-2 border rounded-lg
                    bg-white dark:bg-gray-900
                    text-gray-900 dark:text-gray-100
                    placeholder-gray-400 dark:placeholder-gray-500
                    focus:outline-none focus:ring-2 focus:ring-red-500
                    disabled:opacity-50 disabled:cursor-not-allowed
                    ${error ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}
                  `}
                  autoFocus
                />
              </div>
            )}

            {/* Error message */}
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
              </div>
            )}

            {/* Permission warning */}
            {!item.permissions?.canDelete && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-800 dark:text-red-200">
                  You do not have permission to delete this {isShortcut ? 'shortcut' : 'document'}.
                </p>
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
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !isConfirmationValid || !item.permissions?.canDelete}
              className={`
                px-4 py-2 text-sm font-medium
                text-white rounded-lg transition-colors
                disabled:opacity-50 disabled:cursor-not-allowed
                flex items-center gap-2
                ${isShortcut ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-600 hover:bg-red-700'}
              `}
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
                  {isShortcut ? 'Removing...' : 'Moving to Trash...'}
                </>
              ) : (
                <>
                  <TrashIcon className="w-4 h-4" />
                  {isShortcut ? 'Remove Shortcut' : 'Move to Trash'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
