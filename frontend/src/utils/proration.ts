/**
 * Proration Calculation Utilities
 * Calculate prorated amounts for mid-cycle plan changes
 */

import type { BillingCycle, Plan, Subscription, ProrationCalculation } from '@/types/billing'

/**
 * Calculate the number of days remaining in the current billing period
 */
export function getDaysRemaining(currentPeriodEnd: string): number {
  const endDate = new Date(currentPeriodEnd)
  const now = new Date()
  const diffTime = endDate.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return Math.max(0, diffDays)
}

/**
 * Calculate the total days in the current billing period
 */
export function getTotalPeriodDays(currentPeriodStart: string, currentPeriodEnd: string): number {
  const startDate = new Date(currentPeriodStart)
  const endDate = new Date(currentPeriodEnd)
  const diffTime = endDate.getTime() - startDate.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}

/**
 * Calculate the unused amount from the current plan
 */
export function calculateUnusedAmount(
  currentPlan: Plan,
  billingCycle: BillingCycle,
  currentPeriodStart: string,
  currentPeriodEnd: string
): number {
  const daysRemaining = getDaysRemaining(currentPeriodEnd)
  const totalDays = getTotalPeriodDays(currentPeriodStart, currentPeriodEnd)

  if (totalDays === 0) return 0

  const planPrice =
    billingCycle === BillingCycle.MONTHLY ? currentPlan.price.monthly : currentPlan.price.annual

  const dailyRate = planPrice / totalDays
  const unusedAmount = dailyRate * daysRemaining

  return Math.round(unusedAmount * 100) / 100 // Round to 2 decimal places
}

/**
 * Calculate the prorated charge for the new plan
 */
export function calculateNewPlanCharge(
  newPlan: Plan,
  billingCycle: BillingCycle,
  currentPeriodEnd: string
): number {
  const daysRemaining = getDaysRemaining(currentPeriodEnd)

  const planPrice =
    billingCycle === BillingCycle.MONTHLY ? newPlan.price.monthly : newPlan.price.annual

  // For monthly, calculate based on remaining days
  // For annual, charge for the remaining period
  const daysInCycle = billingCycle === BillingCycle.MONTHLY ? 30 : 365
  const dailyRate = planPrice / daysInCycle
  const proratatedCharge = dailyRate * daysRemaining

  return Math.round(proratatedCharge * 100) / 100 // Round to 2 decimal places
}

/**
 * Calculate the next billing date after a plan change
 */
export function getNextBillingDate(currentPeriodEnd: string, billingCycle: BillingCycle): string {
  const endDate = new Date(currentPeriodEnd)

  if (billingCycle === BillingCycle.MONTHLY) {
    // Next billing is 1 month after current period end
    const nextDate = new Date(endDate)
    nextDate.setMonth(nextDate.getMonth() + 1)
    return nextDate.toISOString()
  } else {
    // Next billing is 1 year after current period end
    const nextDate = new Date(endDate)
    nextDate.setFullYear(nextDate.getFullYear() + 1)
    return nextDate.toISOString()
  }
}

/**
 * Calculate complete proration details for a plan change
 */
export function calculateProration(
  currentSubscription: Subscription,
  newPlan: Plan,
  newBillingCycle: BillingCycle
): ProrationCalculation {
  const {
    plan: currentPlan,
    billingCycle,
    currentPeriodStart,
    currentPeriodEnd,
  } = currentSubscription

  // Calculate unused amount from current plan
  const unusedAmount = calculateUnusedAmount(
    currentPlan,
    billingCycle,
    currentPeriodStart,
    currentPeriodEnd
  )

  // Calculate new plan charge
  const newPlanAmount = calculateNewPlanCharge(newPlan, newBillingCycle, currentPeriodEnd)

  // Net proration amount (positive = charge, negative = credit)
  const prorationAmount = newPlanAmount - unusedAmount

  // Effective date is now
  const effectiveDate = new Date().toISOString()

  // Next billing date
  const nextBillingDate = getNextBillingDate(currentPeriodEnd, newBillingCycle)

  // Generate description
  const description = generateProrationDescription(
    currentPlan,
    newPlan,
    billingCycle,
    newBillingCycle,
    prorationAmount
  )

  return {
    unusedAmount,
    newPlanAmount,
    prorationAmount,
    effectiveDate,
    nextBillingDate,
    description,
  }
}

/**
 * Generate a human-readable description of the proration
 */
function generateProrationDescription(
  currentPlan: Plan,
  newPlan: Plan,
  currentCycle: BillingCycle,
  newCycle: BillingCycle,
  prorationAmount: number
): string {
  const isUpgrade =
    newPlan.price[newCycle === BillingCycle.MONTHLY ? 'monthly' : 'annual'] >
    currentPlan.price[currentCycle === BillingCycle.MONTHLY ? 'monthly' : 'annual']

  const changeType = isUpgrade ? 'Upgrading' : 'Downgrading'
  const cycleChange = currentCycle !== newCycle ? ` and switching to ${newCycle} billing` : ''

  if (prorationAmount > 0) {
    return `${changeType} from ${currentPlan.name} to ${newPlan.name}${cycleChange}. You'll be charged the prorated amount for the remainder of this billing period.`
  } else if (prorationAmount < 0) {
    return `${changeType} from ${currentPlan.name} to ${newPlan.name}${cycleChange}. You'll receive a credit for the unused time on your current plan.`
  } else {
    return `Switching from ${currentPlan.name} to ${newPlan.name}${cycleChange}. No additional charge or credit will be applied.`
  }
}

/**
 * Calculate trial days remaining
 */
export function calculateTrialDaysRemaining(trialEnd?: string): number {
  if (!trialEnd) return 0

  const endDate = new Date(trialEnd)
  const now = new Date()
  const diffTime = endDate.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  return Math.max(0, diffDays)
}

/**
 * Check if trial is expiring soon (within warning days)
 */
export function isTrialExpiringSoon(
  trialEnd: string | undefined,
  warningDays: number = 7
): boolean {
  if (!trialEnd) return false

  const daysRemaining = calculateTrialDaysRemaining(trialEnd)
  return daysRemaining > 0 && daysRemaining <= warningDays
}

/**
 * Get trial urgency level
 */
export function getTrialUrgency(daysRemaining: number): 'critical' | 'high' | 'medium' | 'low' {
  if (daysRemaining <= 1) return 'critical'
  if (daysRemaining <= 3) return 'high'
  if (daysRemaining <= 7) return 'medium'
  return 'low'
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount)
}

/**
 * Calculate discount amount
 */
export function calculateDiscount(
  amount: number,
  discountType: 'percentage' | 'fixed',
  discountValue: number
): number {
  if (discountType === 'percentage') {
    return Math.round(((amount * discountValue) / 100) * 100) / 100
  } else {
    return Math.min(discountValue, amount)
  }
}

/**
 * Calculate final amount after discount
 */
export function applyDiscount(
  amount: number,
  discountType: 'percentage' | 'fixed',
  discountValue: number
): number {
  const discount = calculateDiscount(amount, discountType, discountValue)
  return Math.max(0, amount - discount)
}
