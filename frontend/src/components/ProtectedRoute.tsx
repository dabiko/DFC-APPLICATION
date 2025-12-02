import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@hooks/useAuth'
import { usePermissions, type PermissionAction } from '@/contexts/PermissionContext'
import { AccessDenied } from '@/components/Permission/AccessDenied'
import type { ReactNode } from 'react'

interface ProtectedRouteProps {
  children: ReactNode
  /** Required role(s) to access this route */
  requiredRole?: string | string[]
  /** Required department(s) to access this route */
  requiredDepartment?: string | string[]
  /** Required RBAC permission(s) to access this route */
  requiredPermission?: PermissionAction | PermissionAction[]
  /** If true, all permissions are required. If false, any permission is sufficient (default: false for roles, true for permissions) */
  requireAll?: boolean
  /** Redirect path if not authenticated (default: /login) */
  redirectTo?: string
  /** Custom access denied component */
  accessDeniedComponent?: ReactNode
  /** Page name for display in access denied message */
  pageName?: string
}

/**
 * ProtectedRoute component
 *
 * Protects routes from unauthorized access.
 * Redirects to login if user is not authenticated.
 * Supports role-based, department-based, and RBAC permission-based access control.
 *
 * @example
 * ```tsx
 * // Basic protection (authentication only)
 * <ProtectedRoute>
 *   <ProtectedComponent />
 * </ProtectedRoute>
 *
 * // With role requirement
 * <ProtectedRoute requiredRole="admin">
 *   <AdminPanel />
 * </ProtectedRoute>
 *
 * // With multiple roles (any role matches)
 * <ProtectedRoute requiredRole={['admin', 'manager']}>
 *   <ManagementPanel />
 * </ProtectedRoute>
 *
 * // With RBAC permission requirement
 * <ProtectedRoute requiredPermission="can_manage_permissions">
 *   <PermissionManager />
 * </ProtectedRoute>
 *
 * // With multiple permissions (all required)
 * <ProtectedRoute
 *   requiredPermission={['can_view_audit_log', 'can_manage_retention']}
 *   requireAll={true}
 * >
 *   <ComplianceCenter />
 * </ProtectedRoute>
 * ```
 */
export const ProtectedRoute = ({
  children,
  requiredRole,
  requiredDepartment,
  requiredPermission,
  requireAll,
  redirectTo = '/login',
  accessDeniedComponent,
  pageName,
}: ProtectedRouteProps) => {
  const location = useLocation()
  const navigate = useNavigate()
  const { isAuthenticated, hasRole, hasDepartment, user } = useAuth()
  const { hasGlobalPermission, hasAnyGlobalPermission, hasAllGlobalPermissions, isAdmin } =
    usePermissions()

  // Check if user is authenticated
  if (!isAuthenticated) {
    // Redirect to login while saving the attempted location
    return <Navigate to={redirectTo} state={{ from: location }} replace />
  }

  // Admin bypass - admins have access to all pages
  if (isAdmin) {
    return <>{children}</>
  }

  // Check role requirement
  if (requiredRole) {
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole]
    const hasRequiredRole = hasRole(requiredRole)

    if (!hasRequiredRole) {
      if (accessDeniedComponent) {
        return <>{accessDeniedComponent}</>
      }

      return (
        <AccessDenied
          title="Access Denied"
          reason={`This page requires ${roles.length > 1 ? 'one of the following roles' : 'the role'}: ${roles.join(', ')}`}
          source="ROLE_REQUIRED"
          resourceType="page"
          resourceName={pageName || getPageNameFromPath(location.pathname)}
          onGoBack={() => navigate(-1)}
          onGoHome={() => navigate('/dashboard')}
        />
      )
    }
  }

  // Check department requirement
  if (requiredDepartment) {
    const departments = Array.isArray(requiredDepartment)
      ? requiredDepartment
      : [requiredDepartment]
    const hasRequiredDepartment = hasDepartment(requiredDepartment)

    if (!hasRequiredDepartment) {
      if (accessDeniedComponent) {
        return <>{accessDeniedComponent}</>
      }

      return (
        <AccessDenied
          title="Access Denied"
          reason={`This page is only accessible to the following departments: ${departments.join(', ')}`}
          source="DEPARTMENT_REQUIRED"
          resourceType="page"
          resourceName={pageName || getPageNameFromPath(location.pathname)}
          onGoBack={() => navigate(-1)}
          onGoHome={() => navigate('/dashboard')}
        />
      )
    }
  }

  // Check RBAC permission requirement
  if (requiredPermission) {
    const permissions = Array.isArray(requiredPermission)
      ? requiredPermission
      : [requiredPermission]

    // Default: any permission is sufficient for multiple, exact match for single
    const checkAll = requireAll ?? permissions.length === 1

    const hasRequiredPermission = checkAll
      ? hasAllGlobalPermissions(permissions)
      : hasAnyGlobalPermission(permissions)

    if (!hasRequiredPermission) {
      if (accessDeniedComponent) {
        return <>{accessDeniedComponent}</>
      }

      const permissionDisplay = permissions
        .map((p) => getPermissionDisplayName(p))
        .join(checkAll ? ' and ' : ' or ')

      return (
        <AccessDenied
          title="Access Denied"
          reason={`You do not have the required permission${permissions.length > 1 ? 's' : ''} to access this page.`}
          requiredPermission={permissions.join(', ')}
          source="PERMISSION_REQUIRED"
          resourceType="page"
          resourceName={pageName || getPageNameFromPath(location.pathname)}
          onGoBack={() => navigate(-1)}
          onGoHome={() => navigate('/dashboard')}
        />
      )
    }
  }

  // User is authenticated and has required permissions
  return <>{children}</>
}

/**
 * Get a display-friendly page name from the URL path
 */
function getPageNameFromPath(path: string): string {
  const pathMap: Record<string, string> = {
    '/dashboard': 'Dashboard',
    '/my-documents': 'My Documents',
    '/shared-with-me': 'Shared With Me',
    '/favorites': 'Favorites',
    '/recent': 'Recent Files',
    '/trash': 'Trash',
    '/settings': 'Settings',
    '/audit': 'Audit Logs',
    '/users': 'Users & Roles',
    '/retention': 'Retention Management',
    '/workflows': 'Workflow Center',
    '/automation': 'Automation',
    '/compliance': 'Compliance Center',
    '/organization-settings': 'Organization Settings',
    '/integrations': 'Integrations',
    '/admin/system': 'System Settings',
    '/billing': 'Billing',
  }

  return pathMap[path] || path.split('/').pop()?.replace(/-/g, ' ') || 'this page'
}

/**
 * Get display-friendly permission name
 */
function getPermissionDisplayName(permission: PermissionAction): string {
  const permissionMap: Record<PermissionAction, string> = {
    can_view: 'View',
    can_download: 'Download',
    can_upload: 'Upload',
    can_edit: 'Edit',
    can_delete: 'Delete',
    can_share: 'Share',
    can_manage_permissions: 'Manage Permissions',
    can_view_audit_log: 'View Audit Logs',
    can_manage_retention: 'Manage Retention',
    can_manage_classification: 'Manage Classification',
  }

  return permissionMap[permission] || permission
}

/**
 * Higher-order component for protecting components with permissions
 */
export function withProtectedRoute<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options: Omit<ProtectedRouteProps, 'children'>
): React.FC<P> {
  return function ProtectedComponent(props: P) {
    return (
      <ProtectedRoute {...options}>
        <WrappedComponent {...props} />
      </ProtectedRoute>
    )
  }
}
