/**
 * BillingHistory Storybook Stories
 */

import type { Meta, StoryObj } from '@storybook/react'
import { BillingHistory } from './BillingHistory'
import type { Invoice } from '../../types/billing'
import { InvoiceStatus } from '../../types/billing'

const meta: Meta<typeof BillingHistory> = {
  title: 'Billing/BillingHistory',
  component: BillingHistory,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Displays billing history with invoice list, filtering, pagination, and download capabilities.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    onPageChange: { action: 'page-changed' },
    onDownload: { action: 'download-clicked' },
    onRetryPayment: { action: 'retry-payment-clicked' },
    onFilterChange: { action: 'filter-changed' },
    loading: {
      control: 'boolean',
      description: 'Loading state',
    },
  },
}

export default meta
type Story = StoryObj<typeof BillingHistory>

// Helper to create mock invoices
const createInvoice = (
  id: string,
  invoiceNumber: string,
  amount: number,
  status: InvoiceStatus,
  daysAgo: number
): Invoice => {
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)

  return {
    id,
    invoiceNumber,
    subscriptionId: 'sub_123456',
    userId: 'user_123',
    status,
    amount,
    subtotal: amount * 0.9,
    tax: amount * 0.1,
    currency: 'USD',
    items: [
      {
        id: `item_${id}`,
        description: 'Professional Plan - Monthly Subscription',
        amount: amount * 0.9,
        quantity: 1,
        total: amount * 0.9,
        period: {
          start: date.toISOString(),
          end: new Date(date.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
      },
    ],
    dueDate: date.toISOString(),
    paidAt: status === 'paid' ? date.toISOString() : undefined,
    createdAt: date.toISOString(),
    pdfUrl: `https://example.com/invoices/${invoiceNumber}.pdf`,
  }
}

const mockInvoices: Invoice[] = [
  createInvoice('inv_1', 'INV-2025-001', 29.99, InvoiceStatus.PAID, 5),
  createInvoice('inv_2', 'INV-2025-002', 29.99, InvoiceStatus.PAID, 35),
  createInvoice('inv_3', 'INV-2024-012', 29.99, InvoiceStatus.PAID, 65),
  createInvoice('inv_4', 'INV-2024-011', 29.99, InvoiceStatus.PAID, 95),
  createInvoice('inv_5', 'INV-2024-010', 29.99, InvoiceStatus.PAID, 125),
  createInvoice('inv_6', 'INV-2024-009', 9.99, InvoiceStatus.PAID, 155),
  createInvoice('inv_7', 'INV-2024-008', 9.99, InvoiceStatus.PAID, 185),
  createInvoice('inv_8', 'INV-2024-007', 9.99, InvoiceStatus.PAID, 215),
]

/**
 * Default with paid invoices
 */
export const Default: Story = {
  args: {
    invoices: mockInvoices.slice(0, 5),
    totalCount: 5,
    currentPage: 1,
    pageSize: 10,
    loading: false,
  },
}

/**
 * With mixed statuses
 */
export const MixedStatuses: Story = {
  args: {
    invoices: [
      createInvoice('inv_1', 'INV-2025-001', 29.99, InvoiceStatus.PAID, 5),
      createInvoice('inv_2', 'INV-2025-002', 29.99, InvoiceStatus.PENDING, 10),
      createInvoice('inv_3', 'INV-2024-012', 29.99, InvoiceStatus.FAILED, 15),
      createInvoice('inv_4', 'INV-2024-011', 29.99, InvoiceStatus.REFUNDED, 20),
      createInvoice('inv_5', 'INV-2024-010', 29.99, InvoiceStatus.PAID, 25),
    ],
    totalCount: 5,
    currentPage: 1,
    pageSize: 10,
    loading: false,
  },
}

/**
 * With pagination
 */
export const WithPagination: Story = {
  args: {
    invoices: mockInvoices,
    totalCount: 25,
    currentPage: 2,
    pageSize: 8,
    loading: false,
  },
}

/**
 * Empty state
 */
export const Empty: Story = {
  args: {
    invoices: [],
    totalCount: 0,
    currentPage: 1,
    pageSize: 10,
    loading: false,
  },
}

/**
 * Loading state
 */
export const Loading: Story = {
  args: {
    invoices: [],
    totalCount: 0,
    currentPage: 1,
    pageSize: 10,
    loading: true,
  },
}

/**
 * With failed invoices requiring retry
 */
export const WithFailedInvoices: Story = {
  args: {
    invoices: [
      createInvoice('inv_1', 'INV-2025-001', 29.99, InvoiceStatus.FAILED, 2),
      createInvoice('inv_2', 'INV-2025-002', 29.99, InvoiceStatus.FAILED, 5),
      createInvoice('inv_3', 'INV-2024-012', 29.99, InvoiceStatus.PAID, 35),
    ],
    totalCount: 3,
    currentPage: 1,
    pageSize: 10,
    loading: false,
  },
}

/**
 * Large dataset
 */
export const LargeDataset: Story = {
  args: {
    invoices: mockInvoices,
    totalCount: 100,
    currentPage: 1,
    pageSize: 10,
    loading: false,
  },
}

/**
 * Single invoice
 */
export const SingleInvoice: Story = {
  args: {
    invoices: [createInvoice('inv_1', 'INV-2025-001', 99.99, InvoiceStatus.PAID, 5)],
    totalCount: 1,
    currentPage: 1,
    pageSize: 10,
    loading: false,
  },
}

/**
 * High value invoices
 */
export const HighValueInvoices: Story = {
  args: {
    invoices: [
      createInvoice('inv_1', 'INV-2025-001', 999.99, InvoiceStatus.PAID, 5),
      createInvoice('inv_2', 'INV-2025-002', 999.99, InvoiceStatus.PAID, 35),
      createInvoice('inv_3', 'INV-2024-012', 999.99, InvoiceStatus.PAID, 65),
    ],
    totalCount: 3,
    currentPage: 1,
    pageSize: 10,
    loading: false,
  },
}

/**
 * Recent invoices only
 */
export const RecentOnly: Story = {
  args: {
    invoices: [
      createInvoice('inv_1', 'INV-2025-003', 29.99, InvoiceStatus.PAID, 1),
      createInvoice('inv_2', 'INV-2025-002', 29.99, InvoiceStatus.PAID, 2),
      createInvoice('inv_3', 'INV-2025-001', 29.99, InvoiceStatus.PAID, 3),
    ],
    totalCount: 3,
    currentPage: 1,
    pageSize: 10,
    loading: false,
  },
}

/**
 * Mobile view
 */
export const Mobile: Story = {
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
  },
  args: {
    invoices: mockInvoices.slice(0, 3),
    totalCount: 3,
    currentPage: 1,
    pageSize: 10,
    loading: false,
  },
}

/**
 * Without download functionality
 */
export const WithoutDownload: Story = {
  args: {
    invoices: mockInvoices.slice(0, 5),
    totalCount: 5,
    currentPage: 1,
    pageSize: 10,
    onDownload: undefined,
    loading: false,
  },
}

/**
 * With only pagination (no filters)
 */
export const OnlyPagination: Story = {
  args: {
    invoices: mockInvoices,
    totalCount: 50,
    currentPage: 3,
    pageSize: 8,
    onFilterChange: undefined,
    loading: false,
  },
}
