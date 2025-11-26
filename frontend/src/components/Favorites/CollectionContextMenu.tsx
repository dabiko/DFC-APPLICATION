/**
 * CollectionContextMenu Component
 * Right-click context menu for favorite collection operations
 */

import { FC, useEffect, useRef } from 'react'
import {
  PencilIcon,
  TrashIcon,
  ShareIcon,
  UserMinusIcon,
  FolderIcon,
  DocumentDuplicateIcon,
} from '@heroicons/react/24/outline'
import type { FavoriteCollection } from '@/services/favoritesService'

export type CollectionOperation = 'edit' | 'share' | 'unshare' | 'delete' | 'export'

export interface CollectionContextMenuProps {
  collection: FavoriteCollection
  position: { x: number; y: number }
  onAction: (operation: CollectionOperation) => void
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
      {shortcut && <span className="text-xs text-gray-500 dark:text-gray-400">{shortcut}</span>}
    </button>
  )
}

const ContextMenuDivider: FC = () => (
  <div className="h-px bg-gray-200 dark:bg-gray-700 my-1" role="separator" />
)

export const CollectionContextMenu: FC<CollectionContextMenuProps> = ({
  collection,
  position,
  onAction,
  onClose,
}) => {
  const menuRef = useRef<HTMLDivElement>(null)

  // Only owner can edit/delete/share
  const canManage = collection.is_owner

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

  // Close on escape and handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        const menuItems = menuRef.current?.querySelectorAll(
          'button[role="menuitem"]:not([disabled])'
        )
        if (!menuItems || menuItems.length === 0) return

        const currentIndex = Array.from(menuItems).findIndex(
          (item) => item === document.activeElement
        )

        let nextIndex = currentIndex
        if (e.key === 'ArrowDown') {
          nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % menuItems.length
        } else {
          nextIndex =
            currentIndex === -1
              ? menuItems.length - 1
              : (currentIndex - 1 + menuItems.length) % menuItems.length
        }

        ;(menuItems[nextIndex] as HTMLElement).focus()
      }
    }

    // Close on click outside
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [onClose])

  // Focus first menu item on mount
  useEffect(() => {
    const firstMenuItem = menuRef.current?.querySelector(
      'button[role="menuitem"]:not([disabled])'
    ) as HTMLElement
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
      aria-label="Collection context menu"
    >
      {/* Collection info header */}
      <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <FolderIcon className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate max-w-[150px]">
            {collection.name}
          </span>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          {collection.item_count} item{collection.item_count !== 1 ? 's' : ''}
          {collection.is_shared && ' • Shared'}
        </p>
      </div>

      {/* Edit */}
      <ContextMenuItem
        label="Edit Collection"
        icon={<PencilIcon className="w-5 h-5" />}
        onClick={() => {
          onAction('edit')
          onClose()
        }}
        disabled={!canManage}
        shortcut="E"
      />

      {/* Share / Unshare */}
      {collection.is_shared ? (
        <ContextMenuItem
          label="Manage Sharing"
          icon={<ShareIcon className="w-5 h-5" />}
          onClick={() => {
            onAction('share')
            onClose()
          }}
          disabled={!canManage}
        />
      ) : (
        <ContextMenuItem
          label="Share Collection"
          icon={<ShareIcon className="w-5 h-5" />}
          onClick={() => {
            onAction('share')
            onClose()
          }}
          disabled={!canManage}
        />
      )}

      {/* Remove sharing (if shared) */}
      {collection.is_shared && canManage && (
        <ContextMenuItem
          label="Remove All Sharing"
          icon={<UserMinusIcon className="w-5 h-5" />}
          onClick={() => {
            onAction('unshare')
            onClose()
          }}
        />
      )}

      <ContextMenuDivider />

      {/* Export */}
      <ContextMenuItem
        label="Export Collection"
        icon={<DocumentDuplicateIcon className="w-5 h-5" />}
        onClick={() => {
          onAction('export')
          onClose()
        }}
      />

      <ContextMenuDivider />

      {/* Delete */}
      <ContextMenuItem
        label="Delete Collection"
        icon={<TrashIcon className="w-5 h-5" />}
        onClick={() => {
          onAction('delete')
          onClose()
        }}
        disabled={!canManage}
        danger
        shortcut="Del"
      />
    </div>
  )
}

export default CollectionContextMenu
