/**
 * PermissionGate Component
 *
 * Conditionally renders children based on user permissions.
 * Supports both global permissions and resource-level permissions.
 *
 * SECURITY NOTE:
 * - This component is for UI/UX purposes ONLY
 * - Backend MUST enforce permissions on every API call
 * - Resource-level checks call the backend API
 * - Global checks use server-provided permission summary
 * - No client-side bypasses for admin/owner - backend handles this
 *
 * Usage:
 * ```tsx
 * // Global permission check
 * <PermissionGate permission="can_manage_permissions">
 *   <AdminPanel />
 * </PermissionGate>
 *
 * // Document permission check
 * <PermissionGate permission="can_edit" document={document}>
 *   <EditButton />
 * </PermissionGate>
 *
 * // Folder permission check
 * <PermissionGate permission="can_delete" folder={folder}>
 *   <DeleteButton />
 * </PermissionGate>
 *
 * // With fallback
 * <PermissionGate permission="can_edit" fallback={<ViewOnlyMessage />}>
 *   <EditForm />
 * </PermissionGate>
 *
 * // Multiple permissions (any)
 * <PermissionGate permissions={['can_edit', 'can_delete']} requireAll={false}>
 *   <ModifyButton />
 * </PermissionGate>
 * ```
 */

import { ReactNode, useState, useEffect, useRef } from 'react'
import { usePermissions, type PermissionAction } from '@/contexts/PermissionContext'

interface BaseGateProps {
  /** Content to render when permission is granted */
  children: ReactNode
  /** Content to render when permission is denied */
  fallback?: ReactNode
  /** Show loading indicator while checking permissions */
  showLoading?: boolean
  /** Custom loading component */
  loadingComponent?: ReactNode
}

interface SinglePermissionProps extends BaseGateProps {
  /** Single permission to check */
  permission: PermissionAction
  permissions?: never
  requireAll?: never
}

interface MultiplePermissionsProps extends BaseGateProps {
  /** Multiple permissions to check */
  permissions: PermissionAction[]
  /** If true, all permissions are required. If false, any permission is sufficient */
  requireAll?: boolean
  permission?: never
}

interface ResourceProps {
  /** Document to check permission on */
  document?: { id: string; owner_id?: string; owner?: { id: string } }
  /** Folder to check permission on */
  folder?: { id: string; owner_id?: string; owner?: { id: string } }
}

type PermissionGateProps = (SinglePermissionProps | MultiplePermissionsProps) & ResourceProps

export function PermissionGate({
  children,
  fallback = null,
  showLoading = false,
  loadingComponent,
  document,
  folder,
  ...props
}: PermissionGateProps) {
  const {
    hasAnyGlobalPermission,
    hasAllGlobalPermissions,
    checkDocumentPermission,
    checkFolderPermission,
    isLoading: permissionsLoading,
    isAdmin,
  } = usePermissions()

  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const mountedRef = useRef(true)

  // Get the permissions to check
  const permissionsToCheck: PermissionAction[] =
    'permission' in props && props.permission
      ? [props.permission]
      : 'permissions' in props && props.permissions
        ? props.permissions
        : []

  const requireAll = 'requireAll' in props ? (props.requireAll ?? true) : true

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    const checkPermissions = async () => {
      // Wait for global permissions to load
      if (permissionsLoading) {
        return
      }

      setIsLoading(true)

      // ADMIN BYPASS: If user is admin/superuser (from server-validated permissionSummary),
      // grant all permissions immediately without API calls
      // This is safe because isAdmin is derived from server-validated permissionSummary
      if (isAdmin) {
        if (mountedRef.current) {
          setHasPermission(true)
          setIsLoading(false)
        }
        return
      }

      // Resource-level permission check via backend API
      if (document?.id) {
        try {
          const results = await Promise.all(
            permissionsToCheck.map((p) => checkDocumentPermission(document.id, p))
          )

          if (mountedRef.current) {
            const allowed = requireAll
              ? results.every((r) => r.allowed)
              : results.some((r) => r.allowed)

            setHasPermission(allowed)
          }
        } catch {
          // SECURITY: On error, deny access (fail-secure)
          if (mountedRef.current) {
            setHasPermission(false)
          }
        }
        if (mountedRef.current) {
          setIsLoading(false)
        }
        return
      }

      if (folder?.id) {
        try {
          const results = await Promise.all(
            permissionsToCheck.map((p) => checkFolderPermission(folder.id, p))
          )

          if (mountedRef.current) {
            const allowed = requireAll
              ? results.every((r) => r.allowed)
              : results.some((r) => r.allowed)

            setHasPermission(allowed)
          }
        } catch {
          // SECURITY: On error, deny access (fail-secure)
          if (mountedRef.current) {
            setHasPermission(false)
          }
        }
        if (mountedRef.current) {
          setIsLoading(false)
        }
        return
      }

      // Global permission check (uses server-provided permission summary)
      // SECURITY: hasAllGlobalPermissions and hasAnyGlobalPermission
      // only use data from permissionSummary fetched from server
      const allowed = requireAll
        ? hasAllGlobalPermissions(permissionsToCheck)
        : hasAnyGlobalPermission(permissionsToCheck)

      if (mountedRef.current) {
        setHasPermission(allowed)
        setIsLoading(false)
      }
    }

    checkPermissions()
  }, [
    document?.id,
    folder?.id,
    permissionsToCheck.join(','),
    requireAll,
    permissionsLoading,
    hasAnyGlobalPermission,
    hasAllGlobalPermissions,
    checkDocumentPermission,
    checkFolderPermission,
    isAdmin,
  ])

  // Loading state
  if ((isLoading || permissionsLoading) && showLoading) {
    return <>{loadingComponent || <DefaultLoadingIndicator />}</>
  }

  // Still loading but not showing indicator
  if (hasPermission === null) {
    return null
  }

  // Permission granted
  if (hasPermission) {
    return <>{children}</>
  }

  // Permission denied
  return <>{fallback}</>
}

