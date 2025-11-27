/**
 * UsersTab Component
 *
 * User management interface with list/grid views, filtering, and user actions.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Search,
  Filter,
  List,
  Grid3X3,
  UserPlus,
  Download,
  MoreVertical,
  User,
  Building2,
  Shield,
  Unlock,
  Key,
  Edit,
  CheckCircle,
  XCircle,
  Loader2,
  ChevronDown,
  X,
  ShieldCheck,
} from 'lucide-react'
import {
  getUsers,
  getDepartments,
  activateUser,
  deactivateUser,
  unlockUser,
  resetUserPassword,
  exportUsers,
  downloadBlob,
  getUserStatus,
  getStatusColorClasses,
  getRoleColorClasses,
  getUserInitials,
  formatRelativeTime,
  type User as UserType,
  type UserFilters,
  type Department,
  type UserStatus,
  type OrganizationRole,
  ROLE_OPTIONS,
  STATUS_OPTIONS,
} from '@/services/userManagementService'
import { InviteUserModal } from './InviteUserModal'
import { EditUserModal } from './EditUserModal'
import { UserDetailPanel } from './UserDetailPanel'
import { cn } from '@/utils/cn'

interface UsersTabProps {
  onRefresh?: () => void
}

// ============================================================================
// FILTER DROPDOWN COMPONENT
// ============================================================================

interface FilterDropdownProps {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
  icon?: React.ReactNode
}

function FilterDropdown({ label, value, options, onChange, icon }: FilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectedOption = options.find((opt) => opt.value === value)

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-colors',
          value
            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-600 text-blue-700 dark:text-blue-300'
            : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
        )}
      >
        {icon}
        <span>{selectedOption?.label || label}</span>
        <ChevronDown className={cn('w-4 h-4 transition-transform', isOpen && 'rotate-180')} />
      </button>
      {isOpen && (
        <div className="absolute z-50 mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 max-h-64 overflow-y-auto">
          <button
            onClick={() => {
              onChange('')
              setIsOpen(false)
            }}
            className={cn(
              'w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700',
              !value && 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
            )}
          >
            All {label}s
          </button>
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                onChange(option.value)
                setIsOpen(false)
              }}
              className={cn(
                'w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700',
                value === option.value &&
                  'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// USER ACTION MENU
// ============================================================================

interface UserActionMenuProps {
  user: UserType
  onEdit: () => void
  onActivate: () => void
  onDeactivate: () => void
  onUnlock: () => void
  onResetPassword: () => void
  onViewDetails: () => void
}

function UserActionMenu({
  user,
  onEdit,
  onActivate,
  onDeactivate,
  onUnlock,
  onResetPassword,
  onViewDetails,
}: UserActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const status = getUserStatus(user)
  const isLocked = status === 'locked'

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation()
          setIsOpen(!isOpen)
        }}
        className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
      >
        <MoreVertical className="w-4 h-4 text-gray-500" />
      </button>
      {isOpen && (
        <div className="absolute right-0 z-50 mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1">
          <button
            onClick={() => {
              onViewDetails()
              setIsOpen(false)
            }}
            className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
          >
            <User className="w-4 h-4" />
            View Details
          </button>
          <button
            onClick={() => {
              onEdit()
              setIsOpen(false)
            }}
            className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
          >
            <Edit className="w-4 h-4" />
            Edit User
          </button>
          <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
          {isLocked ? (
            <button
              onClick={() => {
                onUnlock()
                setIsOpen(false)
              }}
              className="w-full px-3 py-2 text-left text-sm text-green-600 dark:text-green-400 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
            >
              <Unlock className="w-4 h-4" />
              Unlock Account
            </button>
          ) : null}
          {user.is_active ? (
            <button
              onClick={() => {
                onDeactivate()
                setIsOpen(false)
              }}
              className="w-full px-3 py-2 text-left text-sm text-orange-600 dark:text-orange-400 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
            >
              <XCircle className="w-4 h-4" />
              Deactivate
            </button>
          ) : (
            <button
              onClick={() => {
                onActivate()
                setIsOpen(false)
              }}
              className="w-full px-3 py-2 text-left text-sm text-green-600 dark:text-green-400 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              Activate
            </button>
          )}
          <button
            onClick={() => {
              onResetPassword()
              setIsOpen(false)
            }}
            className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
          >
            <Key className="w-4 h-4" />
            Reset Password
          </button>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// USER ROW COMPONENT
// ============================================================================

interface UserRowProps {
  user: UserType
  isSelected: boolean
  onSelect: (selected: boolean) => void
  onEdit: () => void
  onActivate: () => void
  onDeactivate: () => void
  onUnlock: () => void
  onResetPassword: () => void
  onViewDetails: () => void
}

function UserRow({
  user,
  isSelected,
  onSelect,
  onEdit,
  onActivate,
  onDeactivate,
  onUnlock,
  onResetPassword,
  onViewDetails,
}: UserRowProps) {
  const status = getUserStatus(user)
  const statusColors = getStatusColorClasses(status)
  const roleColors = user.role ? getRoleColorClasses(user.role) : null

  return (
    <tr
      onClick={onViewDetails}
      className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors border-b border-gray-100 dark:border-gray-800"
    >
      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => onSelect(e.target.checked)}
          className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
        />
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          {user.avatar ? (
            <img src={user.avatar} alt="" className="w-10 h-10 rounded-full" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold text-sm">
              {getUserInitials(user)}
            </div>
          )}
          <div>
            <div className="font-medium text-gray-900 dark:text-gray-100">
              {user.first_name} {user.last_name}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">{user.email}</div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        {roleColors ? (
          <span
            className={cn(
              'text-xs font-medium px-2 py-1 rounded-full',
              roleColors.bg,
              roleColors.text
            )}
          >
            {ROLE_OPTIONS.find((r) => r.value === user.role)?.label || user.role}
          </span>
        ) : (
          <span className="text-sm text-gray-500 dark:text-gray-400">-</span>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="text-sm text-gray-900 dark:text-gray-100">
          {user.department_name || '-'}
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'text-xs font-medium px-2 py-1 rounded-full',
              statusColors.bg,
              statusColors.text
            )}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </span>
          {user.mfa_enabled && (
            <ShieldCheck className="w-4 h-4 text-green-500" title="MFA Enabled" />
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
        {formatRelativeTime(user.last_login)}
      </td>
      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
        <UserActionMenu
          user={user}
          onEdit={onEdit}
          onActivate={onActivate}
          onDeactivate={onDeactivate}
          onUnlock={onUnlock}
          onResetPassword={onResetPassword}
          onViewDetails={onViewDetails}
        />
      </td>
    </tr>
  )
}

// ============================================================================
// USER CARD COMPONENT
// ============================================================================

interface UserCardProps {
  user: UserType
  isSelected: boolean
  onSelect: (selected: boolean) => void
  onEdit: () => void
  onActivate: () => void
  onDeactivate: () => void
  onUnlock: () => void
  onResetPassword: () => void
  onViewDetails: () => void
}

function UserCard({
  user,
  isSelected,
  onSelect,
  onEdit,
  onActivate,
  onDeactivate,
  onUnlock,
  onResetPassword,
  onViewDetails,
}: UserCardProps) {
  const status = getUserStatus(user)
  const statusColors = getStatusColorClasses(status)
  const roleColors = user.role ? getRoleColorClasses(user.role) : null

  return (
    <div
      onClick={onViewDetails}
      className={cn(
        'bg-white dark:bg-gray-800 rounded-xl border p-4 transition-all cursor-pointer hover:shadow-md',
        isSelected
          ? 'border-blue-500 ring-2 ring-blue-500/20'
          : 'border-gray-200 dark:border-gray-700'
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div onClick={(e) => e.stopPropagation()}>
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => onSelect(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
            />
          </div>
          {user.avatar ? (
            <img src={user.avatar} alt="" className="w-12 h-12 rounded-full" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold">
              {getUserInitials(user)}
            </div>
          )}
        </div>
        <div onClick={(e) => e.stopPropagation()}>
          <UserActionMenu
            user={user}
            onEdit={onEdit}
            onActivate={onActivate}
            onDeactivate={onDeactivate}
            onUnlock={onUnlock}
            onResetPassword={onResetPassword}
            onViewDetails={onViewDetails}
          />
        </div>
      </div>

      <div className="mb-3">
        <div className="font-medium text-gray-900 dark:text-gray-100">
          {user.first_name} {user.last_name}
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">{user.email}</div>
        {user.job_title && (
          <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">{user.job_title}</div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span
          className={cn(
            'text-xs font-medium px-2 py-1 rounded-full',
            statusColors.bg,
            statusColors.text
          )}
        >
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
        {roleColors && (
          <span
            className={cn(
              'text-xs font-medium px-2 py-1 rounded-full',
              roleColors.bg,
              roleColors.text
            )}
          >
            {ROLE_OPTIONS.find((r) => r.value === user.role)?.label || user.role}
          </span>
        )}
        {user.mfa_enabled && (
          <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
            <ShieldCheck className="w-3 h-3" />
            MFA
          </span>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-1">
          <Building2 className="w-3 h-3" />
          <span>{user.department_name || 'No department'}</span>
        </div>
        <span>Last login: {formatRelativeTime(user.last_login)}</span>
      </div>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function UsersTab({ onRefresh }: UsersTabProps) {
  // State
  const [users, setUsers] = useState<UserType[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [totalCount, setTotalCount] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)

  // View state
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
  const [showFilters, setShowFilters] = useState(true)
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set())

  // Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('')
  const [mfaFilter, setMfaFilter] = useState('')

  // Modal state
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [editingUser, setEditingUser] = useState<UserType | null>(null)
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null)
  const [showDetailPanel, setShowDetailPanel] = useState(false)

  const PAGE_SIZE = 20

  // Build filters
  const buildFilters = useCallback((): UserFilters => {
    const filters: UserFilters = {
      page_size: PAGE_SIZE,
      page: 1,
    }

    if (searchQuery) filters.search = searchQuery
    if (statusFilter) filters.status = statusFilter as UserStatus
    if (roleFilter) filters.role = roleFilter as OrganizationRole
    if (departmentFilter) filters.department = parseInt(departmentFilter)
    if (mfaFilter === 'enabled') filters.mfa_enabled = true
    if (mfaFilter === 'disabled') filters.mfa_enabled = false

    return filters
  }, [searchQuery, statusFilter, roleFilter, departmentFilter, mfaFilter])

  // Fetch users
  const fetchUsers = useCallback(async () => {
    setIsLoading(true)
    try {
      const filters = buildFilters()
      const response = await getUsers(filters)
      setUsers(response.results)
      setTotalCount(response.count)
      setHasMore(!!response.next)
      setPage(1)
    } catch (error) {
      console.error('Failed to fetch users:', error)
    } finally {
      setIsLoading(false)
    }
  }, [buildFilters])

  // Fetch more users
  const fetchMoreUsers = useCallback(async () => {
    if (isLoadingMore || !hasMore) return

    setIsLoadingMore(true)
    try {
      const filters = buildFilters()
      filters.page = page + 1
      const response = await getUsers(filters)
      setUsers((prev) => [...prev, ...response.results])
      setHasMore(!!response.next)
      setPage((prev) => prev + 1)
    } catch (error) {
      console.error('Failed to fetch more users:', error)
    } finally {
      setIsLoadingMore(false)
    }
  }, [buildFilters, page, hasMore, isLoadingMore])

  // Fetch departments
  const fetchDepartments = useCallback(async () => {
    try {
      const data = await getDepartments()
      setDepartments(data)
    } catch (error) {
      console.error('Failed to fetch departments:', error)
    }
  }, [])

  // Initial fetch
  useEffect(() => {
    fetchUsers()
    fetchDepartments()
  }, [fetchUsers, fetchDepartments])

  // Refetch when filters change
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      fetchUsers()
    }, 300)
    return () => clearTimeout(debounceTimer)
  }, [statusFilter, roleFilter, departmentFilter, mfaFilter, fetchUsers])

  // Debounced search
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      fetchUsers()
    }, 500)
    return () => clearTimeout(debounceTimer)
  }, [searchQuery, fetchUsers])

  // User actions
  const handleActivateUser = async (user: UserType) => {
    try {
      await activateUser(user.id)
      fetchUsers()
      onRefresh?.()
    } catch (error) {
      console.error('Failed to activate user:', error)
    }
  }

  const handleDeactivateUser = async (user: UserType) => {
    try {
      await deactivateUser(user.id)
      fetchUsers()
      onRefresh?.()
    } catch (error) {
      console.error('Failed to deactivate user:', error)
    }
  }

  const handleUnlockUser = async (user: UserType) => {
    try {
      await unlockUser(user.id)
      fetchUsers()
      onRefresh?.()
    } catch (error) {
      console.error('Failed to unlock user:', error)
    }
  }

  const handleResetPassword = async (user: UserType) => {
    try {
      await resetUserPassword(user.id)
      // Show success notification
    } catch (error) {
      console.error('Failed to reset password:', error)
    }
  }

  const handleExport = async () => {
    try {
      const filters = buildFilters()
      const blob = await exportUsers(filters)
      downloadBlob(blob, `users-export-${new Date().toISOString().split('T')[0]}.csv`)
    } catch (error) {
      console.error('Failed to export users:', error)
    }
  }

  // Selection handlers
  const handleSelectUser = (userId: string, selected: boolean) => {
    setSelectedUsers((prev) => {
      const next = new Set(prev)
      if (selected) {
        next.add(userId)
      } else {
        next.delete(userId)
      }
      return next
    })
  }

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedUsers(new Set(users.map((u) => u.id)))
    } else {
      setSelectedUsers(new Set())
    }
  }

  // Clear filters
  const clearFilters = () => {
    setSearchQuery('')
    setStatusFilter('')
    setRoleFilter('')
    setDepartmentFilter('')
    setMfaFilter('')
  }

  const hasActiveFilters =
    searchQuery || statusFilter || roleFilter || departmentFilter || mfaFilter

  const departmentOptions = departments.map((d) => ({ value: d.id.toString(), label: d.name }))

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex-shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between gap-4 mb-3">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search users by name or email..."
              className="w-full pl-10 pr-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                <X className="w-3 h-3 text-gray-500" />
              </button>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                'flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-colors',
                showFilters
                  ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-600 text-blue-700 dark:text-blue-300'
                  : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              )}
            >
              <Filter className="w-4 h-4" />
              <span>Filters</span>
              {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-blue-500" />}
            </button>

            {/* View Toggle */}
            <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  'p-2 rounded-md transition-colors',
                  viewMode === 'list'
                    ? 'bg-white dark:bg-gray-600 shadow-sm'
                    : 'hover:bg-gray-200 dark:hover:bg-gray-600'
                )}
                title="List view"
              >
                <List className="w-4 h-4 text-gray-600 dark:text-gray-300" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={cn(
                  'p-2 rounded-md transition-colors',
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-gray-600 shadow-sm'
                    : 'hover:bg-gray-200 dark:hover:bg-gray-600'
                )}
                title="Grid view"
              >
                <Grid3X3 className="w-4 h-4 text-gray-600 dark:text-gray-300" />
              </button>
            </div>

            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export</span>
            </button>

            <button
              onClick={() => setShowInviteModal(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              <span>Invite User</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="flex flex-wrap items-center gap-3">
            <FilterDropdown
              label="Status"
              value={statusFilter}
              options={STATUS_OPTIONS}
              onChange={setStatusFilter}
              icon={<CheckCircle className="w-4 h-4" />}
            />
            <FilterDropdown
              label="Role"
              value={roleFilter}
              options={ROLE_OPTIONS.map((r) => ({ value: r.value, label: r.label }))}
              onChange={setRoleFilter}
              icon={<Shield className="w-4 h-4" />}
            />
            <FilterDropdown
              label="Department"
              value={departmentFilter}
              options={departmentOptions}
              onChange={setDepartmentFilter}
              icon={<Building2 className="w-4 h-4" />}
            />
            <FilterDropdown
              label="MFA"
              value={mfaFilter}
              options={[
                { value: 'enabled', label: 'MFA Enabled' },
                { value: 'disabled', label: 'MFA Disabled' },
              ]}
              onChange={setMfaFilter}
              icon={<ShieldCheck className="w-4 h-4" />}
            />
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                Clear all
              </button>
            )}
          </div>
        )}

        {/* Bulk Actions */}
        {selectedUsers.size > 0 && (
          <div className="mt-3 flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
              {selectedUsers.size} user{selectedUsers.size > 1 ? 's' : ''} selected
            </span>
            <button className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
              Change Role
            </button>
            <button className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
              Change Department
            </button>
            <button className="text-sm text-red-600 dark:text-red-400 hover:underline">
              Deactivate
            </button>
            <button
              onClick={() => setSelectedUsers(new Set())}
              className="ml-auto text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              Clear selection
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <User className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">
              No users found
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {hasActiveFilters ? 'Try adjusting your filters' : 'Invite users to get started'}
            </p>
            {hasActiveFilters ? (
              <button
                onClick={clearFilters}
                className="mt-4 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Clear filters
              </button>
            ) : (
              <button
                onClick={() => setShowInviteModal(true)}
                className="mt-4 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Invite User
              </button>
            )}
          </div>
        ) : viewMode === 'list' ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedUsers.size === users.length && users.length > 0}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Department
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Last Login
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <UserRow
                      key={user.id}
                      user={user}
                      isSelected={selectedUsers.has(user.id)}
                      onSelect={(selected) => handleSelectUser(user.id, selected)}
                      onEdit={() => setEditingUser(user)}
                      onActivate={() => handleActivateUser(user)}
                      onDeactivate={() => handleDeactivateUser(user)}
                      onUnlock={() => handleUnlockUser(user)}
                      onResetPassword={() => handleResetPassword(user)}
                      onViewDetails={() => {
                        setSelectedUser(user)
                        setShowDetailPanel(true)
                      }}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {users.map((user) => (
              <UserCard
                key={user.id}
                user={user}
                isSelected={selectedUsers.has(user.id)}
                onSelect={(selected) => handleSelectUser(user.id, selected)}
                onEdit={() => setEditingUser(user)}
                onActivate={() => handleActivateUser(user)}
                onDeactivate={() => handleDeactivateUser(user)}
                onUnlock={() => handleUnlockUser(user)}
                onResetPassword={() => handleResetPassword(user)}
                onViewDetails={() => {
                  setSelectedUser(user)
                  setShowDetailPanel(true)
                }}
              />
            ))}
          </div>
        )}

        {/* Load More */}
        {!isLoading && users.length > 0 && (
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            {isLoadingMore && (
              <div className="flex items-center gap-2 text-gray-500">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm">Loading more...</span>
              </div>
            )}
            {hasMore && !isLoadingMore && (
              <button
                onClick={fetchMoreUsers}
                className="px-6 py-2.5 text-sm font-medium bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Load More ({users.length} of {totalCount})
              </button>
            )}
            {!hasMore && users.length > 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Showing all {users.length} users
              </p>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <InviteUserModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onSuccess={() => {
          fetchUsers()
          onRefresh?.()
        }}
        departments={departments}
      />

      <EditUserModal
        isOpen={!!editingUser}
        user={editingUser}
        onClose={() => setEditingUser(null)}
        onSuccess={() => {
          fetchUsers()
          onRefresh?.()
        }}
        departments={departments}
      />

      <UserDetailPanel
        isOpen={showDetailPanel}
        user={selectedUser}
        onClose={() => {
          setShowDetailPanel(false)
          setSelectedUser(null)
        }}
        onEdit={() => {
          if (selectedUser) {
            setEditingUser(selectedUser)
          }
        }}
      />
    </div>
  )
}
