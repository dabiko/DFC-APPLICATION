/**
 * UsageMetrics Storybook Stories
 */

import type { Meta, StoryObj } from '@storybook/react-vite'
import { UsageMetrics } from './UsageMetrics'
import type { UsageMetrics as UsageMetricsType } from '../../types/billing'

const meta: Meta<typeof UsageMetrics> = {
  title: 'Billing/UsageMetrics',
  component: UsageMetrics,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Displays usage statistics with progress bars, alerts, and upgrade prompts based on plan limits.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    onUpgrade: { action: 'upgrade-clicked' },
    onDismissAlert: { action: 'alert-dismissed' },
    showUpgradePrompt: {
      control: 'boolean',
      description: 'Whether to show upgrade prompt when usage is high',
    },
  },
}

export default meta
type Story = StoryObj<typeof UsageMetrics>

// Helper to create usage data
const createUsage = (
  storagePercent: number,
  documentsPercent: number,
  usersUsed: number,
  usersLimit: number,
  apiPercent: number
): UsageMetricsType => ({
  users: {
    current: usersUsed,
    limit: usersLimit,
  },
  storage: {
    currentGB: (storagePercent / 100) * 100,
    limitGB: 100,
    percentage: storagePercent,
  },
  documents: {
    current: Math.floor((documentsPercent / 100) * 10000),
    limit: 10000,
    percentage: documentsPercent,
  },
  folders: {
    current: 342,
    limit: 1000,
  },
  apiCalls: {
    currentMonth: Math.floor((apiPercent / 100) * 50000),
    limit: 50000,
    percentage: apiPercent,
  },
})

/**
 * Low usage - healthy state
 */
export const LowUsage: Story = {
  args: {
    usage: createUsage(25, 15, 2, 5, 20),
    alerts: [],
    showUpgradePrompt: true,
  },
}

/**
 * Moderate usage (50-80%)
 */
export const ModerateUsage: Story = {
  args: {
    usage: createUsage(60, 55, 3, 5, 65),
    alerts: [],
    showUpgradePrompt: true,
  },
}

/**
 * High usage (80-95%) with warnings
 */
export const HighUsage: Story = {
  args: {
    usage: createUsage(85, 82, 4, 5, 88),
    alerts: [
      {
        id: 'alert_1',
        type: 'storage',
        severity: 'warning',
        message:
          'You are using 85% of your storage quota. Consider upgrading your plan or removing unused files.',
        currentValue: 85,
        limitValue: 100,
        percentage: 85,
        createdAt: new Date().toISOString(),
        dismissed: false,
      },
      {
        id: 'alert_2',
        type: 'documents',
        severity: 'warning',
        message: 'You have used 82% of your document limit.',
        currentValue: 8200,
        limitValue: 10000,
        percentage: 82,
        createdAt: new Date().toISOString(),
        dismissed: false,
      },
    ],
    showUpgradePrompt: true,
  },
}

/**
 * Critical usage (95%+) with critical alerts
 */
export const CriticalUsage: Story = {
  args: {
    usage: createUsage(97, 96, 5, 5, 98),
    alerts: [
      {
        id: 'alert_1',
        type: 'storage',
        severity: 'critical',
        message:
          'CRITICAL: You have reached 97% of your storage limit. Upgrade immediately to avoid service interruption.',
        currentValue: 97,
        limitValue: 100,
        percentage: 97,
        createdAt: new Date().toISOString(),
        dismissed: false,
      },
      {
        id: 'alert_2',
        type: 'documents',
        severity: 'critical',
        message:
          'CRITICAL: You have reached 96% of your document limit. You may not be able to upload new documents soon.',
        currentValue: 9600,
        limitValue: 10000,
        percentage: 96,
        createdAt: new Date().toISOString(),
        dismissed: false,
      },
      {
        id: 'alert_3',
        type: 'api_calls',
        severity: 'critical',
        message: 'API call limit almost exceeded. API access may be throttled.',
        currentValue: 49000,
        limitValue: 50000,
        percentage: 98,
        createdAt: new Date().toISOString(),
        dismissed: false,
      },
    ],
    showUpgradePrompt: true,
  },
}

/**
 * Enterprise plan with unlimited resources
 */
