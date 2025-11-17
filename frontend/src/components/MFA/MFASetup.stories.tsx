import type { Meta, StoryObj } from '@storybook/react'
import { MFASetup } from './MFASetup'
import type { MFASetupProps } from '@/types/mfa'

const meta: Meta<typeof MFASetup> = {
  title: 'Components/MFA/MFASetup',
  component: MFASetup,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof MFASetup>

// Mock handlers
const handleComplete: MFASetupProps['onComplete'] = async (data) => {
  console.log('MFA Setup completed:', data)
  return Promise.resolve()
}

const handleCancel = () => {
  console.log('MFA Setup cancelled')
}

export const Step1_PasswordVerification: Story = {
  args: {
    onComplete: handleComplete,
    onCancel: handleCancel,
    method: 'totp',
    loading: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'Step 1: User must verify their password before setting up MFA.',
      },
    },
  },
}

export const Step2_QRCodeScan: Story = {
  args: {
    onComplete: handleComplete,
    onCancel: handleCancel,
    method: 'totp',
    loading: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'Step 2: User scans QR code with their authenticator app. Manual secret entry available.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    // Simulate moving to step 2
    const passwordInput = canvasElement.querySelector('input[type="password"]') as HTMLInputElement
    if (passwordInput) {
      passwordInput.value = 'password123'
      const continueButton = canvasElement.querySelector('button[type="button"]') as HTMLButtonElement
      continueButton?.click()
    }
  },
}

export const Step3_VerificationCode: Story = {
  args: {
    onComplete: handleComplete,
    onCancel: handleCancel,
    method: 'totp',
    loading: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'Step 3: User enters 6-digit code from their authenticator app to verify setup.',
      },
    },
  },
}

export const Step4_BackupCodes: Story = {
  args: {
    onComplete: handleComplete,
    onCancel: handleCancel,
    method: 'totp',
    loading: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'Step 4: User receives backup codes for account recovery. Can download or print.',
      },
    },
  },
}

export const Loading: Story = {
  args: {
    onComplete: handleComplete,
    onCancel: handleCancel,
    method: 'totp',
    loading: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Loading state during API calls.',
      },
    },
  },
}

export const WithoutCancel: Story = {
  args: {
    onComplete: handleComplete,
    method: 'totp',
    loading: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'Setup wizard without cancel option (required setup).',
      },
    },
  },
}

export const EmailMethod: Story = {
  args: {
    onComplete: handleComplete,
    onCancel: handleCancel,
    method: 'email',
    loading: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'MFA setup with email method (alternative to TOTP).',
      },
    },
  },
}

export const SMSMethod: Story = {
  args: {
    onComplete: handleComplete,
    onCancel: handleCancel,
    method: 'sms',
    loading: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'MFA setup with SMS method (alternative to TOTP).',
      },
    },
  },
}
