import type { Meta, StoryObj } from '@storybook/react-vite'
import { SecurityBadge } from './SecurityBadge'

const meta: Meta<typeof SecurityBadge> = {
  title: 'Components/Security/SecurityBadge',
  component: SecurityBadge,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof SecurityBadge>

export const Encrypted: Story = {
  args: {
    status: 'encrypted',
    variant: 'icon-text',
    size: 'md',
  },
}

export const Unencrypted: Story = {
  args: {
    status: 'unencrypted',
    variant: 'icon-text',
    size: 'md',
  },
}

export const IconOnly: Story = {
  args: {
    status: 'encrypted',
    variant: 'icon-only',
    size: 'md',
  },
}

export const TopSecret: Story = {
  args: {
    securityLevel: 'top-secret',
    variant: 'icon-text',
    size: 'md',
  },
}

export const Confidential: Story = {
  args: {
    securityLevel: 'confidential',
    variant: 'icon-text',
    size: 'md',
  },
}

export const ComplianceBadge: Story = {
  args: {
    compliance: 'FIPS-140-3',
    variant: 'text-only',
    size: 'sm',
  },
}

export const SmallSize: Story = {
  args: {
    status: 'encrypted',
    variant: 'icon-text',
    size: 'sm',
  },
}

export const LargeSize: Story = {
  args: {
    status: 'encrypted',
    variant: 'icon-text',
    size: 'lg',
  },
}

export const OverlayExample: Story = {
  render: () => (
    <div className="relative w-64 h-48 bg-gray-200 dark:bg-gray-800 rounded-lg">
      <SecurityBadge
        status="encrypted"
        variant="icon-text"
        size="sm"
        overlay={true}
        position="top-right"
      />
      <div className="absolute inset-0 flex items-center justify-center text-gray-600">
        Document Preview
      </div>
    </div>
  ),
}

export const DarkMode: Story = {
  render: () => (
    <div className="dark bg-gray-950 p-8">
      <div className="space-y-4">
        <SecurityBadge status="encrypted" variant="icon-text" />
        <SecurityBadge securityLevel="top-secret" variant="icon-text" />
        <SecurityBadge compliance="HIPAA" variant="text-only" />
      </div>
    </div>
  ),
}
