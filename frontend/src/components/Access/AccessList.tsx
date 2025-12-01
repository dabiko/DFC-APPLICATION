/**
 * AccessList Component
 * Displays a list of users/groups with access to a resource
 */

import { FC } from 'react'
import {
  UserIcon,
  UserGroupIcon,
  ShieldCheckIcon,
  PencilIcon,
  EyeIcon,
  CogIcon,
  ShareIcon,
} from '@heroicons/react/24/outline'
import { cn } from '@utils/cn'
import { formatDistanceToNow } from 'date-fns'

export interface AccessEntry {
  id: string
  userId?: string
  userName: string
  userEmail?: string
  userAvatar?: string
  type: 'user' | 'group' | 'public'
  permission: 'view' | 'edit' | 'manage' | 'owner'
  grantedAt: string
  grantedBy?: string
  expiresAt?: string
}

export interface AccessListProps {
  /** List of access entries */
  accessList: AccessEntry[]
  /** Loading state */
  isLoading?: boolean
  /** Can manage access */
  canManage?: boolean
  /** Callback when share button clicked */
  onShare?: () => void
  /** Callback when remove access clicked */
  onRemoveAccess?: (entry: AccessEntry) => void
  /** Callback when change permission clicked */
  onChangePermission?: (entry: AccessEntry, newPermission: AccessEntry['permission']) => void
  /** Custom class name */
  className?: string
}

const getPermissionLabel = (permission: AccessEntry['permission']) => {
  switch (permission) {
    case 'owner':
      return 'Owner'
    case 'manage':
      return 'Manager'
    case 'edit':
      return 'Editor'
    case 'view':
    default:
      return 'Viewer'
  }
}

const getPermissionColor = (permission: AccessEntry['permission']) => {
  switch (permission) {
    case 'owner':
      return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
    case 'manage':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
    case 'edit':
      return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
    case 'view':
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
  }
}

const formatDate = (dateString: string) => {
  try {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true })
  } catch {
    return dateString
  }
}

export const AccessList: FC<AccessListProps> = ({
  accessList,
  isLoading = false,
  canManage = false,
  onShare,
  onRemoveAccess,
  onChangePermission,
  className,
}) => {
  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center py-12', className)}>
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Loading access list...</p>
        </div>
      </div>
    )
  }

  if (accessList.length === 0) {
    return (
      <div
        className={cn(
          'text-center py-12 bg-gray-50 dark:bg-gray-900 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700',
          className
        )}
      >
        <UserGroupIcon className="w-12 h-12 mx-auto text-gray-400 mb-3" />
        <p className="text-gray-600 dark:text-gray-400">No access permissions set</p>
        <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
          Only you have access to this item
        </p>
        {onShare && canManage && (
          <button
            onClick={onShare}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
          >
            <ShareIcon className="w-4 h-4" />
            Share this item
          </button>
        )}
      </div>
    )
  }

  // Group by permission level
  const groupedAccess = {
    owner: accessList.filter((a) => a.permission === 'owner'),
    manage: accessList.filter((a) => a.permission === 'manage'),
    edit: accessList.filter((a) => a.permission === 'edit'),
    view: accessList.filter((a) => a.permission === 'view'),
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {accessList.length} {accessList.length === 1 ? 'person has' : 'people have'} access
        </p>
        {onShare && canManage && (
          <button
            onClick={onShare}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
          >
            <ShareIcon className="w-4 h-4" />
            Share
          </button>
        )}
      </div>

      {/* Access List */}
      <div className="space-y-4">
        {/* Owners */}
        {groupedAccess.owner.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
              Owners
            </h4>
            <div className="space-y-2">
              {groupedAccess.owner.map((entry) => (
                <AccessEntryRow
                  key={entry.id}
                  entry={entry}
                  canManage={canManage}
                  onRemove={onRemoveAccess}
                  onChangePermission={onChangePermission}
                />
              ))}
            </div>
          </div>
        )}

        {/* Managers */}
        {groupedAccess.manage.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
              Managers
            </h4>
            <div className="space-y-2">
              {groupedAccess.manage.map((entry) => (
                <AccessEntryRow
                  key={entry.id}
                  entry={entry}
                  canManage={canManage}
                  onRemove={onRemoveAccess}
                  onChangePermission={onChangePermission}
                />
              ))}
            </div>
          </div>
        )}

        {/* Editors */}
        {groupedAccess.edit.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
              Editors
            </h4>
            <div className="space-y-2">
              {groupedAccess.edit.map((entry) => (
                <AccessEntryRow
                  key={entry.id}
                  entry={entry}
                  canManage={canManage}
                  onRemove={onRemoveAccess}
                  onChangePermission={onChangePermission}
                />
              ))}
            </div>
          </div>
        )}

        {/* Viewers */}
        {groupedAccess.view.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
              Viewers
            </h4>
            <div className="space-y-2">
              {groupedAccess.view.map((entry) => (
                <AccessEntryRow
                  key={entry.id}
                  entry={entry}
                  canManage={canManage}
                  onRemove={onRemoveAccess}
                  onChangePermission={onChangePermission}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

interface AccessEntryRowProps {
  entry: AccessEntry
  canManage: boolean
  onRemove?: (entry: AccessEntry) => void
  onChangePermission?: (entry: AccessEntry, newPermission: AccessEntry['permission']) => void
}

// Render icon based on type
const TypeIconRenderer: FC<{ type: AccessEntry['type']; className?: string }> = ({
  type,
  className,
}) => {
  switch (type) {
    case 'group':
      return <UserGroupIcon className={className} />
    case 'public':
      return <ShareIcon className={className} />
    case 'user':
    default:
      return <UserIcon className={className} />
  }
}

// Render icon based on permission
const PermissionIconRenderer: FC<{ permission: AccessEntry['permission']; className?: string }> = ({
  permission,
  className,
}) => {
  switch (permission) {
    case 'owner':
      return <ShieldCheckIcon className={className} />
    case 'manage':
      return <CogIcon className={className} />
    case 'edit':
      return <PencilIcon className={className} />
    case 'view':
    default:
      return <EyeIcon className={className} />
  }
}

const AccessEntryRow: FC<AccessEntryRowProps> = ({ entry, canManage, onRemove }) => {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        {/* Avatar */}
        <div className="flex-shrink-0">
          {entry.userAvatar ? (
            <img
              src={entry.userAvatar}
              alt={entry.userName}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
              {entry.type === 'user' ? (
                <span className="text-sm font-semibold text-primary-700 dark:text-primary-300">
                  {getInitials(entry.userName)}
                </span>
              ) : (
                <TypeIconRenderer
                  type={entry.type}
                  className="w-5 h-5 text-primary-600 dark:text-primary-400"
                />
              )}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
            {entry.userName}
          </p>
          {entry.userEmail && (
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{entry.userEmail}</p>
          )}
          {entry.grantedBy && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              Added by {entry.grantedBy} {formatDate(entry.grantedAt)}
            </p>
          )}
        </div>
      </div>

      {/* Permission badge & actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <span
          className={cn(
            'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium',
            getPermissionColor(entry.permission)
          )}
        >
          <PermissionIconRenderer permission={entry.permission} className="w-3 h-3" />
          {getPermissionLabel(entry.permission)}
        </span>

        {canManage && entry.permission !== 'owner' && onRemove && (
          <button
            onClick={() => onRemove(entry)}
            className="p-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400 rounded transition-colors"
            title="Remove access"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}

export default AccessList
