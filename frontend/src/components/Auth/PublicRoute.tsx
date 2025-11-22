import { Navigate } from 'react-router-dom'
import { authService } from '@/services/auth.service'

interface PublicRouteProps {
  children: React.ReactNode
  /**
   * Where to redirect if user is already authenticated (default: /dashboard)
   */
  redirectTo?: string
}

/**
 * PublicRoute Component
 * Wraps routes that should only be accessible to unauthenticated users
 * (e.g., login, signup, forgot password)
 * Redirects to dashboard if user is already authenticated
 */
export function PublicRoute({ children, redirectTo = '/dashboard' }: PublicRouteProps) {
  const isAuthenticated = authService.isAuthenticated()

  if (isAuthenticated) {
    // Redirect to dashboard if already logged in
    return <Navigate to={redirectTo} replace />
  }

  return <>{children}</>
}
