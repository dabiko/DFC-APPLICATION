/**
 * FileUploadProgress Storybook Stories
 */

import type { Meta, StoryObj } from '@storybook/react'
import { FileUploadProgress } from './FileUploadProgress'
import type { FileUploadItem } from '@/types/upload'

const meta: Meta<typeof FileUploadProgress> = {
  title: 'Components/Upload/FileUploadProgress',
  component: FileUploadProgress,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof FileUploadProgress>

const createMockFile = (name: string, size: number, type: string): File => {
  return new File([''], name, { type })
}

const baseUpload: FileUploadItem = {
  id: 'upload-1',
  file: createMockFile('Financial_Report_Q4.pdf', 2548976, 'application/pdf'),
  status: 'uploading',
  progress: 45,
  uploadSpeed: 1024 * 512, // 512 KB/s
  timeRemaining: 8,
  startedAt: new Date().toISOString(),
}

export const Uploading: Story = {
  args: {
    upload: baseUpload,
    onCancel: (id) => console.log('Cancel:', id),
    showDetails: true,
  },
}

export const UploadingFast: Story = {
  args: {
    upload: {
      ...baseUpload,
      progress: 75,
      uploadSpeed: 1024 * 1024 * 5, // 5 MB/s
      timeRemaining: 2,
    },
    onCancel: (id) => console.log('Cancel:', id),
  },
}

export const Processing: Story = {
  args: {
    upload: {
      ...baseUpload,
      status: 'processing',
      progress: 100,
      uploadSpeed: undefined,
      timeRemaining: undefined,
    },
  },
}

export const Completed: Story = {
  args: {
    upload: {
      ...baseUpload,
      status: 'completed',
      progress: 100,
      completedAt: new Date().toISOString(),
      documentId: 'doc-123',
    },
    onRemove: (id) => console.log('Remove:', id),
  },
}

export const Failed: Story = {
  args: {
    upload: {
      ...baseUpload,
      status: 'error',
      progress: 25,
      error: 'Network connection lost. Please try again.',
    },
    onRetry: (id) => console.log('Retry:', id),
    onRemove: (id) => console.log('Remove:', id),
  },
}

export const Cancelled: Story = {
  args: {
    upload: {
      ...baseUpload,
      status: 'cancelled',
      progress: 60,
    },
    onRemove: (id) => console.log('Remove:', id),
  },
}

export const Pending: Story = {
  args: {
    upload: {
      ...baseUpload,
      status: 'pending',
      progress: 0,
    },
  },
}

export const LargeFile: Story = {
  args: {
    upload: {
      id: 'upload-2',
      file: createMockFile('Presentation_Final.pptx', 450 * 1024 * 1024, 'application/vnd.openxmlformats-officedocument.presentationml.presentation'),
      status: 'uploading',
      progress: 12,
      uploadSpeed: 1024 * 1024 * 2.5, // 2.5 MB/s
      timeRemaining: 180,
      startedAt: new Date().toISOString(),
    },
    onCancel: (id) => console.log('Cancel:', id),
  },
}

export const ImageFile: Story = {
  args: {
    upload: {
      id: 'upload-3',
      file: createMockFile('photo_2024.jpg', 3145728, 'image/jpeg'),
      status: 'uploading',
      progress: 88,
      uploadSpeed: 1024 * 768,
      timeRemaining: 1,
      startedAt: new Date().toISOString(),
    },
    onCancel: (id) => console.log('Cancel:', id),
  },
}

export const WithoutDetails: Story = {
  args: {
    upload: baseUpload,
    showDetails: false,
    onCancel: (id) => console.log('Cancel:', id),
  },
}

export const MultipleStates: Story = {
  render: () => (
    <div className="space-y-4 max-w-2xl">
      <FileUploadProgress
        upload={{ ...baseUpload, id: '1', status: 'pending', progress: 0 }}
      />
      <FileUploadProgress
        upload={{ ...baseUpload, id: '2', status: 'uploading', progress: 35 }}
        onCancel={(id) => console.log('Cancel:', id)}
      />
      <FileUploadProgress
        upload={{ ...baseUpload, id: '3', status: 'processing', progress: 100 }}
      />
      <FileUploadProgress
        upload={{ ...baseUpload, id: '4', status: 'completed', progress: 100 }}
        onRemove={(id) => console.log('Remove:', id)}
      />
      <FileUploadProgress
        upload={{ ...baseUpload, id: '5', status: 'error', progress: 50, error: 'Upload failed' }}
        onRetry={(id) => console.log('Retry:', id)}
        onRemove={(id) => console.log('Remove:', id)}
      />
    </div>
  ),
}
