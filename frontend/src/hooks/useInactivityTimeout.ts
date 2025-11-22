import { useEffect, useRef, useState, useCallback } from 'react'

interface UseInactivityTimeoutOptions {
  /**
   * Warning timeout in milliseconds (default: 5 minutes)
   */
  warningTimeout?: number
  /**
   * Logout timeout in milliseconds (default: 10 minutes)
   */
  logoutTimeout?: number
  /**
   * Callback function to execute when warning is triggered
   */
  onWarning?: () => void
  /**
   * Callback function to execute when logout is triggered
   */
  onLogout?: () => void
  /**
   * Whether to enable the inactivity timeout (default: true)
   */
  enabled?: boolean
}

/**
 * Custom hook to handle user inactivity timeout
 * Monitors user activity and triggers warning and logout callbacks
 *
 * @param options - Configuration options
 * @returns Object with showWarning state and resetActivity function
 *
 * @example
 * const { showWarning, resetActivity } = useInactivityTimeout({
 *   warningTimeout: 5 * 60 * 1000, // 5 minutes
 *   logoutTimeout: 10 * 60 * 1000, // 10 minutes
 *   onWarning: () => setShowWarningModal(true),
 *   onLogout: () => handleLogout()
 * })
 */
export function useInactivityTimeout({
  warningTimeout = 5 * 60 * 1000, // 5 minutes default
  logoutTimeout = 10 * 60 * 1000, // 10 minutes default
  onWarning,
  onLogout,
  enabled = true,
}: UseInactivityTimeoutOptions = {}) {
  const [showWarning, setShowWarning] = useState(false)
  const warningTimerRef = useRef<NodeJS.Timeout | null>(null)
  const logoutTimerRef = useRef<NodeJS.Timeout | null>(null)

  /**
   * Clear all active timers
   */
  const clearTimers = useCallback(() => {
    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current)
      warningTimerRef.current = null
    }
    if (logoutTimerRef.current) {
      clearTimeout(logoutTimerRef.current)
      logoutTimerRef.current = null
    }
  }, [])

  /**
   * Reset activity timers
   */
  const resetActivity = useCallback(() => {
    if (!enabled) return

    // Clear existing timers
    clearTimers()

    // Hide warning if it was showing
    setShowWarning(false)

    // Set warning timer
    warningTimerRef.current = setTimeout(() => {
      setShowWarning(true)
      onWarning?.()
    }, warningTimeout)

    // Set logout timer
    logoutTimerRef.current = setTimeout(() => {
      onLogout?.()
    }, logoutTimeout)
  }, [enabled, warningTimeout, logoutTimeout, onWarning, onLogout, clearTimers])

  /**
   * Handle user activity events
   */
  const handleActivity = useCallback(() => {
    resetActivity()
  }, [resetActivity])

  useEffect(() => {
    if (!enabled) {
      clearTimers()
      return
    }

    // List of events to track for user activity
    const events: (keyof DocumentEventMap)[] = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click',
    ]

    // Add event listeners for all activity events
    events.forEach((event) => {
      document.addEventListener(event, handleActivity)
    })

    // Initialize timers
    resetActivity()

    // Cleanup function
    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, handleActivity)
      })
      clearTimers()
    }
  }, [enabled, handleActivity, resetActivity, clearTimers])

  return {
    showWarning,
    resetActivity,
  }
}
