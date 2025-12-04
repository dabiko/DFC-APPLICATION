/**
 * InviteUserModal Component
 *
 * Modal for inviting new users to the organization with role and department selection.
 */

import { useState, useEffect } from 'react'
import {
  X,
  Mail,
  Building2,
  Shield,
  Send,
  Loader2,
  AlertCircle,
  CheckCircle,
  Plus,
  Trash2,
} from 'lucide-react'
import {
  createInvitation,
  getDepartments,
  getRoles,
  type Department,
  type Role,
  type CreateInvitationRequest,
  type OrganizationRole,
  ROLE_OPTIONS,
} from '@/services/userManagementService'
import { cn } from '@/utils/cn'

// ============================================================================
// TYPES
// ============================================================================

interface InviteUserModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface InviteeForm {
  email: string
  first_name: string
  last_name: string
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function InviteUserModal({ isOpen, onClose, onSuccess }: InviteUserModalProps) {
  // Form state
  const [invitees, setInvitees] = useState<InviteeForm[]>([
    { email: '', first_name: '', last_name: '' },
  ])
  const [selectedRole, setSelectedRole] = useState<string>('viewer')
  const [selectedDepartment, setSelectedDepartment] = useState<string>('')
  const [customMessage, setCustomMessage] = useState('')
  const [sendWelcomeEmail, setSendWelcomeEmail] = useState(true)

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

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setInvitees([{ email: '', first_name: '', last_name: '' }])
      setSelectedRole('viewer')
      setSelectedDepartment('')
      setCustomMessage('')
      setError(null)
      setSuccess(false)
    }
  }, [isOpen])

  const handleAddInvitee = () => {
    if (invitees.length < 10) {
      setInvitees([...invitees, { email: '', first_name: '', last_name: '' }])
    }
  }

  const handleRemoveInvitee = (index: number) => {
    if (invitees.length > 1) {
      setInvitees(invitees.filter((_, i) => i !== index))
    }
  }

  const handleInviteeChange = (index: number, field: keyof InviteeForm, value: string) => {
    const updated = [...invitees]
    updated[index][field] = value
    setInvitees(updated)
  }

  const validateForm = (): boolean => {
    // Check all invitees have valid emails
    for (const invitee of invitees) {
      if (!invitee.email || !invitee.email.includes('@')) {
        setError('Please enter valid email addresses for all invitees')
        return false
      }
    }

    // Check role is selected
    if (!selectedRole) {
      setError('Please select a role')
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
      // Send invitations for each invitee
      const promises = invitees.map((invitee) => {
        const request: CreateInvitationRequest = {
          email: invitee.email,
          role: selectedRole as OrganizationRole,
          department: selectedDepartment ? parseInt(selectedDepartment) : undefined,
          message: customMessage || undefined,
        }
        return createInvitation(request)
      })

      await Promise.all(promises)
      setSuccess(true)

      // Close modal after short delay
      setTimeout(() => {
        onSuccess()
        onClose()
      }, 1500)
    } catch (err: any) {
      // Handle API error response format
      if (err.response?.data) {
        const errorData = err.response.data
        if (errorData.email) {
          // Email validation errors from backend
          setError(Array.isArray(errorData.email) ? errorData.email[0] : errorData.email)
        } else if (errorData.error) {
          setError(errorData.error)
        } else if (errorData.detail) {
          setError(errorData.detail)
        } else if (typeof errorData === 'string') {
          setError(errorData)
        } else {
          // Try to extract first error message
          const firstKey = Object.keys(errorData)[0]
          if (firstKey) {
            const firstError = errorData[firstKey]
            setError(Array.isArray(firstError) ? firstError[0] : firstError)
          } else {
            setError('Failed to send invitations')
          }
        }
      } else {
        setError(err.message || 'Failed to send invitations')
      }
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
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Invite Users
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Send invitations to new team members
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
                <span>Invitations sent successfully!</span>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg">
                <AlertCircle className="w-5 h-5" />
                <span>{error}</span>
              </div>
            )}

            {/* Email Domain Notice */}
            <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-blue-700 dark:text-blue-300">
                Only users with your organization's email domain can be invited. Personal email
                providers (Gmail, Yahoo, Hotmail, etc.) are not allowed.
              </p>
            </div>

            {/* Invitees */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Invite Users
                </label>
                <button
                  type="button"
                  onClick={handleAddInvitee}
                  disabled={invitees.length >= 10}
                  className={cn(
                    'flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300',
                    invitees.length >= 10 && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <Plus className="w-4 h-4" />
                  Add Another
                </button>
              </div>

              {invitees.map((invitee, index) => (
                <div
                  key={index}
                  className="grid grid-cols-12 gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                >
                  <div className="col-span-5">
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="email"
                        placeholder="Email address *"
                        value={invitee.email}
                        onChange={(e) => handleInviteeChange(index, 'email', e.target.value)}
                        className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                  </div>
                  <div className="col-span-3">
                    <input
                      type="text"
                      placeholder="First name"
                      value={invitee.first_name}
                      onChange={(e) => handleInviteeChange(index, 'first_name', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="col-span-3">
                    <input
                      type="text"
                      placeholder="Last name"
                      value={invitee.last_name}
                      onChange={(e) => handleInviteeChange(index, 'last_name', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="col-span-1 flex items-center justify-center">
                    {invitees.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveInvitee(index)}
                        className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Role Selection */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Shield className="inline w-4 h-4 mr-1" />
                  Role *
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isLoadingDepartments}
                >
                  <option value="">Select department (optional)</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Custom Message */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Personal Message (Optional)
              </label>
              <textarea
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Add a personal message to the invitation email..."
                rows={3}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>

            {/* Send Email Option */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="sendWelcomeEmail"
                checked={sendWelcomeEmail}
                onChange={(e) => setSendWelcomeEmail(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label
                htmlFor="sendWelcomeEmail"
                className="text-sm text-gray-700 dark:text-gray-300"
              >
                Send welcome email with invitation link
              </label>
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
                  Sending...
                </>
              ) : success ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Sent!
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send Invitations
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default InviteUserModal
