import type { Meta, StoryObj } from '@storybook/react'
import React from 'react'
import { FileUpload } from './index'
import { Alert } from '@components/Feedback'

const meta: Meta<typeof FileUpload> = {
  title: 'Components/FileUpload',
  component: FileUpload,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof FileUpload>

/**
 * Basic file upload
 */
export const Basic: Story = {
  args: {
    onFilesSelected: (files) => console.log('Files selected:', files),
  },
}

/**
 * Single file upload
 */
export const SingleFile: Story = {
  args: {
    multiple: false,
    onFilesSelected: (files) => console.log('File selected:', files[0]),
  },
}

/**
 * With file type restrictions
 */
export const WithFileTypeRestrictions: Story = {
  args: {
    accept: ['.pdf', '.docx', '.xlsx', '.txt'],
    onFilesSelected: (files) => console.log('Files selected:', files),
  },
}

/**
 * With size limit
 */
export const WithSizeLimit: Story = {
  args: {
    maxSize: 5 * 1024 * 1024, // 5MB
    onFilesSelected: (files) => console.log('Files selected:', files),
  },
}

/**
 * With upload handler
 */
export const WithUploadHandler: Story = {
  args: {
    onUpload: async (file) => {
      // Simulate upload delay
      await new Promise((resolve) => setTimeout(resolve, 2000))
      console.log('File uploaded:', file.name)
    },
    onFilesSelected: (files) => console.log('Files selected:', files),
  },
}

/**
 * Compact variant
 */
export const CompactVariant: Story = {
  args: {
    variant: 'compact',
    onFilesSelected: (files) => console.log('Files selected:', files),
  },
}

/**
 * Without file list
 */
export const WithoutFileList: Story = {
  args: {
    showFileList: false,
    onFilesSelected: (files) => console.log('Files selected:', files),
  },
}

/**
 * Disabled state
 */
export const Disabled: Story = {
  args: {
    disabled: true,
  },
}

/**
 * DFC Document Upload Example
 */
export const DFCDocumentUpload: Story = {
  render: () => (
    <div className="max-w-2xl space-y-4">
      <div>
        <h2 className="text-xl font-semibold mb-2">Upload Documents</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Upload your documents to the Digital Filing Cabinet. Supported formats: PDF, Word, Excel,
          Images.
        </p>
      </div>

      <Alert variant="info" hideIcon>
        <p className="text-sm">
          <strong>File Requirements:</strong>
          <ul className="list-disc list-inside mt-1 space-y-1">
            <li>Maximum file size: 50 MB</li>
            <li>Accepted formats: PDF, DOCX, XLSX, PNG, JPG</li>
            <li>Multiple files can be uploaded at once</li>
          </ul>
        </p>
      </Alert>

      <FileUpload
        multiple
        accept={['.pdf', '.docx', '.xlsx', '.png', '.jpg', '.jpeg']}
        maxSize={50 * 1024 * 1024}
        onUpload={async (file) => {
          // Simulate upload to server
          await new Promise((resolve) => setTimeout(resolve, 2000))
          console.log('Document uploaded:', file.name)
        }}
        onFilesSelected={(files) => {
          console.log(`${files.length} file(s) selected for upload`)
        }}
        onRemove={(fileId) => {
          console.log('File removed:', fileId)
        }}
      />
    </div>
  ),
}

/**
 * With confidentiality selection
 */
export const WithConfidentialitySelection: Story = {
  render: () => {
    const [confidentiality, setConfidentiality] = React.useState<string>('internal')

    return (
      <div className="max-w-2xl space-y-4">
        <div>
          <h2 className="text-xl font-semibold mb-2">Upload Confidential Document</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Select the confidentiality level for your document.
          </p>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Confidentiality Level
          </label>
          <select
            value={confidentiality}
            onChange={(e) => setConfidentiality(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="public">Public</option>
            <option value="internal">Internal</option>
            <option value="confidential">Confidential</option>
            <option value="highly-confidential">Highly Confidential</option>
          </select>
        </div>

        <FileUpload
          accept={['.pdf', '.docx']}
          maxSize={25 * 1024 * 1024}
          onUpload={async (file) => {
            console.log(`Uploading ${file.name} with level: ${confidentiality}`)
            await new Promise((resolve) => setTimeout(resolve, 2000))
          }}
        />
      </div>
    )
  },
}
