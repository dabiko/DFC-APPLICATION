/**
 * PlanCard Component
 * Displays a subscription plan with pricing, features, and CTA button
 */

import React from 'react'
import { Button } from '../Button/Button'
import { Badge } from '../Badge/Badge'
import { formatPrice, getAnnualDiscount } from '../../config/subscriptionPlans'
import type { Plan, BillingCycle } from '../../types/billing'
import { cn } from '../../utils/cn'

export interface PlanCardProps {
  plan: Plan
  billingCycle: BillingCycle
  isCurrentPlan?: boolean
  isRecommended?: boolean
  loading?: boolean
  disabled?: boolean
  onSelect?: (planId: string) => void
  className?: string
}

export const PlanCard: React.FC<PlanCardProps> = ({
  plan,
  billingCycle,
  isCurrentPlan = false,
  isRecommended = false,
  loading = false,
  disabled = false,
  onSelect,
  className,
}) => {
  const price = billingCycle === 'monthly' ? plan.price.monthly : plan.price.annual / 12
  const totalPrice = billingCycle === 'monthly' ? plan.price.monthly : plan.price.annual
  const discount = billingCycle === 'annual' ? getAnnualDiscount(plan.id as any) : 0

  const handleSelect = () => {
    if (!disabled && !loading && onSelect) {
      onSelect(plan.id)
    }
  }

  return (
    <div
      className={cn(
        'relative flex flex-col rounded-lg border bg-white dark:bg-gray-800 shadow-sm transition-all duration-200',
        {
          'border-green-500 ring-2 ring-green-500 ring-opacity-50': isCurrentPlan || isRecommended,
          'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md':
            !isCurrentPlan && !isRecommended,
          'opacity-60': disabled,
        },
        className
      )}
      data-testid={`plan-card-${plan.id}`}
    >
      {/* Badges */}
      {(isCurrentPlan || isRecommended) && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          {isCurrentPlan && (
            <Badge variant="success" size="sm">
              Current Plan
            </Badge>
          )}
          {isRecommended && !isCurrentPlan && (
            <Badge variant="info" size="sm">
              Recommended
            </Badge>
          )}
        </div>
      )}

      {/* Discount Badge */}
      {discount > 0 && (
        <div className="absolute -top-3 right-4">
          <Badge variant="warning" size="sm">
            Save {discount}%
          </Badge>
        </div>
      )}

      <div className="flex flex-1 flex-col p-6">
        {/* Plan Name */}
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">{plan.name}</h3>

        {/* Description */}
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{plan.description}</p>

        {/* Pricing */}
        <div className="mt-6">
          <div className="flex items-baseline">
            <span className="text-4xl font-extrabold text-gray-900 dark:text-white">
              {formatPrice(price, plan.price.currency)}
            </span>
            <span className="ml-1 text-lg text-gray-600 dark:text-gray-400">/mo</span>
          </div>
          {billingCycle === 'annual' && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {formatPrice(totalPrice, plan.price.currency)} billed annually
            </p>
          )}
          {plan.price.custom && (
            <p className="mt-1 text-sm font-medium text-green-600 dark:text-green-400">
              Custom pricing available
            </p>
          )}
        </div>

        {/* CTA Button */}
        <div className="mt-6">
          {isCurrentPlan ? (
            <Button
              variant="outline"
              size="lg"
              fullWidth
              disabled
              aria-label={`Current plan: ${plan.name}`}
            >
              Current Plan
            </Button>
          ) : (
            <Button
              variant={isRecommended ? 'primary' : 'outline'}
              size="lg"
              fullWidth
              onClick={handleSelect}
              loading={loading}
              disabled={disabled}
              aria-label={`Select ${plan.name} plan`}
            >
              {plan.trial ? 'Start Free Trial' : 'Select Plan'}
            </Button>
          )}
        </div>

        {/* Features List */}
        <div className="mt-6 flex-1">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            {plan.trial ? 'Trial includes:' : 'Features:'}
          </p>
          <ul className="mt-4 space-y-3" role="list">
            {plan.features.map((feature, index) => (
              <li key={index} className="flex items-start">
                <svg
                  className="mr-3 h-5 w-5 flex-shrink-0 text-green-500 dark:text-green-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-sm text-gray-700 dark:text-gray-300">{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

export default PlanCard
