import { useEffect, useState } from 'react'
import { AlertCircle, X } from 'lucide-react'
import { Button } from '@components/Button/Button'

interface InactivityWarningModalProps {
  /**
   * Whether the modal is visible
   */
  isOpen: boolean
  /**
   * Callback when user clicks "Stay Logged In"
   */
  onStayActive: () => void
  /**
   * Callback when user clicks "Logout"
   */
  onLogout: () => void
  /**
   * Countdown duration in seconds (default: 300 for 5 minutes)
   */
  countdownSeconds?: number
}

/**
 * InactivityWarningModal Component
 * Displays a warning modal when user has been inactive
 * Shows a countdown timer and options to stay active or logout
 */
export function InactivityWarningModal({
  isOpen,
  onStayActive,
  onLogout,
  countdownSeconds = 300, // 5 minutes default
}: InactivityWarningModalProps) {
  const [secondsRemaining, setSecondsRemaining] = useState(countdownSeconds)

  useEffect(() => {
    if (!isOpen) {
      setSecondsRemaining(countdownSeconds)
      return
    }

    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          onLogout()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [isOpen, countdownSeconds, onLogout])

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md mx-4 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Session Timeout Warning
            </h2>
          </div>
          <button
            onClick={onStayActive}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-gray-600 dark:text-gray-300">
            You have been inactive for a while. For your security, your session will expire soon.
          </p>

          {/* Countdown Timer */}
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Time until automatic logout:
            </p>
            <p className="text-4xl font-bold text-yellow-600 dark:text-yellow-400">
              {formatTime(secondsRemaining)}
            </p>
          </div>

          <p className="text-sm text-gray-500 dark:text-gray-400">
            Click "Stay Logged In" to continue your session, or "Logout" to end it now.
          </p>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <Button variant="outline" fullWidth onClick={onLogout}>
            Logout
          </Button>
          <Button variant="primary" fullWidth onClick={onStayActive}>
            Stay Logged In
          </Button>
        </div>
      </div>
    </div>
  )
}
