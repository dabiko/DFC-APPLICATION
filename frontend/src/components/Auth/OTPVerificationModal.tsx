/**
 * OTP Verification Modal
 * Modal for email and phone OTP verification during signup
 */

import React, { useState, useRef, useEffect } from 'react'
import { Modal } from '../Modal/Modal'
import { Button } from '../Button/Button'

interface OTPVerificationModalProps {
  isOpen: boolean
  onClose: () => void
  onVerify: (otp: string) => Promise<void>
  type: 'email' | 'phone'
  destination: string // email address or phone number
  onResend?: () => Promise<void>
}

export const OTPVerificationModal: React.FC<OTPVerificationModalProps> = ({
  isOpen,
  onClose,
  onVerify,
  type,
  destination,
  onResend,
}) => {
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Cooldown timer for resend
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [resendCooldown])

  const handleChange = (index: number, value: string) => {
    // Only allow digits
    if (!/^\d*$/.test(value)) return

    const newOtp = [...otp]
    newOtp[index] = value.slice(-1) // Only take the last character
    setOtp(newOtp)
    setError('')

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').slice(0, 6)
    if (!/^\d+$/.test(pastedData)) return

    const newOtp = pastedData.split('').concat(Array(6 - pastedData.length).fill(''))
    setOtp(newOtp)
    setError('')

    // Focus the next empty input or the last one
    const nextEmptyIndex = newOtp.findIndex((val) => !val)
    inputRefs.current[nextEmptyIndex !== -1 ? nextEmptyIndex : 5]?.focus()
  }

  const handleVerify = async () => {
    const otpCode = otp.join('')
    if (otpCode.length !== 6) {
      setError('Please enter the complete 6-digit code')
      return
    }

    setLoading(true)
    setError('')

    try {
      await onVerify(otpCode)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid verification code. Please try again.')
      // Clear OTP on error
      setOtp(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (!onResend || resendCooldown > 0) return

    setLoading(true)
    setError('')

    try {
      await onResend()
      setResendCooldown(60) // 60 second cooldown
      setOtp(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend code')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={`Verify your ${type === 'email' ? 'email' : 'phone number'}`}
      size="sm"
    >
      <div className="space-y-6">
        <div className="text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            We've sent a 6-digit verification code to
          </p>
          <p className="font-semibold text-gray-900 dark:text-white mt-1">{destination}</p>
        </div>

        {/* OTP Input */}
        <div className="flex justify-center gap-2" onPaste={handlePaste}>
          {otp.map((digit, index) => (
            <input
              key={index}
              ref={(el) => {
                inputRefs.current[index] = el
              }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              className={`w-12 h-14 text-center text-2xl font-bold border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                error
                  ? 'border-red-500 dark:border-red-400'
                  : 'border-gray-300 dark:border-gray-600'
              } ${
                digit
                  ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 dark:border-blue-400'
                  : 'bg-white dark:bg-gray-800'
              } text-gray-900 dark:text-white`}
              disabled={loading}
              autoFocus={index === 0}
            />
          ))}
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <p className="text-sm text-red-600 dark:text-red-400 text-center">{error}</p>
          </div>
        )}

        {/* Verify Button */}
        <Button
          onClick={handleVerify}
          loading={loading}
          disabled={otp.join('').length !== 6 || loading}
          fullWidth
          size="lg"
        >
          Verify Code
        </Button>

        {/* Resend Code */}
        {onResend && (
          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Didn't receive the code?{' '}
              {resendCooldown > 0 ? (
                <span className="font-medium text-gray-500">Resend in {resendCooldown}s</span>
              ) : (
                <button
                  onClick={handleResend}
                  disabled={loading}
                  className="font-medium text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50 cursor-pointer"
                >
                  Resend Code
                </button>
              )}
            </p>
          </div>
        )}
      </div>
    </Modal>
  )
}
