/**
 * EditUserModal Component
 *
 * Modal for editing existing user information, role, and department.
 * Supports direct role changes by admins.
 */

import { useState, useEffect } from 'react'
import {
  X,
  Mail,
  User,
  Building2,
  Shield,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle,
  Phone,
} from 'lucide-react'
import {
  updateUser,
  getDepartments,
  getRoles,
  type User as UserType,
  type Department,
  type Role,
  type UpdateUserRequest,
  ROLE_OPTIONS,
  getUserInitials,
} from '@/services/userManagementService'
import { cn } from '@/utils/cn'

// ============================================================================
// TYPES
// ============================================================================

interface EditUserModalProps {
  isOpen: boolean
  user: UserType | null
  onClose: () => void
  onSuccess: () => void
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function EditUserModal({ isOpen, user, onClose, onSuccess }: EditUserModalProps) {
  // Form state
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    organization_role: '',
    department_id: '',
  })

  // Loading states
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingDepartments, setIsLoadingDepartments] = useState(true)
  const [isLoadingRoles, setIsLoadingRoles] = useState(true)

  // Data
  const [departments, setDepartments] = useState<Department[]>([])
  const [roles, setRoles] = useState<Role[]>([])

  // Error state
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Populate form when user changes
  useEffect(() => {
    if (user && isOpen) {
      setFormData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        phone_number: user.phone_number || '',
        organization_role: user.role || 'viewer',
        department_id: user.department?.toString() || '',
      })
      setError(null)
      setSuccess(false)
    }
  }, [user, isOpen])

  // Fetch departments and roles on mount
  useEffect(() => {
    if (isOpen) {
      fetchDepartments()
      fetchRoles()
    }
  }, [isOpen])

  const fetchDepartments = async () => {
    setIsLoadingDepartments(true)
    try {
      const data = await getDepartments()
      setDepartments(data)
    } catch (err) {
      console.error('Failed to fetch departments:', err)
    } finally {
      setIsLoadingDepartments(false)
    }
  }

  const fetchRoles = async () => {
    setIsLoadingRoles(true)
    try {
      const data = await getRoles()
      setRoles(data)
    } catch (err) {
      console.error('Failed to fetch roles:', err)
    } finally {
      setIsLoadingRoles(false)
    }
  }

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const validateForm = (): boolean => {
    if (!formData.first_name.trim()) {
      setError('First name is required')
      return false
    }
    if (!formData.last_name.trim()) {
      setError('Last name is required')
      return false
    }
    if (!formData.email || !formData.email.includes('@')) {
      setError('Valid email address is required')
      return false
    }
    if (!formData.organization_role) {
      setError('Role is required')
      return false
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!user) return
    if (!validateForm()) return

    setIsLoading(true)

    try {
      const request: UpdateUserRequest = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        phone_number: formData.phone_number || undefined,
        role: formData.organization_role as any,
        department: formData.department_id ? parseInt(formData.department_id) : undefined,
      }

      await updateUser(user.id, request)
      setSuccess(true)

      // Close modal after short delay
      setTimeout(() => {
        onSuccess()
        onClose()
      }, 1500)
    } catch (err: any) {
      setError(err.message || 'Failed to update user')
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen || !user) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={`${user.first_name} ${user.last_name}`}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                {getUserInitials(user)}
              </div>
            )}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Edit User</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
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
                <span>User updated successfully!</span>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg">
                <AlertCircle className="w-5 h-5" />
                <span>{error}</span>
              </div>
            )}

            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  First Name *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={formData.first_name}
                    onChange={(e) => handleChange('first_name', e.target.value)}
                    className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Last Name *
                </label>
                <input
                  type="text"
                  value={formData.last_name}
                  onChange={(e) => handleChange('last_name', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email Address *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="tel"
                  value={formData.phone_number}
                  onChange={(e) => handleChange('phone_number', e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Role and Department */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Shield className="inline w-4 h-4 mr-1" />
                  Role *
                </label>
                <select
                  value={formData.organization_role}
                  onChange={(e) => handleChange('organization_role', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  disabled={isLoadingRoles}
                >
                  {ROLE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                  {roles
                    .filter((r) => !r.is_system)
                    .map((role) => (
                      <option key={role.id} value={role.name}>
                        {role.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Building2 className="inline w-4 h-4 mr-1" />
                  Department
                </label>
                <select
                  value={formData.department_id}
                  onChange={(e) => handleChange('department_id', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isLoadingDepartments}
                >
                  <option value="">No department</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* User Status Info */}
            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                <div className="flex justify-between">
                  <span>Account Status:</span>
                  <span
                    className={cn(
                      'font-medium',
                      user.is_active
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                    )}
                  >
                    {user.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>MFA Enabled:</span>
                  <span
                    className={cn(
                      'font-medium',
                      user.mfa_enabled
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-gray-600 dark:text-gray-400'
                    )}
                  >
                    {user.mfa_enabled ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Last Login:</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
                  </span>
                </div>
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
                  Saving...
                </>
              ) : success ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Saved!
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default EditUserModal
