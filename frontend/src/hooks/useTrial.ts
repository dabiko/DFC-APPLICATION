/**
 * useTrial Hook
 * Manage trial period status and actions
 */

import { useEffect, useState, useCallback } from 'react'
import type { TrialStatus, Subscription, SubscriptionStatus } from '@/types/billing'
import {
  calculateTrialDaysRemaining,
  isTrialExpiringSoon,
  getTrialUrgency,
} from '@/utils/proration'

export interface UseTrialOptions {
  subscription?: Subscription
  warningDays?: number // Days before expiration to show warnings
  onTrialExpired?: () => void
  onTrialExpiringSoon?: (daysRemaining: number) => void
}

export interface UseTrialReturn {
  trial: TrialStatus | null
  isActive: boolean
  daysRemaining: number
  isExpiringSoon: boolean
  urgency: 'critical' | 'high' | 'medium' | 'low'
  extendTrial: (additionalDays: number) => Promise<void>
  convertToPlanned: (planId: string) => Promise<void>
  loading: boolean
  error: string | null
}

export function useTrial({
  subscription,
  warningDays = 7,
  onTrialExpired,
  onTrialExpiringSoon,
}: UseTrialOptions = {}): UseTrialReturn {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Calculate trial status
  const trial: TrialStatus | null =
    subscription?.status === SubscriptionStatus.TRIAL
      ? {
          isActive: true,
          daysRemaining: calculateTrialDaysRemaining(subscription.trialEnd),
          endDate: subscription.trialEnd || '',
          planId: subscription.planId,
          canExtend: true, // This would be determined by business logic
        }
      : null

  const isActive = trial?.isActive || false
  const daysRemaining = trial?.daysRemaining || 0
  const isExpiringSoon = isTrialExpiringSoon(subscription?.trialEnd, warningDays)
  const urgency = getTrialUrgency(daysRemaining)

  // Check for trial expiration
  useEffect(() => {
    if (!trial) return

    if (daysRemaining === 0 && onTrialExpired) {
      onTrialExpired()
    } else if (isExpiringSoon && onTrialExpiringSoon) {
      onTrialExpiringSoon(daysRemaining)
    }
  }, [daysRemaining, isExpiringSoon, onTrialExpired, onTrialExpiringSoon, trial])

  // Extend trial period
  const extendTrial = useCallback(
    async (additionalDays: number) => {
      if (!subscription) {
        setError('No active subscription found')
        return
      }

      setLoading(true)
      setError(null)

      try {
        // TODO: Call API to extend trial
        // const response = await billingApi.extendTrial(subscription.id, additionalDays);

        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 1000))

        // TODO: Update subscription state
        console.log(`Trial extended by ${additionalDays} days`)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to extend trial'
        setError(message)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [subscription]
  )

  // Convert trial to paid plan
  const convertToPlanned = useCallback(
    async (planId: string) => {
      if (!subscription) {
        setError('No active subscription found')
        return
      }

      setLoading(true)
      setError(null)

      try {
        // TODO: Call API to convert trial to paid plan
        // const response = await billingApi.convertTrial(subscription.id, planId);

        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 1000))

        // TODO: Update subscription state
        console.log(`Trial converted to plan: ${planId}`)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to convert trial'
        setError(message)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [subscription]
  )

  return {
    trial,
    isActive,
    daysRemaining,
    isExpiringSoon,
    urgency,
    extendTrial,
    convertToPlanned,
    loading,
    error,
  }
}
