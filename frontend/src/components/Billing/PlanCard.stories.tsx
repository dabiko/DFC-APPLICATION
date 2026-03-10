/**
 * PlanCard Storybook Stories
 */

import type { Meta, StoryObj } from '@storybook/react-vite'
import { PlanCard } from './PlanCard'
import { SUBSCRIPTION_PLANS } from '../../config/subscriptionPlans'
import { BillingCycle } from '../../types/billing'

const meta: Meta<typeof PlanCard> = {
  title: 'Billing/PlanCard',
  component: PlanCard,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'A card component that displays subscription plan details including pricing, features, and selection button.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    billingCycle: {
      control: 'select',
      options: ['monthly', 'annual'],
      description: 'Billing cycle to display pricing for',
    },
    isCurrentPlan: {
      control: 'boolean',
      description: "Whether this is the user's current plan",
    },
    isRecommended: {
      control: 'boolean',
      description: 'Whether this plan is recommended',
    },
    loading: {
      control: 'boolean',
      description: 'Loading state for the select button',
    },
    disabled: {
      control: 'boolean',
      description: 'Disabled state for the card',
    },
    onSelect: {
      action: 'selected',
      description: 'Callback when plan is selected',
    },
  },
}

export default meta
type Story = StoryObj<typeof PlanCard>

/**
 * Default state - Basic plan with monthly billing
 */
export const Default: Story = {
  args: {
    plan: SUBSCRIPTION_PLANS.BASIC,
    billingCycle: BillingCycle.MONTHLY,
    isCurrentPlan: false,
    isRecommended: false,
    loading: false,
    disabled: false,
  },
}

/**
 * Professional plan (recommended)
 */
export const Recommended: Story = {
  args: {
    plan: SUBSCRIPTION_PLANS.PROFESSIONAL,
    billingCycle: BillingCycle.MONTHLY,
    isCurrentPlan: false,
    isRecommended: true,
    loading: false,
    disabled: false,
  },
}

/**
 * Current plan state
 */
export const CurrentPlan: Story = {
  args: {
    plan: SUBSCRIPTION_PLANS.PROFESSIONAL,
    billingCycle: BillingCycle.MONTHLY,
    isCurrentPlan: true,
    isRecommended: false,
    loading: false,
    disabled: false,
  },
}

/**
 * Enterprise plan with annual billing
 */
export const AnnualBilling: Story = {
  args: {
    plan: SUBSCRIPTION_PLANS.ENTERPRISE,
    billingCycle: BillingCycle.ANNUAL,
    isCurrentPlan: false,
    isRecommended: false,
    loading: false,
    disabled: false,
  },
}

/**
 * Annual billing showing discount badge
 */
export const WithDiscount: Story = {
  args: {
    plan: SUBSCRIPTION_PLANS.PROFESSIONAL,
    billingCycle: BillingCycle.ANNUAL,
    isCurrentPlan: false,
    isRecommended: true,
    loading: false,
    disabled: false,
  },
}

/**
 * Trial plan
 */
export const TrialPlan: Story = {
  args: {
    plan: SUBSCRIPTION_PLANS.TRIAL,
    billingCycle: BillingCycle.MONTHLY,
    isCurrentPlan: false,
    isRecommended: false,
    loading: false,
    disabled: false,
  },
}

/**
 * Loading state
 */
export const Loading: Story = {
  args: {
    plan: SUBSCRIPTION_PLANS.BASIC,
    billingCycle: BillingCycle.MONTHLY,
    isCurrentPlan: false,
    isRecommended: false,
    loading: true,
    disabled: false,
  },
}

/**
 * Disabled state
 */
export const Disabled: Story = {
  args: {
    plan: SUBSCRIPTION_PLANS.BASIC,
    billingCycle: BillingCycle.MONTHLY,
    isCurrentPlan: false,
    isRecommended: false,
    loading: false,
    disabled: true,
  },
}

/**
 * Comparison view - All plans side by side
 */
export const AllPlans: Story = {
  render: (args) => (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4 p-6">
      <PlanCard {...args} plan={SUBSCRIPTION_PLANS.TRIAL} billingCycle={BillingCycle.MONTHLY} />
      <PlanCard {...args} plan={SUBSCRIPTION_PLANS.BASIC} billingCycle={BillingCycle.MONTHLY} />
      <PlanCard
        {...args}
        plan={SUBSCRIPTION_PLANS.PROFESSIONAL}
        billingCycle={BillingCycle.MONTHLY}
        isRecommended
      />
      <PlanCard
        {...args}
        plan={SUBSCRIPTION_PLANS.ENTERPRISE}
        billingCycle={BillingCycle.MONTHLY}
      />
    </div>
  ),
  parameters: {
    layout: 'fullscreen',
  },
}

/**
 * Annual billing comparison
 */
export const AnnualComparison: Story = {
  render: (args) => (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3 lg:grid-cols-3 p-6">
      <PlanCard {...args} plan={SUBSCRIPTION_PLANS.BASIC} billingCycle={BillingCycle.ANNUAL} />
      <PlanCard
        {...args}
        plan={SUBSCRIPTION_PLANS.PROFESSIONAL}
        billingCycle={BillingCycle.ANNUAL}
        isRecommended
      />
      <PlanCard {...args} plan={SUBSCRIPTION_PLANS.ENTERPRISE} billingCycle={BillingCycle.ANNUAL} />
    </div>
  ),
  parameters: {
    layout: 'fullscreen',
  },
}

/**
 * Current plan highlighted in comparison
 */
export const CurrentInComparison: Story = {
  render: (args) => (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3 lg:grid-cols-3 p-6">
      <PlanCard {...args} plan={SUBSCRIPTION_PLANS.BASIC} billingCycle={BillingCycle.MONTHLY} />
      <PlanCard
        {...args}
        plan={SUBSCRIPTION_PLANS.PROFESSIONAL}
        billingCycle={BillingCycle.MONTHLY}
        isCurrentPlan
      />
      <PlanCard
        {...args}
        plan={SUBSCRIPTION_PLANS.ENTERPRISE}
        billingCycle={BillingCycle.MONTHLY}
      />
    </div>
  ),
  parameters: {
    layout: 'fullscreen',
  },
}
