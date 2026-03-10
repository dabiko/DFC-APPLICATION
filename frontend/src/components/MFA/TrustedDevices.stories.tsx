import type { Meta, StoryObj } from '@storybook/react-vite'
import { TrustedDevices } from './TrustedDevices'
import type { TrustedDevice } from '@/types/mfa'

const meta: Meta<typeof TrustedDevices> = {
  title: 'Components/MFA/TrustedDevices',
  component: TrustedDevices,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof TrustedDevices>

const mockDevices: TrustedDevice[] = [
  {
    id: '1',
    deviceName: 'Chrome on Windows',
    deviceType: 'desktop',
    browser: 'Chrome 120',
    os: 'Windows 11',
    ipAddress: '192.168.1.100',
    location: 'New York, US',
    lastUsedAt: new Date().toISOString(),
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    expiresAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
    fingerprint: 'device-fingerprint-1',
  },
  {
    id: '2',
    deviceName: 'Safari on iPhone',
    deviceType: 'mobile',
    browser: 'Safari 17',
    os: 'iOS 17.2',
    ipAddress: '192.168.1.101',
    location: 'New York, US',
    lastUsedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    expiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    fingerprint: 'device-fingerprint-2',
  },
  {
    id: '3',
    deviceName: 'Firefox on Linux',
    deviceType: 'desktop',
    browser: 'Firefox 121',
    os: 'Ubuntu 22.04',
    ipAddress: '192.168.1.102',
    location: 'San Francisco, US',
    lastUsedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
    expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    fingerprint: 'device-fingerprint-3',
  },
]

const mockDevicesExpiring: TrustedDevice[] = [
  ...mockDevices,
  {
    id: '4',
    deviceName: 'Edge on Windows',
    deviceType: 'desktop',
    browser: 'Edge 120',
    os: 'Windows 10',
    ipAddress: '192.168.1.103',
    location: 'London, UK',
    lastUsedAt: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString(),
    expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    fingerprint: 'device-fingerprint-4',
  },
]

export const Default: Story = {
  args: {
    devices: mockDevices,
    currentDeviceId: '1',
    onRemoveDevice: async (id) => console.log('Remove device:', id),
    onTrustCurrentDevice: async () => console.log('Trust current device'),
    loading: false,
  },
}

export const Empty: Story = {
  args: {
    devices: [],
    currentDeviceId: undefined,
    onRemoveDevice: async (id) => console.log('Remove device:', id),
    onTrustCurrentDevice: async () => console.log('Trust current device'),
    loading: false,
  },
}

export const WithExpiring: Story = {
  args: {
    devices: mockDevicesExpiring,
    currentDeviceId: '1',
    onRemoveDevice: async (id) => console.log('Remove device:', id),
    onTrustCurrentDevice: async () => console.log('Trust current device'),
    loading: false,
  },
}

export const NotTrusted: Story = {
  args: {
    devices: mockDevices,
    currentDeviceId: 'not-in-list',
    onRemoveDevice: async (id) => console.log('Remove device:', id),
    onTrustCurrentDevice: async () => console.log('Trust current device'),
    loading: false,
  },
}

export const Loading: Story = {
  args: {
    devices: mockDevices,
    currentDeviceId: '1',
    onRemoveDevice: async (id) => console.log('Remove device:', id),
    onTrustCurrentDevice: async () => console.log('Trust current device'),
    loading: true,
  },
}
