import React, { useState, useEffect } from 'react'
import {
  ShieldCheckIcon,
  KeyIcon,
  ExclamationTriangleIcon,
  DevicePhoneMobileIcon,
  EnvelopeIcon,
} from '@heroicons/react/24/outline'
import type { MFAVerificationProps, MFAVerificationState } from '@/types/mfa'
import { validateMFACode, validateBackupCode, generateDeviceFingerprint } from '@/types/mfa'
import { mfaService } from '@/services/mfaService'

type VerificationMethod = 'totp' | 'sms' | 'email' | 'backup_code'

interface ExtendedMFAVerificationProps extends MFAVerificationProps {
  /** User ID for OTP verification */
  userId?: number | string
  /** Available MFA methods */
  availableMethods?: VerificationMethod[]
  /** User's email (for display) */
  userEmail?: string
  /** User's phone (for display) */
  userPhone?: string
}

export const MFAVerification: React.FC<ExtendedMFAVerificationProps> = ({
  onVerify,
  onCancel,
  method = 'totp',
  allowBackupCode = true,
  allowTrustDevice = true,
  remainingAttempts,
  loading = false,
  userId,
  availableMethods = ['totp'],
  userEmail,
  userPhone,
}) => {
  const [state, setState] = useState<MFAVerificationState>({
    code: '',
    method: method,
    trustDevice: false,
    error: undefined,
    remainingAttempts: remainingAttempts,
    isLocked: false,
  })
  const [activeMethod, setActiveMethod] = useState<VerificationMethod>(method as VerificationMethod)
  const [otpSent, setOtpSent] = useState(false)
  const [otpExpiry, setOtpExpiry] = useState<number | null>(null)
  const [otpMaskedDest, setOtpMaskedDest] = useState<string>('')
  const [sendingOtp, setSendingOtp] = useState(false)
  const [useBackupCode, setUseBackupCode] = useState(false)

  // Countdown timer for OTP expiry
  useEffect(() => {
    if (otpExpiry && otpExpiry > 0) {
      const timer = setInterval(() => {
        setOtpExpiry((prev) => (prev && prev > 0 ? prev - 1 : null))
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [otpExpiry])

  const handleSendOTP = async (otpMethod: 'sms' | 'email') => {
    if (!userId) {
      setState({ ...state, error: 'User ID is required for OTP verification' })
      return
    }

    setSendingOtp(true)
    setState({ ...state, error: undefined })

    try {
      const response = await mfaService.sendOTP({
        method: otpMethod,
        user_id: userId,
      })

      if (response.success) {
        setOtpSent(true)
        setOtpExpiry(response.data.expires_in)
        setOtpMaskedDest(response.data.masked_destination)
        setActiveMethod(otpMethod)
      } else {
        setState({ ...state, error: response.message || 'Failed to send verification code' })
      }
    } catch (error: any) {
      setState({ ...state, error: error.message || 'Failed to send verification code' })
    } finally {
      setSendingOtp(false)
    }
  }

  const handleCodeChange = (value: string) => {
    if (useBackupCode) {
      // Backup codes: alphanumeric, strip non-alphanumeric first
      const cleanValue = value
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .slice(0, 8)
      // Auto-format with dash after 4 characters for display
      const formattedValue =
        cleanValue.length > 4 ? `${cleanValue.slice(0, 4)}-${cleanValue.slice(4)}` : cleanValue
      setState({
        ...state,
        code: formattedValue,
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
    const isValid = useBackupCode ? validateBackupCode(state.code) : validateMFACode(state.code)

    if (!isValid) {
      setState({
        ...state,
        error: useBackupCode ? 'Invalid backup code format' : 'Code must be 6 digits',
      })
      return
    }

    try {
      // For SMS/Email OTP, use the OTP verify endpoint
      if ((activeMethod === 'sms' || activeMethod === 'email') && userId) {
        const otpResponse = await mfaService.verifyOTP({
          code: state.code,
          method: activeMethod,
          user_id: userId,
        })

        if (otpResponse.success) {
          // Call the parent's onVerify to complete the flow
          await onVerify({
            code: state.code,
            method: activeMethod,
            trustDevice: state.trustDevice,
            deviceFingerprint: state.trustDevice ? generateDeviceFingerprint() : undefined,
          })
        } else {
          setState({
            ...state,
            error: otpResponse.message || 'Invalid code. Please try again.',
            code: '',
          })
        }
        return
      }

      // For TOTP and backup codes, use the standard verify
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
    // Backup code with dash is 9 chars (XXXX-XXXX), TOTP is 6 digits
    if (e.key === 'Enter' && state.code.length >= (useBackupCode ? 9 : 6)) {
      handleVerify()
    }
  }

  const showMethodSelection = availableMethods.length > 1 && !useBackupCode

  const getMethodDescription = () => {
    if (useBackupCode) return 'Enter one of your backup codes'
    switch (activeMethod) {
      case 'totp':
        return 'Enter the 6-digit code from your authenticator app'
      case 'sms':
        return otpSent
          ? `Enter the code sent to ${otpMaskedDest}`
          : "We'll send a code to your phone"
      case 'email':
        return otpSent
          ? `Enter the code sent to ${otpMaskedDest}`
          : "We'll send a code to your email"
      default:
        return 'Enter your verification code'
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
          <p className="text-sm text-gray-600 dark:text-gray-400">{getMethodDescription()}</p>
        </div>

        {/* Method Selection Tabs */}
        {showMethodSelection && (
          <div className="flex gap-2 mb-4 p-1 bg-gray-100 dark:bg-gray-700 rounded-lg">
            {availableMethods.includes('totp') && (
              <button
                onClick={() => {
                  setActiveMethod('totp')
                  setOtpSent(false)
                  setState({ ...state, code: '', error: undefined })
                }}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeMethod === 'totp'
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <ShieldCheckIcon className="w-4 h-4" />
                Authenticator
              </button>
            )}
            {availableMethods.includes('sms') && userPhone && (
              <button
                onClick={() => {
                  setActiveMethod('sms')
                  setState({ ...state, code: '', error: undefined })
                }}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeMethod === 'sms'
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <DevicePhoneMobileIcon className="w-4 h-4" />
                SMS
              </button>
            )}
            {availableMethods.includes('email') && userEmail && (
              <button
                onClick={() => {
                  setActiveMethod('email')
                  setState({ ...state, code: '', error: undefined })
                }}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeMethod === 'email'
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <EnvelopeIcon className="w-4 h-4" />
                Email
              </button>
            )}
          </div>
        )}

        {/* Send OTP Button (for SMS/Email) */}
        {(activeMethod === 'sms' || activeMethod === 'email') && !otpSent && !useBackupCode && (
          <div className="mb-4">
            <button
              onClick={() => handleSendOTP(activeMethod)}
              disabled={sendingOtp || state.isLocked}
              className="w-full px-4 py-3 text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {sendingOtp
                ? 'Sending...'
                : `Send Code to ${activeMethod === 'sms' ? 'Phone' : 'Email'}`}
            </button>
          </div>
        )}

        {/* OTP Countdown */}
        {otpSent && otpExpiry !== null && otpExpiry > 0 && (
          <div className="mb-4 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Code expires in{' '}
              <span className="font-medium text-blue-600 dark:text-blue-400">
                {Math.floor(otpExpiry / 60)}:{(otpExpiry % 60).toString().padStart(2, '0')}
              </span>
            </p>
          </div>
        )}

        {/* Resend OTP (when expired) */}
        {otpSent && otpExpiry !== null && otpExpiry <= 0 && (
          <div className="mb-4 text-center">
            <p className="text-sm text-orange-600 dark:text-orange-400 mb-2">Code expired</p>
            <button
              onClick={() => handleSendOTP(activeMethod as 'sms' | 'email')}
              disabled={sendingOtp}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50"
            >
              {sendingOtp ? 'Sending...' : 'Resend code'}
            </button>
          </div>
        )}

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

        {/* Code Input - show for TOTP/backup always, for SMS/Email only after OTP sent */}
        {(activeMethod === 'totp' || useBackupCode || otpSent) && (
          <div className="mb-4">
            <input
              type="text"
              value={state.code}
              onChange={(e) => handleCodeChange(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={state.isLocked || loading}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white text-center text-2xl font-mono tracking-widest focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder={useBackupCode ? 'XXXX-XXXX' : '000000'}
              maxLength={useBackupCode ? 9 : 6}
              autoFocus
            />
            {state.error && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">{state.error}</p>
            )}
            {state.remainingAttempts !== undefined && state.remainingAttempts <= 3 && (
              <p className="mt-2 text-sm text-orange-600 dark:text-orange-400">
                {state.remainingAttempts} attempt{state.remainingAttempts !== 1 ? 's' : ''}{' '}
                remaining
              </p>
            )}
          </div>
        )}

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

        {/* Verify Button - show for TOTP/backup always, for SMS/Email only after OTP sent */}
        {(activeMethod === 'totp' || useBackupCode || otpSent) && (
          <button
            onClick={handleVerify}
            disabled={state.code.length < (useBackupCode ? 9 : 6) || state.isLocked || loading}
            className="w-full px-4 py-3 text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors mb-3"
          >
            {loading ? 'Verifying...' : 'Verify'}
          </button>
        )}

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
