/**
 * Password Strength Indicator
 * Visual indicator showing password strength with progress bar and feedback
 */

import React from 'react'
import {
  calculatePasswordStrength,
  getPasswordStrengthLabel,
  type PasswordStrengthResult,
} from '@/utils/passwordStrength'
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid'

interface PasswordStrengthIndicatorProps {
  password: string
  showFeedback?: boolean
}

export const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({
  password,
  showFeedback = true,
}) => {
  const strength: PasswordStrengthResult = calculatePasswordStrength(password)

  if (!password) return null

  return (
    <div className="space-y-3">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Password Strength
          </span>
          <span
            className={`text-sm font-semibold ${
              strength.level === 'strong'
                ? 'text-green-600 dark:text-green-400'
                : strength.level === 'good'
                  ? 'text-blue-600 dark:text-blue-400'
                  : strength.level === 'fair'
                    ? 'text-yellow-600 dark:text-yellow-400'
                    : strength.level === 'weak'
                      ? 'text-orange-600 dark:text-orange-400'
                      : 'text-red-600 dark:text-red-400'
            }`}
          >
            {getPasswordStrengthLabel(strength.level)}
          </span>
        </div>

        <div className="relative w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ease-out ${strength.color}`}
            style={{ width: `${strength.percentage}%` }}
          />
        </div>
      </div>

      {/* Feedback Messages */}
      {showFeedback && strength.feedback.length > 0 && (
        <div className="space-y-1">
          {strength.feedback.map((message, index) => {
            const isPositive = message.includes('Excellent')
            return (
              <div key={index} className="flex items-start gap-2">
                {isPositive ? (
                  <CheckCircleIcon className="w-4 h-4 text-green-500 dark:text-green-400 mt-0.5 flex-shrink-0" />
                ) : (
                  <XCircleIcon className="w-4 h-4 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
                )}
                <span
                  className={`text-xs ${
                    isPositive
                      ? 'text-green-600 dark:text-green-400 font-medium'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {message}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* Requirements Checklist */}
      {password.length > 0 && (
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
          <RequirementItem label="8+ characters" met={password.length >= 8} />
          <RequirementItem label="Uppercase (A-Z)" met={/[A-Z]/.test(password)} />
          <RequirementItem label="Lowercase (a-z)" met={/[a-z]/.test(password)} />
          <RequirementItem label="Number (0-9)" met={/\d/.test(password)} />
          <RequirementItem
            label="Special (!@#$...)"
            met={/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)}
          />
          <RequirementItem label="No repeats" met={!/(.)\1{2,}/.test(password)} />
        </div>
      )}
    </div>
  )
}

interface RequirementItemProps {
  label: string
  met: boolean
}

const RequirementItem: React.FC<RequirementItemProps> = ({ label, met }) => {
  return (
    <div className="flex items-center gap-1.5">
      <div
        className={`w-4 h-4 rounded-full flex items-center justify-center ${
          met
            ? 'bg-green-500 dark:bg-green-600'
            : 'bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600'
        }`}
      >
        {met && (
          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </div>
      <span
        className={`text-xs ${
          met
            ? 'text-green-600 dark:text-green-400 font-medium'
            : 'text-gray-500 dark:text-gray-400'
        }`}
      >
        {label}
      </span>
    </div>
  )
}
