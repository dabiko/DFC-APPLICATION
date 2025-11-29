import { useState, useCallback, useRef } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { authService } from '@/services/auth.service'
import { useInactivityTimeout } from '@/hooks/useInactivityTimeout'
import { InactivityWarningModal } from './InactivityWarningModal'

interface ProtectedRouteProps {
  children: React.ReactNode
  /**
   * Whether to enable session timeout monitoring (default: true)
   */
  enableSessionTimeout?: boolean
  /**
   * Warning timeout in milliseconds (default: 5 minutes)
   */
  warningTimeout?: number
  /**
   * Logout timeout in milliseconds (default: 10 minutes)
   */
  logoutTimeout?: number
}

/**
 * ProtectedRoute Component
 * Wraps routes that require authentication
 * Includes session management with inactivity timeout
 * Redirects to login page if user is not authenticated
 */
export function ProtectedRoute({
  children,
  enableSessionTimeout = true,
  warningTimeout = 5 * 60 * 1000, // 5 minutes default
  logoutTimeout = 10 * 60 * 1000, // 10 minutes default
}: ProtectedRouteProps) {
  const navigate = useNavigate()
  const isAuthenticated = authService.isAuthenticated()
  const [showWarningModal, setShowWarningModal] = useState(false)

  // Use a ref to hold the resetActivity function so callbacks can access it
  const resetActivityRef = useRef<() => void>(() => {})

  /**
   * Handle logout - clears tokens and redirects to login
   */
  const handleLogout = useCallback(async () => {
    try {
      const refreshToken = authService.getRefreshToken()
      if (refreshToken) {
        await authService.logout(refreshToken)
      }
    } catch (error) {
      console.error('Session timeout logout error:', error)
    } finally {
      authService.clearTokens()
      navigate('/login', { state: { sessionExpired: true } })
    }
  }, [navigate])

  /**
   * Handle inactivity warning
   */
  const handleInactivityWarning = useCallback(() => {
    setShowWarningModal(true)
  }, [])

  /**
   * Handle staying active - resets timers and closes modal
   */
  const handleStayActive = useCallback(() => {
    setShowWarningModal(false)
    resetActivityRef.current()
  }, [])

  // Set up inactivity timeout - only when authenticated
  const { resetActivity } = useInactivityTimeout({
    warningTimeout,
    logoutTimeout,
    onWarning: handleInactivityWarning,
    onLogout: handleLogout,
    enabled: isAuthenticated && enableSessionTimeout,
  })

  // Update the ref when resetActivity changes
  resetActivityRef.current = resetActivity

  if (!isAuthenticated) {
    // Redirect to login page if not authenticated
    return <Navigate to="/login" replace />
  }

  return (
    <>
      {/* Session Inactivity Warning Modal */}
      {enableSessionTimeout && (
        <InactivityWarningModal
          isOpen={showWarningModal}
          onStayActive={handleStayActive}
          onLogout={handleLogout}
          countdownSeconds={Math.floor((logoutTimeout - warningTimeout) / 1000)}
        />
      )}
      {children}
    </>
  )
}
