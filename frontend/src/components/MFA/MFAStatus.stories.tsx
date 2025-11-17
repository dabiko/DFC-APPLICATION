import type { Meta, StoryObj } from '@storybook/react'
import { MFAStatus } from './MFAStatus'
import type { MFAConfig } from '@/types/mfa'

const meta: Meta<typeof MFAStatus> = {
  title: 'Components/MFA/MFAStatus',
  component: MFAStatus,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof MFAStatus>

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

export const Enabled: Story = {
  args: {
    config: mockMFAConfigEnabled,
    compact: false,
    showDetails: true,
  },
}

export const Disabled: Story = {
  args: {
    config: mockMFAConfigDisabled,
    compact: false,
    showDetails: true,
  },
}

export const CompactEnabled: Story = {
  args: {
    config: mockMFAConfigEnabled,
    compact: true,
    showDetails: false,
  },
}

export const CompactDisabled: Story = {
  args: {
    config: mockMFAConfigDisabled,
    compact: true,
    showDetails: false,
  },
}

export const NoDetails: Story = {
  args: {
    config: mockMFAConfigEnabled,
    compact: false,
    showDetails: false,
  },
}
