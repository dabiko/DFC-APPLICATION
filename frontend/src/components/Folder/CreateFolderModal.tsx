/**
 * CreateFolderModal Component
 * Modal for creating new folders
 */

import { type FC, useState, useEffect } from 'react'
import { XMarkIcon, FolderPlusIcon, RectangleStackIcon } from '@heroicons/react/24/outline'
import { FolderTemplateSelector } from './FolderTemplateSelector'
import type { Folder, CreateFolderData, ConfidentialityLevel } from '@/types/folder'
import type { FolderTemplate } from '@/types/folderTemplate'

export interface CreateFolderModalProps {
  isOpen: boolean
  parentFolder: Folder | null
  onClose: () => void
  onCreate: (data: CreateFolderData) => Promise<void>
  existingFolderNames?: string[]
}

export const CreateFolderModal: FC<CreateFolderModalProps> = ({
  isOpen,
  parentFolder,
  onClose,
  onCreate,
  existingFolderNames = [],
}) => {
  const [folderName, setFolderName] = useState('')
  const [confidentiality, setConfidentiality] = useState<ConfidentialityLevel>('internal')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showTemplateSelector, setShowTemplateSelector] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<FolderTemplate | null>(null)

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFolderName('')
      setConfidentiality(parentFolder?.confidentiality || 'internal')
      setError(null)
      setSelectedTemplate(null)
    }
  }, [isOpen, parentFolder])

  // Handle template selection
  const handleTemplateSelect = (template: FolderTemplate) => {
    setSelectedTemplate(template)
    setFolderName(template.name)
    setShowTemplateSelector(false)
  }

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

    // Check for duplicate names in same parent
    if (existingFolderNames.includes(name.trim())) {
      return 'A folder with this name already exists in this location'
    }

    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const validationError = validateFolderName(folderName)
    if (validationError) {
      setError(validationError)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      await onCreate({
        name: folderName.trim(),
        parentId: parentFolder?.id || null,
        confidentiality,
        templateId: selectedTemplate?.id,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create folder')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    // Don't close if template selector is open
    if (showTemplateSelector) {
      return
    }

    if (!isLoading) {
      onClose()
    }
  }

  // Handle backdrop click - don't close modal
  const handleBackdropClick = (e: React.MouseEvent) => {
    // Prevent closing on backdrop click
    e.stopPropagation()
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-folder-title"
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <FolderPlusIcon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            <h2
              id="create-folder-title"
              className="text-lg font-semibold text-gray-900 dark:text-gray-100"
            >
              Create New Folder
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
            {/* Parent folder display */}
            {parentFolder && (
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Creating folder in:{' '}
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {parentFolder.path}
                </span>
              </div>
            )}

            {/* Template Button */}
            <div>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setShowTemplateSelector(true)
                }}
                disabled={isLoading}
                className="
                  w-full px-4 py-2 border-2 border-dashed border-gray-300 dark:border-gray-600
                  rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300
                  hover:border-primary-500 hover:text-primary-600 dark:hover:text-primary-400
                  transition-colors flex items-center justify-center gap-2
                  disabled:opacity-50 disabled:cursor-not-allowed
                "
              >
                <RectangleStackIcon className="w-5 h-5" />
                {selectedTemplate
                  ? `Using Template: ${selectedTemplate.name}`
                  : 'Use Template (Optional)'}
              </button>
              {selectedTemplate && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {selectedTemplate.description}
                </p>
              )}
            </div>

            {/* Folder name input */}
            <div>
              <label
                htmlFor="folder-name"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Folder Name <span className="text-red-500">*</span>
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
                placeholder="Enter folder name"
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
              />
              {error && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>}
            </div>

            {/* Confidentiality level */}
            <div>
              <label
                htmlFor="confidentiality"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Confidentiality Level <span className="text-red-500">*</span>
              </label>
              <select
                id="confidentiality"
                value={confidentiality}
                onChange={(e) => setConfidentiality(e.target.value as ConfidentialityLevel)}
                disabled={isLoading}
                className="
                  w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                  bg-white dark:bg-gray-900
                  text-gray-900 dark:text-gray-100
                  focus:outline-none focus:ring-2 focus:ring-primary-500
                  disabled:opacity-50 disabled:cursor-not-allowed
                "
              >
                <option value="public">Public</option>
                <option value="internal">Internal</option>
                <option value="confidential">Confidential</option>
                <option value="highly_confidential">Highly Confidential</option>
              </select>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                This determines who can access the folder and its contents
              </p>
            </div>

            {/* Inherited confidentiality notice */}
            {parentFolder && parentFolder.confidentiality !== 'public' && (
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  Parent folder has <strong>{parentFolder.confidentiality}</strong> confidentiality.
                  Child folders cannot have lower confidentiality than their parent.
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
              disabled={isLoading || !folderName.trim()}
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
                  Creating...
                </>
              ) : (
                'Create Folder'
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Template Selector Modal */}
      {showTemplateSelector && (
        <FolderTemplateSelector
          isOpen={showTemplateSelector}
          onClose={() => setShowTemplateSelector(false)}
          onSelectTemplate={handleTemplateSelect}
          parentFolderName={parentFolder?.name}
        />
      )}
    </div>
  )
}
