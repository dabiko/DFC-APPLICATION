/**
 * CancellationModal Component
 * Modal for cancelling subscription with feedback collection
 */

import React, { useState } from 'react'
import { Modal } from '../Modal/Modal'
import { Button } from '../Button/Button'
import { Alert } from '../Feedback/Alert'
import { Select } from '../Select/Select'
import { Textarea } from '../Input/Textarea'
import { Radio, RadioGroup } from '../Checkbox/Radio'
import type { CancellationRequest } from '../../types/billing'

export interface CancellationModalProps {
  isOpen: boolean
  onClose: () => void
  subscriptionId: string
  nextBillingDate: string
  planName: string
  onConfirm: (request: CancellationRequest) => Promise<void>
  loading?: boolean
  error?: string
}

const CANCELLATION_REASONS = [
  { value: 'too_expensive', label: 'Too expensive' },
  { value: 'missing_features', label: 'Missing features I need' },
  { value: 'not_using', label: 'Not using it enough' },
  { value: 'switching_competitor', label: 'Switching to a competitor' },
  { value: 'technical_issues', label: 'Technical issues' },
  { value: 'poor_support', label: 'Poor customer support' },
  { value: 'temporary', label: 'Temporary - will return later' },
  { value: 'other', label: 'Other reason' },
]

export const CancellationModal: React.FC<CancellationModalProps> = ({
  isOpen,
  onClose,
  subscriptionId,
  nextBillingDate,
  planName,
  onConfirm,
  loading = false,
  error,
}) => {
  const [step, setStep] = useState<'confirm' | 'feedback' | 'final'>('confirm')
  const [reason, setReason] = useState<string>('')
  const [feedback, setFeedback] = useState<string>('')
  const [cancelImmediately, setCancelImmediately] = useState<string>('end_of_period')

  const billingDate = new Date(nextBillingDate)

  const handleContinue = () => {
    setStep('feedback')
  }

  const handleBack = () => {
    if (step === 'feedback') {
      setStep('confirm')
    } else if (step === 'final') {
      setStep('feedback')
    }
  }

  const handleSubmitFeedback = () => {
    setStep('final')
  }

  const handleConfirmCancellation = async () => {
    const request: CancellationRequest = {
      subscriptionId,
      reason: reason || undefined,
      feedback: feedback || undefined,
      cancelAtPeriodEnd: cancelImmediately === 'end_of_period',
    }

    try {
      await onConfirm(request)
      onClose()
      // Reset state
      setStep('confirm')
      setReason('')
      setFeedback('')
      setCancelImmediately('end_of_period')
    } catch (_err) {
      // Error handled via error prop
    }
  }

  const handleCloseModal = () => {
    onClose()
    // Reset state after animation
    setTimeout(() => {
      setStep('confirm')
      setReason('')
      setFeedback('')
      setCancelImmediately('end_of_period')
    }, 300)
  }

  return (
    <Modal open={isOpen} onClose={handleCloseModal} title="Cancel Subscription" size="md">
      <div className="space-y-6">
        {/* Error */}
        {error && (
          <Alert variant="error" title="Error">
            {error}
          </Alert>
        )}

        {/* Step 1: Confirmation */}
        {step === 'confirm' && (
          <>
            <Alert variant="warning" title="Are you sure?">
              You're about to cancel your <strong>{planName}</strong> subscription.
            </Alert>

            <div className="space-y-4">
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <h4 className="text-sm font-semibold text-gray-900">What you'll lose:</h4>
                <ul className="mt-3 space-y-2 text-sm text-gray-700">
                  <li className="flex items-start">
                    <svg
                      className="mr-2 h-5 w-5 flex-shrink-0 text-red-500"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span>Access to all premium features</span>
                  </li>
                  <li className="flex items-start">
                    <svg
                      className="mr-2 h-5 w-5 flex-shrink-0 text-red-500"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span>Document storage and management</span>
                  </li>
                  <li className="flex items-start">
                    <svg
                      className="mr-2 h-5 w-5 flex-shrink-0 text-red-500"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span>Priority support</span>
                  </li>
                  <li className="flex items-start">
                    <svg
                      className="mr-2 h-5 w-5 flex-shrink-0 text-red-500"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span>Advanced search and collaboration features</span>
                  </li>
                </ul>
              </div>

              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                <h4 className="text-sm font-semibold text-blue-900">
                  Consider downgrading instead?
                </h4>
                <p className="mt-2 text-sm text-blue-800">
                  You can switch to a lower-tier plan to reduce costs while keeping your data and
                  basic features.
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={handleCloseModal}>
                Keep Subscription
              </Button>
              <Button variant="error" onClick={handleContinue}>
                Continue to Cancel
              </Button>
            </div>
          </>
        )}

        {/* Step 2: Feedback */}
        {step === 'feedback' && (
          <>
            <div className="space-y-4">
              <p className="text-sm text-gray-700">
                We're sorry to see you go. Help us improve by letting us know why you're cancelling.
              </p>

              <div>
                <Select
                  label="Reason for cancellation"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  options={[
                    { value: '', label: 'Select a reason (optional)' },
                    ...CANCELLATION_REASONS,
                  ]}
                />
              </div>

              <div>
                <Textarea
                  label="Additional feedback (optional)"
                  placeholder="Tell us more about your experience..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={4}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={handleBack}>
                Back
              </Button>
              <Button variant="primary" onClick={handleSubmitFeedback}>
                Continue
              </Button>
            </div>
          </>
        )}

        {/* Step 3: Final Confirmation */}
        {step === 'final' && (
          <>
            <div className="space-y-4">
              <p className="text-sm text-gray-700">
                Choose when you'd like your cancellation to take effect:
              </p>

              <RadioGroup
                value={cancelImmediately}
                onChange={setCancelImmediately}
                className="space-y-3"
              >
                <Radio
                  value="end_of_period"
                  label={
                    <div>
                      <p className="font-medium text-gray-900">Cancel at end of billing period</p>
                      <p className="text-sm text-gray-600">
                        Your subscription will remain active until{' '}
                        {billingDate.toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                        . No further charges will be made.
                      </p>
                    </div>
                  }
                />
                <Radio
                  value="immediately"
                  label={
                    <div>
                      <p className="font-medium text-gray-900">Cancel immediately</p>
                      <p className="text-sm text-gray-600">
                        Your subscription will be cancelled right away. You may lose access to your
                        data.
                      </p>
                    </div>
                  }
                />
              </RadioGroup>

              {cancelImmediately === 'end_of_period' && (
                <Alert variant="info">
                  You can reactivate your subscription anytime before{' '}
                  {billingDate.toLocaleDateString()}.
                </Alert>
              )}

              {cancelImmediately === 'immediately' && (
                <Alert variant="warning">
                  Immediate cancellation may result in data loss. We recommend cancelling at the end
                  of your billing period.
                </Alert>
              )}
            </div>

            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={handleBack} disabled={loading}>
                Back
              </Button>
              <Button
                variant="error"
                onClick={handleConfirmCancellation}
                loading={loading}
                disabled={loading}
              >
                {loading ? 'Cancelling...' : 'Confirm Cancellation'}
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}

export default CancellationModal
