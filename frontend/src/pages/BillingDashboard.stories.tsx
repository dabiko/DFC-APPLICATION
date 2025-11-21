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
import type { Subscription, Invoice, PaymentMethod } from '../types/billing'

// Mock data
const mockActiveSubscription: Subscription = {
  id: 'sub_123',
  userId: 'user_123',
  planId: 'professional',
  plan: SUBSCRIPTION_PLANS.PROFESSIONAL,
  status: 'active',
  billingCycle: 'monthly',
  currentPeriodStart: '2025-11-01T00:00:00Z',
  currentPeriodEnd: '2025-12-01T00:00:00Z',
  cancelAtPeriodEnd: false,
  autoRenew: true,
  usage: {
    users: {
      current: 18,
      limit: 50,
    },
    storage: {
      currentGB: 425,
      limitGB: 1000,
      percentage: 42.5,
    },
    documents: {
      current: 8500,
      limit: 100000,
      percentage: 8.5,
    },
    folders: {
      current: 342,
      limit: 1000,
    },
    apiCalls: {
      currentMonth: 75000,
      limit: 1000000,
      percentage: 7.5,
    },
  },
  createdAt: '2025-01-15T00:00:00Z',
  updatedAt: '2025-11-01T00:00:00Z',
}

const mockInvoices: Invoice[] = [
  {
    id: 'inv_1',
    subscriptionId: 'sub_123',
    userId: 'user_123',
    invoiceNumber: 'INV-2025-11-001',
    status: 'paid',
    amount: 29.99,
    subtotal: 29.99,
    tax: 0,
    currency: 'USD',
    description: 'Professional Plan - November 2025',
    lineItems: [],
    pdfUrl: '/invoices/inv_1.pdf',
    dueDate: '2025-11-01T00:00:00Z',
    paidAt: '2025-11-01T00:00:00Z',
    createdAt: '2025-11-01T00:00:00Z',
  },
  {
    id: 'inv_2',
    subscriptionId: 'sub_123',
    userId: 'user_123',
    invoiceNumber: 'INV-2025-10-001',
    status: 'paid',
    amount: 29.99,
    subtotal: 29.99,
    tax: 0,
    currency: 'USD',
    description: 'Professional Plan - October 2025',
    lineItems: [],
    pdfUrl: '/invoices/inv_2.pdf',
    dueDate: '2025-10-01T00:00:00Z',
    paidAt: '2025-10-01T00:00:00Z',
    createdAt: '2025-10-01T00:00:00Z',
  },
]

const mockPaymentMethods: PaymentMethod[] = [
  {
    id: 'pm_1',
    type: 'card',
    isDefault: true,
    card: {
      brand: 'visa',
      last4: '4242',
      expiryMonth: 12,
      expiryYear: 2026,
      holderName: 'John Doe',
    },
    createdAt: '2025-01-15T00:00:00Z',
  },
  {
    id: 'pm_2',
    type: 'card',
    isDefault: false,
    card: {
      brand: 'mastercard',
      last4: '5555',
      expiryMonth: 6,
      expiryYear: 2027,
      holderName: 'John Doe',
    },
    createdAt: '2025-06-10T00:00:00Z',
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
        trialStart: '2025-11-01T00:00:00Z',
        trialEnd: '2025-11-15T00:00:00Z',
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
        cancelledAt: '2025-11-15T00:00:00Z',
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
          users: {
            current: 48,
            limit: 50,
          },
          storage: {
            currentGB: 950,
            limitGB: 1000,
            percentage: 95,
          },
          documents: {
            current: 95000,
            limit: 100000,
            percentage: 95,
          },
          folders: {
            current: 980,
            limit: 1000,
          },
          apiCalls: {
            currentMonth: 980000,
            limit: 1000000,
            percentage: 98,
          },
        },
      },
      usageAlerts: [
        {
          id: 'alert_1',
          type: 'storage',
          severity: 'warning',
          message: 'You are using 95% of your storage limit',
          currentValue: 950,
          limitValue: 1000,
          percentage: 95,
          createdAt: new Date().toISOString(),
          dismissed: false,
        },
        {
          id: 'alert_2',
          type: 'users',
          severity: 'warning',
          message: 'You are using 96% of your user seats',
          currentValue: 48,
          limitValue: 50,
          percentage: 96,
          createdAt: new Date().toISOString(),
          dismissed: false,
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
          userId: 'user_123',
          invoiceNumber: 'INV-2025-11-001',
          status: 'past_due',
          amount: 29.99,
          subtotal: 29.99,
          tax: 0,
          currency: 'USD',
          description: 'Professional Plan - November 2025',
          lineItems: [],
          pdfUrl: '/invoices/inv_past_due.pdf',
          dueDate: '2025-11-01T00:00:00Z',
          createdAt: '2025-11-01T00:00:00Z',
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
