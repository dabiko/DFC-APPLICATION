import type { Meta, StoryObj } from '@storybook/react-vite'
import { MFABackupCodes } from './MFABackupCodes'
import type { BackupCodesSet } from '@/types/mfa'

const meta: Meta<typeof MFABackupCodes> = {
  title: 'Components/MFA/MFABackupCodes',
  component: MFABackupCodes,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof MFABackupCodes>

const mockBackupCodes: BackupCodesSet = {
  codes: [
    { id: '1', code: 'ABCD1234', used: false, usedAt: null },
    { id: '2', code: 'EFGH5678', used: false, usedAt: null },
    { id: '3', code: 'IJKL9012', used: true, usedAt: new Date().toISOString() },
    { id: '4', code: 'MNOP3456', used: false, usedAt: null },
    { id: '5', code: 'QRST7890', used: false, usedAt: null },
    { id: '6', code: 'UVWX1234', used: false, usedAt: null },
    { id: '7', code: 'YZAB5678', used: false, usedAt: null },
    { id: '8', code: 'CDEF9012', used: false, usedAt: null },
    { id: '9', code: 'GHIJ3456', used: true, usedAt: new Date().toISOString() },
    { id: '10', code: 'KLMN7890', used: false, usedAt: null },
  ],
  generatedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  totalCodes: 10,
  usedCodes: 2,
  remainingCodes: 8,
}

const mockBackupCodesLow: BackupCodesSet = {
  ...mockBackupCodes,
  codes: mockBackupCodes.codes.map((code, index) => ({
    ...code,
    used: index < 8,
    usedAt: index < 8 ? new Date().toISOString() : null,
  })),
  usedCodes: 8,
  remainingCodes: 2,
}

export const Default: Story = {
  args: {
    codes: mockBackupCodes,
    onRegenerate: async () => console.log('Regenerate codes'),
    onDownload: () => console.log('Download codes'),
    onPrint: () => console.log('Print codes'),
    showCodes: false,
    loading: false,
  },
}

export const Visible: Story = {
  args: {
    codes: mockBackupCodes,
    onRegenerate: async () => console.log('Regenerate codes'),
    onDownload: () => console.log('Download codes'),
    onPrint: () => console.log('Print codes'),
    showCodes: true,
    loading: false,
  },
}

export const LowCodes: Story = {
  args: {
    codes: mockBackupCodesLow,
    onRegenerate: async () => console.log('Regenerate codes'),
    onDownload: () => console.log('Download codes'),
    onPrint: () => console.log('Print codes'),
    showCodes: true,
    loading: false,
  },
}

export const Loading: Story = {
  args: {
    codes: mockBackupCodes,
    onRegenerate: async () => console.log('Regenerate codes'),
    onDownload: () => console.log('Download codes'),
    onPrint: () => console.log('Print codes'),
    showCodes: false,
    loading: true,
  },
}
