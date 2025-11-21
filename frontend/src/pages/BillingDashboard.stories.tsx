/**
 * Storybook Stories for BillingDashboard Page
 */

import type { Meta, StoryObj } from '@storybook/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { BillingDashboard } from './BillingDashboard'
import { ToastContainer } from '../components/common/Toast'
import billingReducer from '../store/slices/billingSlice'
import type { BillingState } from '../store/slices/billingSlice'
import { SUBSCRIPTION_PLANS } from '../config/subscriptionPlans'
import type { Subscription, Invoice, PaymentMethod, UsageMetrics } from '../types/billing'

// Mock data
const mockActiveSubscription: Subscription = {
  id: 'sub_123',
  userId: 'user_123',
  planId: 'professional',
  plan: SUBSCRIPTION_PLANS.PROFESSIONAL,
  status: 'active',
  billingCycle: 'monthly',
  currentPeriodStart: new Date('2025-11-01'),
  currentPeriodEnd: new Date('2025-12-01'),
  cancelAtPeriodEnd: false,
  usage: {
    storageUsed: 425,
    storageLimit: 1000,
    documentsUsed: 8500,
    documentsLimit: 100000,
    usersUsed: 18,
    usersLimit: 50,
    apiCallsUsed: 75000,
    apiCallsLimit: 1000000,
  },
  createdAt: new Date('2025-01-15'),
  updatedAt: new Date('2025-11-01'),
}

const mockInvoices: Invoice[] = [
  {
    id: 'inv_1',
    subscriptionId: 'sub_123',
    invoiceNumber: 'INV-2025-11-001',
    status: 'paid',
    amount: 29.99,
    currency: 'USD',
    description: 'Professional Plan - November 2025',
    pdfUrl: '/invoices/inv_1.pdf',
    dueDate: new Date('2025-11-01'),
    paidDate: new Date('2025-11-01'),
    createdAt: new Date('2025-11-01'),
  },
  {
    id: 'inv_2',
    subscriptionId: 'sub_123',
    invoiceNumber: 'INV-2025-10-001',
    status: 'paid',
    amount: 29.99,
    currency: 'USD',
    description: 'Professional Plan - October 2025',
    pdfUrl: '/invoices/inv_2.pdf',
    dueDate: new Date('2025-10-01'),
    paidDate: new Date('2025-10-01'),
    createdAt: new Date('2025-10-01'),
  },
]

const mockPaymentMethods: PaymentMethod[] = [
  {
    id: 'pm_1',
    userId: 'user_123',
    type: 'card',
    cardBrand: 'visa',
    last4: '4242',
    expiryMonth: 12,
    expiryYear: 2026,
    isDefault: true,
    createdAt: new Date('2025-01-15'),
  },
  {
    id: 'pm_2',
    userId: 'user_123',
    type: 'card',
    cardBrand: 'mastercard',
    last4: '5555',
    expiryMonth: 6,
    expiryYear: 2027,
    isDefault: false,
    createdAt: new Date('2025-06-10'),
  },
]

// Create mock store
function createMockStore(initialState: Partial<BillingState>) {
  return configureStore({
    reducer: {
      billing: billingReducer,
    },
    preloadedState: {
      billing: {
        subscription: null,
        subscriptionLoading: false,
        subscriptionError: null,

        plans: Object.values(SUBSCRIPTION_PLANS),
        plansLoading: false,
        plansError: null,

        paymentMethods: [],
        paymentMethodsLoading: false,
        paymentMethodsError: null,

        invoices: [],
        invoicesTotal: 0,
        invoicesPage: 1,
        invoicesPageSize: 10,
        invoicesFilters: {},
        invoicesLoading: false,
        invoicesError: null,

        usage: null,
        usageAlerts: [],
        usageLoading: false,
        usageError: null,

        proration: null,
        prorationLoading: false,
        prorationError: null,

        activeModal: null,

        ...initialState,
      } as BillingState,
    },
  })
}

