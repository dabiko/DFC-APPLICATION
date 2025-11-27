/**
 * CreateDepartmentModal Component
 *
 * Modal for creating or editing departments with head assignment
 * and parent department selection.
 */

import { useState, useEffect } from 'react'
import {
  X,
  Building2,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle,
  User,
  FolderTree,
} from 'lucide-react'
import {
  createDepartment,
  updateDepartment,
  getUsers,
  type Department,
  type User as UserType,
} from '@/services/userManagementService'
import { cn } from '@/utils/cn'

// ============================================================================
// TYPES
// ============================================================================

interface CreateDepartmentModalProps {
  isOpen: boolean
  department: Department | null // null for create, Department for edit
  departments: Department[] // All departments for parent selection
  onClose: () => void
  onSuccess: () => void
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function CreateDepartmentModal({
  isOpen,
  department,
  departments,
  onClose,
  onSuccess,
}: CreateDepartmentModalProps) {
  const isEditing = !!department

  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [parentId, setParentId] = useState('')
  const [headId, setHeadId] = useState('')

  // Loading states
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingUsers, setIsLoadingUsers] = useState(true)

  // Data
  const [users, setUsers] = useState<UserType[]>([])

  // Error state
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Fetch users on mount
  useEffect(() => {
    if (isOpen) {
      fetchUsers()
    }
  }, [isOpen])

  const fetchUsers = async () => {
    setIsLoadingUsers(true)
    try {
      const data = await getUsers()
      setUsers(data)
    } catch (err) {
      console.error('Failed to fetch users:', err)
    } finally {
      setIsLoadingUsers(false)
    }
  }

  // Populate form when editing
  useEffect(() => {
    if (department && isOpen) {
      setName(department.name)
      setDescription(department.description || '')
      setParentId(department.parent_id || '')
      setHeadId(department.head?.id || '')
    } else if (!department && isOpen) {
      setName('')
      setDescription('')
      setParentId('')
      setHeadId('')
    }
    setError(null)
    setSuccess(false)
  }, [department, isOpen])

  // Filter out the current department and its descendants for parent selection
  const getAvailableParents = (): Department[] => {
    if (!isEditing) return departments

    const descendants = new Set<string>()
    const findDescendants = (deptId: string) => {
      descendants.add(deptId)
      departments.filter((d) => d.parent_id === deptId).forEach((d) => findDescendants(d.id))
    }
    findDescendants(department!.id)

    return departments.filter((d) => !descendants.has(d.id))
  }

  const availableParents = getAvailableParents()

  const validateForm = (): boolean => {
    if (!name.trim()) {
      setError('Department name is required')
      return false
    }
    if (name.length < 2) {
      setError('Department name must be at least 2 characters')
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
      const request = {
        name: name.trim(),
        code: name.trim().toLowerCase().replace(/\s+/g, '_'),
        parent: parentId ? parseInt(parentId) : undefined,
      }

      if (isEditing && department) {
        await updateDepartment(department.id, request)
      } else {
        await createDepartment(request)
      }

      setSuccess(true)

      // Close modal after short delay
      setTimeout(() => {
        onSuccess()
        onClose()
      }, 1500)
    } catch (err: any) {
      setError(err.message || `Failed to ${isEditing ? 'update' : 'create'} department`)
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
      <div className="relative w-full max-w-lg bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
              <Building2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {isEditing ? 'Edit Department' : 'Create Department'}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {isEditing
                  ? 'Update department information'
                  : 'Add a new department to your organization'}
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
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-5">
            {/* Success Message */}
            {success && (
              <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg">
                <CheckCircle className="w-5 h-5" />
                <span>Department {isEditing ? 'updated' : 'created'} successfully!</span>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg">
                <AlertCircle className="w-5 h-5" />
                <span>{error}</span>
              </div>
            )}

            {/* Department Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Department Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Engineering, Marketing"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
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
                placeholder="Brief description of the department..."
                rows={3}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>

            {/* Parent Department */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <FolderTree className="inline w-4 h-4 mr-1" />
                Parent Department
              </label>
              <select
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">No parent (Top-level department)</option>
                {availableParents.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Select a parent to create a nested department structure
              </p>
            </div>

            {/* Department Head */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <User className="inline w-4 h-4 mr-1" />
                Department Head
              </label>
              <select
                value={headId}
                onChange={(e) => setHeadId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoadingUsers}
              >
                <option value="">No head assigned</option>
                {users
                  .filter((u) => u.is_active)
                  .map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.first_name} {user.last_name} ({user.email})
                    </option>
                  ))}
              </select>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                The department head will have management responsibilities
              </p>
            </div>

            {/* Info Box */}
            {isEditing && department?.member_count && department.member_count > 0 && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  This department has {department.member_count} member
                  {department.member_count > 1 ? 's' : ''}. Changes to the department will affect
                  all members.
                </p>
              </div>
            )}
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
                  {isEditing ? 'Update Department' : 'Create Department'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreateDepartmentModal
