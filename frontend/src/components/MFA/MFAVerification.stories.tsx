import type { Meta, StoryObj } from '@storybook/react-vite'
import { MFAVerification } from './MFAVerification'
import type { MFAVerificationProps, MFAVerificationResponse } from '@/types/mfa'

const meta: Meta<typeof MFAVerification> = {
  title: 'Components/MFA/MFAVerification',
  component: MFAVerification,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof MFAVerification>

// Mock handlers
const handleVerify: MFAVerificationProps['onVerify'] = async (request) => {
  console.log('MFA Verification:', request)

  // Simulate verification response
  const response: MFAVerificationResponse = {
    verified: true,
    token: 'mock-jwt-token',
    message: 'Verification successful',
  }

  return Promise.resolve(response)
}

const handleCancel = () => {
  console.log('MFA Verification cancelled')
}

export const Default: Story = {
  args: {
    onVerify: handleVerify,
    onCancel: handleCancel,
    method: 'totp',
    allowBackupCode: true,
    allowTrustDevice: true,
    loading: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'Default MFA verification screen with all features enabled.',
      },
    },
  },
}

export const TOTPOnly: Story = {
  args: {
    onVerify: handleVerify,
    onCancel: handleCancel,
    method: 'totp',
    allowBackupCode: false,
    allowTrustDevice: true,
    loading: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'TOTP verification only, backup codes disabled.',
      },
    },
  },
}

export const WithBackupCode: Story = {
  args: {
    onVerify: handleVerify,
    onCancel: handleCancel,
    method: 'backup_code',
    allowBackupCode: true,
    allowTrustDevice: true,
    loading: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'Using backup code instead of TOTP.',
      },
    },
  },
}

export const WithRemainingAttempts: Story = {
  args: {
    onVerify: handleVerify,
    onCancel: handleCancel,
    method: 'totp',
    allowBackupCode: true,
    allowTrustDevice: true,
    remainingAttempts: 3,
    loading: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows remaining attempts warning when ≤3 attempts left.',
      },
    },
  },
}

export const OneAttemptLeft: Story = {
  args: {
    onVerify: handleVerify,
    onCancel: handleCancel,
    method: 'totp',
    allowBackupCode: true,
    allowTrustDevice: true,
    remainingAttempts: 1,
    loading: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'Critical state with only 1 attempt remaining.',
      },
    },
  },
}

export const Loading: Story = {
  args: {
    onVerify: handleVerify,
    onCancel: handleCancel,
    method: 'totp',
    allowBackupCode: true,
    allowTrustDevice: true,
    loading: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Loading state during verification.',
      },
    },
  },
}

export const NoCancel: Story = {
  args: {
    onVerify: handleVerify,
    method: 'totp',
    allowBackupCode: true,
    allowTrustDevice: true,
    loading: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'Without cancel option (mandatory verification).',
      },
    },
  },
}

export const NoTrustDevice: Story = {
  args: {
    onVerify: handleVerify,
    onCancel: handleCancel,
    method: 'totp',
    allowBackupCode: true,
    allowTrustDevice: false,
    loading: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'Trust device option disabled.',
      },
    },
  },
}

export const EmailMethod: Story = {
  args: {
    onVerify: handleVerify,
    onCancel: handleCancel,
    method: 'email',
    allowBackupCode: true,
    allowTrustDevice: true,
    loading: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'Email-based MFA verification.',
      },
    },
  },
}

export const SMSMethod: Story = {
  args: {
    onVerify: handleVerify,
    onCancel: handleCancel,
    method: 'sms',
    allowBackupCode: true,
    allowTrustDevice: true,
    loading: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'SMS-based MFA verification.',
      },
    },
  },
}
