/**
 * CurrentSubscription Component
 * Displays active subscription details with usage summary
 */

import React from 'react'
import { Button } from '../Button/Button'
import { Badge } from '../Badge/Badge'
import { Progress } from '../Feedback/Progress'
import { formatPrice } from '../../config/subscriptionPlans'
import type { Subscription } from '../../types/billing'
import { cn } from '../../utils/cn'

export interface CurrentSubscriptionProps {
  subscription: Subscription
  onUpgrade?: () => void
  onDowngrade?: () => void
  onCancel?: () => void
  onManagePayment?: () => void
  loading?: boolean
  className?: string
}

export const CurrentSubscription: React.FC<CurrentSubscriptionProps> = ({
  subscription,
  onUpgrade,
  onDowngrade,
  onCancel,
  onManagePayment,
  loading = false,
  className,
}) => {
  const isActive = subscription.status === 'active'
  const isTrial = subscription.status === 'trial'
  const isCancelled = subscription.cancelAtPeriodEnd

  const nextBillingDate = new Date(subscription.currentPeriodEnd)
  const daysUntilBilling = Math.ceil(
    (nextBillingDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  )

  const getStatusBadge = () => {
    if (isCancelled) {
      return (
        <Badge variant="warning">
          Cancelled (Active until {nextBillingDate.toLocaleDateString()})
        </Badge>
      )
    }

    switch (subscription.status) {
      case 'active':
        return <Badge variant="success">Active</Badge>
      case 'trial':
        return <Badge variant="info">Trial</Badge>
      case 'past_due':
        return <Badge variant="error">Past Due</Badge>
      case 'cancelled':
        return <Badge variant="default">Cancelled</Badge>
      case 'expired':
        return <Badge variant="error">Expired</Badge>
      case 'suspended':
        return <Badge variant="warning">Suspended</Badge>
      default:
        return <Badge variant="default">{subscription.status}</Badge>
    }
  }

  const getUsageColor = (percentage: number) => {
    if (percentage >= 95) return 'error'
    if (percentage >= 80) return 'warning'
    return 'success'
  }

  const monthlyPrice =
    subscription.billingCycle === 'monthly'
      ? subscription.plan.price.monthly
      : subscription.plan.price.annual / 12

  return (
    <div
      className={cn(
        'rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-sm',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center space-x-3">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              {subscription.plan.name}
            </h3>
            {getStatusBadge()}
          </div>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {subscription.plan.description}
          </p>
        </div>
      </div>

      {/* Pricing */}
      <div className="mt-6">
        <div className="flex items-baseline space-x-2">
          <span className="text-3xl font-bold text-gray-900 dark:text-white">
            {formatPrice(monthlyPrice, subscription.plan.price.currency)}
          </span>
          <span className="text-gray-600 dark:text-gray-400">/month</span>
        </div>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Billed {subscription.billingCycle === 'monthly' ? 'monthly' : 'annually'}
          {subscription.billingCycle === 'annual' && (
            <span className="ml-1 text-green-600 dark:text-green-400">
              ({formatPrice(subscription.plan.price.annual, subscription.plan.price.currency)}/year)
            </span>
          )}
        </p>
      </div>

      {/* Next Billing */}
      {isActive && !isCancelled && (
        <div className="mt-4 rounded-lg bg-gray-50 dark:bg-gray-700/50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Next Billing Date</p>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {nextBillingDate.toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {daysUntilBilling} days remaining
              </p>
              {subscription.autoRenew && (
                <p className="mt-1 text-xs text-green-600 dark:text-green-400">
                  Auto-renewal enabled
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Trial Info */}
      {isTrial && subscription.trialEnd && (
        <div className="mt-4 rounded-lg bg-blue-50 dark:bg-blue-900/30 p-4">
          <p className="text-sm font-medium text-blue-900 dark:text-blue-300">Trial Period</p>
          <p className="mt-1 text-sm text-blue-700 dark:text-blue-400">
            Your trial ends on{' '}
            {new Date(subscription.trialEnd).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
          <p className="mt-2 text-xs text-blue-600 dark:text-blue-500">
            Upgrade now to continue using all features after your trial ends.
          </p>
        </div>
      )}

      {/* Cancellation Notice */}
      {isCancelled && (
        <div className="mt-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/30 p-4">
          <p className="text-sm font-medium text-yellow-900 dark:text-yellow-300">
            Subscription Cancelled
          </p>
          <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-400">
            Your subscription will remain active until {nextBillingDate.toLocaleDateString()}.
            Reactivate anytime before this date to continue service.
          </p>
        </div>
      )}

      {/* Usage Summary */}
      {subscription.usage && (
        <div className="mt-6 space-y-4">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Usage Summary</h4>

          {/* Storage */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm text-gray-700 dark:text-gray-300">Storage</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {subscription.usage.storage.currentGB.toFixed(2)} GB /{' '}
                {subscription.usage.storage.limitGB} GB
              </span>
            </div>
            <Progress
              value={subscription.usage.storage.percentage}
              variant={getUsageColor(subscription.usage.storage.percentage)}
              size="sm"
            />
          </div>

          {/* Documents */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm text-gray-700 dark:text-gray-300">Documents</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {subscription.usage.documents.current.toLocaleString()} /{' '}
                {subscription.usage.documents.limit === -1
                  ? 'Unlimited'
                  : subscription.usage.documents.limit.toLocaleString()}
              </span>
            </div>
            {subscription.usage.documents.limit !== -1 && (
              <Progress
                value={subscription.usage.documents.percentage}
                variant={getUsageColor(subscription.usage.documents.percentage)}
                size="sm"
              />
            )}
          </div>

          {/* Users */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm text-gray-700 dark:text-gray-300">Users</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {subscription.usage.users.current} /{' '}
                {subscription.usage.users.limit === -1
                  ? 'Unlimited'
                  : subscription.usage.users.limit}
              </span>
            </div>
            {subscription.usage.users.limit !== -1 && (
              <Progress
                value={(subscription.usage.users.current / subscription.usage.users.limit) * 100}
                variant={getUsageColor(
                  (subscription.usage.users.current / subscription.usage.users.limit) * 100
                )}
                size="sm"
              />
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-6 flex flex-col space-y-3 sm:flex-row sm:space-x-3 sm:space-y-0">
        {isTrial && onUpgrade && (
          <Button
            variant="primary"
            fullWidth
            onClick={onUpgrade}
            loading={loading}
            disabled={loading}
          >
            Upgrade Now
          </Button>
        )}

        {isActive && !isTrial && onUpgrade && (
          <Button
            variant="outline"
            fullWidth
            onClick={onUpgrade}
            loading={loading}
            disabled={loading}
          >
            Upgrade Plan
          </Button>
        )}

        {isActive && !isTrial && onDowngrade && (
          <Button
            variant="outline"
            fullWidth
            onClick={onDowngrade}
            loading={loading}
            disabled={loading}
          >
            Change Plan
          </Button>
        )}

        {onManagePayment && (
          <Button variant="outline" fullWidth onClick={onManagePayment} disabled={loading}>
            Manage Payment
          </Button>
        )}

        {isActive && !isCancelled && onCancel && (
          <Button
            variant="ghost"
            fullWidth
            onClick={onCancel}
            disabled={loading}
            className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30"
          >
            Cancel Subscription
          </Button>
        )}

        {isCancelled && onUpgrade && (
          <Button
            variant="primary"
            fullWidth
            onClick={onUpgrade}
            loading={loading}
            disabled={loading}
          >
            Reactivate Subscription
          </Button>
        )}
      </div>
    </div>
  )
}

export default CurrentSubscription
