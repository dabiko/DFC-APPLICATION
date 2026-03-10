import type { Meta, StoryObj } from '@storybook/react-vite'
import { MFASettings } from './MFASettings'
import type { MFAConfig } from '@/types/mfa'

const meta: Meta<typeof MFASettings> = {
  title: 'Components/MFA/MFASettings',
  component: MFASettings,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof MFASettings>

const mockMFAConfigEnabled: MFAConfig = {
  enabled: true,
  method: 'totp',
  setupCompleted: true,
  backupCodesGenerated: true,
  backupCodesRemaining: 8,
  lastVerifiedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
}

const mockMFAConfigDisabled: MFAConfig = {
  enabled: false,
  method: 'totp',
  setupCompleted: false,
  backupCodesGenerated: false,
  backupCodesRemaining: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

const mockMFAConfigLowCodes: MFAConfig = {
  ...mockMFAConfigEnabled,
  backupCodesRemaining: 2,
}

export const Enabled: Story = {
  args: {
    config: mockMFAConfigEnabled,
    onEnable: async () => console.log('Enable MFA'),
    onDisable: async () => console.log('Disable MFA'),
    onRegenerateBackupCodes: async () => console.log('Regenerate codes'),
    onViewBackupCodes: () => console.log('View codes'),
    loading: false,
  },
}

export const Disabled: Story = {
  args: {
    config: mockMFAConfigDisabled,
    onEnable: async () => console.log('Enable MFA'),
    onDisable: async () => console.log('Disable MFA'),
    onRegenerateBackupCodes: async () => console.log('Regenerate codes'),
    onViewBackupCodes: () => console.log('View codes'),
    loading: false,
  },
}

export const LowBackupCodes: Story = {
  args: {
    config: mockMFAConfigLowCodes,
    onEnable: async () => console.log('Enable MFA'),
    onDisable: async () => console.log('Disable MFA'),
    onRegenerateBackupCodes: async () => console.log('Regenerate codes'),
    onViewBackupCodes: () => console.log('View codes'),
    loading: false,
  },
}

export const Loading: Story = {
  args: {
    config: mockMFAConfigEnabled,
    onEnable: async () => console.log('Enable MFA'),
    onDisable: async () => console.log('Disable MFA'),
    onRegenerateBackupCodes: async () => console.log('Regenerate codes'),
    onViewBackupCodes: () => console.log('View codes'),
    loading: true,
  },
}
