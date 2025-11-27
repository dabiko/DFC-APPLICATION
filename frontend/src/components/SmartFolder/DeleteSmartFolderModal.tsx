/**
 * DeleteSmartFolderModal Component
 * Confirmation modal for deleting smart folders
 */

import { FC, useState, useEffect } from 'react'
import { X, Trash2, AlertTriangle, Loader2 } from 'lucide-react'
import { cn } from '@/utils/cn'
import { deleteSmartFolder, type SmartFolder } from '@/services/smartFolderService'
import { toast } from '@/utils/toast'

export interface DeleteSmartFolderModalProps {
  isOpen: boolean
  smartFolder: SmartFolder | null
  onClose: () => void
  onDeleted: () => void
}

export const DeleteSmartFolderModal: FC<DeleteSmartFolderModalProps> = ({
  isOpen,
  smartFolder,
  onClose,
  onDeleted,
}) => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setError(null)
      setIsLoading(false)
    }
  }, [isOpen])

  const handleDelete = async () => {
    if (!smartFolder) return

    setIsLoading(true)
    setError(null)

    try {
      await deleteSmartFolder(smartFolder.id)
      toast.success(`Smart folder "${smartFolder.name}" deleted`)
      onDeleted()
      onClose()
    } catch (err) {
      console.error('Failed to delete smart folder:', err)
      setError('Failed to delete smart folder. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      onClose()
    }
  }

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen, isLoading, onClose])

  if (!isOpen || !smartFolder) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-smart-folder-title"
      onClick={handleClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
              <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <h2
              id="delete-smart-folder-title"
              className="text-lg font-semibold text-gray-900 dark:text-gray-100"
            >
              Delete Smart Folder
            </h2>
          </div>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-4">
          {/* Warning */}
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <div className="flex gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  Are you sure you want to delete this smart folder? This action cannot be undone.
                </p>
              </div>
            </div>
          </div>

          {/* Smart folder details */}
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">Name:</span>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {smartFolder.name}
              </span>
            </div>
            {smartFolder.description && (
              <div className="flex items-start gap-2">
                <span className="text-sm text-gray-500 dark:text-gray-400">Description:</span>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {smartFolder.description}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">Documents:</span>
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {smartFolder.document_count} matching
              </span>
            </div>
          </div>

          {/* Info note */}
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Note: Deleting this smart folder will not delete any documents. It only removes the
            saved search criteria.
          </p>

          {/* Error message */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 dark:bg-gray-800/50 rounded-b-lg border-t border-gray-200 dark:border-gray-800">
          <button
            type="button"
            onClick={handleClose}
            disabled={isLoading}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
              'text-gray-700 dark:text-gray-300',
              'hover:bg-gray-100 dark:hover:bg-gray-700',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isLoading}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
              'bg-red-600 hover:bg-red-700 text-white',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'flex items-center gap-2'
            )}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                Delete
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default DeleteSmartFolderModal
