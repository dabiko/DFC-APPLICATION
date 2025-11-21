/**
 * Skeleton Loading Components for Billing
 * Provides visual feedback during data loading
 */

import React from 'react'
import { cn } from '../../utils/cn'

// Base Skeleton Component
interface SkeletonProps {
  className?: string
  variant?: 'text' | 'circular' | 'rectangular'
  width?: string | number
  height?: string | number
  animation?: 'pulse' | 'wave' | 'none'
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  variant = 'text',
  width,
  height,
  animation = 'pulse',
}) => {
  const variantStyles = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  }

  const animationStyles = {
    pulse: 'animate-pulse',
    wave: 'animate-shimmer',
    none: '',
  }

  return (
    <div
      className={cn(
        'bg-gray-200 dark:bg-gray-700',
        variantStyles[variant],
        animationStyles[animation],
        className
      )}
      style={{
        width: width || '100%',
        height: height || (variant === 'text' ? '1em' : '100%'),
      }}
    />
  )
}

// Plan Card Skeleton
export const PlanCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-700 p-6">
      {/* Header */}
      <div className="space-y-2 mb-6">
        <Skeleton width="60%" height="1.5rem" />
        <Skeleton width="80%" height="1rem" />
      </div>

      {/* Price */}
      <div className="mb-6">
        <Skeleton width="40%" height="2.5rem" className="mb-1" />
        <Skeleton width="50%" height="0.875rem" />
      </div>

      {/* Features */}
      <div className="space-y-3 mb-6">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <Skeleton variant="circular" width="1rem" height="1rem" />
            <Skeleton width="70%" height="0.875rem" />
          </div>
        ))}
      </div>

      {/* Button */}
      <Skeleton height="2.5rem" className="rounded-lg" />
    </div>
  )
}

// Subscription Details Skeleton
export const SubscriptionDetailsSkeleton: React.FC = () => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex-1">
          <Skeleton width="40%" height="1.75rem" className="mb-2" />
          <Skeleton width="60%" height="1rem" />
        </div>
        <Skeleton width="5rem" height="1.5rem" className="rounded-full" />
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <div key={i}>
            <Skeleton width="50%" height="0.875rem" className="mb-1" />
            <Skeleton width="70%" height="1.25rem" />
          </div>
        ))}
      </div>

      {/* Usage Progress */}
      <div className="space-y-4 mb-6">
        <Skeleton width="30%" height="1rem" className="mb-3" />
        {[...Array(3)].map((_, i) => (
          <div key={i}>
            <div className="flex justify-between mb-1">
              <Skeleton width="30%" height="0.875rem" />
              <Skeleton width="20%" height="0.875rem" />
            </div>
            <Skeleton height="0.5rem" className="rounded-full" />
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Skeleton width="6rem" height="2.5rem" className="rounded-lg" />
        <Skeleton width="6rem" height="2.5rem" className="rounded-lg" />
        <Skeleton width="6rem" height="2.5rem" className="rounded-lg" />
      </div>
    </div>
  )
}

// Invoice Table Row Skeleton
export const InvoiceRowSkeleton: React.FC = () => {
  return (
    <tr className="border-b border-gray-200 dark:border-gray-700">
      <td className="px-6 py-4">
        <Skeleton width="8rem" height="1rem" />
      </td>
      <td className="px-6 py-4">
        <Skeleton width="6rem" height="1rem" />
      </td>
      <td className="px-6 py-4">
        <Skeleton width="5rem" height="1.5rem" className="rounded-full" />
      </td>
      <td className="px-6 py-4">
        <Skeleton width="4rem" height="1rem" />
      </td>
      <td className="px-6 py-4">
        <div className="flex gap-2">
          <Skeleton width="4rem" height="1.75rem" className="rounded" />
          <Skeleton width="4rem" height="1.75rem" className="rounded" />
        </div>
      </td>
    </tr>
  )
}

// Invoice Table Skeleton
export const InvoiceTableSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-900">
          <tr>
            {['Invoice', 'Date', 'Status', 'Amount', 'Actions'].map((header) => (
              <th key={header} className="px-6 py-3 text-left">
                <Skeleton width="60%" height="0.875rem" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[...Array(rows)].map((_, i) => (
            <InvoiceRowSkeleton key={i} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

// Invoice Card Skeleton (Mobile)
export const InvoiceCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex justify-between items-start mb-3">
        <Skeleton width="40%" height="1.25rem" />
        <Skeleton width="4rem" height="1.5rem" className="rounded-full" />
      </div>
      <div className="space-y-2 mb-3">
        <Skeleton width="30%" height="0.875rem" />
        <Skeleton width="25%" height="1rem" />
      </div>
      <div className="flex gap-2">
        <Skeleton width="5rem" height="2rem" className="rounded" />
        <Skeleton width="5rem" height="2rem" className="rounded" />
      </div>
    </div>
  )
}

// Usage Metric Card Skeleton
export const UsageMetricSkeleton: React.FC = () => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Skeleton variant="circular" width="2.5rem" height="2.5rem" />
          <div>
            <Skeleton width="6rem" height="1rem" className="mb-1" />
            <Skeleton width="4rem" height="0.875rem" />
          </div>
        </div>
        <Skeleton width="4rem" height="1.5rem" className="rounded-full" />
      </div>
      <div className="mb-2">
        <Skeleton height="0.5rem" className="rounded-full" />
      </div>
      <div className="flex justify-between">
        <Skeleton width="4rem" height="0.875rem" />
        <Skeleton width="3rem" height="0.875rem" />
      </div>
    </div>
  )
}

// Payment Method Card Skeleton
export const PaymentMethodSkeleton: React.FC = () => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Skeleton width="3rem" height="2rem" className="rounded" />
          <div>
            <Skeleton width="8rem" height="1rem" className="mb-1" />
            <Skeleton width="6rem" height="0.875rem" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton width="5rem" height="1.75rem" className="rounded" />
          <Skeleton width="4rem" height="1.75rem" className="rounded" />
        </div>
      </div>
    </div>
  )
}

// Loading Spinner Component
interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export const Spinner: React.FC<SpinnerProps> = ({ size = 'md', className }) => {
  const sizeStyles = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-2',
    lg: 'h-12 w-12 border-3',
  }

  return (
    <div
      className={cn(
        'inline-block rounded-full border-gray-300 border-t-blue-600 animate-spin',
        sizeStyles[size],
        className
      )}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  )
}

// Button with Loading State
interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean
  children: React.ReactNode
  loadingText?: string
}

export const LoadingButton: React.FC<LoadingButtonProps> = ({
  loading = false,
  children,
  loadingText,
  disabled,
  className,
  ...props
}) => {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2',
        loading && 'opacity-75 cursor-not-allowed',
        className
      )}
    >
      {loading && <Spinner size="sm" />}
      {loading && loadingText ? loadingText : children}
    </button>
  )
}

// Full Page Loading
export const BillingPageSkeleton: React.FC = () => {
  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div>
        <Skeleton width="15rem" height="2rem" className="mb-2" />
        <Skeleton width="25rem" height="1rem" />
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200 dark:border-gray-700 pb-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} width="8rem" height="2.5rem" className="rounded-t" />
        ))}
      </div>

      {/* Content */}
      <div className="space-y-6">
        <SubscriptionDetailsSkeleton />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <UsageMetricSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  )
}
