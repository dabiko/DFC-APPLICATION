/**
 * ProrationBreakdown Component
 * Displays detailed proration calculation for plan changes
 */

import React from 'react'
import type { ProrationCalculation } from '@/types/billing'
import { Info, TrendingDown, TrendingUp } from 'lucide-react'

export interface ProrationBreakdownProps {
  proration: ProrationCalculation
  loading?: boolean
  className?: string
}

export const ProrationBreakdown: React.FC<ProrationBreakdownProps> = ({
  proration,
  loading = false,
  className = '',
}) => {
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date)
  }

  const isCredit = proration.prorationAmount < 0
  const isCharge = proration.prorationAmount > 0

  if (loading) {
    return (
      <div
        className={`bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-3 ${className}`}
        role="status"
        aria-live="polite"
      >
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
        </div>
        <span className="sr-only">Calculating proration...</span>
      </div>
    )
  }

  return (
    <div
      className={`bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-3 ${className}`}
      role="region"
      aria-label="Proration breakdown"
    >
      {/* Header */}
      <div className="flex items-start gap-2">
        <Info
          className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5"
          aria-hidden="true"
        />
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Proration Details
          </h3>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{proration.description}</p>
        </div>
      </div>

      {/* Breakdown */}
      <div className="space-y-2 text-sm">
        {/* Credit from current plan */}
        <div className="flex justify-between items-center">
          <span className="text-gray-600 dark:text-gray-400">Credit for unused time</span>
          <span
            className="font-medium text-green-600 dark:text-green-400"
            aria-label={`Credit: ${formatCurrency(proration.unusedAmount)}`}
          >
            {formatCurrency(proration.unusedAmount)}
          </span>
        </div>

        {/* Charge for new plan */}
        <div className="flex justify-between items-center">
          <span className="text-gray-600 dark:text-gray-400">Charge for new plan</span>
          <span
            className="font-medium text-gray-900 dark:text-gray-100"
            aria-label={`Charge: ${formatCurrency(proration.newPlanAmount)}`}
          >
            {formatCurrency(proration.newPlanAmount)}
          </span>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200 dark:border-gray-700 my-2" />

        {/* Net amount */}
        <div className="flex justify-between items-center">
          <span className="font-semibold text-gray-900 dark:text-gray-100">
            {isCredit ? 'Credit applied' : isCharge ? 'Amount due today' : 'No charge'}
          </span>
          <div className="flex items-center gap-1">
            {isCredit && (
              <TrendingDown
                className="w-4 h-4 text-green-600 dark:text-green-400"
                aria-hidden="true"
              />
            )}
            {isCharge && (
              <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />
            )}
            <span
              className={`text-lg font-bold ${
                isCredit
                  ? 'text-green-600 dark:text-green-400'
                  : isCharge
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-gray-900 dark:text-gray-100'
              }`}
              aria-label={`Total amount: ${formatCurrency(Math.abs(proration.prorationAmount))}`}
            >
              {isCredit && '-'}
              {formatCurrency(Math.abs(proration.prorationAmount))}
            </span>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="pt-3 border-t border-gray-200 dark:border-gray-700 space-y-1 text-xs text-gray-600 dark:text-gray-400">
        <div className="flex justify-between">
          <span>Effective date:</span>
          <time
            dateTime={proration.effectiveDate}
            className="font-medium text-gray-900 dark:text-gray-100"
          >
            {formatDate(proration.effectiveDate)}
          </time>
        </div>
        <div className="flex justify-between">
          <span>Next billing date:</span>
          <time
            dateTime={proration.nextBillingDate}
            className="font-medium text-gray-900 dark:text-gray-100"
          >
            {formatDate(proration.nextBillingDate)}
          </time>
        </div>
      </div>

      {/* Credit note */}
      {isCredit && (
        <div
          className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded p-2 text-xs text-green-800 dark:text-green-200"
          role="note"
        >
          <span className="font-medium">Note:</span> This credit will be applied to your next
          invoice.
        </div>
      )}

      {/* Charge note */}
      {isCharge && (
        <div
          className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded p-2 text-xs text-blue-800 dark:text-blue-200"
          role="note"
        >
          <span className="font-medium">Note:</span> This amount will be charged to your default
          payment method immediately.
        </div>
      )}
    </div>
  )
}
