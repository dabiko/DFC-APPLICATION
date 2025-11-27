/**
 * CreateRoleModal Component
 *
 * Modal for creating or editing custom roles with permission selection.
 */

import { useState, useEffect } from 'react'
import { X, Shield, Save, Loader2, AlertCircle, CheckCircle, Check } from 'lucide-react'
import {
  createCustomRole,
  updateCustomRole,
  type Role,
  type CreateCustomRoleRequest,
} from '@/services/userManagementService'
import { cn } from '@/utils/cn'

// ============================================================================
// TYPES
// ============================================================================

interface CreateRoleModalProps {
  isOpen: boolean
  role: Role | null // null for create, Role for edit
  onClose: () => void
  onSuccess: () => void
}

// All available permissions in the system
const ALL_PERMISSIONS = [
  // Document permissions
  {
    key: 'view_documents',
    label: 'View Documents',
    category: 'Documents',
    description: 'View document content and metadata',
  },
  {
    key: 'create_documents',
    label: 'Create Documents',
    category: 'Documents',
    description: 'Upload and create new documents',
  },
  {
    key: 'edit_documents',
    label: 'Edit Documents',
    category: 'Documents',
    description: 'Modify document metadata and content',
  },
  {
    key: 'delete_documents',
    label: 'Delete Documents',
    category: 'Documents',
    description: 'Delete documents from the system',
  },
  {
    key: 'download_documents',
    label: 'Download Documents',
    category: 'Documents',
    description: 'Download document files',
  },
  {
    key: 'share_documents',
    label: 'Share Documents',
    category: 'Documents',
    description: 'Share documents with other users',
  },
  // Folder permissions
  {
    key: 'view_folders',
    label: 'View Folders',
    category: 'Folders',
    description: 'View folder structure and contents',
  },
  {
    key: 'create_folders',
    label: 'Create Folders',
    category: 'Folders',
    description: 'Create new folders',
  },
  {
    key: 'edit_folders',
    label: 'Edit Folders',
    category: 'Folders',
    description: 'Rename and modify folders',
  },
  {
    key: 'delete_folders',
    label: 'Delete Folders',
    category: 'Folders',
    description: 'Delete folders and their contents',
  },
  {
    key: 'manage_folder_permissions',
    label: 'Manage Folder Permissions',
    category: 'Folders',
    description: 'Set access permissions on folders',
  },
  // User permissions
  {
    key: 'view_users',
    label: 'View Users',
    category: 'Users',
    description: 'View user profiles and lists',
  },
  {
    key: 'invite_users',
    label: 'Invite Users',
    category: 'Users',
    description: 'Send invitations to new users',
  },
  {
    key: 'edit_users',
    label: 'Edit Users',
    category: 'Users',
    description: 'Modify user profiles and settings',
  },
  {
    key: 'delete_users',
    label: 'Delete Users',
    category: 'Users',
    description: 'Remove users from the system',
  },
  {
    key: 'manage_roles',
    label: 'Manage Roles',
    category: 'Users',
    description: 'Create and modify custom roles',
  },
  // Admin permissions
  {
    key: 'view_audit_logs',
    label: 'View Audit Logs',
    category: 'Administration',
    description: 'View system audit trail',
  },
  {
    key: 'manage_departments',
    label: 'Manage Departments',
    category: 'Administration',
    description: 'Create and modify departments',
  },
  {
    key: 'manage_settings',
    label: 'Manage Settings',
    category: 'Administration',
    description: 'Modify system settings',
  },
  {
    key: 'manage_security',
    label: 'Manage Security',
    category: 'Administration',
    description: 'Configure security options',
  },
]

