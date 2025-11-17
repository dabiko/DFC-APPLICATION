import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { EncryptionSettings } from './EncryptionSettings'
import { getDefaultEncryptionSettings } from '@/types/encryption'
import type { EncryptionPolicy } from '@/types/encryption'

const meta: Meta<typeof EncryptionSettings> = {
  title: 'Components/Security/EncryptionSettings',
  component: EncryptionSettings,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof EncryptionSettings>

const mockPolicies: EncryptionPolicy[] = [
  {
    id: 'policy-1',
    name: 'Financial Documents Policy',
    description: 'Mandatory encryption for all financial documents',
    type: 'mandatory',
    enabled: true,
    requiredSecurityLevel: 'confidential',
    requiredAlgorithm: 'AES-256-GCM',
    minKeySize: 256,
    forceClientSide: true,
    allowedAlgorithms: ['AES-256-GCM', 'ChaCha20-Poly1305'],
    keyRotationFrequency: 'quarterly',
    complianceStandards: ['SOX', 'PCI-DSS'],
    createdAt: new Date().toISOString(),
    modifiedAt: new Date().toISOString(),
    priority: 1,
  },
  {
    id: 'policy-2',
    name: 'Healthcare Data Protection',
    description: 'HIPAA-compliant encryption for patient data',
    type: 'mandatory',
    enabled: true,
    requiredSecurityLevel: 'secret',
    minKeySize: 256,
    forceClientSide: true,
    allowedAlgorithms: ['AES-256-GCM'],
    keyRotationFrequency: 'monthly',
    complianceStandards: ['HIPAA', 'FIPS-140-3'],
    createdAt: new Date().toISOString(),
    modifiedAt: new Date().toISOString(),
    priority: 2,
  },
]

export const Default: Story = {
  args: {
    settings: getDefaultEncryptionSettings(),
    availablePolicies: mockPolicies,
    showActions: true,
  },
}

export const WithoutActions: Story = {
  args: {
    settings: getDefaultEncryptionSettings(),
    showActions: false,
  },
}

export const CustomSettings: Story = {
  args: {
    settings: {
      ...getDefaultEncryptionSettings(),
      encryptByDefault: false,
      preferClientSide: false,
      warnUnencrypted: false,
      cacheDecrypted: true,
      cacheDuration: 600,
    },
    availablePolicies: mockPolicies,
  },
}

export const Interactive: Story = {
  render: () => {
    const [settings, setSettings] = useState(getDefaultEncryptionSettings())
    const [saving, setSaving] = useState(false)

    const handleSave = () => {
      console.log('Saving settings:', settings)
      setSaving(true)
      setTimeout(() => {
        setSaving(false)
        alert('Settings saved successfully!')
      }, 1500)
    }

    const handleReset = () => {
      setSettings(getDefaultEncryptionSettings())
      alert('Settings reset to defaults')
    }

    return (
      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
          <strong>Interactive Demo:</strong> Modify encryption settings and save changes.
        </div>
        <EncryptionSettings
          settings={settings}
          onSettingsChange={setSettings}
          onSave={handleSave}
          onReset={handleReset}
          saving={saving}
          availablePolicies={mockPolicies}
        />
      </div>
    )
  },
}

export const DarkMode: Story = {
  render: () => (
    <div className="dark bg-gray-950 p-8 min-h-screen">
      <EncryptionSettings
        settings={getDefaultEncryptionSettings()}
        availablePolicies={mockPolicies}
      />
    </div>
  ),
}