const meta: Meta<typeof BillingDashboard> = {
  title: 'Pages/BillingDashboard',
  component: BillingDashboard,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Complete billing dashboard page integrating all billing components with state management.',
      },
    },
  },
  decorators: [
    (Story, context) => {
      const store = createMockStore(context.args.initialState || {})
      return (
        <Provider store={store}>
          <Story />
          <ToastContainer />
        </Provider>
      )
    },
  ],
}

export default meta
type Story = StoryObj<typeof BillingDashboard>

export const Default: Story = {
  args: {
    initialState: {
      subscription: mockActiveSubscription,
      paymentMethods: mockPaymentMethods,
      invoices: mockInvoices,
      invoicesTotal: 12,
    },
  },
}

export const NewUser: Story = {
  args: {
    initialState: {
      subscription: null,
      paymentMethods: [],
      invoices: [],
      invoicesTotal: 0,
    },
  },
}

export const TrialSubscription: Story = {
  args: {
    initialState: {
      subscription: {
        ...mockActiveSubscription,
        planId: 'trial',
        plan: SUBSCRIPTION_PLANS.TRIAL,
        status: 'trialing',
        trialEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      },
      paymentMethods: [],
      invoices: [],
      invoicesTotal: 0,
    },
  },
}

export const CancelledSubscription: Story = {
  args: {
    initialState: {
      subscription: {
        ...mockActiveSubscription,
        status: 'canceled',
        canceledAt: new Date('2025-11-15'),
        cancelAtPeriodEnd: true,
      },
      paymentMethods: mockPaymentMethods,
      invoices: mockInvoices,
      invoicesTotal: 12,
    },
  },
}

export const HighUsage: Story = {
  args: {
    initialState: {
      subscription: {
        ...mockActiveSubscription,
        usage: {
          storageUsed: 950,
          storageLimit: 1000,
          documentsUsed: 95000,
          documentsLimit: 100000,
          usersUsed: 48,
          usersLimit: 50,
          apiCallsUsed: 980000,
          apiCallsLimit: 1000000,
        },
      },
      usageAlerts: [
        {
          id: 'alert_1',
          type: 'warning',
          metric: 'storage',
          message: 'You are using 95% of your storage limit',
          threshold: 95,
          currentValue: 95,
          createdAt: new Date(),
        },
        {
          id: 'alert_2',
          type: 'warning',
          metric: 'users',
          message: 'You are using 96% of your user seats',
          threshold: 95,
          currentValue: 96,
          createdAt: new Date(),
        },
      ],
      paymentMethods: mockPaymentMethods,
      invoices: mockInvoices,
      invoicesTotal: 12,
    },
  },
}

export const NoPaymentMethods: Story = {
  args: {
    initialState: {
      subscription: mockActiveSubscription,
      paymentMethods: [],
      invoices: mockInvoices,
      invoicesTotal: 12,
    },
  },
}

export const PastDueInvoice: Story = {
  args: {
    initialState: {
      subscription: {
        ...mockActiveSubscription,
        status: 'past_due',
      },
      paymentMethods: mockPaymentMethods,
      invoices: [
        {
          id: 'inv_past_due',
          subscriptionId: 'sub_123',
          invoiceNumber: 'INV-2025-11-001',
          status: 'past_due',
          amount: 29.99,
          currency: 'USD',
          description: 'Professional Plan - November 2025',
          pdfUrl: '/invoices/inv_past_due.pdf',
          dueDate: new Date('2025-11-01'),
          createdAt: new Date('2025-11-01'),
        },
        ...mockInvoices,
      ],
      invoicesTotal: 13,
    },
  },
}

export const Loading: Story = {
  args: {
    initialState: {
      subscription: null,
      subscriptionLoading: true,
      paymentMethods: [],
      paymentMethodsLoading: true,
      invoices: [],
      invoicesLoading: true,
      invoicesTotal: 0,
    },
  },
}

export const Error: Story = {
  args: {
    initialState: {
      subscription: null,
      subscriptionError: 'Failed to load subscription data',
      paymentMethods: [],
      paymentMethodsError: 'Failed to load payment methods',
      invoices: [],
      invoicesError: 'Failed to load billing history',
      invoicesTotal: 0,
    },
  },
}
