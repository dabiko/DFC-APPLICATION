/**
 * SubscriptionPlans Storybook Stories
 */

import type { Meta, StoryObj } from '@storybook/react-vite'
import { SubscriptionPlans } from './SubscriptionPlans'

const meta: Meta<typeof SubscriptionPlans> = {
  title: 'Billing/SubscriptionPlans',
  component: SubscriptionPlans,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'A comprehensive component that displays all available subscription plans with billing cycle toggle and plan selection.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    currentPlanId: {
      control: 'select',
      options: ['trial', 'basic', 'professional', 'enterprise', undefined],
      description: "The ID of the user's current plan",
    },
    recommendedPlanId: {
      control: 'select',
      options: ['basic', 'professional', 'enterprise'],
      description: 'The ID of the recommended plan',
    },
    loading: {
      control: 'boolean',
      description: 'Loading state for all plan cards',
    },
    showTrial: {
      control: 'boolean',
      description: 'Whether to show the trial plan option',
    },
    onSelectPlan: {
      action: 'plan-selected',
      description: 'Callback when a plan is selected',
    },
  },
}

export default meta
type Story = StoryObj<typeof SubscriptionPlans>

/**
 * Default view - All plans with no current plan
 */
export const Default: Story = {
  args: {
    currentPlanId: undefined,
    recommendedPlanId: 'professional',
    loading: false,
    showTrial: true,
  },
}

/**
 * User on Basic plan
 */
export const WithBasicPlan: Story = {
  args: {
    currentPlanId: 'basic',
    recommendedPlanId: 'professional',
    loading: false,
    showTrial: true,
  },
}

/**
 * User on Professional plan
 */
export const WithProfessionalPlan: Story = {
  args: {
    currentPlanId: 'professional',
    recommendedPlanId: 'professional',
    loading: false,
    showTrial: true,
  },
}

/**
 * User on Enterprise plan
 */
export const WithEnterprisePlan: Story = {
  args: {
    currentPlanId: 'enterprise',
    recommendedPlanId: 'professional',
    loading: false,
    showTrial: true,
  },
}

/**
 * User on Trial
 */
export const OnTrial: Story = {
  args: {
    currentPlanId: 'trial',
    recommendedPlanId: 'professional',
    loading: false,
    showTrial: true,
  },
}

/**
 * Without trial plan (paid plans only)
 */
export const WithoutTrial: Story = {
  args: {
    currentPlanId: 'basic',
    recommendedPlanId: 'professional',
    loading: false,
    showTrial: false,
  },
}

/**
 * Loading state
 */
export const Loading: Story = {
  args: {
    currentPlanId: undefined,
    recommendedPlanId: 'professional',
    loading: true,
    showTrial: true,
  },
}

/**
 * Different recommended plan
 */
export const RecommendEnterprise: Story = {
  args: {
    currentPlanId: 'basic',
    recommendedPlanId: 'enterprise',
    loading: false,
    showTrial: true,
  },
}

/**
 * New user view (no plan selected, recommend trial)
 */
export const NewUser: Story = {
  args: {
    currentPlanId: undefined,
    recommendedPlanId: 'trial',
    loading: false,
    showTrial: true,
  },
}
