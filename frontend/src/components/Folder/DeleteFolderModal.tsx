/**
 * DeleteFolderModal Component
 * Modal for deleting folders with confirmation
 */

import { FC, useState, useEffect } from 'react'
import { XMarkIcon, TrashIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import type { Folder } from '@/types/folder'

export interface DeleteFolderModalProps {
  isOpen: boolean
  folder: Folder | null
  onClose: () => void
  onDelete: (folderId: string, force?: boolean) => Promise<void>
}

export const DeleteFolderModal: FC<DeleteFolderModalProps> = ({
  isOpen,
  folder,
  onClose,
  onDelete,
}) => {
  const [confirmationText, setConfirmationText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [forceDelete, setForceDelete] = useState(false)

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setConfirmationText('')
      setError(null)
      setForceDelete(false)
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!folder) return

    // Validate confirmation
    if (confirmationText !== folder.name) {
      setError('Folder name does not match. Please type the exact folder name to confirm.')
      return
    }

    // Check permissions
    if (!folder.permissions.canDelete) {
      setError('You do not have permission to delete this folder')
      return
    }

    if (folder.isLocked && !forceDelete) {
      setError('This folder is locked. Enable "Force Delete" to proceed.')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      await onDelete(folder.id, forceDelete)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete folder')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      onClose()
    }
  }

  if (!isOpen || !folder) return null

  const hasContents = folder.childrenCount > 0 || folder.documentCount > 0
  const isConfirmationValid = confirmationText === folder.name

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-folder-title"
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
              id="delete-folder-title"
              className="text-lg font-semibold text-gray-900 dark:text-gray-100"
            >
              Delete Folder
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
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex gap-3">
                <ExclamationTriangleIcon className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="font-semibold text-red-800 dark:text-red-200 mb-1">
                    This action cannot be undone
                  </h3>
                  <p className="text-sm text-red-700 dark:text-red-300">
                    You are about to permanently delete this folder
                    {hasContents ? ' and all its contents' : ''}. This will remove all data and
                    cannot be recovered.
                  </p>
                </div>
              </div>
            </div>

            {/* Folder details */}
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-600 dark:text-gray-400">Folder: </span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{folder.name}</span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Path: </span>
                <span className="text-gray-900 dark:text-gray-100">{folder.path}</span>
              </div>
              {hasContents && (
                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    This folder contains:
                  </p>
                  <ul className="mt-1 text-sm text-yellow-700 dark:text-yellow-300 list-disc list-inside">
                    {folder.childrenCount > 0 && (
                      <li>
                        <strong>{folder.childrenCount}</strong> subfolder
                        {folder.childrenCount === 1 ? '' : 's'}
                      </li>
                    )}
                    {folder.documentCount > 0 && (
                      <li>
                        <strong>{folder.documentCount}</strong> document
                        {folder.documentCount === 1 ? '' : 's'}
                      </li>
                    )}
                  </ul>
                  <p className="mt-2 text-xs text-yellow-700 dark:text-yellow-300">
                    All contents will be permanently deleted.
                  </p>
                </div>
              )}
            </div>

            {/* Locked folder notice */}
            {folder.isLocked && (
              <div className="p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                <p className="text-sm text-orange-800 dark:text-orange-200">
                  This folder is locked. You must enable "Force Delete" to proceed.
                </p>
              </div>
            )}

            {/* Force delete option */}
            {(folder.isLocked || hasContents) && (
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="force-delete"
                  checked={forceDelete}
                  onChange={(e) => setForceDelete(e.target.checked)}
                  disabled={isLoading}
                  className="mt-1 w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                />
                <label htmlFor="force-delete" className="text-sm text-gray-700 dark:text-gray-300">
                  I understand this will permanently delete the folder and all its contents
                </label>
              </div>
            )}

            {/* Confirmation input */}
            <div>
              <label
                htmlFor="confirmation"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Type{' '}
                <span className="font-mono font-semibold text-red-600 dark:text-red-400">
                  {folder.name}
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
                placeholder="Type folder name here"
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
              {error && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>}
            </div>

            {/* Permission warning */}
            {!folder.permissions.canDelete && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-800 dark:text-red-200">
                  You do not have permission to delete this folder.
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
              disabled={
                isLoading ||
                !isConfirmationValid ||
                !folder.permissions.canDelete ||
                (folder.isLocked && !forceDelete) ||
                (hasContents && !forceDelete)
              }
              className="
                px-4 py-2 text-sm font-medium
                bg-red-600 hover:bg-red-700
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
                  Deleting...
                </>
              ) : (
                <>
                  <TrashIcon className="w-4 h-4" />
                  Delete Folder
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
