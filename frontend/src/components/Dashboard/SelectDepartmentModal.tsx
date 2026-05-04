/**
 * SelectDepartmentModal
 *
 * Step 1 of the dashboard "New Folder" / "Upload Document" wizard.
 * Lets the user pick a department they have access to before proceeding,
 * because folders must live inside a department.
 */

import { FC, useEffect, useMemo, useState } from 'react'
import {
  XMarkIcon,
  BuildingOffice2Icon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline'
import { useAppDispatch, useAppSelector } from '@/store'
import { fetchNavigation, selectNavigation } from '@/store/slices/departmentSlice'
import type { Department, DepartmentNavigationItem } from '@/types/department'

export interface SelectDepartmentModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (department: Department) => void
  /** Title shown in the modal header */
  title?: string
  /** Helper text shown above the list */
  description?: string
}

export const SelectDepartmentModal: FC<SelectDepartmentModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  title = 'Choose a department',
  description = 'Folders must live inside a department. Pick one to continue.',
}) => {
  const dispatch = useAppDispatch()
  const navigation = useAppSelector(selectNavigation)
  const [searchQuery, setSearchQuery] = useState('')

  // Fetch navigation on open if empty
  useEffect(() => {
    if (isOpen && navigation.length === 0) {
      dispatch(fetchNavigation())
    }
  }, [isOpen, navigation.length, dispatch])

  // (Search query intentionally persists across reopens — clearing on close
  // would require setState-in-effect, and persisting is acceptable UX.)

  // Only show departments the user can access
  const accessibleItems = useMemo(() => navigation.filter((n) => n.isAccessible), [navigation])

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return accessibleItems
    const q = searchQuery.toLowerCase()
    return accessibleItems.filter(
      (n) =>
        n.department.name.toLowerCase().includes(q) || n.department.code?.toLowerCase().includes(q)
    )
  }, [accessibleItems, searchQuery])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="select-department-title"
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <BuildingOffice2Icon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            <h2
              id="select-department-title"
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
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{description}</p>

          {/* Search */}
          {accessibleItems.length > 5 && (
            <div className="relative mb-3">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search departments..."
                className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                autoFocus
              />
            </div>
          )}

          {/* Department list */}
          <div className="flex-1 overflow-y-auto -mx-2">
            {accessibleItems.length === 0 ? (
              <div className="text-center py-8 text-sm text-gray-500 dark:text-gray-400">
                You do not have access to any departments yet. Ask an administrator for access.
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="text-center py-8 text-sm text-gray-500 dark:text-gray-400">
                No departments match "{searchQuery}".
              </div>
            ) : (
              <ul className="space-y-1">
                {filteredItems.map((item) => (
                  <DepartmentRow key={item.department.id} item={item} onSelect={onSelect} />
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 dark:bg-gray-900 rounded-b-lg border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

interface DepartmentRowProps {
  item: DepartmentNavigationItem
  onSelect: (department: Department) => void
}

const DepartmentRow: FC<DepartmentRowProps> = ({ item, onSelect }) => {
  const { department, accessType, grantedRole } = item
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(department)}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
      >
        <BuildingOffice2Icon className="w-5 h-5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
              {department.name}
            </span>
            {department.code && (
              <span className="text-xs text-gray-500 dark:text-gray-400">({department.code})</span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {accessType === 'own' && <span>Your department</span>}
            {accessType === 'admin' && <span>Admin access</span>}
            {accessType === 'granted' && grantedRole && <span>{grantedRole} access</span>}
            {typeof department.folderCount === 'number' && (
              <span>
                · {department.folderCount} folder{department.folderCount === 1 ? '' : 's'}
              </span>
            )}
          </div>
        </div>
        <ChevronRightIcon className="w-5 h-5 flex-shrink-0 text-gray-400" />
      </button>
    </li>
  )
}
