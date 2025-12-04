import React, { useState } from 'react'
import {
  ShieldCheckIcon,
  KeyIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'
import type { MFASettingsProps, MFADisableRequest } from '@/types/mfa'
import { getMFAStatusColor, getMFAStatusLabel, getMFAMethodLabel } from '@/types/mfa'
import { format } from 'date-fns'

export const MFASettings: React.FC<MFASettingsProps> = ({
  config,
  onEnable,
  onDisable,
  onRegenerateBackupCodes,
  onViewBackupCodes,
  loading = false,
}) => {
  const [showDisableModal, setShowDisableModal] = useState(false)
  const [disableToken, setDisableToken] = useState('')
  const [disabling, setDisabling] = useState(false)
  const [disableError, setDisableError] = useState<string | null>(null)
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false)

  const statusColors = getMFAStatusColor(config.enabled ? 'enabled' : 'disabled')

  const handleDisable = async () => {
    if (!disableToken || disableToken.length !== 6) {
      setDisableError('Please enter a valid 6-digit code')
      return
    }

    setDisabling(true)
    setDisableError(null)
    try {
      const request: MFADisableRequest = {
        token: disableToken,
      }
      await onDisable(request)
      setShowDisableModal(false)
      setDisableToken('')
    } catch (error: any) {
      console.error('Failed to disable MFA:', error)

      // Extract specific error message from API response
      const responseData = error?.response?.data
      let errorMessage = 'Failed to disable MFA'

      if (responseData?.errors) {
        // Handle field-specific errors (e.g., { errors: { token: ["Invalid verification code"] } })
        const fieldErrors = responseData.errors
        if (fieldErrors.token && Array.isArray(fieldErrors.token)) {
          errorMessage = fieldErrors.token[0]
        } else if (fieldErrors.non_field_errors && Array.isArray(fieldErrors.non_field_errors)) {
          errorMessage = fieldErrors.non_field_errors[0]
        } else {
          // Get first error from any field
          const firstField = Object.keys(fieldErrors)[0]
          if (firstField && Array.isArray(fieldErrors[firstField])) {
            errorMessage = fieldErrors[firstField][0]
          }
        }
      } else if (responseData?.message) {
        errorMessage = responseData.message
      } else if (error?.message) {
        errorMessage = error.message
      }

      setDisableError(errorMessage)
    } finally {
      setDisabling(false)
    }
  }

  const handleRegenerateCodes = () => {
    setShowRegenerateConfirm(true)
  }

  const handleConfirmRegenerate = async () => {
    setShowRegenerateConfirm(false)
    try {
      await onRegenerateBackupCodes()
    } catch (error) {
      console.error('Failed to regenerate backup codes:', error)
    }
  }

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg ${statusColors.bg}`}>
              <ShieldCheckIcon className={`w-6 h-6 ${statusColors.text}`} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Two-Factor Authentication
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {config.enabled
                  ? 'Your account is protected with two-factor authentication'
                  : 'Add an extra layer of security to your account'}
              </p>
            </div>
          </div>
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${statusColors.bg} ${statusColors.text}`}
          >
            {getMFAStatusLabel(config.enabled ? 'enabled' : 'disabled')}
          </span>
        </div>

        {config.enabled && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Method</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {getMFAMethodLabel(config.method)}
              </p>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Last Verified</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {config.lastVerifiedAt
                  ? format(new Date(config.lastVerifiedAt), 'MMM d, yyyy')
                  : 'Never'}
              </p>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Backup Codes</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {config.backupCodesRemaining} remaining
              </p>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          {config.enabled ? (
            <button
              onClick={() => setShowDisableModal(true)}
              disabled={loading}
              className="px-4 py-2 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Disable MFA
            </button>
          ) : (
            <button
              onClick={onEnable}
              disabled={loading}
              className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : 'Enable MFA'}
            </button>
          )}
        </div>
      </div>

      {/* Backup Codes Card */}
      {config.enabled && config.backupCodesGenerated && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-start gap-3 mb-4">
            <KeyIcon className="w-6 h-6 text-gray-600 dark:text-gray-400" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                Backup Codes
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Use backup codes to access your account if you lose your authenticator device
              </p>
            </div>
          </div>

          {config.backupCodesRemaining <= 2 && (
            <div className="mb-4 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
              <div className="flex gap-2">
                <ExclamationTriangleIcon className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0" />
                <p className="text-sm text-orange-700 dark:text-orange-300">
                  You're running low on backup codes. Consider regenerating them.
                </p>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onViewBackupCodes}
              className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg font-medium transition-colors"
            >
              View Codes
            </button>
            <button
              onClick={handleRegenerateCodes}
              disabled={loading}
              className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowPathIcon className="w-4 h-4 inline mr-1" />
              Regenerate
            </button>
          </div>
        </div>
      )}

      {/* Activity Card */}
      {config.enabled && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-start gap-3 mb-4">
            <ClockIcon className="w-6 h-6 text-gray-600 dark:text-gray-400" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                Recent Activity
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Two-factor authentication security events
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700">
              <span className="text-sm text-gray-700 dark:text-gray-300">Enabled</span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {format(new Date(config.createdAt), 'MMM d, yyyy')}
              </span>
            </div>
            {config.lastVerifiedAt && (
              <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                <span className="text-sm text-gray-700 dark:text-gray-300">Last verified</span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {format(new Date(config.lastVerifiedAt), 'MMM d, yyyy')}
                </span>
              </div>
            )}
            {config.updatedAt !== config.createdAt && (
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-700 dark:text-gray-300">Last updated</span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {format(new Date(config.updatedAt), 'MMM d, yyyy')}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Disable MFA Modal */}
      {showDisableModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Disable Two-Factor Authentication
            </h3>

            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex gap-2">
                <ExclamationTriangleIcon className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                <p className="text-sm text-red-700 dark:text-red-300">
                  Disabling MFA will make your account less secure. Your backup codes will no longer
                  work.
                </p>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Verification Code
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  Enter the 6-digit code from your authenticator app to confirm
                </p>
                <input
                  type="text"
                  value={disableToken}
                  onChange={(e) => {
                    setDisableToken(e.target.value.replace(/\D/g, '').slice(0, 6))
                    setDisableError(null)
                  }}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 text-center text-2xl tracking-widest"
                  placeholder="000000"
                  maxLength={6}
                  autoFocus
                />
              </div>

              {disableError && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-600 dark:text-red-400">{disableError}</p>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDisableModal(false)
                  setDisableToken('')
                  setDisableError(null)
                }}
                className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDisable}
                disabled={disableToken.length !== 6 || disabling}
                className="flex-1 px-4 py-2 text-white bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {disabling ? 'Disabling...' : 'Disable MFA'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Regenerate Backup Codes Confirmation Modal */}
      {showRegenerateConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                <ArrowPathIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Regenerate Backup Codes?
              </h3>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              This will invalidate all your current backup codes. Make sure you have access to your
              authenticator app before proceeding. You'll need to save the new codes in a secure
              location.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowRegenerateConfirm(false)}
                className="flex-1 px-4 py-2.5 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRegenerate}
                className="flex-1 px-4 py-2.5 text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-lg font-medium transition-colors"
              >
                Yes, Regenerate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
