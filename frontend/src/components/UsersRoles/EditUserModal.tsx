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
  Crown,
  ShieldCheck,
  Users,
  Edit3,
  Eye,
  Sparkles,
} from 'lucide-react'
import { CustomSelect, type SelectOption } from './CustomSelect'
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
// ROLE STYLING HELPERS
// ============================================================================

const ROLE_ICONS: Record<string, React.ReactNode> = {
  owner: <Crown className="w-4 h-4" />,
  admin: <ShieldCheck className="w-4 h-4" />,
  manager: <Users className="w-4 h-4" />,
  member: <Edit3 className="w-4 h-4" />,
  editor: <Edit3 className="w-4 h-4" />,
  viewer: <Eye className="w-4 h-4" />,
}

const ROLE_COLORS: Record<string, { bg: string; text: string; ring: string }> = {
  owner: {
    bg: 'bg-purple-50 dark:bg-purple-900/20',
    text: 'text-purple-700 dark:text-purple-300',
    ring: 'ring-purple-200 dark:ring-purple-800',
  },
  admin: {
    bg: 'bg-red-50 dark:bg-red-900/20',
    text: 'text-red-700 dark:text-red-300',
    ring: 'ring-red-200 dark:ring-red-800',
  },
  manager: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    text: 'text-blue-700 dark:text-blue-300',
    ring: 'ring-blue-200 dark:ring-blue-800',
  },
  member: {
    bg: 'bg-green-50 dark:bg-green-900/20',
    text: 'text-green-700 dark:text-green-300',
    ring: 'ring-green-200 dark:ring-green-800',
  },
  editor: {
    bg: 'bg-green-50 dark:bg-green-900/20',
    text: 'text-green-700 dark:text-green-300',
    ring: 'ring-green-200 dark:ring-green-800',
  },
  viewer: {
    bg: 'bg-gray-50 dark:bg-gray-700/50',
    text: 'text-gray-700 dark:text-gray-300',
    ring: 'ring-gray-200 dark:ring-gray-700',
  },
}

const DEFAULT_ROLE_COLOR = {
  bg: 'bg-indigo-50 dark:bg-indigo-900/20',
  text: 'text-indigo-700 dark:text-indigo-300',
  ring: 'ring-indigo-200 dark:ring-indigo-800',
}

function getRoleColor(roleName: string) {
  return ROLE_COLORS[roleName.toLowerCase()] || DEFAULT_ROLE_COLOR
}

function getRoleIcon(roleName: string) {
  return ROLE_ICONS[roleName.toLowerCase()] || <Sparkles className="w-4 h-4" />
}

function getRoleDescription(roleName: string): string {
  const descriptions: Record<string, string> = {
    owner: 'Full organization control and billing',
    admin: 'System-wide administration access',
    administrator: 'System-wide administration access',
    manager: 'Team and content management',
    member: 'Standard content creation access',
    editor: 'Document and procedure editing',
    viewer: 'Read-only access to content',
  }
  return descriptions[roleName.toLowerCase()] || 'Custom role with specific permissions'
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

  // Build role options for the custom select
  const roleOptions: SelectOption[] = [
    ...ROLE_OPTIONS.map((option) => {
      const colors = getRoleColor(option.value)
      return {
        value: option.value,
        label: option.label,
        description: getRoleDescription(option.value),
        icon: getRoleIcon(option.value),
        badge: 'System',
        badgeColor: `${colors.bg} ${colors.text}`,
        group: 'System Roles',
      }
    }),
    ...roles
      .filter((r) => !r.is_system)
      .map((role) => ({
        value: role.name,
        label: role.display_name || role.name,
        description:
          role.description || `Custom role with ${role.permissions?.length || 0} permissions`,
        icon: <Sparkles className="w-4 h-4" />,
        badge: 'Custom',
        badgeColor: DEFAULT_ROLE_COLOR.bg + ' ' + DEFAULT_ROLE_COLOR.text,
        group: 'Custom Roles',
      })),
  ]

  // Build department options for the custom select
  const departmentOptions: SelectOption[] = [
    {
      value: '',
      label: 'No Department',
      description: 'User will not be assigned to any department',
      icon: <Building2 className="w-4 h-4" />,
      badgeColor: 'bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-400',
    },
    ...departments.map((dept) => ({
      value: dept.id.toString(),
      label: dept.name,
      description: dept.code ? `Code: ${dept.code}` : undefined,
      icon: <Building2 className="w-4 h-4" />,
      badgeColor: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
    })),
  ]

  if (!isOpen || !user) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-2xl bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden">
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
          <div className="p-6 space-y-5 max-h-[calc(100vh-220px)] overflow-y-auto">
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
                    className="w-full pl-10 pr-3 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  className="w-full px-3 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  className="w-full pl-10 pr-3 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  className="w-full pl-10 pr-3 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Role and Department — Custom Selects */}
            <div className="grid grid-cols-2 gap-4">
              <CustomSelect
                value={formData.organization_role}
                onChange={(val) => handleChange('organization_role', val)}
                options={roleOptions}
                icon={<Shield className="w-4 h-4" />}
                label="Role"
                required
                disabled={isLoadingRoles}
                searchable
                placeholder="Select role..."
              />

              <CustomSelect
                value={formData.department_id}
                onChange={(val) => handleChange('department_id', val)}
                options={departmentOptions}
                icon={<Building2 className="w-4 h-4" />}
                label="Department"
                disabled={isLoadingDepartments}
                searchable={departments.length > 5}
                placeholder="Select department..."
              />
            </div>

            {/* User Status Info */}
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-700">
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2.5">
                Account Info
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <div
                    className={cn(
                      'text-sm font-semibold',
                      user.is_active
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                    )}
                  >
                    {user.is_active ? 'Active' : 'Inactive'}
                  </div>
                  <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">Status</div>
                </div>
                <div className="text-center border-x border-gray-200 dark:border-gray-600">
                  <div
                    className={cn(
                      'text-sm font-semibold',
                      user.mfa_enabled
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-gray-500 dark:text-gray-400'
                    )}
                  >
                    {user.mfa_enabled ? 'Enabled' : 'Disabled'}
                  </div>
                  <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">MFA</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
                  </div>
                  <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                    Last Login
                  </div>
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
