/**
 * Storybook Stories for Billing Skeleton Components
 */

import type { Meta, StoryObj } from '@storybook/react'
import {
  Skeleton,
  PlanCardSkeleton,
  SubscriptionDetailsSkeleton,
  InvoiceTableSkeleton,
  InvoiceCardSkeleton,
  UsageMetricSkeleton,
  PaymentMethodSkeleton,
  Spinner,
  LoadingButton,
  BillingPageSkeleton,
} from './Skeletons'

const meta: Meta = {
  title: 'Billing/Skeletons',
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Skeleton loading components for billing UI elements.',
      },
    },
  },
}

export default meta

// Base Skeleton
export const BaseSkeleton: StoryObj = {
  render: () => (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium mb-2">Text Variant</h3>
        <Skeleton variant="text" width="200px" height="1rem" />
      </div>
      <div>
        <h3 className="text-sm font-medium mb-2">Rectangular Variant</h3>
        <Skeleton variant="rectangular" width="200px" height="100px" />
      </div>
      <div>
        <h3 className="text-sm font-medium mb-2">Circular Variant</h3>
        <Skeleton variant="circular" width="3rem" height="3rem" />
      </div>
    </div>
  ),
}

// Plan Card Skeleton
export const PlanCardLoading: StoryObj = {
  render: () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl">
      <PlanCardSkeleton />
      <PlanCardSkeleton />
      <PlanCardSkeleton />
    </div>
  ),
}

// Subscription Details Skeleton
export const SubscriptionLoading: StoryObj = {
  render: () => (
    <div className="max-w-4xl">
      <SubscriptionDetailsSkeleton />
    </div>
  ),
}

// Invoice Table Skeleton
export const InvoiceTableLoading: StoryObj = {
  render: () => (
    <div className="max-w-6xl">
      <InvoiceTableSkeleton rows={5} />
    </div>
  ),
}

// Invoice Cards Skeleton (Mobile)
export const InvoiceCardsLoading: StoryObj = {
  render: () => (
    <div className="max-w-md space-y-4">
      <InvoiceCardSkeleton />
      <InvoiceCardSkeleton />
      <InvoiceCardSkeleton />
    </div>
  ),
}

// Usage Metrics Skeleton
export const UsageMetricsLoading: StoryObj = {
  render: () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-6xl">
      <UsageMetricSkeleton />
      <UsageMetricSkeleton />
      <UsageMetricSkeleton />
      <UsageMetricSkeleton />
    </div>
  ),
}

// Payment Methods Skeleton
export const PaymentMethodsLoading: StoryObj = {
  render: () => (
    <div className="max-w-2xl space-y-4">
      <PaymentMethodSkeleton />
      <PaymentMethodSkeleton />
    </div>
  ),
}

// Spinner
export const SpinnerVariants: StoryObj = {
  render: () => (
    <div className="flex items-center gap-8">
      <div className="text-center">
        <Spinner size="sm" />
        <p className="text-sm mt-2">Small</p>
      </div>
      <div className="text-center">
        <Spinner size="md" />
        <p className="text-sm mt-2">Medium</p>
      </div>
      <div className="text-center">
        <Spinner size="lg" />
        <p className="text-sm mt-2">Large</p>
      </div>
    </div>
  ),
}

// Loading Button
export const LoadingButtonStates: StoryObj = {
  render: () => (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium mb-2">Normal State</h3>
        <LoadingButton className="px-4 py-2 bg-blue-600 text-white rounded">
          Submit Payment
        </LoadingButton>
      </div>
      <div>
        <h3 className="text-sm font-medium mb-2">Loading State</h3>
        <LoadingButton
          loading
          loadingText="Processing..."
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          Submit Payment
        </LoadingButton>
      </div>
      <div>
        <h3 className="text-sm font-medium mb-2">Loading (Keep Text)</h3>
        <LoadingButton loading className="px-4 py-2 bg-blue-600 text-white rounded">
          Submit Payment
        </LoadingButton>
      </div>
    </div>
  ),
}

// Full Page Skeleton
export const FullPageLoading: StoryObj = {
  render: () => <BillingPageSkeleton />,
  parameters: {
    layout: 'fullscreen',
  },
}

// Mixed Loading States
export const MixedLoadingStates: StoryObj = {
  render: () => (
    <div className="space-y-8 p-6 max-w-6xl">
      <div>
        <h2 className="text-xl font-bold mb-4">Current Subscription</h2>
        <SubscriptionDetailsSkeleton />
      </div>
      <div>
        <h2 className="text-xl font-bold mb-4">Usage Metrics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <UsageMetricSkeleton />
          <UsageMetricSkeleton />
          <UsageMetricSkeleton />
          <UsageMetricSkeleton />
        </div>
      </div>
      <div>
        <h2 className="text-xl font-bold mb-4">Recent Invoices</h2>
        <div className="hidden md:block">
          <InvoiceTableSkeleton rows={3} />
        </div>
        <div className="md:hidden space-y-4">
          <InvoiceCardSkeleton />
          <InvoiceCardSkeleton />
          <InvoiceCardSkeleton />
        </div>
      </div>
    </div>
  ),
}
