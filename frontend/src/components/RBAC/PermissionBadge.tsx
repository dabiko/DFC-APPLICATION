/**
 * PermissionBadge Component
 * Display badge for permissions and access levels
 */

import { FC } from 'react'
import { cn } from '@utils/cn'
import type { PermissionBadgeProps, PermissionType, AccessLevel } from '@/types/rbac'
import {
  getPermissionLabel,
  getPermissionDescription,
  ACCESS_LEVEL_LABELS,
  ACCESS_LEVEL_COLORS,
  ALL_PERMISSIONS,
} from '@/types/rbac'

export const PermissionBadge: FC<PermissionBadgeProps> = ({
  permission,
  variant = 'permission',
  size = 'md',
  showTooltip = true,
  className,
}) => {
  const getPermissionColor = (perm: PermissionType): string => {
    const permissionData = ALL_PERMISSIONS.find((p) => p.type === perm)
    switch (permissionData?.category) {
      case 'document':
        return 'blue'
      case 'folder':
        return 'yellow'
      case 'system':
        return 'gray'
      case 'compliance':
        return 'red'
      default:
        return 'gray'
    }
  }

  const getBadgeClasses = (color: string) => {
    const baseClasses = 'inline-flex items-center gap-1 font-medium rounded-full'

    const sizeClasses = {
      sm: 'px-2 py-0.5 text-xs',
      md: 'px-2.5 py-1 text-sm',
      lg: 'px-3 py-1.5 text-base',
    }

    const colorClasses = {
      gray: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
      blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
      green: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
      yellow: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
      red: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
      orange: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    }

    return cn(
      baseClasses,
      sizeClasses[size],
      colorClasses[color as keyof typeof colorClasses] || colorClasses.gray,
      className
    )
  }

  if (variant === 'access-level') {
    const accessLevel = permission as AccessLevel
    const color = ACCESS_LEVEL_COLORS[accessLevel]
    const label = ACCESS_LEVEL_LABELS[accessLevel]

    const getAccessLevelIcon = () => {
      switch (accessLevel) {
        case 'none':
          return '🚫'
        case 'read':
          return '👁️'
        case 'write':
          return '✏️'
        case 'admin':
          return '🔑'
        default:
          return ''
      }
    }

    return (
      <span
        className={getBadgeClasses(color)}
        title={showTooltip ? `Access Level: ${label}` : undefined}
      >
        <span className="text-base">{getAccessLevelIcon()}</span>
        {label}
      </span>
    )
  }

  // Permission variant
  const perm = permission as PermissionType
  const color = getPermissionColor(perm)
  const label = getPermissionLabel(perm)
  const description = getPermissionDescription(perm)

  return (
    <span className={getBadgeClasses(color)} title={showTooltip ? description : undefined}>
      {label}
    </span>
  )
}
