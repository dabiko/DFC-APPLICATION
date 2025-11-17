/**
 * UserRoleManager Component
 * Manage user role assignments
 */

import { FC, useState } from 'react'
import {
  UserIcon,
  ShieldCheckIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline'
import { cn } from '@utils/cn'
import type { UserRoleManagerProps } from '@/types/rbac'
import { SYSTEM_ROLES } from '@/types/rbac'
import { formatDistanceToNow } from 'date-fns'

export const UserRoleManager: FC<UserRoleManagerProps> = ({
  users,
  availableRoles,
  onRoleChange,
  onUserDeactivate,
  onUserActivate,
  canManageRoles,
  className,
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')

  // Filter users
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesRole = roleFilter === 'all' || user.role === roleFilter
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && user.isActive) ||
      (statusFilter === 'inactive' && !user.isActive)

    return matchesSearch && matchesRole && matchesStatus
  })

  const getRoleBadgeColor = (roleName: string) => {
    const role = SYSTEM_ROLES.find((r) => r.name === roleName)
    return role?.color || 'gray'
  }

  const getRoleIcon = (roleName: string) => {
    const role = SYSTEM_ROLES.find((r) => r.name === roleName)
    return role?.icon || '👤'
  }

  const handleRoleChange = (userId: string, newRole: string) => {
    if (!canManageRoles) return

    const reason = prompt('Reason for role change (optional):')
    onRoleChange(userId, newRole, reason || undefined)
  }

  const getRoleBadgeClasses = (color: string) => {
    const colorClasses = {
      gray: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
      blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
      green: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
      orange: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
      red: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    }

    return cn(
      'inline-flex items-center gap-1 px-2.5 py-1 text-sm font-medium rounded-full',
      colorClasses[color as keyof typeof colorClasses] || colorClasses.gray
    )
  }

  return (
    <div
      className={cn(
        'bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            User Role Management
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {filteredUsers.length} of {users.length} users
          </p>
        </div>

        {!canManageRoles && (
          <div className="flex items-center gap-2 px-3 py-2 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 rounded-lg text-sm">
            <ShieldCheckIcon className="w-4 h-4" />
            Read-only mode
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 space-y-4">
        {/* Search */}
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search users by name or email..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        {/* Role and Status Filters */}
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Role
            </label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              <option value="all">All Roles</option>
              {availableRoles.map((role) => (
                <option key={role.id} value={role.name}>
                  {role.displayName}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              <option value="all">All Users</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* User List */}
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {filteredUsers.length === 0 ? (
          <div className="p-8 text-center">
            <UserIcon className="w-12 h-12 mx-auto text-gray-400 mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No users found matching your filters
            </p>
          </div>
        ) : (
          filteredUsers.map((user) => (
            <div
              key={user.id}
              className={cn(
                'p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors',
                !user.isActive && 'opacity-60'
              )}
            >
              <div className="flex items-start justify-between gap-4">
                {/* User Info */}
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    {user.avatar ? (
                      <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                        <UserIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {user.name}
                      </h3>
                      {!user.isActive && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs rounded-full">
                          <XCircleIcon className="w-3 h-3" />
                          Inactive
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5">
                      {user.email}
                    </p>
                    {user.department && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {user.department}
                      </p>
                    )}
                    {user.lastLogin && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        Last login{' '}
                        {formatDistanceToNow(new Date(user.lastLogin), { addSuffix: true })}
                      </p>
                    )}
                  </div>
                </div>

                {/* Role & Actions */}
                <div className="flex items-center gap-3">
                  {/* Current Role Badge */}
                  <span className={getRoleBadgeClasses(getRoleBadgeColor(user.role))}>
                    <span className="text-base">{getRoleIcon(user.role)}</span>
                    {SYSTEM_ROLES.find((r) => r.name === user.role)?.displayName || user.role}
                  </span>

                  {/* Role Selector */}
                  {canManageRoles && user.isActive && (
                    <select
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.id, e.target.value)}
                      className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500"
                    >
                      {availableRoles.map((role) => (
                        <option key={role.id} value={role.name}>
                          {role.displayName}
                        </option>
                      ))}
                    </select>
                  )}

                  {/* Activate/Deactivate */}
                  {canManageRoles && (
                    <button
                      onClick={() =>
                        user.isActive ? onUserDeactivate?.(user.id) : onUserActivate?.(user.id)
                      }
                      className={cn(
                        'p-2 rounded-md transition-colors',
                        user.isActive
                          ? 'hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400'
                          : 'hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600 dark:text-green-400'
                      )}
                      title={user.isActive ? 'Deactivate user' : 'Activate user'}
                    >
                      {user.isActive ? (
                        <XCircleIcon className="w-5 h-5" />
                      ) : (
                        <CheckCircleIcon className="w-5 h-5" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
