/**
 * RenameFolderModal Component
 * Modal for renaming folders
 */

import { FC, useState, useEffect } from 'react'
import { XMarkIcon, PencilIcon, ShieldCheckIcon } from '@heroicons/react/24/outline'
import type { Folder, ConfidentialityLevel } from '@/types/folder'

const CONFIDENTIALITY_OPTIONS: { value: ConfidentialityLevel; label: string; color: string }[] = [
  { value: 'public', label: 'Public', color: 'text-gray-600 bg-gray-100 dark:bg-gray-700' },
  { value: 'internal', label: 'Internal', color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30' },
  { value: 'confidential', label: 'Confidential', color: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30' },
  { value: 'highly_confidential', label: 'Highly Confidential', color: 'text-red-600 bg-red-100 dark:bg-red-900/30' },
]

export interface RenameFolderModalProps {
  isOpen: boolean
  folder: Folder | null
  onClose: () => void
  onRename: (folderId: string, newName: string, confidentiality?: ConfidentialityLevel) => Promise<void>
  existingFolderNames?: string[]
}

export const RenameFolderModal: FC<RenameFolderModalProps> = ({
  isOpen,
  folder,
  onClose,
  onRename,
  existingFolderNames = [],
}) => {
  const [folderName, setFolderName] = useState('')
  const [confidentiality, setConfidentiality] = useState<ConfidentialityLevel>('internal')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen && folder) {
      setFolderName(folder.name)
      setConfidentiality(folder.confidentiality)
      setError(null)
    }
  }, [isOpen, folder])

  // Validate folder name
  const validateFolderName = (name: string): string | null => {
    if (!name.trim()) {
      return 'Folder name is required'
    }

    if (name.length > 255) {
      return 'Folder name must be less than 255 characters'
    }

    // Check for invalid characters
    const invalidChars = /[<>:"/\\|?*]/
    if (invalidChars.test(name)) {
      return 'Folder name contains invalid characters (< > : " / \\ | ? *)'
    }

    // Check if nothing changed
    if (folder && name.trim() === folder.name && confidentiality === folder.confidentiality) {
      return 'Please make a change to save'
    }

    // Check for duplicate names in same parent
    if (existingFolderNames.includes(name.trim())) {
      return 'A folder with this name already exists in this location'
    }

    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!folder) return

    const validationError = validateFolderName(folderName)
    if (validationError) {
      setError(validationError)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Pass confidentiality only if it changed
      const newConfidentiality = confidentiality !== folder.confidentiality ? confidentiality : undefined
      await onRename(folder.id, folderName.trim(), newConfidentiality)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update folder')
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rename-folder-title"
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
              id="rename-folder-title"
              className="text-lg font-semibold text-gray-900 dark:text-gray-100"
            >
              Edit Folder
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
            {/* Current path */}
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Location:{' '}
              <span className="font-medium text-gray-900 dark:text-gray-100">{folder.path}</span>
            </div>

            {/* Folder name input */}
            <div>
              <label
                htmlFor="folder-name"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                New Folder Name <span className="text-red-500">*</span>
              </label>
              <input
                id="folder-name"
                type="text"
                value={folderName}
                onChange={(e) => {
                  setFolderName(e.target.value)
                  setError(null)
                }}
                disabled={isLoading}
                placeholder="Enter new folder name"
                className={`
                  w-full px-3 py-2 border rounded-lg
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
              {error && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>}
            </div>

            {/* Confidentiality level */}
            <div>
              <label
                htmlFor="confidentiality"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                <div className="flex items-center gap-2">
                  <ShieldCheckIcon className="w-4 h-4" />
                  Confidentiality Level
                </div>
              </label>
              <select
                id="confidentiality"
                value={confidentiality}
                onChange={(e) => setConfidentiality(e.target.value as ConfidentialityLevel)}
                disabled={isLoading || folder?.isLocked}
                className={`
                  w-full px-3 py-2 border rounded-lg
                  bg-white dark:bg-gray-900
                  text-gray-900 dark:text-gray-100
                  focus:outline-none focus:ring-2 focus:ring-primary-500
                  disabled:opacity-50 disabled:cursor-not-allowed
                  border-gray-300 dark:border-gray-600
                `}
              >
                {CONFIDENTIALITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                This affects who can access the folder and its contents
              </p>
            </div>

            {/* Locked folder warning */}
            {folder.isLocked && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-800 dark:text-red-200">
                  This folder is locked and cannot be modified.
                </p>
              </div>
            )}

            {/* Subfolder impact notice */}
            {folder.childrenCount > 0 && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  This folder contains <strong>{folder.childrenCount}</strong> subfolder
                  {folder.childrenCount === 1 ? '' : 's'}. Renaming will update the path for all
                  subfolders and documents.
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
              disabled={isLoading || !folderName.trim() || folder.isLocked}
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
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
