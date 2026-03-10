/**
 * Storybook Stories for ProrationBreakdown Component
 */

import type { Meta, StoryObj } from '@storybook/react-vite'
import { ProrationBreakdown } from './ProrationBreakdown'

const meta: Meta<typeof ProrationBreakdown> = {
  title: 'Billing/ProrationBreakdown',
  component: ProrationBreakdown,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof ProrationBreakdown>

// Helper to create future date
const getFutureDate = (daysFromNow: number): string => {
  const date = new Date()
  date.setDate(date.getDate() + daysFromNow)
  return date.toISOString()
}

/**
 * Upgrade with additional charge
 */
export const UpgradeWithCharge: Story = {
  args: {
    proration: {
      unusedAmount: 10.5,
      newPlanAmount: 25.0,
      prorationAmount: 14.5,
      effectiveDate: new Date().toISOString(),
      nextBillingDate: getFutureDate(30),
      description:
        "Upgrading from Basic to Professional plan. You'll be charged the prorated amount for the remainder of this billing period.",
    },
  },
}

/**
 * Downgrade with credit
 */
export const DowngradeWithCredit: Story = {
  args: {
    proration: {
      unusedAmount: 25.0,
      newPlanAmount: 8.5,
      prorationAmount: -16.5,
      effectiveDate: new Date().toISOString(),
      nextBillingDate: getFutureDate(30),
      description:
        "Downgrading from Professional to Basic plan. You'll receive a credit for the unused time on your current plan.",
    },
  },
}

/**
 * Same tier, cycle change (monthly to annual)
 */
export const CycleChange: Story = {
  args: {
    proration: {
      unusedAmount: 15.0,
      newPlanAmount: 240.0,
      prorationAmount: 225.0,
      effectiveDate: new Date().toISOString(),
      nextBillingDate: getFutureDate(365),
      description:
        "Switching from Professional monthly to annual billing. You'll be charged the prorated amount for the remainder of this billing period.",
    },
  },
}

/**
 * No proration (immediate cycle start)
 */
export const NoProration: Story = {
  args: {
    proration: {
      unusedAmount: 0,
      newPlanAmount: 0,
      prorationAmount: 0,
      effectiveDate: new Date().toISOString(),
      nextBillingDate: getFutureDate(30),
      description:
        'Switching from Basic to Professional plan. No additional charge or credit will be applied.',
    },
  },
}

/**
 * Small upgrade charge
 */
export const SmallCharge: Story = {
  args: {
    proration: {
      unusedAmount: 8.5,
      newPlanAmount: 10.0,
      prorationAmount: 1.5,
      effectiveDate: new Date().toISOString(),
      nextBillingDate: getFutureDate(30),
      description:
        "Upgrading from Basic to Professional plan. You'll be charged the prorated amount for the remainder of this billing period.",
    },
  },
}

/**
 * Large upgrade charge
 */
export const LargeCharge: Story = {
  args: {
    proration: {
      unusedAmount: 5.0,
      newPlanAmount: 150.0,
      prorationAmount: 145.0,
      effectiveDate: new Date().toISOString(),
      nextBillingDate: getFutureDate(30),
      description:
        "Upgrading from Basic to Enterprise plan. You'll be charged the prorated amount for the remainder of this billing period.",
    },
  },
}

/**
 * Loading state
 */
export const Loading: Story = {
  args: {
    proration: {
      unusedAmount: 0,
      newPlanAmount: 0,
      prorationAmount: 0,
      effectiveDate: '',
      nextBillingDate: '',
      description: '',
    },
    loading: true,
  },
}

/**
 * All proration scenarios comparison
 */
export const AllScenarios: Story = {
  render: () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
          Upgrade with Charge
        </h3>
        <ProrationBreakdown
          proration={{
            unusedAmount: 10.5,
            newPlanAmount: 25.0,
            prorationAmount: 14.5,
            effectiveDate: new Date().toISOString(),
            nextBillingDate: getFutureDate(30),
            description: 'Upgrading from Basic to Professional plan.',
          }}
        />
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
          Downgrade with Credit
        </h3>
        <ProrationBreakdown
          proration={{
            unusedAmount: 25.0,
            newPlanAmount: 8.5,
            prorationAmount: -16.5,
            effectiveDate: new Date().toISOString(),
            nextBillingDate: getFutureDate(30),
            description: 'Downgrading from Professional to Basic plan.',
          }}
        />
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
          No Proration
        </h3>
        <ProrationBreakdown
          proration={{
            unusedAmount: 0,
            newPlanAmount: 0,
            prorationAmount: 0,
            effectiveDate: new Date().toISOString(),
            nextBillingDate: getFutureDate(30),
            description: 'No additional charge or credit.',
          }}
        />
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
          Loading State
        </h3>
        <ProrationBreakdown
          proration={{
            unusedAmount: 0,
            newPlanAmount: 0,
            prorationAmount: 0,
            effectiveDate: '',
            nextBillingDate: '',
            description: '',
          }}
          loading
        />
      </div>
    </div>
  ),
}

/**
 * Responsive layout test
 */
export const ResponsiveLayout: Story = {
  args: {
    proration: {
      unusedAmount: 15.0,
      newPlanAmount: 30.0,
      prorationAmount: 15.0,
      effectiveDate: new Date().toISOString(),
      nextBillingDate: getFutureDate(30),
      description: 'Upgrading from Basic to Professional plan and switching to annual billing.',
    },
  },
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
  },
}