export const UnlimitedPlan: Story = {
  args: {
    usage: {
      users: {
        current: 150,
        limit: -1,
      },
      storage: {
        currentGB: 1250.5,
        limitGB: 2048,
        percentage: 61,
      },
      documents: {
        current: 125000,
        limit: -1,
        percentage: 0,
      },
      folders: {
        current: 8500,
        limit: -1,
      },
      apiCalls: {
        currentMonth: 750000,
        limit: -1,
        percentage: 0,
      },
    },
    alerts: [],
    showUpgradePrompt: false,
  },
}

/**
 * Storage critical, others fine
 */
export const StorageCritical: Story = {
  args: {
    usage: createUsage(98, 25, 2, 5, 30),
    alerts: [
      {
        id: 'alert_1',
        type: 'storage',
        severity: 'critical',
        message: 'Storage is almost full. Immediate action required.',
        currentValue: 98,
        limitValue: 100,
        percentage: 98,
        createdAt: new Date().toISOString(),
        dismissed: false,
      },
    ],
    showUpgradePrompt: true,
  },
}

/**
 * Multiple critical resources
 */
export const MultipleCritical: Story = {
  args: {
    usage: createUsage(96, 95, 5, 5, 97),
    alerts: [
      {
        id: 'alert_1',
        type: 'storage',
        severity: 'critical',
        message: 'Storage limit critical.',
        currentValue: 96,
        limitValue: 100,
        percentage: 96,
        createdAt: new Date().toISOString(),
        dismissed: false,
      },
      {
        id: 'alert_2',
        type: 'documents',
        severity: 'critical',
        message: 'Document limit critical.',
        currentValue: 9500,
        limitValue: 10000,
        percentage: 95,
        createdAt: new Date().toISOString(),
        dismissed: false,
      },
      {
        id: 'alert_3',
        type: 'users',
        severity: 'critical',
        message: 'User limit reached.',
        currentValue: 5,
        limitValue: 5,
        percentage: 100,
        createdAt: new Date().toISOString(),
        dismissed: false,
      },
    ],
    showUpgradePrompt: true,
  },
}

/**
 * Without upgrade prompt
 */
export const WithoutUpgradePrompt: Story = {
  args: {
    usage: createUsage(85, 82, 4, 5, 88),
    alerts: [],
    showUpgradePrompt: false,
  },
}

/**
 * Fresh account - minimal usage
 */
export const FreshAccount: Story = {
  args: {
    usage: createUsage(2, 1, 1, 5, 5),
    alerts: [],
    showUpgradePrompt: true,
  },
}

/**
 * At capacity (100%)
 */
export const AtCapacity: Story = {
  args: {
    usage: createUsage(100, 100, 5, 5, 100),
    alerts: [
      {
        id: 'alert_1',
        type: 'storage',
        severity: 'critical',
        message: 'Storage limit reached. Cannot upload more files.',
        currentValue: 100,
        limitValue: 100,
        percentage: 100,
        createdAt: new Date().toISOString(),
        dismissed: false,
      },
      {
        id: 'alert_2',
        type: 'documents',
        severity: 'critical',
        message: 'Document limit reached. Cannot create more documents.',
        currentValue: 10000,
        limitValue: 10000,
        percentage: 100,
        createdAt: new Date().toISOString(),
        dismissed: false,
      },
    ],
    showUpgradePrompt: true,
  },
}

/**
 * Mid-tier usage
 */
export const MidTierUsage: Story = {
  args: {
    usage: {
      users: {
        current: 15,
        limit: 25,
      },
      storage: {
        currentGB: 250,
        limitGB: 500,
        percentage: 50,
      },
      documents: {
        current: 25000,
        limit: 50000,
        percentage: 50,
      },
      folders: {
        current: 5000,
        limit: 10000,
      },
      apiCalls: {
        currentMonth: 125000,
        limit: 250000,
        percentage: 50,
      },
    },
    alerts: [],
    showUpgradePrompt: true,
  },
}

/**
 * With dismissed alerts
 */
export const WithDismissedAlerts: Story = {
  args: {
    usage: createUsage(85, 82, 4, 5, 88),
    alerts: [
      {
        id: 'alert_1',
        type: 'storage',
        severity: 'warning',
        message: 'Storage warning',
        currentValue: 85,
        limitValue: 100,
        percentage: 85,
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        dismissed: true,
      },
      {
        id: 'alert_2',
        type: 'documents',
        severity: 'warning',
        message: 'Document limit warning - not dismissed yet',
        currentValue: 8200,
        limitValue: 10000,
        percentage: 82,
        createdAt: new Date().toISOString(),
        dismissed: false,
      },
    ],
    showUpgradePrompt: true,
  },
}
