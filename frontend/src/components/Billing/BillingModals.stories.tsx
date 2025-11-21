/**
 * Billing Modals Storybook Stories
 * Combined stories for UpgradeDowngradeModal and CancellationModal
 */

import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { UpgradeDowngradeModal } from './UpgradeDowngradeModal'
import { CancellationModal } from './CancellationModal'
import { Button } from '../Button/Button'
import { SUBSCRIPTION_PLANS } from '../../config/subscriptionPlans'
import { BillingCycle } from '../../types/billing'
import type { Plan, ProrationCalculation, CancellationRequest } from '../../types/billing'

// ============ Upgrade/Downgrade Modal Stories ============

const upgradeDowngradeMeta: Meta<typeof UpgradeDowngradeModal> = {
  title: 'Billing/Modals/UpgradeDowngrade',
  component: UpgradeDowngradeModal,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Modal for upgrading or downgrading subscription plans with proration preview and billing cycle selection.',
      },
    },
  },
  tags: ['autodocs'],
}

export default upgradeDowngradeMeta
type UpgradeStory = StoryObj<typeof UpgradeDowngradeModal>

const mockProration: ProrationCalculation = {
  unusedAmount: 15.5,
  newPlanAmount: 29.99,
  prorationAmount: 14.49,
  effectiveDate: new Date().toISOString(),
  nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  description:
    'You will be charged $14.49 today for the prorated amount, and your new plan will begin immediately.',
}

const availablePlans: Plan[] = [
  SUBSCRIPTION_PLANS.BASIC,
  SUBSCRIPTION_PLANS.PROFESSIONAL,
  SUBSCRIPTION_PLANS.ENTERPRISE,
]

/**
 * Basic to Professional upgrade
 */
export const UpgradeBasicToProfessional: UpgradeStory = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false)

    return (
      <>
        <Button onClick={() => setIsOpen(true)}>Open Upgrade Modal</Button>
        <UpgradeDowngradeModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          currentPlan={SUBSCRIPTION_PLANS.BASIC}
          availablePlans={availablePlans}
          currentBillingCycle={BillingCycle.MONTHLY}
          onConfirm={async () => {
            await new Promise((resolve) => setTimeout(resolve, 2000))
          }}
          onGetProration={async () => {
            await new Promise((resolve) => setTimeout(resolve, 1000))
            return mockProration
          }}
        />
      </>
    )
  },
}

/**
 * Professional to Enterprise upgrade
 */
export const UpgradeProfessionalToEnterprise: UpgradeStory = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false)

    return (
      <>
        <Button onClick={() => setIsOpen(true)}>Open Upgrade Modal</Button>
        <UpgradeDowngradeModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          currentPlan={SUBSCRIPTION_PLANS.PROFESSIONAL}
          availablePlans={availablePlans}
          currentBillingCycle={BillingCycle.MONTHLY}
          onConfirm={async () => {
            await new Promise((resolve) => setTimeout(resolve, 2000))
          }}
          onGetProration={async () => {
            await new Promise((resolve) => setTimeout(resolve, 1000))
            return {
              ...mockProration,
              unusedAmount: 20.0,
              newPlanAmount: 99.99,
              prorationAmount: 79.99,
            }
          }}
        />
      </>
    )
  },
}

/**
 * Professional to Basic downgrade
 */
export const DowngradeProfessionalToBasic: UpgradeStory = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false)

    return (
      <>
        <Button onClick={() => setIsOpen(true)}>Open Downgrade Modal</Button>
        <UpgradeDowngradeModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          currentPlan={SUBSCRIPTION_PLANS.PROFESSIONAL}
          availablePlans={availablePlans}
          currentBillingCycle={BillingCycle.MONTHLY}
          onConfirm={async () => {
            await new Promise((resolve) => setTimeout(resolve, 2000))
          }}
          onGetProration={async () => {
            await new Promise((resolve) => setTimeout(resolve, 1000))
            return {
              ...mockProration,
              unusedAmount: 20.0,
              newPlanAmount: 9.99,
              prorationAmount: -10.01,
              description:
                'Your downgrade will take effect at the end of your current billing period.',
            }
          }}
        />
      </>
    )
  },
}

/**
 * With annual billing
 */
