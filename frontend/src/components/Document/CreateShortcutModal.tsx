/**
 * CreateShortcutModal Component
 * Modal for creating document shortcuts in different folders
 */

import { FC, useState, useEffect, useMemo } from 'react'
import {
  XMarkIcon,
  LinkIcon,
  FolderIcon,
  ChevronRightIcon,
  DocumentIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline'
import type { Folder } from '@/types/folder'
import type { FileListItem } from '@/types/fileManagement'
import { buildFolderTree } from '@/utils/folderTree'

export interface CreateShortcutModalProps {
  isOpen: boolean
  item: FileListItem | null
  folders: Folder[]
  currentFolderId: string | null
  onClose: () => void
  onCreateShortcut: (documentId: string, targetFolderId: string) => Promise<void>
}

export const CreateShortcutModal: FC<CreateShortcutModalProps> = ({
  isOpen,
  item,
  folders,
  currentFolderId,
  onClose,
  onCreateShortcut,
}) => {
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Build folder tree
  const folderTree = useMemo(() => buildFolderTree(folders), [folders])

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen && item) {
      setSelectedFolderId(null)
      setExpandedIds(new Set())
      setError(null)
    }
  }, [isOpen, item])

  // Validate shortcut creation
  const validateShortcut = (): string | null => {
    if (!item) return 'No item selected'
    if (!selectedFolderId) return 'Please select a folder'

    // Can't create shortcut in the same folder as the original
    if (selectedFolderId === currentFolderId) {
      return 'Cannot create shortcut in the same folder as the original document'
    }

    // Shortcuts can't be created from other shortcuts
    if (item.isShortcut) {
      return 'Cannot create a shortcut from another shortcut'
    }

    // Check target folder permissions
    const targetFolder = folders.find((f) => f.id === selectedFolderId)
    if (targetFolder && !targetFolder.permissions.canEdit) {
      return 'You do not have permission to create shortcuts in the selected folder'
    }

    return null
  }

  const handleSubmit = async () => {
    if (!item || !selectedFolderId) return

    const validationError = validateShortcut()
    if (validationError) {
      setError(validationError)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      await onCreateShortcut(item.id, selectedFolderId)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create shortcut')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      onClose()
    }
  }

  const toggleExpand = (folderId: string) => {
    setExpandedIds((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(folderId)) {
        newSet.delete(folderId)
      } else {
        newSet.add(folderId)
      }
      return newSet
    })
  }

  // Check if folder can be selected as destination
  const canSelectFolder = (folder: Folder): boolean => {
    if (!item) return false

    // Can't create shortcut in the same folder
    if (folder.id === currentFolderId) return false

    // Check permissions
    if (!folder.permissions.canEdit) return false

    return true
  }

  // Render folder tree
  const renderFolderTree = (folderList: Folder[], depth: number = 0) => {
    return folderList.map((f) => {
      const isExpanded = expandedIds.has(f.id)
      const isSelected = selectedFolderId === f.id
      const isCurrentFolder = f.id === currentFolderId
      const canSelect = canSelectFolder(f)
      const hasChildren = f.children && f.children.length > 0

      return (
        <div key={f.id}>
          <button
            type="button"
            onClick={() => {
              if (canSelect) {
                setSelectedFolderId(f.id)
                setError(null)
              }
            }}
            disabled={!canSelect}
            className={`
              w-full flex items-center gap-2 px-3 py-2 text-left text-sm
              transition-colors rounded
              ${isSelected ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300' : ''}
              ${!isSelected && canSelect ? 'hover:bg-gray-100 dark:hover:bg-gray-700' : ''}
              ${isCurrentFolder ? 'bg-gray-100 dark:bg-gray-700' : ''}
              ${!canSelect && !isCurrentFolder ? 'opacity-40 cursor-not-allowed' : ''}
            `}
            style={{ paddingLeft: `${depth * 20 + 12}px` }}
          >
            {/* Expand/Collapse */}
            {hasChildren && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  toggleExpand(f.id)
                }}
                className="flex-shrink-0"
              >
                <ChevronRightIcon
                  className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                />
              </button>
            )}
            {!hasChildren && <div className="w-4" />}

            {/* Folder Icon */}
            <FolderIcon className="w-5 h-5 flex-shrink-0" />

            {/* Folder Name */}
            <span className="flex-1 truncate">{f.name}</span>

            {/* Current folder indicator */}
            {isCurrentFolder && (
              <span className="text-xs text-gray-500 dark:text-gray-400">(original)</span>
            )}

            {/* Selected indicator */}
            {isSelected && (
              <svg
                className="w-5 h-5 text-primary-600 dark:text-primary-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </button>

          {/* Children */}
          {isExpanded && hasChildren && renderFolderTree(f.children!, depth + 1)}
        </div>
      )
    })
  }

  if (!isOpen || !item) return null

  const validationError = validateShortcut()

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-shortcut-title"
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <LinkIcon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            <h2
              id="create-shortcut-title"
              className="text-lg font-semibold text-gray-900 dark:text-gray-100"
            >
              Create Shortcut
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
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="px-6 py-4 space-y-4">
            {/* Document being linked */}
            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <div className="relative">
                <DocumentIcon className="w-8 h-8 text-gray-400" />
                <ArrowTopRightOnSquareIcon className="w-4 h-4 text-primary-500 absolute -bottom-1 -right-1" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{item.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{item.path || 'Root'}</p>
              </div>
            </div>

            {/* Info message */}
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                A shortcut is a reference to the original document. Changes to the original will be
                reflected in the shortcut.
              </p>
            </div>

            {/* Error message */}
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
              </div>
            )}
          </div>

          {/* Folder tree selector */}
          <div className="flex-1 overflow-y-auto px-6 pb-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Select folder for shortcut:
            </p>
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-2 space-y-1 max-h-[300px] overflow-y-auto">
              {/* Root option - only if not currently at root */}
              {currentFolderId && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFolderId('root')
                    setError(null)
                  }}
                  className={`
                    w-full flex items-center gap-2 px-3 py-2 text-left text-sm
                    transition-colors rounded
                    ${selectedFolderId === 'root' ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}
                  `}
                >
                  <FolderIcon className="w-5 h-5 flex-shrink-0" />
                  <span className="flex-1">Root (Top Level)</span>
                  {selectedFolderId === 'root' && (
                    <svg
                      className="w-5 h-5 text-primary-600 dark:text-primary-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </button>
              )}

              {/* Folder tree */}
              {renderFolderTree(folderTree)}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
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
            type="button"
            onClick={handleSubmit}
            disabled={isLoading || !!validationError || !selectedFolderId}
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
              <>
                <LinkIcon className="w-4 h-4" />
                Create Shortcut
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
