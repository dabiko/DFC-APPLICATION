/**
 * RolePermissionsEditor Component
 * Edit permissions for a role
 */

import { FC, useState, useMemo } from 'react'
import { ShieldCheckIcon, CheckIcon } from '@heroicons/react/24/outline'
import { cn } from '@utils/cn'
import type { RolePermissionsEditorProps, Permission } from '@/types/rbac'
import { PERMISSION_CATEGORIES } from '@/types/rbac'

export const RolePermissionsEditor: FC<RolePermissionsEditorProps> = ({
  role,
  availablePermissions,
  onPermissionsChange,
  onRoleUpdate: _onRoleUpdate,
  canEditRole,
  isSystemRole,
  className,
}) => {
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(
    new Set(role.permissions)
  )
  const [hasChanges, setHasChanges] = useState(false)

  // Group permissions by category
  const groupedPermissions = useMemo(() => {
    const groups: Record<string, Permission[]> = {}

    availablePermissions.forEach((perm) => {
      if (!groups[perm.category]) {
        groups[perm.category] = []
      }
      groups[perm.category].push(perm)
    })

    return groups
  }, [availablePermissions])

  const handlePermissionToggle = (permissionType: string) => {
    if (!canEditRole || isSystemRole) return

    const newPermissions = new Set(selectedPermissions)
    if (newPermissions.has(permissionType)) {
      newPermissions.delete(permissionType)
    } else {
      newPermissions.add(permissionType)
    }

    setSelectedPermissions(newPermissions)
    setHasChanges(true)
  }

  const handleSave = () => {
    onPermissionsChange(role.id, Array.from(selectedPermissions))
    setHasChanges(false)
  }

  const handleReset = () => {
    setSelectedPermissions(new Set(role.permissions))
    setHasChanges(false)
  }

  const handleSelectAll = (category: string) => {
    if (!canEditRole || isSystemRole) return

    const newPermissions = new Set(selectedPermissions)
    groupedPermissions[category].forEach((perm) => {
      newPermissions.add(perm.type)
    })
    setSelectedPermissions(newPermissions)
    setHasChanges(true)
  }

  const handleDeselectAll = (category: string) => {
    if (!canEditRole || isSystemRole) return

    const newPermissions = new Set(selectedPermissions)
    groupedPermissions[category].forEach((perm) => {
      newPermissions.delete(perm.type)
    })
    setSelectedPermissions(newPermissions)
    setHasChanges(true)
  }

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
            <div className="flex items-center gap-2">
              <ShieldCheckIcon className="w-5 h-5 text-gray-400" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {role.displayName} Permissions
              </h2>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{role.description}</p>
            {isSystemRole && (
              <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2">
                System roles cannot be modified
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm rounded-full">
              {selectedPermissions.size} permissions
            </span>
          </div>
        </div>
      </div>

      {/* Permission Groups */}
      <div className="p-6 space-y-6">
        {Object.entries(PERMISSION_CATEGORIES).map(([category, categoryInfo]) => {
          const permissions = groupedPermissions[category]
          if (!permissions || permissions.length === 0) return null

          const allSelected = permissions.every((p) => selectedPermissions.has(p.type))
          const someSelected = permissions.some((p) => selectedPermissions.has(p.type))

          return (
            <div key={category}>
              {/* Category Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{categoryInfo.icon}</span>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {categoryInfo.label}
                  </h3>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    ({permissions.filter((p) => selectedPermissions.has(p.type)).length} of{' '}
                    {permissions.length})
                  </span>
                </div>

                {canEditRole && !isSystemRole && (
                  <div className="flex gap-2">
                    {!allSelected && (
                      <button
                        onClick={() => handleSelectAll(category)}
                        className="text-xs text-primary-600 dark:text-primary-400 hover:underline"
                      >
                        Select all
                      </button>
                    )}
                    {someSelected && (
                      <button
                        onClick={() => handleDeselectAll(category)}
                        className="text-xs text-gray-600 dark:text-gray-400 hover:underline"
                      >
                        Deselect all
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Permission Checkboxes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {permissions.map((permission) => {
                  const isSelected = selectedPermissions.has(permission.type)
                  const isRestricted =
                    permission.restrictedTo && !permission.restrictedTo.includes(role.name as never)

                  return (
                    <label
                      key={permission.type}
                      className={cn(
                        'flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer',
                        isSelected
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600',
                        (!canEditRole || isSystemRole || isRestricted) &&
                          'cursor-not-allowed opacity-60'
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handlePermissionToggle(permission.type)}
                        disabled={!canEditRole || isSystemRole || isRestricted}
                        className="mt-0.5 rounded border-gray-300 text-primary-600 focus:ring-primary-500 disabled:opacity-50"
                      />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {permission.label}
                          </p>
                          {permission.requiresApproval && (
                            <span className="px-1.5 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-xs rounded">
                              Requires Approval
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {permission.description}
                        </p>
                        {isRestricted && (
                          <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                            Only available for: {permission.restrictedTo?.join(', ')}
                          </p>
                        )}
                      </div>

                      {isSelected && (
                        <CheckIcon className="w-5 h-5 text-primary-600 dark:text-primary-400 flex-shrink-0" />
                      )}
                    </label>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer with Save/Cancel */}
      {hasChanges && canEditRole && !isSystemRole && (
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
          >
            Save Changes
          </button>
        </div>
      )}
    </div>
  )
}