export const WithAnnualBilling: UpgradeStory = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false)

    return (
      <>
        <Button onClick={() => setIsOpen(true)}>Open Modal (Annual)</Button>
        <UpgradeDowngradeModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          currentPlan={SUBSCRIPTION_PLANS.BASIC}
          availablePlans={availablePlans}
          currentBillingCycle={BillingCycle.ANNUAL}
          onConfirm={async () => {
            await new Promise((resolve) => setTimeout(resolve, 2000))
          }}
          onGetProration={async () => {
            await new Promise((resolve) => setTimeout(resolve, 1000))
            return mockProration
          }}
        />
      </>
    )
  },
}

/**
 * With error state
 */
export const WithError: UpgradeStory = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false)

    return (
      <>
        <Button onClick={() => setIsOpen(true)}>Open Modal (Error)</Button>
        <UpgradeDowngradeModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          currentPlan={SUBSCRIPTION_PLANS.BASIC}
          availablePlans={availablePlans}
          currentBillingCycle={BillingCycle.MONTHLY}
          onConfirm={async () => {
            await new Promise((resolve) => setTimeout(resolve, 2000))
          }}
          error="Payment method failed. Please update your payment method and try again."
        />
      </>
    )
  },
}

/**
 * Without proration calculation
 */
export const WithoutProration: UpgradeStory = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false)

    return (
      <>
        <Button onClick={() => setIsOpen(true)}>Open Modal (No Proration)</Button>
        <UpgradeDowngradeModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          currentPlan={SUBSCRIPTION_PLANS.BASIC}
          availablePlans={availablePlans}
          currentBillingCycle={BillingCycle.MONTHLY}
          onConfirm={async () => {
            await new Promise((resolve) => setTimeout(resolve, 2000))
          }}
        />
      </>
    )
  },
}

// ============ Cancellation Modal Stories ============

const cancellationMeta: Meta<typeof CancellationModal> = {
  title: 'Billing/Modals/Cancellation',
  component: CancellationModal,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Modal for cancelling subscriptions with multi-step flow, feedback collection, and cancellation timing options.',
      },
    },
  },
  tags: ['autodocs'],
}

type CancellationStory = StoryObj<typeof CancellationModal>

/**
 * Default cancellation flow
 */
export const CancellationDefault: CancellationStory = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false)

    return (
      <>
        <Button variant="error" onClick={() => setIsOpen(true)}>
          Cancel Subscription
        </Button>
        <CancellationModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          subscriptionId="sub_123456"
          nextBillingDate={new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()}
          planName="Professional"
          onConfirm={async (request: CancellationRequest) => {
            console.log('Cancellation request:', request)
            await new Promise((resolve) => setTimeout(resolve, 2000))
          }}
        />
      </>
    )
  },
}

/**
 * Cancellation with error
 */
export const CancellationWithError: CancellationStory = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false)

    return (
      <>
        <Button variant="error" onClick={() => setIsOpen(true)}>
          Cancel Subscription
        </Button>
        <CancellationModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          subscriptionId="sub_123456"
          nextBillingDate={new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()}
          planName="Professional"
          onConfirm={async () => {
            await new Promise((resolve) => setTimeout(resolve, 2000))
          }}
          error="Failed to cancel subscription. Please try again or contact support."
        />
      </>
    )
  },
}

/**
 * Cancellation - Basic plan
 */
export const CancellationBasicPlan: CancellationStory = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false)

    return (
      <>
        <Button variant="error" onClick={() => setIsOpen(true)}>
          Cancel Subscription
        </Button>
        <CancellationModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          subscriptionId="sub_123456"
          nextBillingDate={new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString()}
          planName="Basic"
          onConfirm={async (request: CancellationRequest) => {
            console.log('Cancellation request:', request)
            await new Promise((resolve) => setTimeout(resolve, 2000))
          }}
        />
      </>
    )
  },
}

/**
 * Cancellation - Enterprise plan
 */
export const CancellationEnterprisePlan: CancellationStory = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false)

    return (
      <>
        <Button variant="error" onClick={() => setIsOpen(true)}>
          Cancel Subscription
        </Button>
        <CancellationModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          subscriptionId="sub_123456"
          nextBillingDate={new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString()}
          planName="Enterprise"
          onConfirm={async (request: CancellationRequest) => {
            console.log('Cancellation request:', request)
            await new Promise((resolve) => setTimeout(resolve, 2000))
          }}
        />
      </>
    )
  },
}

export { cancellationMeta as CancellationModalMeta }
