/**
 * AccessDenied Component
 *
 * Displays an access denied message with details about why access was denied.
 * Used when users try to access resources they don't have permission for.
 *
 * Usage:
 * ```tsx
 * <AccessDenied
 *   title="Access Denied"
 *   reason="You do not have permission to edit this document"
 *   requiredPermission="can_edit"
 *   onGoBack={() => navigate(-1)}
 * />
 * ```
 */

import { FC } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ShieldExclamationIcon,
  LockClosedIcon,
  ArrowLeftIcon,
  HomeIcon,
} from '@heroicons/react/24/outline'
import { cn } from '@/utils/cn'

export interface AccessDeniedProps {
  /** Title of the access denied page */
  title?: string
  /** Detailed reason for access denial */
  reason?: string
  /** Source of the denial (e.g., 'FOLDER_PERMISSION', 'DOCUMENT_DENIED') */
  source?: string
  /** Required permission that was missing */
  requiredPermission?: string
  /** Resource type (document, folder, page) */
  resourceType?: 'document' | 'folder' | 'page' | 'feature'
  /** Resource name */
  resourceName?: string
  /** Callback when user clicks go back */
  onGoBack?: () => void
  /** Callback when user clicks go home */
  onGoHome?: () => void
  /** Show request access button */
  showRequestAccess?: boolean
  /** Callback when user requests access */
  onRequestAccess?: () => void
  /** Additional CSS classes */
  className?: string
  /** Variant: 'page' for full page, 'inline' for inline message */
  variant?: 'page' | 'inline' | 'compact'
}

export const AccessDenied: FC<AccessDeniedProps> = ({
  title = 'Access Denied',
  reason = 'You do not have permission to access this resource.',
  source,
  requiredPermission,
  resourceType,
  resourceName,
  onGoBack,
  onGoHome,
  showRequestAccess = false,
  onRequestAccess,
  className,
  variant = 'page',
}) => {
  const navigate = useNavigate()

  const handleGoBack = () => {
    if (onGoBack) {
      onGoBack()
    } else {
      navigate(-1)
    }
  }

  const handleGoHome = () => {
    if (onGoHome) {
      onGoHome()
    } else {
      navigate('/dashboard')
    }
  }

  // Get source display text
  const getSourceDisplay = (sourceCode?: string): string => {
    if (!sourceCode) return ''

    const sourceMap: Record<string, string> = {
      NO_PERMISSION: 'No permission granted',
      DOCUMENT_DENIED: 'Document access explicitly denied',
      FOLDER_PERMISSION: 'Folder-level restriction',
      DEPARTMENT: 'Department restriction',
      GLOBAL_ROLE: 'Role-based restriction',
      ADMIN_REQUIRED: 'Administrator privileges required',
      OWNER: 'Owner-only access',
      SUPERUSER: 'Superuser access required',
    }

    return sourceMap[sourceCode] || sourceCode
  }

  // Get permission display text
  const getPermissionDisplay = (permission?: string): string => {
    if (!permission) return ''

    const permissionMap: Record<string, string> = {
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

  // Compact variant (for inline use in cards, etc.)
  if (variant === 'compact') {
    return (
      <div
        className={cn('flex items-center gap-2 text-sm text-red-600 dark:text-red-400', className)}
      >
        <LockClosedIcon className="w-4 h-4" />
        <span>{reason}</span>
      </div>
    )
  }

  // Inline variant (for use within a page section)
  if (variant === 'inline') {
    return (
      <div
        className={cn(
          'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4',
          className
        )}
      >
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <ShieldExclamationIcon className="w-6 h-6 text-red-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-red-800 dark:text-red-200">{title}</h3>
            <p className="mt-1 text-sm text-red-700 dark:text-red-300">{reason}</p>

            {(source || requiredPermission) && (
              <div className="mt-2 text-xs text-red-600 dark:text-red-400">
                {source && <p>Reason: {getSourceDisplay(source)}</p>}
                {requiredPermission && (
                  <p>Required Permission: {getPermissionDisplay(requiredPermission)}</p>
                )}
              </div>
            )}

            {showRequestAccess && onRequestAccess && (
              <button
                onClick={onRequestAccess}
                className="mt-3 text-sm font-medium text-red-700 hover:text-red-800 dark:text-red-300 dark:hover:text-red-200"
              >
                Request Access
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Full page variant
  return (
    <div
      className={cn('min-h-[60vh] flex flex-col items-center justify-center px-4 py-16', className)}
    >
      <div className="max-w-md mx-auto text-center">
        {/* Icon */}
        <div className="mx-auto w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-6">
          <ShieldExclamationIcon className="w-10 h-10 text-red-500" />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">{title}</h1>

        {/* Resource info */}
        {resourceName && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            {resourceType && <span className="capitalize">{resourceType}: </span>}
            <span className="font-medium">{resourceName}</span>
          </p>
        )}

        {/* Reason */}
        <p className="text-gray-600 dark:text-gray-400 mb-6">{reason}</p>

        {/* Details */}
        {(source || requiredPermission) && (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-6 text-left">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Details</h4>
            <dl className="text-sm space-y-1">
              {source && (
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">Denial Reason:</dt>
                  <dd className="text-gray-900 dark:text-gray-100">{getSourceDisplay(source)}</dd>
                </div>
              )}
              {requiredPermission && (
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">Required Permission:</dt>
                  <dd className="text-gray-900 dark:text-gray-100">
                    {getPermissionDisplay(requiredPermission)}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={handleGoBack}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Go Back
          </button>

          <button
            onClick={handleGoHome}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
          >
            <HomeIcon className="w-4 h-4" />
            Go to Dashboard
          </button>
        </div>

        {/* Request Access */}
        {showRequestAccess && onRequestAccess && (
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              Need access to this resource?
            </p>
            <button
              onClick={onRequestAccess}
              className="text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
            >
              Request Access from Administrator
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Small inline access denied badge
 */
export const AccessDeniedBadge: FC<{ reason?: string }> = ({ reason = 'No access' }) => {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/30 rounded-full">
      <LockClosedIcon className="w-3 h-3" />
      {reason}
    </span>
  )
}

/**
 * Access denied card overlay
 */
export const AccessDeniedOverlay: FC<{
  show: boolean
  reason?: string
  onRequestAccess?: () => void
}> = ({ show, reason = 'Access Denied', onRequestAccess }) => {
  if (!show) return null

  return (
    <div className="absolute inset-0 bg-gray-900/50 dark:bg-gray-900/70 backdrop-blur-sm flex items-center justify-center rounded-lg z-10">
      <div className="text-center p-4">
        <LockClosedIcon className="w-8 h-8 text-white mx-auto mb-2" />
        <p className="text-white font-medium">{reason}</p>
        {onRequestAccess && (
          <button
            onClick={onRequestAccess}
            className="mt-2 text-sm text-white/80 hover:text-white underline"
          >
            Request Access
          </button>
        )}
      </div>
    </div>
  )
}

export default AccessDenied
