/**
 * Storybook Stories for TrialBanner Component
 */

import type { Meta, StoryObj } from '@storybook/react'
import { TrialBanner } from './TrialBanner'
import type { TrialStatus } from '@/types/billing'

const meta: Meta<typeof TrialBanner> = {
  title: 'Billing/TrialBanner',
  component: TrialBanner,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof TrialBanner>

// Helper to create trial status
const createTrialStatus = (daysRemaining: number): TrialStatus => {
  const endDate = new Date()
  endDate.setDate(endDate.getDate() + daysRemaining)

  return {
    isActive: true,
    daysRemaining,
    endDate: endDate.toISOString(),
    planId: 'trial-plan',
    canExtend: true,
  }
}

/**
 * Trial with plenty of time remaining (low urgency)
 */
export const LowUrgency: Story = {
  args: {
    trial: createTrialStatus(14),
    onUpgrade: () => console.log('Upgrade clicked'),
    onExtend: () => console.log('Extend clicked'),
  },
}

/**
 * Trial with 7 days remaining (medium urgency)
 */
export const MediumUrgency: Story = {
  args: {
    trial: createTrialStatus(7),
    onUpgrade: () => console.log('Upgrade clicked'),
    onExtend: () => console.log('Extend clicked'),
  },
}

/**
 * Trial with 3 days remaining (high urgency)
 */
export const HighUrgency: Story = {
  args: {
    trial: createTrialStatus(3),
    onUpgrade: () => console.log('Upgrade clicked'),
    onExtend: () => console.log('Extend clicked'),
  },
}

/**
 * Trial with 1 day remaining (critical urgency)
 */
export const CriticalUrgency: Story = {
  args: {
    trial: createTrialStatus(1),
    onUpgrade: () => console.log('Upgrade clicked'),
    onExtend: () => console.log('Extend clicked'),
  },
}

/**
 * Trial expiring today
 */
export const ExpiringToday: Story = {
  args: {
    trial: createTrialStatus(0),
    onUpgrade: () => console.log('Upgrade clicked'),
    onExtend: () => console.log('Extend clicked'),
  },
}

/**
 * Trial without extend option
 */
export const NoExtend: Story = {
  args: {
    trial: {
      ...createTrialStatus(5),
      canExtend: false,
    },
    onUpgrade: () => console.log('Upgrade clicked'),
  },
}

/**
 * Inactive trial (banner hidden)
 */
export const Inactive: Story = {
  args: {
    trial: {
      ...createTrialStatus(10),
      isActive: false,
    },
    onUpgrade: () => console.log('Upgrade clicked'),
  },
}

/**
 * Interactive demo with all urgency levels
 */
export const AllUrgencyLevels: Story = {
  render: () => (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
          Low Urgency (14+ days)
        </h3>
        <TrialBanner
          trial={createTrialStatus(14)}
          onUpgrade={() => console.log('Upgrade')}
          onExtend={() => console.log('Extend')}
        />
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
          Medium Urgency (7 days)
        </h3>
        <TrialBanner
          trial={createTrialStatus(7)}
          onUpgrade={() => console.log('Upgrade')}
          onExtend={() => console.log('Extend')}
        />
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
          High Urgency (3 days)
        </h3>
        <TrialBanner
          trial={createTrialStatus(3)}
          onUpgrade={() => console.log('Upgrade')}
          onExtend={() => console.log('Extend')}
        />
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
          Critical Urgency (1 day)
        </h3>
        <TrialBanner
          trial={createTrialStatus(1)}
          onUpgrade={() => console.log('Upgrade')}
          onExtend={() => console.log('Extend')}
        />
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
          Expiring Today (0 days)
        </h3>
        <TrialBanner
          trial={createTrialStatus(0)}
          onUpgrade={() => console.log('Upgrade')}
          onExtend={() => console.log('Extend')}
        />
      </div>
    </div>
  ),
}
