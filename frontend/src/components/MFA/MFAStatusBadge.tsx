/**
 * MFA Status Badge Component
 *
 * A compact badge that displays the user's MFA status.
 * Can be used in headers, profile sections, or settings pages.
 */

import React from 'react'
import { ShieldCheckIcon, ShieldExclamationIcon } from '@heroicons/react/24/outline'
import { ShieldCheckIcon as ShieldCheckSolidIcon } from '@heroicons/react/24/solid'

export interface MFAStatusBadgeProps {
  /** Whether MFA is enabled for the user */
  mfaEnabled: boolean
  /** Whether MFA is enforced (cannot be disabled) */
  mfaEnforced?: boolean
  /** Display variant */
  variant?: 'badge' | 'icon' | 'text' | 'full'
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
  /** Show tooltip on hover */
  showTooltip?: boolean
  /** Click handler (e.g., to navigate to MFA settings) */
  onClick?: () => void
  /** Additional CSS classes */
  className?: string
}

export const MFAStatusBadge: React.FC<MFAStatusBadgeProps> = ({
  mfaEnabled,
  mfaEnforced = false,
  variant = 'badge',
  size = 'md',
  showTooltip = true,
  onClick,
  className = '',
}) => {
  const sizeClasses = {
    sm: {
      icon: 'w-4 h-4',
      text: 'text-xs',
      badge: 'px-2 py-0.5 text-xs',
      container: 'gap-1',
    },
    md: {
      icon: 'w-5 h-5',
      text: 'text-sm',
      badge: 'px-2.5 py-1 text-sm',
      container: 'gap-1.5',
    },
    lg: {
      icon: 'w-6 h-6',
      text: 'text-base',
      badge: 'px-3 py-1.5 text-base',
      container: 'gap-2',
    },
  }

  const statusConfig = mfaEnabled
    ? {
        icon: ShieldCheckSolidIcon,
        color: 'text-green-600 dark:text-green-400',
        bgColor: 'bg-green-100 dark:bg-green-900/30',
        borderColor: 'border-green-200 dark:border-green-800',
        label: mfaEnforced ? '2FA Enforced' : '2FA Enabled',
        tooltip: mfaEnforced
          ? 'Two-factor authentication is enforced for your account'
          : 'Two-factor authentication is enabled',
      }
    : {
        icon: ShieldExclamationIcon,
        color: 'text-orange-600 dark:text-orange-400',
        bgColor: 'bg-orange-100 dark:bg-orange-900/30',
        borderColor: 'border-orange-200 dark:border-orange-800',
        label: '2FA Disabled',
        tooltip: 'Two-factor authentication is not enabled. Enable it for better security.',
      }

  const Icon = statusConfig.icon
  const sizes = sizeClasses[size]

  const baseClasses = onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''

  const tooltipProps = showTooltip ? { title: statusConfig.tooltip } : {}

  // Icon only variant
  if (variant === 'icon') {
    return (
      <div
        className={`inline-flex items-center ${baseClasses} ${className}`}
        onClick={onClick}
        {...tooltipProps}
      >
        <Icon className={`${sizes.icon} ${statusConfig.color}`} />
      </div>
    )
  }

  // Text only variant
  if (variant === 'text') {
    return (
      <span
        className={`${sizes.text} ${statusConfig.color} font-medium ${baseClasses} ${className}`}
        onClick={onClick}
        {...tooltipProps}
      >
        {statusConfig.label}
      </span>
    )
  }

  // Full variant (icon + text, no background)
  if (variant === 'full') {
    return (
      <div
        className={`inline-flex items-center ${sizes.container} ${baseClasses} ${className}`}
        onClick={onClick}
        {...tooltipProps}
      >
        <Icon className={`${sizes.icon} ${statusConfig.color}`} />
        <span className={`${sizes.text} ${statusConfig.color} font-medium`}>
          {statusConfig.label}
        </span>
      </div>
    )
  }

  // Badge variant (default)
  return (
    <div
      className={`inline-flex items-center ${sizes.container} ${sizes.badge} ${statusConfig.bgColor} ${statusConfig.borderColor} border rounded-full ${baseClasses} ${className}`}
      onClick={onClick}
      {...tooltipProps}
    >
      <Icon className={`${sizes.icon} ${statusConfig.color}`} />
      <span className={`${statusConfig.color} font-medium`}>{statusConfig.label}</span>
    </div>
  )
}

/**
 * MFA Setup Prompt Component
 *
 * A banner that prompts users to enable MFA.
 * Typically shown in the dashboard or settings.
 */
export interface MFASetupPromptProps {
  /** Callback when user clicks "Enable 2FA" */
  onEnable: () => void
  /** Callback when user dismisses the prompt */
  onDismiss?: () => void
  /** Whether the prompt can be dismissed */
  dismissible?: boolean
  /** Variant style */
  variant?: 'banner' | 'card' | 'inline'
}

export const MFASetupPrompt: React.FC<MFASetupPromptProps> = ({
  onEnable,
  onDismiss,
  dismissible = true,
  variant = 'banner',
}) => {
  if (variant === 'inline') {
    return (
      <div className="flex items-center gap-2 text-sm text-orange-600 dark:text-orange-400">
        <ShieldExclamationIcon className="w-4 h-4" />
        <span>2FA not enabled.</span>
        <button onClick={onEnable} className="font-medium underline hover:no-underline">
          Enable now
        </button>
      </div>
    )
  }

  if (variant === 'card') {
    return (
      <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <ShieldExclamationIcon className="w-6 h-6 text-orange-600 dark:text-orange-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-orange-800 dark:text-orange-200">
              Enhance Your Account Security
            </h3>
            <p className="mt-1 text-sm text-orange-700 dark:text-orange-300">
              Two-factor authentication adds an extra layer of security to your account. Enable it
              now to protect your data.
            </p>
            <div className="mt-3 flex gap-3">
              <button
                onClick={onEnable}
                className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Enable 2FA
              </button>
              {dismissible && onDismiss && (
                <button
                  onClick={onDismiss}
                  className="px-3 py-1.5 text-orange-700 dark:text-orange-300 text-sm font-medium hover:underline"
                >
                  Remind me later
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Banner variant (default)
  return (
    <div className="bg-orange-50 dark:bg-orange-900/20 border-b border-orange-200 dark:border-orange-800 px-4 py-3">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <ShieldExclamationIcon className="w-5 h-5 text-orange-600 dark:text-orange-400" />
          <p className="text-sm text-orange-800 dark:text-orange-200">
            <span className="font-medium">Secure your account:</span> Two-factor authentication is
            not enabled.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onEnable}
            className="px-3 py-1 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium rounded transition-colors"
          >
            Enable 2FA
          </button>
          {dismissible && onDismiss && (
            <button
              onClick={onDismiss}
              className="text-orange-600 dark:text-orange-400 hover:text-orange-800 dark:hover:text-orange-200"
            >
              <span className="sr-only">Dismiss</span>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default MFAStatusBadge
