/**
 * RenameDocumentModal Component
 * Modal for renaming document titles
 */

import { FC, useState, useEffect } from 'react'
import { XMarkIcon, PencilIcon, DocumentIcon } from '@heroicons/react/24/outline'
import type { FileListItem } from '@/types/fileManagement'

export interface RenameDocumentModalProps {
  isOpen: boolean
  item: FileListItem | null
  onClose: () => void
  onRename: (documentId: string, newTitle: string) => Promise<void>
}

export const RenameDocumentModal: FC<RenameDocumentModalProps> = ({
  isOpen,
  item,
  onClose,
  onRename,
}) => {
  const [documentTitle, setDocumentTitle] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen && item) {
      // Extract the title without extension for editing
      const nameWithoutExtension = item.name.replace(/\.[^/.]+$/, '')
      setDocumentTitle(nameWithoutExtension)
      setError(null)
    }
  }, [isOpen, item])

  // Get file extension
  const getFileExtension = (): string => {
    if (!item) return ''
    const match = item.name.match(/\.[^/.]+$/)
    return match ? match[0] : ''
  }

  // Validate document title
  const validateTitle = (title: string): string | null => {
    if (!title.trim()) {
      return 'Document title is required'
    }

    if (title.length > 255) {
      return 'Document title must be less than 255 characters'
    }

    // Check for invalid characters
    const invalidChars = /[<>:"/\\|?*]/
    if (invalidChars.test(title)) {
      return 'Document title contains invalid characters (< > : " / \\ | ? *)'
    }

    // Check if name unchanged
    const originalName = item?.name.replace(/\.[^/.]+$/, '') || ''
    if (title.trim() === originalName) {
      return 'Please enter a different title'
    }

    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!item) return

    const validationError = validateTitle(documentTitle)
    if (validationError) {
      setError(validationError)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Add extension back to the new title
      const extension = getFileExtension()
      const newFullTitle = documentTitle.trim() + extension
      await onRename(item.id, newFullTitle)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rename document')
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

  const extension = getFileExtension()

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rename-document-title"
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <PencilIcon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            <h2
              id="rename-document-title"
              className="text-lg font-semibold text-gray-900 dark:text-gray-100"
            >
              Rename Document
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
            {/* Current document info */}
            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <DocumentIcon className="w-8 h-8 text-gray-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-500 dark:text-gray-400">Current name:</p>
                <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{item.name}</p>
              </div>
            </div>

            {/* Document title input */}
            <div>
              <label
                htmlFor="document-title"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                New Title <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center">
                <input
                  id="document-title"
                  type="text"
                  value={documentTitle}
                  onChange={(e) => {
                    setDocumentTitle(e.target.value)
                    setError(null)
                  }}
                  disabled={isLoading}
                  placeholder="Enter new document title"
                  className={`
                    flex-1 px-3 py-2 border rounded-l-lg
                    bg-white dark:bg-gray-900
                    text-gray-900 dark:text-gray-100
                    placeholder-gray-400 dark:placeholder-gray-500
                    focus:outline-none focus:ring-2 focus:ring-primary-500
                    disabled:opacity-50 disabled:cursor-not-allowed
                    ${error ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}
                  `}
                  autoFocus
                  onFocus={(e) => e.target.select()}
                />
                {extension && (
                  <span className="px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-l-0 border-gray-300 dark:border-gray-600 rounded-r-lg text-gray-600 dark:text-gray-400 text-sm">
                    {extension}
                  </span>
                )}
              </div>
              {error && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>}
            </div>

            {/* Shortcut warning */}
            {item.isShortcut && (
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  This is a shortcut. Renaming will change the original document title and affect
                  all shortcuts.
                </p>
              </div>
            )}

            {/* Info about file extension */}
            <div className="text-xs text-gray-500 dark:text-gray-400">
              The file extension ({extension || 'none'}) will be preserved automatically.
            </div>
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
              disabled={isLoading || !documentTitle.trim()}
              className="
                px-4 py-2 text-sm font-medium
                bg-primary-600 hover:bg-primary-700
                text-white rounded-lg transition-colors
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
                  Renaming...
                </>
              ) : (
                'Rename'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