// Group permissions by category
const PERMISSION_CATEGORIES = ALL_PERMISSIONS.reduce(
  (acc, perm) => {
    if (!acc[perm.category]) {
      acc[perm.category] = []
    }
    acc[perm.category].push(perm)
    return acc
  },
  {} as Record<string, typeof ALL_PERMISSIONS>
)

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function CreateRoleModal({ isOpen, role, onClose, onSuccess }: CreateRoleModalProps) {
  const isEditing = !!role

  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set())

  // Loading states
  const [isLoading, setIsLoading] = useState(false)

  // Error state
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Populate form when editing
  useEffect(() => {
    if (role && isOpen) {
      setName(role.name)
      setDescription(role.description || '')
      setSelectedPermissions(new Set(role.permissions || []))
    } else if (!role && isOpen) {
      setName('')
      setDescription('')
      setSelectedPermissions(new Set())
    }
    setError(null)
    setSuccess(false)
  }, [role, isOpen])

  const handleTogglePermission = (permKey: string) => {
    setSelectedPermissions((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(permKey)) {
        newSet.delete(permKey)
      } else {
        newSet.add(permKey)
      }
      return newSet
    })
  }

  const handleToggleCategory = (category: string) => {
    const categoryPerms = PERMISSION_CATEGORIES[category].map((p) => p.key)
    const allSelected = categoryPerms.every((p) => selectedPermissions.has(p))

    setSelectedPermissions((prev) => {
      const newSet = new Set(prev)
      if (allSelected) {
        categoryPerms.forEach((p) => newSet.delete(p))
      } else {
        categoryPerms.forEach((p) => newSet.add(p))
      }
      return newSet
    })
  }

  const validateForm = (): boolean => {
    if (!name.trim()) {
      setError('Role name is required')
      return false
    }
    if (name.length < 2) {
      setError('Role name must be at least 2 characters')
      return false
    }
    if (selectedPermissions.size === 0) {
      setError('Select at least one permission')
      return false
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!validateForm()) return

    setIsLoading(true)

    try {
      const request: CreateCustomRoleRequest = {
        name: name.trim(),
        display_name: name.trim(),
        description: description.trim() || '',
        permissions: Array.from(selectedPermissions),
      }

      if (isEditing && role) {
        await updateCustomRole(role.id, request)
      } else {
        await createCustomRole(request)
      }

      setSuccess(true)

      // Close modal after short delay
      setTimeout(() => {
        onSuccess()
        onClose()
      }, 1500)
    } catch (err: any) {
      setError(err.message || `Failed to ${isEditing ? 'update' : 'create'} role`)
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Shield className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {isEditing ? 'Edit Role' : 'Create Custom Role'}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {isEditing
                  ? 'Modify role permissions and settings'
                  : 'Define a new role with custom permissions'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="p-6 space-y-6">
            {/* Success Message */}
            {success && (
              <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg">
                <CheckCircle className="w-5 h-5" />
                <span>Role {isEditing ? 'updated' : 'created'} successfully!</span>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg">
                <AlertCircle className="w-5 h-5" />
                <span>{error}</span>
              </div>
            )}

            {/* Role Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Role Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Content Manager"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                disabled={isEditing && !role?.is_custom}
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what this role is for..."
                rows={2}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>

            {/* Permissions */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Permissions *
                </label>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {selectedPermissions.size} selected
                </span>
              </div>

              <div className="space-y-4">
                {Object.entries(PERMISSION_CATEGORIES).map(([category, perms]) => {
                  const categoryPerms = perms.map((p) => p.key)
                  const selectedCount = categoryPerms.filter((p) =>
                    selectedPermissions.has(p)
                  ).length
                  const allSelected = selectedCount === categoryPerms.length

                  return (
                    <div
                      key={category}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
                    >
                      {/* Category Header */}
                      <div
                        onClick={() => handleToggleCategory(category)}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              'w-5 h-5 rounded border-2 flex items-center justify-center transition-colors',
                              allSelected
                                ? 'bg-blue-600 border-blue-600'
                                : selectedCount > 0
                                  ? 'bg-blue-100 border-blue-600'
                                  : 'border-gray-300 dark:border-gray-600'
                            )}
                          >
                            {allSelected && <Check className="w-3 h-3 text-white" />}
                            {!allSelected && selectedCount > 0 && (
                              <div className="w-2 h-2 bg-blue-600 rounded-sm" />
                            )}
                          </div>
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {category}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {selectedCount}/{categoryPerms.length}
                        </span>
                      </div>

                      {/* Permissions */}
                      <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                        {perms.map((perm) => {
                          const isSelected = selectedPermissions.has(perm.key)
                          return (
                            <div
                              key={perm.key}
                              onClick={() => handleTogglePermission(perm.key)}
                              className={cn(
                                'flex items-start gap-2 p-2 rounded-lg cursor-pointer transition-colors',
                                isSelected
                                  ? 'bg-blue-50 dark:bg-blue-900/20'
                                  : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                              )}
                            >
                              <div
                                className={cn(
                                  'w-4 h-4 mt-0.5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                                  isSelected
                                    ? 'bg-blue-600 border-blue-600'
                                    : 'border-gray-300 dark:border-gray-600'
                                )}
                              >
                                {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                              </div>
                              <div>
                                <div
                                  className={cn(
                                    'text-sm font-medium',
                                    isSelected
                                      ? 'text-blue-700 dark:text-blue-400'
                                      : 'text-gray-700 dark:text-gray-300'
                                  )}
                                >
                                  {perm.label}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  {perm.description}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || success}
              className={cn(
                'flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg transition-colors',
                isLoading || success ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'
              )}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {isEditing ? 'Updating...' : 'Creating...'}
                </>
              ) : success ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  {isEditing ? 'Updated!' : 'Created!'}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {isEditing ? 'Update Role' : 'Create Role'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreateRoleModal
