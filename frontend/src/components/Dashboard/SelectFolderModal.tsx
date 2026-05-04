/**
 * SelectFolderModal
 *
 * Step 2 of the dashboard quick-action wizard.
 *  - Upload Document: a folder must be picked (required).
 *  - New Folder: a folder may be picked to create a subfolder, or left
 *    unselected to create at the department root (allowRoot=true).
 *
 * Folder tree rendering follows the same pattern as MoveDocumentModal so the
 * UX feels familiar to anyone who has used folder operations elsewhere.
 */

import { FC, useEffect, useMemo, useState } from 'react'
import {
  XMarkIcon,
  FolderIcon,
  ChevronRightIcon,
  ArrowLeftIcon,
  BuildingOffice2Icon,
} from '@heroicons/react/24/outline'
import { useAppDispatch, useAppSelector } from '@/store'
import { fetchFolders, selectFolders } from '@/store/slices/folderSlice'
import { buildFolderTree } from '@/utils/folderTree'
import type { Folder } from '@/types/folder'
import type { Department } from '@/types/department'

export interface SelectFolderModalProps {
  isOpen: boolean
  department: Department | null
  onClose: () => void
  onBack?: () => void
  /**
   * Called with the chosen folder, or `null` when the user picked the
   * department root (only possible when `allowRoot` is true).
   */
  onSelect: (folder: Folder | null) => void
  /**
   * When true, an extra "Department root" option appears at the top of the
   * tree and is the default selection. Use this for the New Folder flow,
   * where creating at the department root is valid.
   */
  allowRoot?: boolean
  /** Label for the confirm button */
  confirmLabel?: string
  /** Title shown in the modal header */
  title?: string
  /** Helper text shown above the folder tree */
  description?: string
}

/** Sentinel used internally to represent "department root" in selection state. */
const ROOT_TOKEN = '__root__'

export const SelectFolderModal: FC<SelectFolderModalProps> = ({
  isOpen,
  department,
  onClose,
  onBack,
  onSelect,
  allowRoot = false,
  confirmLabel = 'Continue',
  title = 'Choose a folder',
  description = 'Pick the folder where this document should live.',
}) => {
  const dispatch = useAppDispatch()
  const allFolders = useAppSelector(selectFolders)
  // null = nothing picked, ROOT_TOKEN = department root, otherwise = folder.id
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(
    allowRoot ? ROOT_TOKEN : null
  )
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  // Fetch folders when opened with a department
  useEffect(() => {
    if (isOpen && department) {
      dispatch(fetchFolders({}))
    }
  }, [isOpen, department, dispatch])

  // Reset selection when modal closes or department changes. This is a
  // legitimate prop-to-state sync (sentinel reset on close); the general
  // lint guidance doesn't apply.
  useEffect(() => {
    if (!isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedFolderId(allowRoot ? ROOT_TOKEN : null)

      setExpandedIds(new Set())
    }
  }, [isOpen, department?.id, allowRoot])

  // Filter folders to the selected department only
  const departmentFolders = useMemo(() => {
    if (!department) return []
    const deptId = String(department.id)
    return allFolders.filter((f) => f.departmentId != null && String(f.departmentId) === deptId)
  }, [allFolders, department])

  // Only show editable folders (where the user can add documents)
  const editableFolders = useMemo(
    () => departmentFolders.filter((f) => f.permissions?.canEdit !== false),
    [departmentFolders]
  )

  const folderTree = useMemo(() => buildFolderTree(editableFolders), [editableFolders])

  const selectedFolder = useMemo(
    () => editableFolders.find((f) => f.id === selectedFolderId) || null,
    [editableFolders, selectedFolderId]
  )

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const renderTree = (nodes: Folder[], depth = 0): JSX.Element[] =>
    nodes.flatMap((f) => {
      const isExpanded = expandedIds.has(f.id)
      const isSelected = selectedFolderId === f.id
      const hasChildren = !!(f.children && f.children.length > 0)

      const row = (
        <button
          key={f.id}
          type="button"
          onClick={() => setSelectedFolderId(f.id)}
          className={`
            w-full flex items-center gap-2 px-3 py-2 text-left text-sm rounded transition-colors
            ${isSelected ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'}
          `}
          style={{ paddingLeft: `${depth * 20 + 12}px` }}
        >
          {hasChildren ? (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation()
                toggleExpand(f.id)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  e.stopPropagation()
                  toggleExpand(f.id)
                }
              }}
              className="flex-shrink-0 cursor-pointer"
            >
              <ChevronRightIcon
                className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
              />
            </span>
          ) : (
            <span className="w-4" />
          )}
          <FolderIcon className="w-5 h-5 flex-shrink-0" />
          <span className="flex-1 truncate">{f.name}</span>
          {f.documentCount > 0 && (
            <span className="text-xs text-gray-400 flex-shrink-0">{f.documentCount}</span>
          )}
        </button>
      )

      if (isExpanded && hasChildren && f.children) {
        return [row, ...renderTree(f.children, depth + 1)]
      }
      return [row]
    })

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="select-folder-title"
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <FolderIcon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            <h2
              id="select-folder-title"
              className="text-lg font-semibold text-gray-900 dark:text-gray-100"
            >
              {title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label="Close modal"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden flex flex-col px-6 py-4">
          {/* Department context */}
          {department && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg mb-3">
              <BuildingOffice2Icon className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
              <div className="text-sm">
                <span className="text-gray-600 dark:text-gray-400">Department: </span>
                <span className="font-medium text-blue-700 dark:text-blue-300">
                  {department.name}
                </span>
                {department.code && (
                  <span className="text-gray-500 dark:text-gray-500 ml-1">({department.code})</span>
                )}
              </div>
            </div>
          )}

          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{description}</p>

          {/* Folder tree */}
          <div className="flex-1 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-2">
            {/* Department root option — only for flows where it is valid (e.g. New Folder) */}
            {allowRoot && department && (
              <button
                type="button"
                onClick={() => setSelectedFolderId(ROOT_TOKEN)}
                className={`
                  w-full flex items-center gap-2 px-3 py-2 mb-1 text-left text-sm rounded transition-colors
                  ${selectedFolderId === ROOT_TOKEN ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'}
                `}
              >
                <BuildingOffice2Icon className="w-5 h-5 flex-shrink-0" />
                <span className="flex-1 truncate">
                  Department root
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                    (top level of {department.name})
                  </span>
                </span>
                {selectedFolderId === ROOT_TOKEN && (
                  <svg
                    className="w-5 h-5 text-primary-600 dark:text-primary-400 flex-shrink-0"
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

            {editableFolders.length === 0 ? (
              allowRoot ? (
                <div className="text-center py-6 text-xs text-gray-500 dark:text-gray-400">
                  No subfolders yet — the new folder will be created at the department root.
                </div>
              ) : (
                <div className="text-center py-8 text-sm text-gray-500 dark:text-gray-400">
                  This department has no folders you can write to yet. Create a folder first.
                </div>
              )
            ) : (
              <div className="space-y-1">{renderTree(folderTree)}</div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 bg-gray-50 dark:bg-gray-900 rounded-b-lg border-t border-gray-200 dark:border-gray-700">
          <div>
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <ArrowLeftIcon className="w-4 h-4" />
                Back
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={selectedFolderId === null}
              onClick={() => {
                if (selectedFolderId === null) return
                if (selectedFolderId === ROOT_TOKEN) {
                  onSelect(null)
                } else if (selectedFolder) {
                  onSelect(selectedFolder)
                }
              }}
              className="px-4 py-2 text-sm font-medium bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
