/**
 * DepartmentBreadcrumbs Component
 * Breadcrumb navigation that includes department context
 */

import { useMemo } from 'react'
import { ChevronRight, Building2, Folder, Home } from 'lucide-react'
import { useAppSelector } from '@/store'
import { selectSelectedDepartment } from '@/store/slices/departmentSlice'
import { selectSelectedFolder, selectFolders } from '@/store/slices/folderSlice'
import { useEncodedNavigation } from '@/hooks/useEncodedNavigation'
import type { Department } from '@/types/department'
import type { Folder as FolderType } from '@/types/folder'
import { cn } from '@/utils/cn'

interface BreadcrumbItem {
  id: string
  label: string
  type: 'home' | 'department' | 'folder'
  onClick?: () => void
  isClickable: boolean
}

interface DepartmentBreadcrumbsProps {
  className?: string
  showHomeIcon?: boolean
  maxItems?: number
  department?: Department | null
  folder?: FolderType | null
  onDepartmentClick?: (department: Department) => void
  onFolderClick?: (folder: FolderType) => void
  onHomeClick?: () => void
}

export function DepartmentBreadcrumbs({
  className,
  showHomeIcon = true,
  maxItems = 5,
  department: propDepartment,
  folder: propFolder,
  onDepartmentClick,
  onFolderClick,
  onHomeClick,
}: DepartmentBreadcrumbsProps) {
  const { navigateToDashboard, navigateToDepartment, navigateToFolder } = useEncodedNavigation()

  // Redux state
  const selectedDepartment = useAppSelector(selectSelectedDepartment)
  const selectedFolder = useAppSelector(selectSelectedFolder)
  const folders = useAppSelector(selectFolders)

  // Use props or Redux state
  const department = propDepartment ?? selectedDepartment
  const folder = propFolder ?? selectedFolder

  // Build folder path from selected folder to root
  const folderPath = useMemo(() => {
    if (!folder) return []

    const path: FolderType[] = []
    let current: FolderType | undefined = folder

    while (current) {
      path.unshift(current)
      if (current.parentId) {
        current = folders.find((f) => f.id === current!.parentId)
      } else {
        break
      }
    }

    return path
  }, [folder, folders])

  // Build breadcrumb items
  const breadcrumbItems = useMemo(() => {
    const items: BreadcrumbItem[] = []

    // Home item
    items.push({
      id: 'home',
      label: 'Home',
      type: 'home',
      onClick: onHomeClick || (() => navigateToDashboard()),
      isClickable: true,
    })

    // Department item
    if (department) {
      items.push({
        id: `dept-${department.id}`,
        label: department.name,
        type: 'department',
        onClick: onDepartmentClick
          ? () => onDepartmentClick(department)
          : () => navigateToDepartment(department.id),
        isClickable: true,
      })
    }

    // Folder items
    folderPath.forEach((f, index) => {
      items.push({
        id: f.id,
        label: f.name,
        type: 'folder',
        onClick: onFolderClick
          ? () => onFolderClick(f)
          : () => navigateToFolder(f.id, f.departmentId),
        // Last item is current folder, not clickable
        isClickable: index < folderPath.length - 1,
      })
    })

    return items
  }, [
    department,
    folderPath,
    navigateToDashboard,
    navigateToDepartment,
    navigateToFolder,
    onDepartmentClick,
    onFolderClick,
    onHomeClick,
  ])

  // Apply max items collapsing
  const displayItems = useMemo(() => {
    if (breadcrumbItems.length <= maxItems) {
      return breadcrumbItems
    }

    // Keep first item (home), second item (department if exists), and last 2 items
    const firstItems = breadcrumbItems.slice(0, 2)
    const lastItems = breadcrumbItems.slice(-2)
    const hasCollapsedItems = breadcrumbItems.length > maxItems

    // Create ellipsis item
    const ellipsisItem: BreadcrumbItem = {
      id: 'ellipsis',
      label: '...',
      type: 'folder',
      isClickable: false,
    }

    if (hasCollapsedItems) {
      return [...firstItems, ellipsisItem, ...lastItems]
    }

    return breadcrumbItems
  }, [breadcrumbItems, maxItems])

  // Get icon for breadcrumb type
  const getIcon = (type: BreadcrumbItem['type']) => {
    switch (type) {
      case 'home':
        return showHomeIcon ? <Home className="w-4 h-4" /> : null
      case 'department':
        return <Building2 className="w-4 h-4" />
      case 'folder':
        return <Folder className="w-4 h-4" />
      default:
        return null
    }
  }

  if (displayItems.length === 0) {
    return null
  }

  return (
    <nav
      aria-label="Breadcrumb navigation"
      className={cn('flex items-center flex-wrap gap-1', className)}
    >
      <ol className="flex items-center flex-wrap gap-1">
        {displayItems.map((item, index) => (
          <li key={item.id} className="flex items-center">
            {/* Separator */}
            {index > 0 && <ChevronRight className="w-4 h-4 text-gray-400 mx-1 flex-shrink-0" />}

            {/* Breadcrumb Item */}
            {item.isClickable ? (
              <button
                onClick={item.onClick}
                className={cn(
                  'flex items-center gap-1.5 px-2 py-1 rounded-md text-sm transition-colors',
                  'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100',
                  'hover:bg-gray-100 dark:hover:bg-gray-800',
                  item.type === 'department' && 'text-blue-600 dark:text-blue-400'
                )}
              >
                {getIcon(item.type)}
                <span className="max-w-[150px] truncate">{item.label}</span>
              </button>
            ) : (
              <span
                className={cn(
                  'flex items-center gap-1.5 px-2 py-1 text-sm',
                  item.id === 'ellipsis'
                    ? 'text-gray-400 dark:text-gray-500'
                    : 'text-gray-900 dark:text-gray-100 font-medium'
                )}
                aria-current={index === displayItems.length - 1 ? 'page' : undefined}
              >
                {item.id !== 'ellipsis' && getIcon(item.type)}
                <span className="max-w-[200px] truncate">{item.label}</span>
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}

export default DepartmentBreadcrumbs
