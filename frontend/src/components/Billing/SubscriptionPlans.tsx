/**
 * SubscriptionPlans Component
 * Displays all available subscription plans with billing cycle toggle
 */

import React, { useState } from 'react'
import { PlanCard } from './PlanCard'
import { Switch } from '../Checkbox/Switch'
import { SUBSCRIPTION_PLANS } from '../../config/subscriptionPlans'
import { BillingCycle } from '../../types/billing'
import type { Plan } from '../../types/billing'
import { cn } from '../../utils/cn'

export interface SubscriptionPlansProps {
  currentPlanId?: string
  recommendedPlanId?: string
  onSelectPlan?: (planId: string, billingCycle: BillingCycle) => void
  loading?: boolean
  showTrial?: boolean
  className?: string
}

export const SubscriptionPlans: React.FC<SubscriptionPlansProps> = ({
  currentPlanId,
  recommendedPlanId = 'professional',
  onSelectPlan,
  loading = false,
  showTrial = true,
  className,
}) => {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>(BillingCycle.MONTHLY)

  const plans: Plan[] = Object.values(SUBSCRIPTION_PLANS).filter((plan) => {
    if (plan.trial) return showTrial
    return true
  })

  const handlePlanSelect = (planId: string) => {
    if (onSelectPlan) {
      onSelectPlan(planId, billingCycle)
    }
  }

  const handleBillingCycleChange = (checked: boolean) => {
    setBillingCycle(checked ? BillingCycle.ANNUAL : BillingCycle.MONTHLY)
  }

  return (
    <div className={cn('w-full', className)}>
      {/* Header */}
      <div className="mb-8 text-center">
        <h2 className="text-3xl font-bold text-gray-900">Choose Your Plan</h2>
        <p className="mt-2 text-lg text-gray-600">Select the perfect plan for your team's needs</p>
      </div>

      {/* Billing Cycle Toggle */}
      <div className="mb-8 flex items-center justify-center space-x-4">
        <span
          className={cn('text-sm font-medium', {
            'text-gray-900': billingCycle === BillingCycle.MONTHLY,
            'text-gray-500': billingCycle === BillingCycle.ANNUAL,
          })}
        >
          Monthly
        </span>
        <Switch
          checked={billingCycle === BillingCycle.ANNUAL}
          onChange={handleBillingCycleChange}
          aria-label="Toggle between monthly and annual billing"
        />
        <span
          className={cn('text-sm font-medium', {
            'text-gray-900': billingCycle === BillingCycle.ANNUAL,
            'text-gray-500': billingCycle === BillingCycle.MONTHLY,
          })}
        >
          Annual
          <span className="ml-2 inline-block rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-800">
            Save ~17%
          </span>
        </span>
      </div>

      {/* Plans Grid */}
      <div
        className={cn('grid gap-6', {
          'grid-cols-1 md:grid-cols-2 lg:grid-cols-4': showTrial,
          'grid-cols-1 md:grid-cols-2 lg:grid-cols-3': !showTrial,
        })}
      >
        {plans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            billingCycle={billingCycle}
            isCurrentPlan={currentPlanId === plan.id}
            isRecommended={recommendedPlanId === plan.id && currentPlanId !== plan.id}
            loading={loading}
            onSelect={handlePlanSelect}
          />
        ))}
      </div>

      {/* Additional Info */}
      <div className="mt-12 text-center">
        <p className="text-sm text-gray-600">All plans include 14-day money-back guarantee</p>
        <p className="mt-2 text-sm text-gray-600">
          Need a custom solution?{' '}
          <a href="/contact-sales" className="font-medium text-blue-600 hover:text-blue-700">
            Contact our sales team
          </a>
        </p>
      </div>
    </div>
  )
}

export default SubscriptionPlans
