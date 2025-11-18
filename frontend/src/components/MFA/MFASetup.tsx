import React, { useState } from 'react'
import {
  ShieldCheckIcon,
  QrCodeIcon,
  KeyIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  EyeIcon,
  EyeSlashIcon,
} from '@heroicons/react/24/outline'
import type { MFASetupProps, MFASetupState } from '@/types/mfa'
import {
  formatBackupCode,
  validateMFACode,
  copyToClipboard,
  downloadBackupCodes,
  printBackupCodes,
} from '@/types/mfa'

export const MFASetup: React.FC<MFASetupProps> = ({
  onComplete,
  onCancel,
  loading = false,
  method = 'totp',
}) => {
  const [state, setState] = useState<MFASetupState>({
    step: 'password',
    verificationCode: '',
  })
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showSecret, setShowSecret] = useState(false)
  const [copied, setCopied] = useState(false)

  const handlePasswordSubmit = async () => {
    // Simulate API call to initiate MFA setup
    const mockSetupData = {
      secret: 'JBSWY3DPEHPK3PXP',
      qrCodeUrl: 'otpauth://totp/DFC:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=DFC',
      backupCodes: [
        'ABCD1234',
        'EFGH5678',
        'IJKL9012',
        'MNOP3456',
        'QRST7890',
        'UVWX1234',
        'YZAB5678',
        'CDEF9012',
        'GHIJ3456',
        'KLMN7890',
      ],
      setupToken: 'setup_token_123',
    }

    setState({
      ...state,
      step: 'qrcode',
      setupData: mockSetupData,
    })
  }

  const handleCopySecret = async () => {
    if (state.setupData?.secret) {
      const success = await copyToClipboard(state.setupData.secret)
      if (success) {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    }
  }

  const handleVerificationSubmit = () => {
    if (!validateMFACode(state.verificationCode)) {
      setState({ ...state, error: 'Invalid code format' })
      return
    }

    // Move to backup codes step
    setState({ ...state, step: 'backup_codes', error: undefined })
  }

  const handleComplete = () => {
    if (state.setupData) {
      onComplete(state.setupData)
      setState({ ...state, step: 'complete' })
    }
  }

  const handleDownloadCodes = () => {
    if (state.setupData?.backupCodes) {
      downloadBackupCodes(state.setupData.backupCodes)
    }
  }

  const handlePrintCodes = () => {
    if (state.setupData?.backupCodes) {
      printBackupCodes(state.setupData.backupCodes)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full mb-4">
          <ShieldCheckIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Enable Two-Factor Authentication
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Add an extra layer of security to your account
        </p>
      </div>

      {/* Step 1: Password Verification */}
      {state.step === 'password' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Step 1: Verify Your Password
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            Please enter your password to continue with MFA setup.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your password"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  {showPassword ? (
                    <EyeSlashIcon className="w-5 h-5" />
                  ) : (
                    <EyeIcon className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={onCancel}
                className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePasswordSubmit}
                disabled={!password || loading}
                className="flex-1 px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Verifying...' : 'Continue'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: QR Code Scan */}
      {state.step === 'qrcode' && state.setupData && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Step 2: Scan QR Code
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
          </p>

          <div className="flex flex-col items-center">
            {/* QR Code Placeholder */}
            <div className="bg-white p-4 rounded-lg border-2 border-gray-300 dark:border-gray-600 mb-4">
              <div className="w-64 h-64 bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                <QrCodeIcon className="w-32 h-32 text-gray-400" />
                <div className="absolute text-xs text-gray-500 dark:text-gray-400">
                  QR Code for {state.setupData.qrCodeUrl}
                </div>
              </div>
            </div>

            {/* Manual Entry Option */}
            <div className="w-full max-w-md">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 text-center">
                Can't scan? Enter this code manually:
              </p>
              <div className="flex items-center gap-2">
                <div className="flex-1 px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg font-mono text-center">
                  {showSecret ? state.setupData.secret : '••••••••••••••••'}
                </div>
                <button
                  onClick={() => setShowSecret(!showSecret)}
                  className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                  title={showSecret ? 'Hide secret' : 'Show secret'}
                >
                  {showSecret ? (
                    <EyeSlashIcon className="w-5 h-5" />
                  ) : (
                    <EyeIcon className="w-5 h-5" />
                  )}
                </button>
                <button
                  onClick={handleCopySecret}
                  className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                  title="Copy secret"
                >
                  {copied ? (
                    <CheckIcon className="w-5 h-5 text-green-600" />
                  ) : (
                    <ClipboardDocumentIcon className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Verification Code Input */}
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Enter the 6-digit code from your app
            </label>
            <input
              type="text"
              value={state.verificationCode}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 6)
                setState({ ...state, verificationCode: value, error: undefined })
              }}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white text-center text-2xl font-mono tracking-widest focus:ring-2 focus:ring-blue-500"
              placeholder="000000"
              maxLength={6}
            />
            {state.error && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">{state.error}</p>
            )}
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={() => setState({ ...state, step: 'password' })}
              className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleVerificationSubmit}
              disabled={state.verificationCode.length !== 6}
              className="flex-1 px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Verify & Continue
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Backup Codes */}
      {state.step === 'backup_codes' && state.setupData && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Step 3: Save Your Backup Codes
          </h3>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
            <div className="flex gap-3">
              <KeyIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300 mb-1">
                  Important: Save these codes
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-400">
                  Each code can only be used once. Store them in a secure location.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            {state.setupData.backupCodes.map((code, index) => (
              <div
                key={index}
                className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg font-mono text-center"
              >
                <span className="text-xs text-gray-500 dark:text-gray-400 mr-2">{index + 1}.</span>
                <span className="text-gray-900 dark:text-white font-semibold">
                  {formatBackupCode(code)}
                </span>
              </div>
            ))}
          </div>

          <div className="flex gap-3 mb-6">
            <button
              onClick={handleDownloadCodes}
              className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
            >
              Download Codes
            </button>
            <button
              onClick={handlePrintCodes}
              className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
            >
              Print Codes
            </button>
          </div>

          <button
            onClick={handleComplete}
            className="w-full px-4 py-3 text-white bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 rounded-lg font-medium transition-colors"
          >
            I've Saved My Backup Codes
          </button>
        </div>
      )}

      {/* Step 4: Complete */}
      {state.step === 'complete' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full mb-4">
            <CheckIcon className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Two-Factor Authentication Enabled!
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Your account is now protected with two-factor authentication.
          </p>
        </div>
      )}
    </div>
  )
}
