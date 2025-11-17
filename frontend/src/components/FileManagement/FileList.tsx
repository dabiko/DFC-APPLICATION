/**
 * FileList Component
 * Displays a list of files and folders in grid or list view
 */

import { FC, useState, useEffect } from 'react'
import { cn } from '@utils/cn'
import type { FileListProps, FileListItem } from '@/types/fileManagement'
import { FileCard } from './FileCard'

export const FileList: FC<FileListProps> = ({
  items,
  viewMode = 'grid',
  sortBy = 'name',
  sortOrder = 'asc',
  selectedIds = new Set(),
  onItemClick,
  onItemDoubleClick,
  onSelectionChange,
  onSortChange,
  onViewModeChange,
  isLoading = false,
  emptyState,
  className,
}) => {
  const [localSelectedIds, setLocalSelectedIds] = useState<Set<string>>(selectedIds)

  // Sync local selection with external selection
  useEffect(() => {
    setLocalSelectedIds(selectedIds)
  }, [selectedIds])

  // Handle item selection
  const handleItemSelect = (itemId: string, selected: boolean) => {
    const newSelection = new Set(localSelectedIds)
    if (selected) {
      newSelection.add(itemId)
    } else {
      newSelection.delete(itemId)
    }
    setLocalSelectedIds(newSelection)
    if (onSelectionChange) {
      onSelectionChange(newSelection)
    }
  }

  // Handle item click
  const handleItemClick = (item: FileListItem) => {
    if (onItemClick) {
      onItemClick(item)
    }
  }

  // Handle item double click
  const handleItemDoubleClick = (item: FileListItem) => {
    if (onItemDoubleClick) {
      onItemDoubleClick(item)
    }
  }

  // Handle favorite toggle
  const handleFavoriteToggle = (itemId: string) => {
    // This would typically call an API to toggle favorite status
    console.log('Toggle favorite:', itemId)
  }

  // Sort items
  const sortedItems = [...items].sort((a, b) => {
    let comparison = 0

    switch (sortBy) {
      case 'name':
        comparison = a.name.localeCompare(b.name)
        break
      case 'type':
        comparison = a.type.localeCompare(b.type)
        break
      case 'size':
        comparison = (a.fileSize || 0) - (b.fileSize || 0)
        break
      case 'dateModified':
        comparison = new Date(a.modifiedAt).getTime() - new Date(b.modifiedAt).getTime()
        break
      case 'dateCreated':
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        break
      case 'confidentiality':
        const levels = ['Public', 'Internal', 'Confidential', 'Highly Confidential']
        comparison = levels.indexOf(a.confidentialityLevel) - levels.indexOf(b.confidentialityLevel)
        break
      default:
        comparison = 0
    }

    // Folders first, then files
    if (a.type !== b.type) {
      return a.type === 'folder' ? -1 : 1
    }

    return sortOrder === 'asc' ? comparison : -comparison
  })

  // Loading state
  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center min-h-[400px]', className)}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-600 dark:text-gray-400">Loading files...</p>
        </div>
      </div>
    )
  }

  // Empty state
  if (sortedItems.length === 0) {
    return (
      <div className={cn('flex items-center justify-center min-h-[400px]', className)}>
        {emptyState || (
          <div className="text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                vectorEffect="non-scaling-stroke"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-gray-100">No files</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Get started by uploading a file or creating a folder.
            </p>
          </div>
        )}
      </div>
    )
  }

  // Grid view
  if (viewMode === 'grid') {
    return (
      <div
        className={cn(
          'grid gap-4',
          'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6',
          className
        )}
      >
        {sortedItems.map((item) => (
          <FileCard
            key={item.id}
            item={item}
            viewMode="grid"
            isSelected={localSelectedIds.has(item.id)}
            onClick={() => handleItemClick(item)}
            onDoubleClick={() => handleItemDoubleClick(item)}
            onSelect={(selected) => handleItemSelect(item.id, selected)}
            onFavoriteToggle={() => handleFavoriteToggle(item.id)}
            showCheckbox={localSelectedIds.size > 0 || onSelectionChange !== undefined}
            showActions={true}
          />
        ))}
      </div>
    )
  }

  // List view
  return (
    <div className={cn('space-y-1', className)}>
      {/* List header */}
      <div className="hidden lg:flex items-center gap-3 px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
        <div className="w-4" /> {/* Checkbox space */}
        <div className="w-10" /> {/* Icon space */}
        <div className="flex-1">Name</div>
        <div className="w-32">Type</div>
        <div className="w-24">Size</div>
        <div className="w-32">Modified</div>
        <div className="w-8" /> {/* Favorite space */}
      </div>

      {/* List items */}
      {sortedItems.map((item) => (
        <FileCard
          key={item.id}
          item={item}
          viewMode="list"
          isSelected={localSelectedIds.has(item.id)}
          onClick={() => handleItemClick(item)}
          onDoubleClick={() => handleItemDoubleClick(item)}
          onSelect={(selected) => handleItemSelect(item.id, selected)}
          onFavoriteToggle={() => handleFavoriteToggle(item.id)}
          showCheckbox={localSelectedIds.size > 0 || onSelectionChange !== undefined}
          showActions={true}
        />
      ))}
    </div>
  )
}