/**
 * Default loading indicator
 */
function DefaultLoadingIndicator() {
  return (
    <span className="inline-block w-4 h-4 border-2 border-gray-300 border-t-primary-500 rounded-full animate-spin" />
  )
}

/**
 * PermissionGate for admin-only content
 *
 * SECURITY: isAdmin is derived from server-provided permissionSummary
 * This is for UI/UX only - backend must enforce admin checks
 */
export function AdminGate({
  children,
  fallback = null,
  showLoading = false,
}: {
  children: ReactNode
  fallback?: ReactNode
  showLoading?: boolean
}) {
  const { isAdmin, isLoading } = usePermissions()

  if (isLoading && showLoading) {
    return <DefaultLoadingIndicator />
  }

  if (isLoading) {
    return null
  }

  // SECURITY: isAdmin is derived from server-validated permissionSummary
  if (isAdmin) {
    return <>{children}</>
  }

  return <>{fallback}</>
}

/**
 * PermissionGate for admin or manager content
 *
 * SECURITY: isAdminOrManager is derived from server-provided permissionSummary
 * This is for UI/UX only - backend must enforce manager checks
 */
export function ManagerGate({
  children,
  fallback = null,
  showLoading = false,
}: {
  children: ReactNode
  fallback?: ReactNode
  showLoading?: boolean
}) {
  const { isAdminOrManager, isLoading } = usePermissions()

  if (isLoading && showLoading) {
    return <DefaultLoadingIndicator />
  }

  if (isLoading) {
    return null
  }

  // SECURITY: isAdminOrManager is derived from server-validated permissionSummary
  if (isAdminOrManager) {
    return <>{children}</>
  }

  return <>{fallback}</>
}

/**
 * PermissionGate for owner-only content
 *
 * SECURITY WARNING: This component makes client-side owner checks.
 * - Use only for UI hints, not security decisions
 * - Backend MUST validate ownership on every API call
 * - Consider using PermissionGate with document/folder props instead
 *   which validates via backend API
 *
 * @deprecated Prefer PermissionGate with resource props for server-validated checks
 */
export function OwnerGate({
  children,
  fallback = null,
  ownerId,
  showLoading = false,
}: {
  children: ReactNode
  fallback?: ReactNode
  ownerId?: string
  showLoading?: boolean
}) {
  const { isAdmin, isLoading } = usePermissions()

  if (isLoading && showLoading) {
    return <DefaultLoadingIndicator />
  }

  if (isLoading) {
    return null
  }

  // SECURITY NOTE: This is a client-side check for UI/UX only
  // Backend MUST validate ownership on every API call
  // isAdmin is from server-validated permissionSummary
  if (isAdmin) {
    return <>{children}</>
  }

  // WARNING: Client-side owner check - for UI only
  // Backend must verify ownership
  if (ownerId) {
    // We need to get user from somewhere - this is problematic
    // This component should be deprecated in favor of PermissionGate
    // which validates via backend API
    console.warn(
      '[OwnerGate] Client-side owner check is for UI only. Backend must enforce ownership.'
    )
  }

  return <>{fallback}</>
}

/**
 * Higher-order component for permission-gated components
 *
 * SECURITY: Wraps component with PermissionGate which validates
 * via backend API for resource-level permissions
 */
export function withPermission<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  permission: PermissionAction | PermissionAction[],
  options?: {
    requireAll?: boolean
    fallback?: ReactNode
  }
): React.FC<P & ResourceProps> {
  const permissions = Array.isArray(permission) ? permission : [permission]
  const requireAll = options?.requireAll ?? true

  return function PermissionWrappedComponent(props: P & ResourceProps) {
    const { document, folder, ...componentProps } = props

    return (
      <PermissionGate
        permissions={permissions}
        requireAll={requireAll}
        document={document}
        folder={folder}
        fallback={options?.fallback}
      >
        <WrappedComponent {...(componentProps as P)} />
      </PermissionGate>
    )
  }
}

export default PermissionGate
