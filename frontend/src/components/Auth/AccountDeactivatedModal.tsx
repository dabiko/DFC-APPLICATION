import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldAlert, LogOut } from 'lucide-react'

/**
 * AccountDeactivatedModal
 *
 * Listens for the 'account-deactivated' custom event dispatched by apiClient
 * when a deactivated user's API request is rejected. Shows a modal explaining
 * what happened and redirects to login when dismissed.
 */
export function AccountDeactivatedModal() {
  const [show, setShow] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    function handleDeactivated() {
      setShow(true)
    }

    window.addEventListener('account-deactivated', handleDeactivated)
    return () => window.removeEventListener('account-deactivated', handleDeactivated)
  }, [])

  const handleDismiss = () => {
    setShow(false)
    navigate('/login?reason=account_deactivated')
  }

  if (!show) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Red top accent */}
        <div className="h-1.5 bg-gradient-to-r from-red-500 to-red-600" />

        <div className="p-6">
          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <ShieldAlert className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
          </div>

          {/* Title */}
          <h2 className="text-xl font-bold text-center text-gray-900 dark:text-gray-100 mb-2">
            Account Deactivated
          </h2>

          {/* Message */}
          <div className="text-center text-sm text-gray-600 dark:text-gray-400 space-y-3 mb-6">
            <p>
              Your account has been deactivated by an administrator. You have been logged out and
              will no longer be able to access the system.
            </p>
            <p>
              If you believe this is a mistake, please contact your system administrator to restore
              your account access.
            </p>
          </div>

          {/* Action */}
          <button
            onClick={handleDismiss}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Go to Login
          </button>
        </div>
      </div>
    </div>
  )
}
