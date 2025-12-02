/**
 * DocumentContextMenu Component
 * Context menu for documents and shortcuts with navigation options
 * Integrated with RBAC permission system
 */

import { FC, useEffect, useRef } from 'react'
import {
  DocumentIcon,
  FolderIcon,
  LinkIcon,
  ArrowDownTrayIcon,
  ShareIcon,
  TrashIcon,
  PencilIcon,
  DocumentDuplicateIcon,
  EyeIcon,
  ArrowRightIcon,
  Cog6ToothIcon,
  StarIcon,
} from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'
import { cn } from '@utils/cn'
import type { FileListItem } from '@/types/fileManagement'
import { useDocumentPermission } from '@/hooks/usePermission'
import { usePermissions } from '@/contexts/PermissionContext'

export type DocumentContextMenuAction =
  | 'preview'
  | 'download'
  | 'share'
  | 'rename'
  | 'edit'
  | 'move'
  | 'delete'
  | 'go-to-original'
  | 'view-shortcut-locations'
  | 'create-shortcut'
  | 'favorite'

interface DocumentContextMenuProps {
  /** The document/file item */
  item: FileListItem
  /** Position to display the menu */
  position: { x: number; y: number }
  /** Callback when an action is selected */
  onAction: (action: DocumentContextMenuAction, item: FileListItem) => void
  /** Callback when menu is closed */
  onClose: () => void
  /** Whether the item has shortcuts (for showing "View Shortcut Locations") */
  hasShortcuts?: boolean
  /** Custom class name */
  className?: string
}

interface MenuItemProps {
  icon: React.ReactNode
  label: string
  onClick: () => void
  variant?: 'default' | 'danger' | 'primary'
  disabled?: boolean
}

