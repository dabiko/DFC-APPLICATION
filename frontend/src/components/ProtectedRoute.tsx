import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@hooks/useAuth'
import type { ReactNode } from 'react'

interface ProtectedRouteProps {
  children: ReactNode
  /** Required role(s) to access this route */
  requiredRole?: string | string[]
  /** Required department(s) to access this route */
  requiredDepartment?: string | string[]
  /** Redirect path if not authenticated (default: /login) */
  redirectTo?: string
}

/**
 * ProtectedRoute component
 *
 * Protects routes from unauthorized access.
 * Redirects to login if user is not authenticated.
 * Optionally checks for specific roles or departments.
 *
 * @example
 * ```tsx
 * <Route
 *   path="/dashboard"
 *   element={
 *     <ProtectedRoute>
 *       <DashboardPage />
 *     </ProtectedRoute>
 *   }
 * />
 *
 * // With role requirement
 * <ProtectedRoute requiredRole="admin">
 *   <AdminPanel />
 * </ProtectedRoute>
 *
 * // With multiple roles
 * <ProtectedRoute requiredRole={['admin', 'manager']}>
 *   <ManagementPanel />
 * </ProtectedRoute>
 * ```
 */
export const ProtectedRoute = ({
  children,
  requiredRole,
  requiredDepartment,
  redirectTo = '/login',
}: ProtectedRouteProps) => {
  const location = useLocation()
  const { isAuthenticated, hasRole, hasDepartment, user } = useAuth()

  // Check if user is authenticated
  if (!isAuthenticated) {
    // Redirect to login while saving the attempted location
    return <Navigate to={redirectTo} state={{ from: location }} replace />
  }

  // Check role requirement
  if (requiredRole && !hasRole(requiredRole)) {
    // User is authenticated but doesn't have required role
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
          <div className="mb-4">
            <svg
              className="mx-auto h-12 w-12 text-error-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">
            Access Denied
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            You don't have permission to access this page.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mb-6">
            Your role: <span className="font-semibold">{user?.role}</span>
            <br />
            Required role:{' '}
            <span className="font-semibold">
              {Array.isArray(requiredRole) ? requiredRole.join(', ') : requiredRole}
            </span>
          </p>
          <button
            onClick={() => window.history.back()}
            className="text-primary-600 dark:text-primary-400 hover:underline"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  // Check department requirement
  if (requiredDepartment && !hasDepartment(requiredDepartment)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
          <div className="mb-4">
            <svg
              className="mx-auto h-12 w-12 text-error-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">
            Access Denied
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            This page is only accessible to specific departments.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mb-6">
            Your department: <span className="font-semibold">{user?.department}</span>
            <br />
            Required department:{' '}
            <span className="font-semibold">
              {Array.isArray(requiredDepartment)
                ? requiredDepartment.join(', ')
                : requiredDepartment}
            </span>
          </p>
          <button
            onClick={() => window.history.back()}
            className="text-primary-600 dark:text-primary-400 hover:underline"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  // User is authenticated and has required permissions
  return <>{children}</>
}
