/**
 * RolesTab Component
 *
 * Displays roles with permission matrix, allows creating custom roles,
 * and managing role assignments.
 */

import { useState, useEffect, useCallback } from 'react'
import {
  Shield,
  Plus,
  Search,
  Edit2,
  Trash2,
  Check,
  X,
  Users,
  Loader2,
  ChevronDown,
  ChevronRight,
  Info,
  AlertTriangle,
} from 'lucide-react'
import {
  getRoles,
  deleteCustomRole,
  type Role,
  ROLE_PERMISSIONS,
} from '@/services/userManagementService'
import { CreateRoleModal } from './CreateRoleModal'
import { cn } from '@/utils/cn'

// ============================================================================
// TYPES
// ============================================================================

interface RolesTabProps {
  onRefresh: () => void
}

// All available permissions in the system
// Keys MUST match the backend Role.PERMISSION_FLAG_MAP values
// (i.e. what get_permissions_list() returns)
const ALL_PERMISSIONS = [
  // Document & Folder permissions
  { key: 'view_document', label: 'View Documents', category: 'Documents & Folders' },
  { key: 'download_document', label: 'Download Documents', category: 'Documents & Folders' },
  { key: 'upload_document', label: 'Upload Documents', category: 'Documents & Folders' },
  { key: 'edit_document', label: 'Edit Documents', category: 'Documents & Folders' },
  { key: 'delete_document', label: 'Delete Documents', category: 'Documents & Folders' },
  { key: 'share_document', label: 'Share Documents', category: 'Documents & Folders' },
  { key: 'manage_permissions', label: 'Manage Permissions', category: 'Documents & Folders' },
  // Procedure permissions
  { key: 'create_procedure', label: 'Create Procedures', category: 'Procedures' },
  { key: 'edit_procedure', label: 'Edit Procedures', category: 'Procedures' },
  { key: 'delete_procedure', label: 'Delete Procedures', category: 'Procedures' },
  { key: 'publish_procedure', label: 'Publish / Retire Procedures', category: 'Procedures' },
  { key: 'review_procedure', label: 'Review Procedures', category: 'Procedures' },
  { key: 'view_all_procedures', label: 'View All Procedures', category: 'Procedures' },
  // Workflow permissions
  { key: 'create_workflow_template', label: 'Create / Edit Templates', category: 'Workflows' },
  { key: 'delete_workflow_template', label: 'Delete Templates', category: 'Workflows' },
  { key: 'start_workflow', label: 'Start Workflows', category: 'Workflows' },
  { key: 'cancel_workflow', label: 'Cancel Workflows', category: 'Workflows' },
  { key: 'manage_auto_triggers', label: 'Manage Auto-Trigger Rules', category: 'Workflows' },
  { key: 'view_workflow_analytics', label: 'View Analytics', category: 'Workflows' },
  // Training permissions
  { key: 'manage_assignments', label: 'Manage Assignments', category: 'Training' },
  { key: 'view_training_dashboard', label: 'View Dashboard', category: 'Training' },
  { key: 'view_trainee_details', label: 'View Trainee Details', category: 'Training' },
  { key: 'view_training_evidence', label: 'View Evidence', category: 'Training' },
  { key: 'audit_training', label: 'Audit Training (Read-only)', category: 'Training' },
  // Administration permissions
  { key: 'view_audit_log', label: 'View Audit Logs', category: 'Administration' },
  { key: 'manage_retention', label: 'Manage Retention Policies', category: 'Administration' },
  { key: 'manage_classification', label: 'Manage Classification', category: 'Administration' },
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
// ROLE CARD COMPONENT
// ============================================================================

interface RoleCardProps {
  role: Role
  isExpanded: boolean
  onToggle: () => void
  onEdit: (role: Role) => void
  onDelete: (role: Role) => void
}

function RoleCard({ role, isExpanded, onToggle, onEdit, onDelete }: RoleCardProps) {
  const permissions = role.permissions || ROLE_PERMISSIONS[role.name] || []

  const getRoleColorClasses = (roleName: string) => {
    const colors: Record<string, string> = {
      owner:
        'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800',
      admin:
        'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800',
      manager:
        'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800',
      editor:
        'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800',
      viewer:
        'bg-gray-100 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600',
    }
    return (
      colors[roleName.toLowerCase()] ||
      'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800'
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div
        onClick={onToggle}
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={cn('p-2 rounded-lg border', getRoleColorClasses(role.name))}>
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 capitalize">
                {role.name.replace('_', ' ')}
              </h3>
              {!role.is_system && (
                <span className="px-2 py-0.5 text-xs font-medium bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full">
                  Custom
                </span>
              )}
              {role.is_system && (
                <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full">
                  System
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {role.description || `${permissions.length} permissions`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
            <Users className="w-4 h-4" />
            <span className="text-sm">{role.user_count || 0}</span>
          </div>
          {isExpanded ? (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-gray-200 dark:border-gray-700">
          {/* Permission Matrix */}
          <div className="p-4">
            <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
              Permissions
            </h4>
            <div className="space-y-4">
              {Object.entries(PERMISSION_CATEGORIES).map(([category, perms]) => (
                <div key={category}>
                  <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {category}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {perms.map((perm) => {
                      const hasPermission = permissions.includes(perm.key)
                      return (
                        <div
                          key={perm.key}
                          className={cn(
                            'flex items-center gap-2 p-2 rounded-lg text-xs',
                            hasPermission
                              ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                              : 'bg-gray-50 dark:bg-gray-700/50 text-gray-400 dark:text-gray-500'
                          )}
                        >
                          {hasPermission ? (
                            <Check className="w-3 h-3" />
                          ) : (
                            <X className="w-3 h-3" />
                          )}
                          <span>{perm.label}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          {!role.is_system && (
            <div className="flex items-center justify-end gap-2 px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit(role)
                }}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
              >
                <Edit2 className="w-4 h-4" />
                Edit
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(role)
                }}
                disabled={(role.user_count || 0) > 0}
                className={cn(
                  'flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg transition-colors',
                  (role.user_count || 0) > 0
                    ? 'text-gray-400 cursor-not-allowed'
                    : 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                )}
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function RolesTab({ onRefresh }: RolesTabProps) {
  // State
  const [roles, setRoles] = useState<Role[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedRoles, setExpandedRoles] = useState<Set<string>>(new Set())
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [deletingRole, setDeletingRole] = useState<Role | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Fetch roles
  const fetchRoles = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await getRoles()
      setRoles(data)
    } catch (error) {
      console.error('Failed to fetch roles:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRoles()
  }, [fetchRoles])

  // Filter roles
  const filteredRoles = roles.filter(
    (role) =>
      role.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      role.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Separate system and custom roles
  const systemRoles = filteredRoles.filter((r) => r.is_system)
  const customRoles = filteredRoles.filter((r) => !r.is_system)

  const handleToggleExpand = (roleId: string) => {
    setExpandedRoles((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(roleId)) {
        newSet.delete(roleId)
      } else {
        newSet.add(roleId)
      }
      return newSet
    })
  }

  const handleDeleteRole = async () => {
    if (!deletingRole) return
    setIsDeleting(true)
    try {
      await deleteCustomRole(deletingRole.id)
      setRoles((prev) => prev.filter((r) => r.id !== deletingRole.id))
      setDeletingRole(null)
      onRefresh()
    } catch (error) {
      console.error('Failed to delete role:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleCreateSuccess = () => {
    fetchRoles()
    onRefresh()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="flex-shrink-0 p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between gap-4">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search roles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Create Button */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Role
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* System Roles */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
            <Shield className="w-4 h-4" />
            System Roles
            <span className="text-xs text-gray-500">({systemRoles.length})</span>
          </h3>
          <div className="space-y-3">
            {systemRoles.map((role) => (
              <RoleCard
                key={role.id}
                role={role}
                isExpanded={expandedRoles.has(role.id)}
                onToggle={() => handleToggleExpand(role.id)}
                onEdit={setEditingRole}
                onDelete={setDeletingRole}
              />
            ))}
          </div>
        </div>

        {/* Custom Roles */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Custom Roles
            <span className="text-xs text-gray-500">({customRoles.length})</span>
          </h3>
          {customRoles.length > 0 ? (
            <div className="space-y-3">
              {customRoles.map((role) => (
                <RoleCard
                  key={role.id}
                  role={role}
                  isExpanded={expandedRoles.has(role.id)}
                  onToggle={() => handleToggleExpand(role.id)}
                  onEdit={setEditingRole}
                  onDelete={setDeletingRole}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-600">
              <Shield className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No custom roles created yet
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                Create your first custom role
              </button>
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-700 dark:text-blue-300">
            <p className="font-medium mb-1">About Roles</p>
            <p className="text-blue-600 dark:text-blue-400">
              System roles (Owner, Admin, Manager, Editor, Viewer) cannot be modified or deleted.
              Create custom roles to define specific permission sets for your organization.
            </p>
          </div>
        </div>
      </div>

      {/* Create/Edit Modal */}
      <CreateRoleModal
        isOpen={showCreateModal || !!editingRole}
        role={editingRole}
        onClose={() => {
          setShowCreateModal(false)
          setEditingRole(null)
        }}
        onSuccess={handleCreateSuccess}
      />

      {/* Delete Confirmation Modal */}
      {deletingRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setDeletingRole(null)}
          />
          <div className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Delete Role
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  This action cannot be undone
                </p>
              </div>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
              Are you sure you want to delete the role "{deletingRole.name}"?
              {(deletingRole.user_count || 0) > 0 && (
                <span className="block mt-2 text-red-600 dark:text-red-400">
                  This role has {deletingRole.user_count} users assigned. Please reassign them
                  first.
                </span>
              )}
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setDeletingRole(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteRole}
                disabled={isDeleting || (deletingRole.user_count || 0) > 0}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors',
                  isDeleting || (deletingRole.user_count || 0) > 0
                    ? 'bg-red-400 cursor-not-allowed'
                    : 'bg-red-600 hover:bg-red-700'
                )}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete Role
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default RolesTab
