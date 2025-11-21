/**
 * UpgradeDowngradeModal Component
 * Modal for changing subscription plans with proration details
 */

import React, { useState, useEffect } from 'react'
import { Modal } from '../Modal/Modal'
import { Button } from '../Button/Button'
import { Alert } from '../Feedback/Alert'
import { Badge } from '../Badge/Badge'
import { Radio, RadioGroup } from '../Checkbox/Radio'
import { formatPrice } from '../../config/subscriptionPlans'
import type { Plan, BillingCycle, ProrationCalculation } from '../../types/billing'
import { cn } from '../../utils/cn'

export interface UpgradeDowngradeModalProps {
  isOpen: boolean
  onClose: () => void
  currentPlan: Plan
  availablePlans: Plan[]
  currentBillingCycle: BillingCycle
  onConfirm: (planId: string, billingCycle: BillingCycle) => Promise<void>
  onGetProration?: (planId: string, billingCycle: BillingCycle) => Promise<ProrationCalculation>
  proration?: ProrationCalculation | null
  prorationLoading?: boolean
  loading?: boolean
  error?: string
}

export const UpgradeDowngradeModal: React.FC<UpgradeDowngradeModalProps> = ({
  isOpen,
  onClose,
  currentPlan,
  availablePlans,
  currentBillingCycle,
  onConfirm,
  onGetProration,
  proration: externalProration,
  prorationLoading: externalProrationLoading,
  loading = false,
  error,
}) => {
  // Use currentPlan.id with fallback to prevent errors
  const initialPlanId = currentPlan?.id || availablePlans?.[0]?.id || ''

  const [selectedPlanId, setSelectedPlanId] = useState<string>(initialPlanId)
  const [selectedBillingCycle, setSelectedBillingCycle] =
    useState<BillingCycle>(currentBillingCycle)
  const [internalProration, setInternalProration] = useState<ProrationCalculation | null>(null)
  const [internalLoadingProration, setInternalLoadingProration] = useState(false)

  // Use external proration if provided, otherwise use internal state
  const proration = externalProration !== undefined ? externalProration : internalProration
  const loadingProration =
    externalProrationLoading !== undefined ? externalProrationLoading : internalLoadingProration

  const selectedPlan = availablePlans?.find((p) => p.id === selectedPlanId)
  const isUpgrade =
    selectedPlan && currentPlan && selectedPlan.price.monthly > currentPlan.price.monthly
  const isDowngrade =
    selectedPlan && currentPlan && selectedPlan.price.monthly < currentPlan.price.monthly
  const isSamePlan = selectedPlanId === currentPlan?.id

  // Fetch proration when plan or billing cycle changes (only if external proration not provided)
  useEffect(() => {
    if (externalProration !== undefined || !onGetProration || isSamePlan) {
      setInternalProration(null)
      return
    }

    const fetchProration = async () => {
      setInternalLoadingProration(true)
      try {
        const calc = await onGetProration(selectedPlanId, selectedBillingCycle)
        setInternalProration(calc)
      } catch (_err) {
        console.error('Failed to fetch proration')
        setInternalProration(null)
      } finally {
        setInternalLoadingProration(false)
      }
    }

    fetchProration()
  }, [selectedPlanId, selectedBillingCycle, onGetProration, isSamePlan, externalProration])

  const handleConfirm = async () => {
    if (!selectedPlan || isSamePlan) return

    try {
      await onConfirm(selectedPlanId, selectedBillingCycle)
      onClose()
    } catch (_err) {
      // Error handled via error prop
    }
  }

  const getPrice = (plan: Plan, cycle: BillingCycle) => {
    return cycle === 'monthly' ? plan.price.monthly : plan.price.annual / 12
  }

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={isUpgrade ? 'Upgrade Plan' : isDowngrade ? 'Change Plan' : 'Select Plan'}
      size="lg"
    >
      <div className="space-y-6">
        {/* Error */}
        {error && (
          <Alert variant="error" title="Error">
            {error}
          </Alert>
        )}

        {/* Current Plan */}
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">Current Plan</p>
              <p className="mt-1 text-lg font-bold text-gray-900">{currentPlan.name}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">
                {formatPrice(
                  getPrice(currentPlan, currentBillingCycle),
                  currentPlan.price.currency
                )}
                /mo
              </p>
              <p className="text-xs text-gray-500">
                Billed {currentBillingCycle === 'monthly' ? 'monthly' : 'annually'}
              </p>
            </div>
          </div>
        </div>

        {/* Plan Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-900">Select New Plan</label>
          <RadioGroup
            value={selectedPlanId}
            onChange={setSelectedPlanId}
            className="mt-3 space-y-3"
          >
            {availablePlans.map((plan) => {
              const price = getPrice(plan, selectedBillingCycle)
              const priceDiff = price - getPrice(currentPlan, currentBillingCycle)
              const isCurrentPlan = plan.id === currentPlan.id

              return (
                <Radio
                  key={plan.id}
                  value={plan.id}
                  disabled={isCurrentPlan}
                  label={
                    <div className="flex w-full items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div>
                          <p className="font-medium text-gray-900">{plan.name}</p>
                          <p className="text-sm text-gray-600">{plan.description}</p>
                        </div>
                        {isCurrentPlan && (
                          <Badge variant="default" size="sm">
                            Current
                          </Badge>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900">
                          {formatPrice(price, plan.price.currency)}/mo
                        </p>
                        {!isCurrentPlan && priceDiff !== 0 && (
                          <p
                            className={cn('text-sm', {
                              'text-green-600': priceDiff > 0,
                              'text-red-600': priceDiff < 0,
                            })}
                          >
                            {priceDiff > 0 ? '+' : ''}
                            {formatPrice(Math.abs(priceDiff), plan.price.currency)}/mo
                          </p>
                        )}
                      </div>
                    </div>
                  }
                />
              )
            })}
          </RadioGroup>
        </div>

        {/* Billing Cycle Selection */}
        {selectedPlan && !isSamePlan && (
          <div>
            <label className="block text-sm font-medium text-gray-900">Billing Cycle</label>
            <RadioGroup
              value={selectedBillingCycle}
              onChange={(value) => setSelectedBillingCycle(value as BillingCycle)}
              className="mt-3 space-y-3"
            >
              <Radio
                value="monthly"
                label={
                  <div className="flex w-full items-center justify-between">
                    <span>Monthly</span>
                    <span className="font-medium">
                      {formatPrice(selectedPlan.price.monthly, selectedPlan.price.currency)}/mo
                    </span>
                  </div>
                }
              />
              <Radio
                value="annual"
                label={
                  <div className="flex w-full items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span>Annual</span>
                      <Badge variant="success" size="sm">
                        Save ~17%
                      </Badge>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        {formatPrice(selectedPlan.price.annual / 12, selectedPlan.price.currency)}
                        /mo
                      </p>
                      <p className="text-xs text-gray-600">
                        ({formatPrice(selectedPlan.price.annual, selectedPlan.price.currency)}/year)
                      </p>
                    </div>
                  </div>
                }
              />
            </RadioGroup>
          </div>
        )}

        {/* Proration Details */}
        {!isSamePlan && selectedPlan && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <h4 className="text-sm font-semibold text-blue-900">Payment Details</h4>

            {loadingProration ? (
              <div className="mt-3 flex items-center space-x-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
                <p className="text-sm text-blue-700">Calculating charges...</p>
              </div>
            ) : proration ? (
              <div className="mt-3 space-y-2 text-sm text-blue-800">
                <div className="flex justify-between">
                  <span>Credit from current plan:</span>
                  <span className="font-medium">
                    -{formatPrice(Math.abs(proration.unusedAmount), selectedPlan.price.currency)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>New plan charge:</span>
                  <span className="font-medium">
                    {formatPrice(proration.newPlanAmount, selectedPlan.price.currency)}
                  </span>
                </div>
                <div className="border-t border-blue-300 pt-2">
                  <div className="flex justify-between font-bold">
                    <span>Amount due today:</span>
                    <span
                      className={cn({
                        'text-green-700': proration.prorationAmount < 0,
                      })}
                    >
                      {formatPrice(
                        Math.abs(proration.prorationAmount),
                        selectedPlan.price.currency
                      )}
                    </span>
                  </div>
                </div>
                <p className="pt-2 text-xs text-blue-700">{proration.description}</p>
              </div>
            ) : (
              <p className="mt-2 text-sm text-blue-700">
                {isUpgrade
                  ? 'You will be charged the prorated amount for the rest of your billing period.'
                  : 'Your plan change will take effect at the end of your current billing period.'}
              </p>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end space-x-3">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirm}
            loading={loading}
            disabled={loading || isSamePlan || loadingProration}
          >
            {loading ? 'Processing...' : isUpgrade ? 'Upgrade Plan' : 'Change Plan'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export default UpgradeDowngradeModal
