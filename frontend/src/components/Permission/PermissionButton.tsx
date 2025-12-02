/**
 * PermissionButton Component
 *
 * A button that only renders/enables based on RBAC permissions.
 * Useful for action buttons that require specific permissions.
 *
 * SECURITY NOTE:
 * - This component is for UI/UX purposes ONLY
 * - Backend MUST enforce permissions on every API call triggered by clicks
 * - Global checks use server-provided permission summary
 * - For resource-level checks, use the document/folder props
 *   (checks via backend API in PermissionGate would be more secure)
 *
 * Usage:
 * ```tsx
 * <PermissionButton
 *   permission="can_upload"
 *   folder={currentFolder}
 *   onClick={handleUpload}
 *   variant="primary"
 * >
 *   <Upload className="w-4 h-4" />
 *   Upload
 * </PermissionButton>
 * ```
 */

import { FC, ReactNode, ButtonHTMLAttributes, useState, useEffect } from 'react'
import { usePermissions, type PermissionAction } from '@/contexts/PermissionContext'
import { cn } from '@/utils/cn'
import { LockClosedIcon } from '@heroicons/react/24/outline'

interface PermissionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Permission(s) required to enable the button */
  permission: PermissionAction | PermissionAction[]
  /** If true, all permissions are required. If false, any permission is sufficient */
  requireAll?: boolean
  /** Document to check permission against (optional for resource-level) */
  document?: { id: string; owner_id?: string; owner?: { id: string } }
  /** Folder to check permission against (optional for resource-level) */
  folder?: { id: string; owner_id?: string; owner?: { id: string } }
  /** Button content */
  children: ReactNode
  /** Visual variant */
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
  /** If true, hide button instead of disabling when no permission */
  hideWhenDenied?: boolean
  /** Show lock icon when disabled due to permission */
  showLockIcon?: boolean
  /** Custom tooltip when disabled */
  disabledTooltip?: string
}

export const PermissionButton: FC<PermissionButtonProps> = ({
  permission,
  requireAll = true,
  document,
  folder,
  children,
  variant = 'secondary',
  size = 'md',
  hideWhenDenied = false,
  showLockIcon = false,
  disabledTooltip = 'You do not have permission to perform this action',
  className,
  disabled,
  ...buttonProps
}) => {
  const {
    hasAnyGlobalPermission,
    hasAllGlobalPermissions,
    checkDocumentPermission,
    checkFolderPermission,
    isLoading: permissionsLoading,
  } = usePermissions()

  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [isChecking, setIsChecking] = useState(true)

  // Normalize permissions to array
  const permissions = Array.isArray(permission) ? permission : [permission]

  useEffect(() => {
    const checkPermissions = async () => {
      // Wait for global permissions to load
      if (permissionsLoading) {
        return
      }

      setIsChecking(true)

      // SECURITY: No client-side admin/owner bypasses
      // Backend handles admin and owner checks

      // Resource-level permission check via backend API
      if (document?.id) {
        try {
          const results = await Promise.all(
            permissions.map((p) => checkDocumentPermission(document.id, p))
          )

          const allowed = requireAll
            ? results.every((r) => r.allowed)
            : results.some((r) => r.allowed)

          setHasPermission(allowed)
        } catch {
          // SECURITY: On error, deny permission (fail-secure)
          setHasPermission(false)
        }
        setIsChecking(false)
        return
      }

      if (folder?.id) {
        try {
          const results = await Promise.all(
            permissions.map((p) => checkFolderPermission(folder.id, p))
          )

          const allowed = requireAll
            ? results.every((r) => r.allowed)
            : results.some((r) => r.allowed)

          setHasPermission(allowed)
        } catch {
          // SECURITY: On error, deny permission (fail-secure)
          setHasPermission(false)
        }
        setIsChecking(false)
        return
      }

      // Global permission check (uses server-provided permission summary)
      // SECURITY: These functions only use data from permissionSummary fetched from server
      const allowed = requireAll
        ? hasAllGlobalPermissions(permissions)
        : hasAnyGlobalPermission(permissions)

      setHasPermission(allowed)
      setIsChecking(false)
    }

    checkPermissions()
  }, [
    document?.id,
    folder?.id,
    permissions.join(','),
    requireAll,
    permissionsLoading,
    hasAnyGlobalPermission,
    hasAllGlobalPermissions,
    checkDocumentPermission,
    checkFolderPermission,
  ])

  // Still loading
  if (isChecking || permissionsLoading || hasPermission === null) {
    // Show disabled button while checking
    return (
      <button
        {...buttonProps}
        disabled={true}
        className={cn(
          'inline-flex items-center justify-center gap-2 font-medium transition-colors rounded-lg cursor-not-allowed opacity-50',
          className
        )}
      >
        {children}
      </button>
    )
  }

  // Hide button if no permission and hideWhenDenied is true
  if (!hasPermission && hideWhenDenied) {
    return null
  }

  // Button styles based on variant and size
  const baseStyles =
    'inline-flex items-center justify-center gap-2 font-medium transition-colors rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2'

  const variantStyles = {
    primary:
      'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500 disabled:bg-primary-300 dark:disabled:bg-primary-800',
    secondary:
      'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 focus:ring-gray-500 disabled:bg-gray-100 dark:disabled:bg-gray-900',
    danger:
      'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 disabled:bg-red-300 dark:disabled:bg-red-800',
    ghost:
      'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 focus:ring-gray-500',
  }

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  }

  const isDisabled = disabled || !hasPermission

  return (
    <button
      {...buttonProps}
      disabled={isDisabled}
      title={isDisabled && !disabled ? disabledTooltip : buttonProps.title}
      className={cn(
        baseStyles,
        variantStyles[variant],
        sizeStyles[size],
        isDisabled && 'cursor-not-allowed opacity-50',
        className
      )}
    >
      {showLockIcon && !hasPermission && <LockClosedIcon className="w-4 h-4 text-gray-400" />}
      {children}
    </button>
  )
}

/**
 * PermissionIconButton - Icon-only button with permission check
 *
 * SECURITY: This is for UI/UX only. Backend must enforce permissions.
 */
interface PermissionIconButtonProps extends Omit<PermissionButtonProps, 'children' | 'size'> {
  icon: ReactNode
  size?: 'sm' | 'md' | 'lg'
  label: string // For accessibility
}

export const PermissionIconButton: FC<PermissionIconButtonProps> = ({
  icon,
  size = 'md',
  label,
  className,
  ...props
}) => {
  const sizeStyles = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-3',
  }

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  }

  return (
    <PermissionButton
      {...props}
      size={size}
      className={cn(sizeStyles[size], 'rounded-full', className)}
      aria-label={label}
    >
      <span className={iconSizes[size]}>{icon}</span>
    </PermissionButton>
  )
}

export default PermissionButton
