/**
 * FolderContextMenu Component
 * Right-click context menu for folder operations
 */

import { FC, useEffect, useRef } from 'react'
import {
  FolderPlusIcon,
  PencilIcon,
  ArrowRightIcon,
  TrashIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline'
import type { Folder, FolderOperation } from '@/types/folder'

export interface FolderContextMenuProps {
  folder: Folder
  position: { x: number; y: number }
  onAction: (operation: FolderOperation) => void
  onClose: () => void
}

interface ContextMenuItemProps {
  label: string
  icon?: React.ReactNode
  onClick: () => void
  disabled?: boolean
  danger?: boolean
  shortcut?: string
}

const ContextMenuItem: FC<ContextMenuItemProps> = ({
  label,
  icon,
  onClick,
  disabled = false,
  danger = false,
  shortcut,
}) => {
  return (
    <button
      className={`
        w-full px-3 py-2 text-left text-sm flex items-center gap-3
        transition-colors
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}
        ${danger && !disabled ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'}
      `}
      onClick={onClick}
      disabled={disabled}
      role="menuitem"
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
    >
      {icon && <span className="w-5 h-5 flex-shrink-0">{icon}</span>}
      <span className="flex-1">{label}</span>
      {shortcut && (
        <span className="text-xs text-gray-500 dark:text-gray-400">{shortcut}</span>
      )}
    </button>
  )
}

const ContextMenuDivider: FC = () => (
  <div className="h-px bg-gray-200 dark:bg-gray-700 my-1" role="separator" />
)

export const FolderContextMenu: FC<FolderContextMenuProps> = ({
  folder,
  position,
  onAction,
  onClose,
}) => {
  const menuRef = useRef<HTMLDivElement>(null)

  // Calculate permissions
  const canDelete = folder.permissions.canDelete && !folder.isLocked
  const canEdit = folder.permissions.canEdit && !folder.isLocked
  const canManage = folder.permissions.canManage

  // Adjust position to prevent overflow
  useEffect(() => {
    if (menuRef.current) {
      const menu = menuRef.current
      const menuRect = menu.getBoundingClientRect()
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight

      let adjustedX = position.x
      let adjustedY = position.y

      // Prevent overflow on right edge
      if (position.x + menuRect.width > viewportWidth) {
        adjustedX = viewportWidth - menuRect.width - 10
      }

      // Prevent overflow on bottom edge
      if (position.y + menuRect.height > viewportHeight) {
        adjustedY = viewportHeight - menuRect.height - 10
      }

      menu.style.left = `${adjustedX}px`
      menu.style.top = `${adjustedY}px`
    }
  }, [position])

  // Keyboard navigation within menu
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        const menuItems = menuRef.current?.querySelectorAll('button[role="menuitem"]:not([disabled])')
        if (!menuItems || menuItems.length === 0) return

        const currentIndex = Array.from(menuItems).findIndex(
          (item) => item === document.activeElement
        )

        let nextIndex = currentIndex
        if (e.key === 'ArrowDown') {
          nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % menuItems.length
        } else {
          nextIndex = currentIndex === -1 ? menuItems.length - 1 : (currentIndex - 1 + menuItems.length) % menuItems.length
        }

        ;(menuItems[nextIndex] as HTMLElement).focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // Focus first menu item on mount
  useEffect(() => {
    const firstMenuItem = menuRef.current?.querySelector('button[role="menuitem"]:not([disabled])') as HTMLElement
    firstMenuItem?.focus()
  }, [])

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 min-w-[200px]"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
      onClick={(e) => e.stopPropagation()}
      role="menu"
      aria-label="Folder context menu"
    >
      {/* Create subfolder */}
      <ContextMenuItem
        label="New Folder"
        icon={<FolderPlusIcon className="w-5 h-5" />}
        onClick={() => onAction('create')}
        disabled={!canManage}
        shortcut="Ctrl+N"
      />

      <ContextMenuDivider />

      {/* Rename */}
      <ContextMenuItem
        label="Rename"
        icon={<PencilIcon className="w-5 h-5" />}
        onClick={() => onAction('rename')}
        disabled={!canEdit}
        shortcut="F2"
      />

      {/* Move */}
      <ContextMenuItem
        label="Move"
        icon={<ArrowRightIcon className="w-5 h-5" />}
        onClick={() => onAction('move')}
        disabled={!canEdit}
        shortcut="Ctrl+X"
      />

      <ContextMenuDivider />

      {/* Properties */}
      <ContextMenuItem
        label="Properties"
        icon={<InformationCircleIcon className="w-5 h-5" />}
        onClick={() => onAction('properties')}
      />

      <ContextMenuDivider />

      {/* Delete */}
      <ContextMenuItem
        label="Delete"
        icon={<TrashIcon className="w-5 h-5" />}
        onClick={() => onAction('delete')}
        disabled={!canDelete}
        danger
        shortcut="Del"
      />

      {/* Locked folder indicator */}
      {folder.isLocked && (
        <>
          <ContextMenuDivider />
          <div className="px-3 py-2 text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            <span>Folder is locked</span>
          </div>
        </>
      )}
    </div>
  )
}
