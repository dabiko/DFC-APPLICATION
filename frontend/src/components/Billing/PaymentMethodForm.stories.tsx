/**
 * PaymentMethodForm Storybook Stories
 */

import type { Meta, StoryObj } from '@storybook/react'
import { PaymentMethodForm } from './PaymentMethodForm'
import type { PaymentFormData } from '../../types/billing'

const meta: Meta<typeof PaymentMethodForm> = {
  title: 'Billing/PaymentMethodForm',
  component: PaymentMethodForm,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'A secure form for adding payment methods with credit card validation, billing address, and error handling.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    onSubmit: {
      action: 'submitted',
      description: 'Callback when form is submitted with valid data',
    },
    onCancel: {
      action: 'cancelled',
      description: 'Callback when cancel button is clicked',
    },
    loading: {
      control: 'boolean',
      description: 'Loading state during submission',
    },
    error: {
      control: 'text',
      description: 'External error message to display',
    },
  },
  decorators: [
    (Story) => (
      <div className="w-full max-w-2xl p-6">
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof PaymentMethodForm>

/**
 * Default empty form
 */
export const Default: Story = {
  args: {
    loading: false,
    error: undefined,
  },
}

/**
 * Form with initial data (editing mode)
 */
export const WithInitialData: Story = {
  args: {
    initialData: {
      cardNumber: '4242 4242 4242 4242',
      cardholderName: 'John Doe',
      expiryMonth: '12',
      expiryYear: '25',
      cvv: '123',
      billingAddress: {
        line1: '123 Main Street',
        line2: 'Apt 4B',
        city: 'New York',
        state: 'NY',
        postalCode: '10001',
        country: 'US',
      },
    },
    loading: false,
  },
}

/**
 * Loading state during submission
 */
export const Loading: Story = {
  args: {
    loading: true,
    error: undefined,
  },
}

/**
 * With error message
 */
export const WithError: Story = {
  args: {
    loading: false,
    error: 'Payment processing failed. Please check your card details and try again.',
  },
}

/**
 * Card declined error
 */
export const CardDeclined: Story = {
  args: {
    loading: false,
    error: 'Your card was declined. Please use a different payment method.',
  },
}

/**
 * Network error
 */
export const NetworkError: Story = {
  args: {
    loading: false,
    error: 'Network error. Please check your internet connection and try again.',
  },
}

/**
 * Without cancel button
 */
export const WithoutCancel: Story = {
  args: {
    onCancel: undefined,
    loading: false,
  },
}

/**
 * Form validation demo
 */
export const ValidationDemo: Story = {
  render: (args) => {
    const handleSubmit = async (data: PaymentFormData) => {
      console.log('Form submitted:', data)
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 2000))
    }

    return (
      <div className="space-y-4">
        <div className="rounded-lg bg-blue-50 p-4">
          <h3 className="font-semibold text-blue-900">Test Card Numbers</h3>
          <ul className="mt-2 space-y-1 text-sm text-blue-800">
            <li>Visa: 4242 4242 4242 4242</li>
            <li>Mastercard: 5555 5555 5555 4444</li>
            <li>Amex: 3782 822463 10005</li>
            <li>Discover: 6011 1111 1111 1117</li>
          </ul>
          <p className="mt-2 text-xs text-blue-700">
            Use any future expiry date and any 3-digit CVV (4 for Amex)
          </p>
        </div>
        <PaymentMethodForm {...args} onSubmit={handleSubmit} />
      </div>
    )
  },
  args: {
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
    loading: false,
  },
}

/**
 * With different card brands
 */
export const VisaCard: Story = {
  args: {
    initialData: {
      cardNumber: '4242',
      cardholderName: '',
      expiryMonth: '',
      expiryYear: '',
      cvv: '',
      billingAddress: {
        line1: '',
        city: '',
        state: '',
        postalCode: '',
        country: 'US',
      },
    },
  },
}

export const MastercardCard: Story = {
  args: {
    initialData: {
      cardNumber: '5555',
      cardholderName: '',
      expiryMonth: '',
      expiryYear: '',
      cvv: '',
      billingAddress: {
        line1: '',
        city: '',
        state: '',
        postalCode: '',
        country: 'US',
      },
    },
  },
}

export const AmexCard: Story = {
  args: {
    initialData: {
      cardNumber: '3782',
      cardholderName: '',
      expiryMonth: '',
      expiryYear: '',
      cvv: '',
      billingAddress: {
        line1: '',
        city: '',
        state: '',
        postalCode: '',
        country: 'US',
      },
    },
  },
}
