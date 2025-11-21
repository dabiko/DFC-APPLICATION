/**
 * SignUp Page Storybook Stories
 */

import type { Meta, StoryObj } from '@storybook/react'
import { BrowserRouter } from 'react-router-dom'
import { SignUp } from './SignUp'

const meta: Meta<typeof SignUp> = {
  title: 'Pages/SignUp',
  component: SignUp,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Comprehensive signup page with multi-step form, business email validation, KYC fields, OTP verification, and password strength indicator.',
      },
    },
  },
  decorators: [
    (Story) => (
      <BrowserRouter>
        <Story />
      </BrowserRouter>
    ),
  ],
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof SignUp>

/**
 * Default SignUp page - Step 1 (Company Information)
 */
export const Default: Story = {}

/**
 * Complete signup flow demonstration
 */
export const CompletFlow: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'This demonstrates the complete signup flow:\n\n' +
          '1. **Step 1**: Company Information (name, registration number, tax ID, industry)\n' +
          '2. **Step 2**: Personal Information & KYC (name, business email, phone with country code, job title, business address)\n' +
          '3. **Email OTP Verification**: 6-digit code sent to business email (use 123456 for demo)\n' +
          '4. **Phone OTP Verification**: 6-digit code sent to phone (use 123456 for demo)\n' +
          '5. **Step 3**: Security (password with strength indicator, confirmPassword, terms acceptance)\n\n' +
          '**Features:**\n' +
          '- Business email validation (rejects Gmail, Yahoo, etc.)\n' +
          '- Password strength indicator with real-time feedback\n' +
          '- Country selection with phone codes (European, American, African countries)\n' +
          '- OTP verification for both email and phone\n' +
          '- Comprehensive form validation\n' +
          '- Loading states\n' +
          '- Cursor pointer on all clickable elements',
      },
    },
  },
}
