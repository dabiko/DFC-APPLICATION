/**
 * CurrentSubscription Storybook Stories
 */

import type { Meta, StoryObj } from '@storybook/react-vite'
import { CurrentSubscription } from './CurrentSubscription'
import { SUBSCRIPTION_PLANS } from '../../config/subscriptionPlans'
import { SubscriptionStatus, BillingCycle } from '../../types/billing'
import type { Subscription } from '../../types/billing'

const meta: Meta<typeof CurrentSubscription> = {
  title: 'Billing/CurrentSubscription',
  component: CurrentSubscription,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Displays current subscription details including plan info, pricing, billing cycle, usage metrics, and action buttons.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    onUpgrade: { action: 'upgrade-clicked' },
    onDowngrade: { action: 'downgrade-clicked' },
    onCancel: { action: 'cancel-clicked' },
    onManagePayment: { action: 'manage-payment-clicked' },
    loading: {
      control: 'boolean',
      description: 'Loading state for action buttons',
    },
  },
  decorators: [
    (Story) => (
      <div className="w-full max-w-2xl">
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof CurrentSubscription>

// Helper to create subscription data
const createSubscription = (
  planId: keyof typeof SUBSCRIPTION_PLANS,
  status: SubscriptionStatus,
  overrides?: Partial<Subscription>
): Subscription => {
  const plan = SUBSCRIPTION_PLANS[planId]
  const now = new Date()
  const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 days from now

  return {
    id: 'sub_123456',
    userId: 'user_123',
    planId: plan.id,
    plan,
    status,
    billingCycle: BillingCycle.MONTHLY,
    currentPeriodStart: now.toISOString(),
    currentPeriodEnd: periodEnd.toISOString(),
    cancelAtPeriodEnd: false,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    autoRenew: true,
    usage: {
      users: { current: 3, limit: plan.limits.users },
      storage: {
        currentGB: 45.5,
        limitGB: plan.limits.storageGB,
        percentage: (45.5 / plan.limits.storageGB) * 100,
      },
      documents: {
        current: 5234,
        limit: plan.limits.documents,
        percentage: (5234 / plan.limits.documents) * 100,
      },
      folders: { current: 342, limit: plan.limits.folders },
      apiCalls: {
        currentMonth: 12500,
        limit: plan.limits.apiCallsPerMonth,
        percentage: (12500 / plan.limits.apiCallsPerMonth) * 100,
      },
    },
    ...overrides,
  }
}

/**
 * Active Basic subscription with monthly billing
 */
export const BasicMonthly: Story = {
  args: {
    subscription: createSubscription('BASIC', SubscriptionStatus.ACTIVE),
    loading: false,
  },
}

/**
 * Active Professional subscription with annual billing
 */
export const ProfessionalAnnual: Story = {
  args: {
    subscription: createSubscription('PROFESSIONAL', SubscriptionStatus.ACTIVE, {
      billingCycle: BillingCycle.ANNUAL,
    }),
    loading: false,
  },
}

/**
 * Active Enterprise subscription
 */
export const Enterprise: Story = {
  args: {
    subscription: createSubscription('ENTERPRISE', SubscriptionStatus.ACTIVE, {
      usage: {
        users: { current: 150, limit: -1 },
        storage: {
          currentGB: 1250.5,
          limitGB: 2048,
          percentage: (1250.5 / 2048) * 100,
        },
        documents: {
          current: 125000,
          limit: -1,
          percentage: 0,
        },
        folders: { current: 8500, limit: -1 },
        apiCalls: {
          currentMonth: 750000,
          limit: -1,
          percentage: 0,
        },
      },
    }),
    loading: false,
  },
}

/**
 * Trial subscription
 */
export const Trial: Story = {
  args: {
    subscription: createSubscription('TRIAL', SubscriptionStatus.TRIAL, {
      trialStart: new Date().toISOString(),
      trialEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    }),
    loading: false,
  },
}

/**
 * Trial ending soon (3 days left)
 */
export const TrialEndingSoon: Story = {
  args: {
    subscription: createSubscription('TRIAL', SubscriptionStatus.TRIAL, {
      trialStart: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000).toISOString(),
      trialEnd: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      currentPeriodEnd: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    }),
    loading: false,
  },
}

/**
 * Cancelled subscription (still active until period end)
 */
export const Cancelled: Story = {
  args: {
    subscription: createSubscription('PROFESSIONAL', SubscriptionStatus.ACTIVE, {
      cancelAtPeriodEnd: true,
      cancelledAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    }),
    loading: false,
  },
}

/**
 * High storage usage (85%)
 */
export const HighStorageUsage: Story = {
  args: {
    subscription: createSubscription('BASIC', SubscriptionStatus.ACTIVE, {
      usage: {
        users: { current: 4, limit: 5 },
        storage: {
          currentGB: 85,
          limitGB: 100,
          percentage: 85,
        },
        documents: {
          current: 8500,
          limit: 10000,
          percentage: 85,
        },
        folders: { current: 850, limit: 1000 },
        apiCalls: {
          currentMonth: 42500,
          limit: 50000,
          percentage: 85,
        },
      },
    }),
    loading: false,
  },
}

/**
 * Critical usage levels (95%+)
 */
export const CriticalUsage: Story = {
  args: {
    subscription: createSubscription('BASIC', SubscriptionStatus.ACTIVE, {
      usage: {
        users: { current: 5, limit: 5 },
        storage: {
          currentGB: 97,
          limitGB: 100,
          percentage: 97,
        },
        documents: {
          current: 9700,
          limit: 10000,
          percentage: 97,
        },
        folders: { current: 970, limit: 1000 },
        apiCalls: {
          currentMonth: 48500,
          limit: 50000,
          percentage: 97,
        },
      },
    }),
    loading: false,
  },
}

/**
 * Low usage
 */
export const LowUsage: Story = {
  args: {
    subscription: createSubscription('PROFESSIONAL', SubscriptionStatus.ACTIVE, {
      usage: {
        users: { current: 5, limit: 25 },
        storage: {
          currentGB: 25,
          limitGB: 500,
          percentage: 5,
        },
        documents: {
          current: 1250,
          limit: 50000,
          percentage: 2.5,
        },
        folders: { current: 125, limit: 10000 },
        apiCalls: {
          currentMonth: 12500,
          limit: 250000,
          percentage: 5,
        },
      },
    }),
    loading: false,
  },
}

/**
 * Past due subscription
 */
export const PastDue: Story = {
  args: {
    subscription: createSubscription('PROFESSIONAL', SubscriptionStatus.PAST_DUE),
    loading: false,
  },
}

/**
 * Expired subscription
 */
export const Expired: Story = {
  args: {
    subscription: createSubscription('BASIC', SubscriptionStatus.EXPIRED, {
      currentPeriodEnd: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    }),
    loading: false,
  },
}

/**
 * Loading state
 */
export const Loading: Story = {
  args: {
    subscription: createSubscription('PROFESSIONAL', SubscriptionStatus.ACTIVE),
    loading: true,
  },
}

/**
 * Without optional action buttons
 */
export const MinimalActions: Story = {
  args: {
    subscription: createSubscription('ENTERPRISE', SubscriptionStatus.ACTIVE),
    onUpgrade: undefined,
    onDowngrade: undefined,
    onCancel: undefined,
    loading: false,
  },
}

/**
 * Auto-renewal disabled
 */
export const NoAutoRenewal: Story = {
  args: {
    subscription: createSubscription('BASIC', SubscriptionStatus.ACTIVE, {
      autoRenew: false,
    }),
    loading: false,
  },
}
