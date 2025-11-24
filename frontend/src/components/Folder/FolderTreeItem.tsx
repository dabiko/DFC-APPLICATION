/**
 * FolderTreeItem Component
 * Individual folder node in the tree
 */

import { FC, memo, MouseEvent, useState } from 'react'
import {
  ChevronRightIcon,
  ChevronDownIcon,
  FolderIcon,
  FolderOpenIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline'
import { ConfidentialityBadge } from '@components/Badge/ConfidentialityBadge'
import { useSortableFolder } from '@/hooks/useFolderDragDrop'
import type { Folder } from '@/types/folder'

export interface FolderTreeItemProps {
  folder: Folder
  depth: number
  isExpanded: boolean
  isSelected: boolean
  hasChildren: boolean
  onSelect: (folder: Folder) => void
  onToggleExpand: (folderId: string) => void
  onContextMenu?: (event: MouseEvent, folder: Folder) => void
  showIcons?: boolean
  showLockIndicator?: boolean
  showDocumentCount?: boolean
  showConfidentiality?: boolean
  enableDragDrop?: boolean
  isDragOver?: boolean
}

export const FolderTreeItem: FC<FolderTreeItemProps> = memo(
  ({
    folder,
    depth,
    isExpanded,
    isSelected,
    hasChildren,
    onSelect,
    onToggleExpand,
    onContextMenu,
    showIcons = true,
    showLockIndicator = true,
    showDocumentCount = false,
    showConfidentiality = false,
    enableDragDrop = false,
    isDragOver = false,
  }) => {
    const [isHovered, setIsHovered] = useState(false)

    // Drag-and-drop setup
    const {
      attributes,
      listeners,
      setNodeRef,
      style: dragStyle,
      isDragging,
      isOver,
    } = useSortableFolder(folder.id)

    const handleClick = () => {
      onSelect(folder)
    }

    const handleExpandClick = (e: MouseEvent) => {
      e.stopPropagation()
      if (hasChildren) {
        onToggleExpand(folder.id)
      }
    }

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault()
      onContextMenu?.(e, folder)
    }

    // Calculate indent based on depth
    const indentSize = depth * 20 // 20px per level

    // Determine if drag is allowed
    const canDrag = enableDragDrop && folder.permissions.canEdit && !folder.isLocked

    return (
      <div
        ref={enableDragDrop ? setNodeRef : undefined}
        className={`
          flex items-center gap-1 px-2 py-1.5 cursor-pointer select-none
          transition-colors duration-150
          ${isSelected ? 'bg-primary-50 dark:bg-primary-900/20' : ''}
          ${isHovered && !isSelected ? 'bg-gray-100 dark:bg-gray-800' : ''}
          ${folder.isLocked ? 'opacity-75' : ''}
          ${isDragging ? 'opacity-40 cursor-grabbing' : ''}
          ${(isOver || isDragOver) && canDrag ? 'ring-2 ring-primary-500 bg-primary-50 dark:bg-primary-900/30' : ''}
        `}
        style={{
          paddingLeft: `${indentSize + 8}px`,
          ...(enableDragDrop ? dragStyle : {}),
        }}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        role="treeitem"
        aria-expanded={hasChildren ? isExpanded : undefined}
        aria-selected={isSelected}
        aria-level={depth + 1}
        aria-grabbed={isDragging}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            handleClick()
          } else if (e.key === 'ArrowRight' && hasChildren && !isExpanded) {
            e.preventDefault()
            onToggleExpand(folder.id)
          } else if (e.key === 'ArrowLeft' && hasChildren && isExpanded) {
            e.preventDefault()
            onToggleExpand(folder.id)
          }
        }}
        {...(enableDragDrop && canDrag ? { ...attributes, ...listeners } : {})}
      >
        {/* Expand/Collapse Icon */}
        <button
          className={`
            flex-shrink-0 w-5 h-5 flex items-center justify-center
            rounded hover:bg-gray-200 dark:hover:bg-gray-700
            transition-colors
            ${!hasChildren ? 'invisible' : ''}
          `}
          onClick={handleExpandClick}
          aria-label={isExpanded ? 'Collapse folder' : 'Expand folder'}
          tabIndex={-1}
        >
          {hasChildren && (
            <>
              {isExpanded ? (
                <ChevronDownIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              ) : (
                <ChevronRightIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              )}
            </>
          )}
        </button>

        {/* Folder Icon */}
        {showIcons && (
          <div className="flex-shrink-0 w-5 h-5 text-primary-500 dark:text-primary-400">
            {isExpanded ? (
              <FolderOpenIcon className="w-5 h-5" />
            ) : (
              <FolderIcon className="w-5 h-5" />
            )}
          </div>
        )}

        {/* Folder Name */}
        <span
          className={`
            flex-1 truncate text-sm
            ${isSelected ? 'font-medium text-primary-700 dark:text-primary-300' : 'text-gray-900 dark:text-gray-100'}
          `}
          title={folder.name}
        >
          {folder.name}
        </span>

        {/* Document Count Badge */}
        {showDocumentCount && folder.documentCount > 0 && (
          <span
            className="
              flex-shrink-0 px-1.5 py-0.5 text-xs
              bg-gray-200 dark:bg-gray-700
              text-gray-600 dark:text-gray-400
              rounded
            "
            title={`${folder.documentCount} document${folder.documentCount === 1 ? '' : 's'}`}
          >
            {folder.documentCount}
          </span>
        )}

        {/* Confidentiality Badge */}
        {showConfidentiality && (
          <div className="flex-shrink-0">
            <ConfidentialityBadge level={folder.confidentiality} iconOnly />
          </div>
        )}

        {/* Lock Indicator */}
        {showLockIndicator && folder.isLocked && (
          <div className="flex-shrink-0 text-red-500 dark:text-red-400" title="Folder is locked">
            <LockClosedIcon className="w-4 h-4" />
          </div>
        )}
      </div>
    )
  }
)

FolderTreeItem.displayName = 'FolderTreeItem'
