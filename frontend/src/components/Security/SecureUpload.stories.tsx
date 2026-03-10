import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { SecureUpload } from './SecureUpload'
import { getDefaultSecureUploadConfig } from '@/types/encryption'

const meta: Meta<typeof SecureUpload> = {
  title: 'Components/Security/SecureUpload',
  component: SecureUpload,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof SecureUpload>

export const Default: Story = {
  args: {
    config: getDefaultSecureUploadConfig(),
    showAdvancedSettings: false,
  },
}

export const WithSettings: Story = {
  args: {
    config: getDefaultSecureUploadConfig(),
    showAdvancedSettings: true,
  },
}

export const Uploading: Story = {
  args: {
    config: getDefaultSecureUploadConfig(),
    uploading: true,
    progress: 65,
  },
}

export const NoEncryption: Story = {
  args: {
    config: {
      ...getDefaultSecureUploadConfig(),
      encryptOnUpload: false,
    },
    showAdvancedSettings: true,
  },
}

export const Interactive: Story = {
  render: () => {
    const [config, setConfig] = useState(getDefaultSecureUploadConfig())
    const [uploading, setUploading] = useState(false)
    const [progress, setProgress] = useState(0)

    const handleUpload = (files: File[]) => {
      console.log('Uploading files:', files)
      setUploading(true)
      setProgress(0)

      // Simulate upload progress
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval)
            setUploading(false)
            return 0
          }
          return prev + 10
        })
      }, 500)
    }

    return (
      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
          <strong>Interactive Demo:</strong> Select files and configure security settings before
          uploading.
        </div>
        <SecureUpload
          config={config}
          onConfigChange={setConfig}
          onUpload={handleUpload}
          uploading={uploading}
          progress={progress}
          showAdvancedSettings={true}
        />
      </div>
    )
  },
}

export const DarkMode: Story = {
  render: () => (
    <div className="dark bg-gray-950 p-8 min-h-screen">
      <SecureUpload config={getDefaultSecureUploadConfig()} showAdvancedSettings={true} />
    </div>
  ),
}
