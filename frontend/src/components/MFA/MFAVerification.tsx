import React, { useState } from 'react'
import {
  ShieldCheckIcon,
  KeyIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import type { MFAVerificationProps, MFAVerificationState } from '@/types/mfa'
import { validateMFACode, validateBackupCode, generateDeviceFingerprint } from '@/types/mfa'

export const MFAVerification: React.FC<MFAVerificationProps> = ({
  onVerify,
  onCancel,
  method = 'totp',
  allowBackupCode = true,
  allowTrustDevice = true,
  remainingAttempts,
  loading = false,
}) => {
  const [state, setState] = useState<MFAVerificationState>({
    code: '',
    method: method,
    trustDevice: false,
    error: undefined,
    remainingAttempts: remainingAttempts,
    isLocked: false,
  })
  const [useBackupCode, setUseBackupCode] = useState(false)

  const handleCodeChange = (value: string) => {
    if (useBackupCode) {
      // Backup codes: alphanumeric
      setState({
        ...state,
        code: value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10),
        error: undefined,
      })
    } else {
      // TOTP codes: numeric only
      setState({
        ...state,
        code: value.replace(/\D/g, '').slice(0, 6),
        error: undefined,
      })
    }
  }

  const handleVerify = async () => {
    // Validate code format
    const isValid = useBackupCode
      ? validateBackupCode(state.code)
      : validateMFACode(state.code)

    if (!isValid) {
      setState({
        ...state,
        error: useBackupCode
          ? 'Invalid backup code format'
          : 'Code must be 6 digits',
      })
      return
    }

    try {
      const response = await onVerify({
        code: state.code,
        method: useBackupCode ? 'backup_code' : state.method,
        trustDevice: state.trustDevice,
        deviceFingerprint: state.trustDevice ? generateDeviceFingerprint() : undefined,
      })

      if (!response.verified) {
        setState({
          ...state,
          error: response.message || 'Invalid code. Please try again.',
          remainingAttempts: response.remainingAttempts,
          isLocked: !!response.lockoutUntil,
          code: '',
        })
      }
    } catch (error) {
      setState({
        ...state,
        error: 'Verification failed. Please try again.',
        code: '',
      })
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && state.code.length >= (useBackupCode ? 8 : 6)) {
      handleVerify()
    }
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full mb-3">
            <ShieldCheckIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Two-Factor Authentication
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {useBackupCode
              ? 'Enter one of your backup codes'
              : 'Enter the 6-digit code from your authenticator app'}
          </p>
        </div>

        {/* Lockout Warning */}
        {state.isLocked && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex gap-2">
              <ExclamationTriangleIcon className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-300">
                Too many failed attempts. Please try again later.
              </p>
            </div>
          </div>
        )}

        {/* Code Input */}
        <div className="mb-4">
          <input
            type="text"
            value={state.code}
            onChange={(e) => handleCodeChange(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={state.isLocked || loading}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white text-center text-2xl font-mono tracking-widest focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder={useBackupCode ? 'XXXXXXXX' : '000000'}
            maxLength={useBackupCode ? 10 : 6}
            autoFocus
          />
          {state.error && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">{state.error}</p>
          )}
          {state.remainingAttempts !== undefined && state.remainingAttempts <= 3 && (
            <p className="mt-2 text-sm text-orange-600 dark:text-orange-400">
              {state.remainingAttempts} attempt{state.remainingAttempts !== 1 ? 's' : ''} remaining
            </p>
          )}
        </div>

        {/* Trust Device */}
        {allowTrustDevice && !state.isLocked && (
          <div className="mb-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={state.trustDevice}
                onChange={(e) => setState({ ...state, trustDevice: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Trust this device for 30 days
              </span>
            </label>
          </div>
        )}

        {/* Verify Button */}
        <button
          onClick={handleVerify}
          disabled={
            state.code.length < (useBackupCode ? 8 : 6) ||
            state.isLocked ||
            loading
          }
          className="w-full px-4 py-3 text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors mb-3"
        >
          {loading ? 'Verifying...' : 'Verify'}
        </button>

        {/* Backup Code Toggle */}
        {allowBackupCode && !state.isLocked && (
          <button
            onClick={() => {
              setUseBackupCode(!useBackupCode)
              setState({ ...state, code: '', error: undefined })
            }}
            className="w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <KeyIcon className="w-4 h-4 inline mr-1" />
            {useBackupCode ? 'Use authenticator code' : 'Use backup code instead'}
          </button>
        )}

        {/* Cancel Button */}
        {onCancel && (
          <button
            onClick={onCancel}
            className="w-full mt-3 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  )
}
