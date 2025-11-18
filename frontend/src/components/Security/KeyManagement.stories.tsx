import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { KeyManagement } from './KeyManagement'
import type { EncryptionKey, KeyRotationEvent } from '@/types/encryption'

const meta: Meta<typeof KeyManagement> = {
  title: 'Components/Security/KeyManagement',
  component: KeyManagement,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof KeyManagement>

const mockKeys: EncryptionKey[] = [
  {
    id: 'key-1',
    name: 'Production Master Key',
    type: 'master',
    status: 'active',
    algorithm: 'AES-256-GCM',
    keySize: 256,
    createdAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
    createdBy: 'admin@example.com',
    expiresAt: new Date(Date.now() + 185 * 24 * 60 * 60 * 1000).toISOString(),
    lastRotatedAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
    nextRotationDue: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    rotationFrequency: 'quarterly',
    usageCount: 15420,
    maxUsageCount: 50000,
    inUse: true,
    documentCount: 1250,
    fingerprint: 'A1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6',
    complianceStandards: ['FIPS-140-3', 'ISO-27001'],
    escrowEnabled: true,
  },
  {
    id: 'key-2',
    name: 'Data Encryption Key (Current)',
    type: 'data',
    status: 'active',
    algorithm: 'AES-256-GCM',
    keySize: 256,
    createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
    createdBy: 'system@example.com',
    lastRotatedAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
    nextRotationDue: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
    rotationFrequency: 'quarterly',
    usageCount: 8920,
    inUse: true,
    documentCount: 892,
    fingerprint: 'Z9Y8X7W6V5U4T3S2R1Q0P9O8N7M6L5K4',
    complianceStandards: ['FIPS-140-3'],
    escrowEnabled: false,
  },
  {
    id: 'key-3',
    name: 'Backup Key (Archive)',
    type: 'backup',
    status: 'active',
    algorithm: 'ChaCha20-Poly1305',
    keySize: 256,
    createdAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
    createdBy: 'admin@example.com',
    rotationFrequency: 'annually',
    usageCount: 250,
    inUse: false,
    documentCount: 45,
    fingerprint: 'J1K2L3M4N5O6P7Q8R9S0T1U2V3W4X5Y6',
    complianceStandards: ['ISO-27001'],
    escrowEnabled: true,
  },
  {
    id: 'key-4',
    name: 'Legacy Encryption Key',
    type: 'data',
    status: 'pending_rotation',
    algorithm: 'AES-256-CBC',
    keySize: 256,
    createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
    createdBy: 'system@example.com',
    lastRotatedAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
    nextRotationDue: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    rotationFrequency: 'quarterly',
    usageCount: 12000,
    inUse: true,
    documentCount: 340,
    fingerprint: 'A9B8C7D6E5F4G3H2I1J0K9L8M7N6O5P4',
    complianceStandards: [],
    escrowEnabled: false,
  },
]

const mockRotationEvents: KeyRotationEvent[] = [
  {
    id: 'event-1',
    keyId: 'key-1',
    oldKeyId: 'key-old-1',
    newKeyId: 'key-1',
    rotatedAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
    rotatedBy: 'admin@example.com',
    reason: 'scheduled',
    documentsReencrypted: 1250,
    status: 'completed',
  },
  {
    id: 'event-2',
    keyId: 'key-2',
    oldKeyId: 'key-old-2',
    newKeyId: 'key-2',
    rotatedAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
    rotatedBy: 'system@example.com',
    reason: 'policy',
    documentsReencrypted: 892,
    status: 'completed',
  },
]

export const Default: Story = {
  args: {
    keys: mockKeys,
    rotationEvents: mockRotationEvents,
    showRotationHistory: true,
  },
}

export const NoKeys: Story = {
  args: {
    keys: [],
    rotationEvents: [],
  },
}

export const WithPendingRotation: Story = {
  args: {
    keys: mockKeys.filter((k) => k.status === 'pending_rotation'),
  },
}

export const Interactive: Story = {
  render: () => {
    const [selectedKey, setSelectedKey] = useState<string>()

    return (
      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
          <strong>Interactive Demo:</strong> Click on keys to select them, use rotation and revoke
          buttons.
        </div>
        <KeyManagement
          keys={mockKeys}
          selectedKeyId={selectedKey}
          onKeySelect={setSelectedKey}
          onRotateKey={(keyId) => alert(`Rotating key: ${keyId}`)}
          onRevokeKey={(keyId) => alert(`Revoking key: ${keyId}`)}
          onCreateKey={() => alert('Creating new key')}
          rotationEvents={mockRotationEvents}
        />
      </div>
    )
  },
}

export const DarkMode: Story = {
  render: () => (
    <div className="dark bg-gray-950 p-8 min-h-screen">
      <KeyManagement keys={mockKeys} rotationEvents={mockRotationEvents} />
    </div>
  ),
}
