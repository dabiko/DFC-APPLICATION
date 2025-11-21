/**
 * TrialBanner Component
 * Displays trial status with countdown and conversion prompts
 */

import React from 'react'
import type { TrialStatus } from '@/types/billing'
import { AlertCircle, Clock, Zap } from 'lucide-react'
import { Button } from '../Button'

export interface TrialBannerProps {
  trial: TrialStatus
  onUpgrade: () => void
  onExtend?: () => void
  className?: string
}

export const TrialBanner: React.FC<TrialBannerProps> = ({
  trial,
  onUpgrade,
  onExtend,
  className = '',
}) => {
  if (!trial.isActive) {
    return null
  }

  const { daysRemaining, endDate, canExtend } = trial

  // Determine urgency level
  const getUrgencyLevel = () => {
    if (daysRemaining <= 1) return 'critical'
    if (daysRemaining <= 3) return 'high'
    if (daysRemaining <= 7) return 'medium'
    return 'low'
  }

  const urgency = getUrgencyLevel()

  // Style based on urgency
  const getBannerStyles = () => {
    switch (urgency) {
      case 'critical':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
      case 'high':
        return 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
      case 'medium':
        return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
      default:
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
    }
  }

  const getIconColor = () => {
    switch (urgency) {
      case 'critical':
        return 'text-red-600 dark:text-red-400'
      case 'high':
        return 'text-orange-600 dark:text-orange-400'
      case 'medium':
        return 'text-yellow-600 dark:text-yellow-400'
      default:
        return 'text-blue-600 dark:text-blue-400'
    }
  }

  const getTextColor = () => {
    switch (urgency) {
      case 'critical':
        return 'text-red-900 dark:text-red-100'
      case 'high':
        return 'text-orange-900 dark:text-orange-100'
      case 'medium':
        return 'text-yellow-900 dark:text-yellow-100'
      default:
        return 'text-blue-900 dark:text-blue-100'
    }
  }

  const getMessage = () => {
    if (daysRemaining === 0) {
      return 'Your trial expires today!'
    }
    if (daysRemaining === 1) {
      return 'Your trial expires tomorrow!'
    }
    return `${daysRemaining} days left in your trial`
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date)
  }

  return (
    <div
      className={`border rounded-lg p-4 ${getBannerStyles()} ${className}`}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`flex-shrink-0 ${getIconColor()}`}>
          {urgency === 'critical' || urgency === 'high' ? (
            <AlertCircle className="w-6 h-6" aria-hidden="true" />
          ) : (
            <Clock className="w-6 h-6" aria-hidden="true" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className={`text-sm font-semibold ${getTextColor()}`}>{getMessage()}</h3>
              <p className={`text-sm mt-1 ${getTextColor()} opacity-90`}>
                Trial ends on{' '}
                <time dateTime={endDate} className="font-medium">
                  {formatDate(endDate)}
                </time>
                . Upgrade now to continue using all features.
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {canExtend && onExtend && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onExtend}
                  className="whitespace-nowrap"
                  aria-label="Extend trial period"
                >
                  Extend Trial
                </Button>
              )}
              <Button
                variant="primary"
                size="sm"
                onClick={onUpgrade}
                className="whitespace-nowrap"
                aria-label="Upgrade to paid plan"
              >
                <Zap className="w-4 h-4 mr-1" aria-hidden="true" />
                Upgrade Now
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      {daysRemaining <= 7 && (
        <div className="mt-3 ml-9" aria-hidden="true">
          <div className="h-2 bg-white/50 dark:bg-gray-800/50 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                urgency === 'critical'
                  ? 'bg-red-500'
                  : urgency === 'high'
                    ? 'bg-orange-500'
                    : 'bg-yellow-500'
              }`}
              style={{
                width: `${Math.max(0, Math.min(100, (daysRemaining / 7) * 100))}%`,
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
