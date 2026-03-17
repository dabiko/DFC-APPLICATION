/**
 * InviteUserModal Component
 *
 * Modal for inviting new users to the organization with role and department selection.
 * Supports bulk CSV upload, duplicate detection, domain validation, and existing user checks.
 */

import { useState, useEffect, useRef } from 'react'
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
  Crown,
  ShieldCheck,
  Users,
  Edit3,
  Eye,
  Sparkles,
  Upload,
  Download,
  FileSpreadsheet,
} from 'lucide-react'
import {
  createInvitation,
  getDepartments,
  getRoles,
  getUsers,
  type Department,
  type Role,
  type CreateInvitationRequest,
  type OrganizationRole,
  ROLE_OPTIONS,
} from '@/services/userManagementService'
import { CustomSelect, type SelectOption } from './CustomSelect'
import { cn } from '@/utils/cn'

// ============================================================================
// CONSTANTS
// ============================================================================

const BLOCKED_EMAIL_DOMAINS = [
  'gmail.com',
  'yahoo.com',
  'hotmail.com',
  'outlook.com',
  'live.com',
  'msn.com',
  'aol.com',
  'mail.com',
  'icloud.com',
  'me.com',
  'mac.com',
  'protonmail.com',
  'proton.me',
  'pm.me',
  'yandex.com',
  'yandex.ru',
  'mail.ru',
  'zoho.com',
  'gmx.com',
  'gmx.net',
  'tempmail.com',
  '10minutemail.com',
  'guerrillamail.com',
  'mailinator.com',
  'maildrop.cc',
  'throwaway.email',
]

// ============================================================================
// TYPES
// ============================================================================

interface InviteUserModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  departments?: Department[]
}

interface InviteeForm {
  email: string
  first_name: string
  last_name: string
  error?: string
}

// ============================================================================
// HELPERS
// ============================================================================

function getEmailDomain(email: string): string {
  return email.toLowerCase().trim().split('@')[1] || ''
}

function isBlockedDomain(email: string): boolean {
  const domain = getEmailDomain(email)
  if (!domain) return false
  return (
    BLOCKED_EMAIL_DOMAINS.includes(domain) ||
    ['temp', 'disposable', 'trash', 'fake', 'throwaway'].some((k) => domain.includes(k))
  )
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function generateCSVTemplate(): string {
  return [
    'email,first_name,last_name',
    'john.doe@cccplc.net,John,Doe',
    'jane.smith@cccplc.net,Jane,Smith',
  ].join('\n')
}

function parseCSV(text: string): InviteeForm[] {
  const lines = text.trim().split('\n')
  if (lines.length < 2) return []

  // Skip header row
  return lines
    .slice(1)
    .map((line) => {
      const cols = line.split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''))
      return {
        email: cols[0] || '',
        first_name: cols[1] || '',
        last_name: cols[2] || '',
      }
    })
    .filter((row) => row.email)
}

// ============================================================================
// OPTION BUILDERS
// ============================================================================

const ROLE_ICONS: Record<string, React.ReactNode> = {
  owner: <Crown className="w-4 h-4" />,
  admin: <ShieldCheck className="w-4 h-4" />,
  manager: <Users className="w-4 h-4" />,
  member: <Edit3 className="w-4 h-4" />,
  editor: <Edit3 className="w-4 h-4" />,
  viewer: <Eye className="w-4 h-4" />,
}

