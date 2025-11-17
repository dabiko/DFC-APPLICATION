/**
 * AccessControlList Component
 * Manage access control entries for documents and folders
 */

import { FC } from 'react'
import {
  UserIcon,
  BuildingOfficeIcon,
  ShieldCheckIcon,
  TrashIcon,
  PencilIcon,
  PlusIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'
import { cn } from '@utils/cn'
import type { AccessControlListProps, AccessControlEntry } from '@/types/rbac'
import { PermissionBadge } from './PermissionBadge'
import { formatDistanceToNow } from 'date-fns'

export const AccessControlList: FC<AccessControlListProps> = ({
  acl,
  onEntryAdd,
  onEntryModify: _onEntryModify,
  onEntryRemove,
  onInheritanceToggle,
  canManagePermissions,
  showInherited = true,
  className,
}) => {
  // Future: Implement inline permission editing
  // const [editingEntryId, setEditingEntryId] = useState<string | null>(null)

  const getSubjectIcon = (entry: AccessControlEntry) => {
    switch (entry.subjectType) {
      case 'user':
        return <UserIcon className="w-4 h-4" />
      case 'department':
        return <BuildingOfficeIcon className="w-4 h-4" />
      case 'role':
        return <ShieldCheckIcon className="w-4 h-4" />
      default:
        return null
    }
  }

  const getSubjectTypeLabel = (type: string) => {
    switch (type) {
      case 'user':
        return 'User'
      case 'department':
        return 'Department'
      case 'role':
        return 'Role'
      default:
        return type
    }
  }

  // Separate inherited and direct entries
  const directEntries = acl.entries.filter((e) => !e.inherited)
  const inheritedEntries = acl.entries.filter((e) => e.inherited)

  return (
    <div
      className={cn(
        'bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700',
        className
      )}
    >
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Access Control
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {acl.resourceName} • {acl.entries.length} access{' '}
              {acl.entries.length === 1 ? 'entry' : 'entries'}
            </p>
          </div>

          {canManagePermissions && (
            <button
              onClick={() =>
                onEntryAdd({
                  resourceId: acl.resourceId,
                  resourceType: acl.resourceType,
                  subjectType: 'user',
                  subjectId: '',
                  accessLevel: 'read',
                })
              }
              className="flex items-center gap-2 px-3 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <PlusIcon className="w-4 h-4" />
              Add Permission
            </button>
          )}
        </div>

        {/* Inheritance Toggle */}
        {onInheritanceToggle && acl.parentFolderId && (
          <div className="mt-4 flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={acl.inheritanceEnabled}
                onChange={(e) => onInheritanceToggle(e.target.checked)}
                disabled={!canManagePermissions}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Inherit permissions from parent folder
              </span>
            </label>
          </div>
        )}
      </div>

      {/* Direct Entries */}
      <div>
        {directEntries.length > 0 && (
          <div className="p-4 bg-gray-50 dark:bg-gray-800/50">
            <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Direct Permissions ({directEntries.length})
            </h4>
          </div>
        )}

        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {directEntries.map((entry) => (
            <div
              key={entry.id}
              className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                {/* Subject Info */}
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="flex-shrink-0 mt-1 text-gray-400">{getSubjectIcon(entry)}</div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {entry.subjectName}
                      </h4>
                      <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs rounded">
                        {getSubjectTypeLabel(entry.subjectType)}
                      </span>
                    </div>

                    {/* Access Level */}
                    <div className="mt-2">
                      <PermissionBadge
                        permission={entry.accessLevel}
                        variant="access-level"
                        size="sm"
                      />
                    </div>

                    {/* Permissions */}
                    <div className="mt-2 flex flex-wrap gap-1">
                      {entry.permissions.slice(0, 3).map((perm) => (
                        <PermissionBadge key={perm} permission={perm} size="sm" />
                      ))}
                      {entry.permissions.length > 3 && (
                        <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs rounded">
                          +{entry.permissions.length - 3} more
                        </span>
                      )}
                    </div>

                    {/* Metadata */}
                    <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      <span>
                        Granted by {entry.grantedBy} •{' '}
                        {formatDistanceToNow(new Date(entry.grantedAt), { addSuffix: true })}
                      </span>
                      {entry.expiresAt && (
                        <span>
                          {' '}
                          • Expires{' '}
                          {formatDistanceToNow(new Date(entry.expiresAt), { addSuffix: true })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                {canManagePermissions && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingEntryId(entry.id)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                      title="Edit permissions"
                    >
                      <PencilIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Remove access for ${entry.subjectName}?`)) {
                          onEntryRemove(entry.id)
                        }
                      }}
                      className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                      title="Remove access"
                    >
                      <TrashIcon className="w-4 h-4 text-red-600 dark:text-red-400" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {directEntries.length === 0 && (
            <div className="p-8 text-center">
              <ShieldCheckIcon className="w-12 h-12 mx-auto text-gray-400 mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">No direct permissions set</p>
              {canManagePermissions && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Click "Add Permission" to grant access
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Inherited Entries */}
      {showInherited && inheritedEntries.length > 0 && (
        <div className="border-t border-gray-200 dark:border-gray-700">
          <div className="p-4 bg-gray-50 dark:bg-gray-800/50">
            <div className="flex items-center gap-2">
              <ArrowPathIcon className="w-4 h-4 text-gray-400" />
              <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Inherited Permissions ({inheritedEntries.length})
              </h4>
            </div>
          </div>

          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {inheritedEntries.map((entry) => (
              <div key={entry.id} className="p-4 bg-gray-50/50 dark:bg-gray-800/20 opacity-75">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1 text-gray-400">{getSubjectIcon(entry)}</div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {entry.subjectName}
                      </h4>
                      <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs rounded">
                        {getSubjectTypeLabel(entry.subjectType)}
                      </span>
                      {entry.inheritedFrom && (
                        <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded">
                          From parent folder
                        </span>
                      )}
                    </div>

                    <div className="mt-2">
                      <PermissionBadge
                        permission={entry.accessLevel}
                        variant="access-level"
                        size="sm"
                      />
                    </div>

                    <div className="mt-2 flex flex-wrap gap-1">
                      {entry.permissions.slice(0, 3).map((perm) => (
                        <PermissionBadge key={perm} permission={perm} size="sm" />
                      ))}
                      {entry.permissions.length > 3 && (
                        <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs rounded">
                          +{entry.permissions.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
