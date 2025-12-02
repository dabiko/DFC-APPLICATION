/**
 * FolderContextMenu Component
 * Right-click context menu for folder operations
 * Integrated with RBAC permission system
 */

import { FC, useEffect, useRef } from 'react'
import {
  FolderPlusIcon,
  PencilIcon,
  ArrowRightIcon,
  TrashIcon,
  InformationCircleIcon,
  ShareIcon,
  LockClosedIcon,
  LockOpenIcon,
  StarIcon,
} from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'
import type { Folder, FolderOperation } from '@/types/folder'
import { useFolderPermission } from '@/hooks/usePermission'
import { usePermissions } from '@/contexts/PermissionContext'

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
      {shortcut && <span className="text-xs text-gray-500 dark:text-gray-400">{shortcut}</span>}
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

  // Get RBAC permissions for this folder
  const { isAdmin } = usePermissions()
  const folderResource = {
    id: folder.id,
    owner_id: folder.ownerId,
  }
  const rbacPermissions = useFolderPermission(folderResource)

  // Combine static permissions with RBAC permissions
  // Admin always has full access, owner always has full access (checked in hook)
  const effectivePermissions = {
    canView: isAdmin || rbacPermissions.canView || folder.permissions.canView,
    canEdit: isAdmin || rbacPermissions.canEdit || folder.permissions.canEdit,
    canDelete: isAdmin || rbacPermissions.canDelete || folder.permissions.canDelete,
    canShare: isAdmin || rbacPermissions.canShare || folder.permissions.canManage,
    canUpload: isAdmin || rbacPermissions.canUpload || folder.permissions.canEdit,
    canManagePermissions:
      isAdmin || rbacPermissions.canManagePermissions || folder.permissions.canManage,
  }

  // Calculate final permissions (also check if folder is locked)
  const canDelete = effectivePermissions.canDelete && !folder.isLocked
  const canEdit = effectivePermissions.canEdit && !folder.isLocked
  const canManage = effectivePermissions.canManagePermissions

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

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
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

      {/* Share */}
      <ContextMenuItem
        label="Share"
        icon={<ShareIcon className="w-5 h-5" />}
        onClick={() => onAction('share')}
        disabled={!canManage}
      />

      {/* Add to Favorites */}
      <ContextMenuItem
        label={folder.isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
        icon={
          folder.isFavorite ? (
            <StarIconSolid className="w-5 h-5 text-yellow-500" />
          ) : (
            <StarIcon className="w-5 h-5" />
          )
        }
        onClick={() => onAction('favorite')}
      />

      <ContextMenuDivider />

      {/* Lock/Unlock */}
      {folder.isLocked ? (
        <ContextMenuItem
          label="Unlock Folder"
          icon={<LockOpenIcon className="w-5 h-5" />}
          onClick={() => onAction('unlock')}
          disabled={!canManage}
        />
      ) : (
        <ContextMenuItem
          label="Lock Folder"
          icon={<LockClosedIcon className="w-5 h-5" />}
          onClick={() => onAction('lock')}
          disabled={!canManage}
        />
      )}

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
    </div>
  )
}