const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
  owner: { bg: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-700 dark:text-purple-300' },
  admin: { bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-300' },
  manager: { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-300' },
  member: { bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-700 dark:text-green-300' },
  editor: { bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-700 dark:text-green-300' },
  viewer: { bg: 'bg-gray-50 dark:bg-gray-700/50', text: 'text-gray-700 dark:text-gray-300' },
}

const ROLE_DESCRIPTIONS: Record<string, string> = {
  owner: 'Full organization control and billing',
  admin: 'System-wide administration access',
  administrator: 'System-wide administration access',
  manager: 'Team and content management',
  member: 'Standard content creation access',
  editor: 'Document and procedure editing',
  viewer: 'Read-only access to content',
}

function buildRoleOptions(roles: Role[]): SelectOption[] {
  const defaultColor = {
    bg: 'bg-indigo-50 dark:bg-indigo-900/20',
    text: 'text-indigo-700 dark:text-indigo-300',
  }

  return [
    ...ROLE_OPTIONS.map((option) => {
      const colors = ROLE_COLORS[option.value.toLowerCase()] || defaultColor
      return {
        value: option.value,
        label: option.label,
        description: ROLE_DESCRIPTIONS[option.value.toLowerCase()] || '',
        icon: ROLE_ICONS[option.value.toLowerCase()] || <Sparkles className="w-4 h-4" />,
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
        badgeColor: `${defaultColor.bg} ${defaultColor.text}`,
        group: 'Custom Roles',
      })),
  ]
}

function buildDepartmentOptions(departments: Department[]): SelectOption[] {
  return [
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
  const [existingEmails, setExistingEmails] = useState<Set<string>>(new Set())

  // Error state
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // CSV upload ref
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fetch departments, roles, and existing users on mount
  useEffect(() => {
    if (isOpen) {
      fetchDepartments()
      fetchRoles()
      fetchExistingUsers()
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

  const fetchExistingUsers = async () => {
    try {
      const response = await getUsers({ page_size: 1000 })
      const emails = new Set(response.results.map((u) => u.email.toLowerCase()))
      setExistingEmails(emails)
    } catch (err) {
      console.error('Failed to fetch existing users:', err)
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

  // ── Invitee row validation (runs on each email change) ──

  const validateInvitee = (email: string, index: number): string | undefined => {
    if (!email) return undefined
    if (!isValidEmail(email)) return 'Invalid email format'
    if (isBlockedDomain(email)) {
      const domain = getEmailDomain(email)
      return `@${domain} is not allowed. Use a company email.`
    }
    if (existingEmails.has(email.toLowerCase())) return 'This user already exists'
    // Check for duplicates within the invitee list
    const isDuplicate = invitees.some(
      (inv, i) => i !== index && inv.email.toLowerCase() === email.toLowerCase() && inv.email !== ''
    )
    if (isDuplicate) return 'Duplicate email'
    return undefined
  }

  const handleAddInvitee = () => {
    if (invitees.length < 50) {
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
    updated[index] = { ...updated[index], [field]: value }
    // Re-validate email on change
    if (field === 'email') {
      updated[index].error = validateInvitee(value, index)
      // Also revalidate other rows for duplicate detection
      updated.forEach((inv, i) => {
        if (i !== index && inv.email) {
          inv.error = validateInvitee(inv.email, i)
        }
      })
    }
    setInvitees(updated)
  }

  // ── CSV Template download ──

  const handleDownloadTemplate = () => {
    const csv = generateCSVTemplate()
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'invite-users-template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── CSV Upload ──

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      const parsed = parseCSV(text)
      if (parsed.length === 0) {
        setError(
          'No valid rows found in CSV. Make sure the first row is a header (email,first_name,last_name).'
        )
        return
      }
      // Validate and merge with existing invitees (replace empty first row)
      const hasOnlyEmptyRow = invitees.length === 1 && !invitees[0].email
      const base = hasOnlyEmptyRow ? [] : invitees
      const merged = [...base, ...parsed].slice(0, 50)

      // Validate each row
      const validated = merged.map((inv, i) => ({
        ...inv,
        error: validateInvitee(inv.email, i),
      }))

      // Re-run duplicate check across all
      const seen = new Map<string, number>()
      validated.forEach((inv, i) => {
        if (!inv.email) return
        const key = inv.email.toLowerCase()
        if (seen.has(key)) {
          inv.error = 'Duplicate email'
          const prevIdx = seen.get(key)!
          if (!validated[prevIdx].error) validated[prevIdx].error = undefined // keep first valid
        } else {
          seen.set(key, i)
        }
      })

      setInvitees(validated)

      const errorCount = validated.filter((v) => v.error).length
      if (errorCount > 0) {
        setError(`Imported ${validated.length} users. ${errorCount} have issues that need fixing.`)
      } else {
        setError(null)
      }
    }
    reader.readAsText(file)

    // Reset file input so same file can be re-uploaded
    e.target.value = ''
  }

  // ── Form validation ──

  const validateForm = (): boolean => {
    let hasError = false
    const updated = invitees.map((inv, i) => {
      if (!inv.email) {
        hasError = true
        return { ...inv, error: 'Email is required' }
      }
      const err = validateInvitee(inv.email, i)
      if (err) hasError = true
      return { ...inv, error: err }
    })
    setInvitees(updated)

    if (hasError) {
      setError('Please fix the highlighted errors before sending invitations.')
      return false
    }

    if (!selectedRole) {
      setError('Please select a role')
      return false
    }

    return true
  }

  // ── Submit ──

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!validateForm()) return

    setIsLoading(true)

    try {
      const promises = invitees.map((invitee) => {
        const request: CreateInvitationRequest = {
          email: invitee.email.trim(),
          role: selectedRole as OrganizationRole,
          department: selectedDepartment ? parseInt(selectedDepartment) : undefined,
          message: customMessage || undefined,
        }
        return createInvitation(request)
      })

      await Promise.all(promises)
      setSuccess(true)

      setTimeout(() => {
        onSuccess()
        onClose()
      }, 1500)
    } catch (err: any) {
      if (err.response?.data) {
        const errorData = err.response.data
        if (errorData.email) {
          setError(Array.isArray(errorData.email) ? errorData.email[0] : errorData.email)
        } else if (errorData.error) {
          setError(errorData.error)
        } else if (errorData.detail) {
          setError(errorData.detail)
        } else if (typeof errorData === 'string') {
          setError(errorData)
        } else {
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

  const validCount = invitees.filter((inv) => inv.email && !inv.error).length

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
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
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

            {/* Invitees Header with Actions */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Invite Users
                  {invitees.length > 1 && (
                    <span className="ml-2 text-xs font-normal text-gray-500">
                      ({validCount} of {invitees.length} valid)
                    </span>
                  )}
                </label>
                <div className="flex items-center gap-2">
                  {/* CSV Template Download */}
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
                    title="Download CSV template"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Template
                  </button>

                  {/* CSV Upload */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                    title="Upload CSV file"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Import CSV
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleCSVUpload}
                    className="hidden"
                  />

                  <div className="w-px h-4 bg-gray-300 dark:bg-gray-600" />

                  {/* Add Another */}
                  <button
                    type="button"
                    onClick={handleAddInvitee}
                    disabled={invitees.length >= 50}
                    className={cn(
                      'flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300',
                      invitees.length >= 50 && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add
                  </button>
                </div>
              </div>

              {/* Invitee Rows */}
              {invitees.map((invitee, index) => (
                <div key={index}>
                  <div
                    className={cn(
                      'grid grid-cols-12 gap-3 p-3 rounded-lg',
                      invitee.error
                        ? 'bg-red-50/50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/50'
                        : 'bg-gray-50 dark:bg-gray-700/50'
                    )}
                  >
                    <div className="col-span-5">
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="email"
                          placeholder="Email address *"
                          value={invitee.email}
                          onChange={(e) => handleInviteeChange(index, 'email', e.target.value)}
                          className={cn(
                            'w-full pl-10 pr-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:border-transparent',
                            invitee.error
                              ? 'border-red-300 dark:border-red-600 focus:ring-red-500'
                              : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'
                          )}
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
                  {/* Inline error message */}
                  {invitee.error && (
                    <p className="mt-1 ml-3 text-xs text-red-600 dark:text-red-400">
                      {invitee.error}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {/* Role and Department Selection */}
            <div className="grid grid-cols-2 gap-4">
              <CustomSelect
                value={selectedRole}
                onChange={(val) => setSelectedRole(val)}
                options={buildRoleOptions(roles)}
                icon={<Shield className="w-4 h-4" />}
                label="Role"
                required
                disabled={isLoadingRoles}
                searchable
                placeholder="Select role..."
              />

              <CustomSelect
                value={selectedDepartment}
                onChange={(val) => setSelectedDepartment(val)}
                options={buildDepartmentOptions(departments)}
                icon={<Building2 className="w-4 h-4" />}
                label="Department"
                disabled={isLoadingDepartments}
                searchable={departments.length > 5}
                placeholder="Select department..."
              />
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
              disabled={isLoading || success || validCount === 0}
              className={cn(
                'flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg transition-colors',
                isLoading || success || validCount === 0
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:bg-blue-700'
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
                  Send {validCount > 1 ? `${validCount} Invitations` : 'Invitation'}
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