const MenuItem: FC<MenuItemProps> = ({
  icon,
  label,
  onClick,
  variant = 'default',
  disabled = false,
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={cn(
      'flex items-center gap-3 w-full px-3 py-2 text-sm text-left transition-colors',
      variant === 'danger'
        ? 'text-error-600 dark:text-error-400 hover:bg-error-50 dark:hover:bg-error-900/20'
        : variant === 'primary'
          ? 'text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20'
          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700',
      disabled && 'opacity-50 cursor-not-allowed'
    )}
  >
    <span className="w-4 h-4 flex-shrink-0">{icon}</span>
    <span>{label}</span>
  </button>
)

const MenuDivider: FC = () => <div className="my-1 border-t border-gray-200 dark:border-gray-700" />

export const DocumentContextMenu: FC<DocumentContextMenuProps> = ({
  item,
  position,
  onAction,
  onClose,
  hasShortcuts = false,
  className,
}) => {
  const menuRef = useRef<HTMLDivElement>(null)
  const isShortcut = item.isShortcut
  const isFolder = item.type === 'folder'

  // Get RBAC permissions for this document
  const { isAdmin } = usePermissions()
  const documentResource = {
    id: isShortcut ? item.originalDocumentId || item.id : item.id,
    owner_id: undefined, // Will be checked by the hook
  }
  const permissions = useDocumentPermission(documentResource)

  // Combine static permissions with RBAC permissions
  // Admin always has full access, owner always has full access (checked in hook)
  const effectivePermissions = {
    canView: isAdmin || permissions.canView || item.permissions?.canView,
    canDownload: isAdmin || permissions.canDownload || item.permissions?.canDownload,
    canEdit: isAdmin || permissions.canEdit || item.permissions?.canEdit,
    canDelete: isAdmin || permissions.canDelete || item.permissions?.canDelete,
    canShare: isAdmin || permissions.canShare || item.permissions?.canShare,
  }

  // Adjust position to stay within viewport
  useEffect(() => {
    if (menuRef.current) {
      const menu = menuRef.current
      const rect = menu.getBoundingClientRect()
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight

      let adjustedX = position.x
      let adjustedY = position.y

      // Adjust horizontal position
      if (position.x + rect.width > viewportWidth - 10) {
        adjustedX = viewportWidth - rect.width - 10
      }

      // Adjust vertical position
      if (position.y + rect.height > viewportHeight - 10) {
        adjustedY = viewportHeight - rect.height - 10
      }

      menu.style.left = `${adjustedX}px`
      menu.style.top = `${adjustedY}px`
    }
  }, [position])

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // Don't render for folders (they have their own context menu)
  if (isFolder) return null

  return (
    <div
      ref={menuRef}
      className={cn(
        'fixed z-50 min-w-[200px] py-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700',
        'animate-in fade-in zoom-in-95 duration-100',
        className
      )}
      style={{ left: position.x, top: position.y }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Document/Shortcut Title */}
      <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          {isShortcut ? (
            <LinkIcon className="w-4 h-4 text-primary-500" />
          ) : (
            <DocumentIcon className="w-4 h-4 text-gray-500" />
          )}
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate max-w-[180px]">
            {item.name}
          </span>
        </div>
        {isShortcut && item.originalFolderName && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
            Shortcut from: {item.originalFolderName}
          </p>
        )}
      </div>

      {/* Navigation Actions - Shortcut specific */}
      {isShortcut && (
        <>
          <MenuItem
            icon={<FolderIcon className="w-4 h-4" />}
            label="Go to Original Location"
            onClick={() => onAction('go-to-original', item)}
            variant="primary"
          />
          <MenuDivider />
        </>
      )}

      {/* Navigation Actions - Original document with shortcuts */}
      {!isShortcut && hasShortcuts && (
        <>
          <MenuItem
            icon={<DocumentDuplicateIcon className="w-4 h-4" />}
            label="View Shortcut Locations"
            onClick={() => onAction('view-shortcut-locations', item)}
            variant="primary"
          />
          <MenuDivider />
        </>
      )}

      {/* Standard Actions */}
      <MenuItem
        icon={<EyeIcon className="w-4 h-4" />}
        label="Preview"
        onClick={() => onAction('preview', item)}
        disabled={!effectivePermissions.canView}
      />
      <MenuItem
        icon={<ArrowDownTrayIcon className="w-4 h-4" />}
        label="Download"
        onClick={() => onAction('download', item)}
        disabled={!effectivePermissions.canDownload}
      />
      <MenuItem
        icon={<ShareIcon className="w-4 h-4" />}
        label="Share"
        onClick={() => onAction('share', item)}
        disabled={!effectivePermissions.canShare}
      />

      {/* Rename option (only for non-shortcuts) */}
      {!isShortcut && (
        <MenuItem
          icon={<PencilIcon className="w-4 h-4" />}
          label="Rename"
          onClick={() => onAction('rename', item)}
          disabled={!effectivePermissions.canEdit}
        />
      )}

      {/* Move option (only for non-shortcuts - shortcuts should be deleted and recreated) */}
      {!isShortcut && (
        <MenuItem
          icon={<ArrowRightIcon className="w-4 h-4" />}
          label="Move to..."
          onClick={() => onAction('move', item)}
          disabled={!effectivePermissions.canEdit}
        />
      )}

      {/* Create Shortcut option (only for non-shortcuts) */}
      {!isShortcut && (
        <MenuItem
          icon={<LinkIcon className="w-4 h-4" />}
          label="Create Shortcut..."
          onClick={() => onAction('create-shortcut', item)}
        />
      )}

      {/* Add to Favorites (only for non-shortcuts) */}
      {!isShortcut && (
        <MenuItem
          icon={
            item.isFavorite ? (
              <StarIconSolid className="w-4 h-4 text-yellow-500" />
            ) : (
              <StarIcon className="w-4 h-4" />
            )
          }
          label={item.isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
          onClick={() => onAction('favorite', item)}
        />
      )}

      <MenuDivider />

      {/* Edit/Delete Actions */}
      <MenuItem
        icon={<Cog6ToothIcon className="w-4 h-4" />}
        label={isShortcut ? 'Edit Original' : 'Edit Metadata'}
        onClick={() => onAction('edit', item)}
        disabled={!effectivePermissions.canEdit}
      />
      <MenuItem
        icon={<TrashIcon className="w-4 h-4" />}
        label={isShortcut ? 'Remove Shortcut' : 'Delete'}
        onClick={() => onAction('delete', item)}
        variant="danger"
        disabled={!effectivePermissions.canDelete}
      />

      {/* Show loading indicator while checking permissions */}
      {permissions.isLoading && (
        <div className="px-3 py-1 text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
          <span className="animate-pulse">Checking permissions...</span>
        </div>
      )}
    </div>
  )
}
