import { AlertTriangle, ShieldX, RefreshCw } from 'lucide-react'

interface ErrorStateProps {
  /** The error message or status code string */
  error: string
  /** Callback to retry the failed operation */
  onRetry?: () => void
  /** Optional custom title override */
  title?: string
}

/**
 * Detects whether an error is a permission/403 error from various message formats.
 */
function isPermissionError(error: string): boolean {
  const lower = error.toLowerCase()
  return (
    lower.includes('status code 403') ||
    lower.includes('403') ||
    lower.includes('permission') ||
    lower.includes('forbidden') ||
    lower.includes('not authorized')
  )
}

/**
 * ErrorState component
 *
 * Displays a user-friendly error message. Automatically detects 403/permission
 * errors and shows a distinct "Access Denied" view instead of a generic error.
 */
export function ErrorState({ error, onRetry, title }: ErrorStateProps) {
  const isPermission = isPermissionError(error)

  if (isPermission) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="p-6 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-200 dark:border-amber-800/50 max-w-md text-center">
          <div className="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-4">
            <ShieldX className="h-7 w-7 text-amber-600 dark:text-amber-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            {title || 'Access Restricted'}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
            You don't have permission to view this section.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            Contact your administrator if you believe this is a mistake.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center h-64">
      <div className="p-6 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800 max-w-md text-center">
        <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="h-7 w-7 text-red-500" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
          {title || 'Something went wrong'}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{error}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors text-sm font-medium"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        )}
      </div>
    </div>
  )
}
