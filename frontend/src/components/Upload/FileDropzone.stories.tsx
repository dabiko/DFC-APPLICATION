/**
 * FileDropzone Storybook Stories
 */

import type { Meta, StoryObj } from '@storybook/react-vite'
import { FileDropzone } from './FileDropzone'
import { useState } from 'react'

const meta: Meta<typeof FileDropzone> = {
  title: 'Components/Upload/FileDropzone',
  component: FileDropzone,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof FileDropzone>

const DropzoneWrapper = (args: any) => {
  const [files, setFiles] = useState<File[]>([])
  const [errors, setErrors] = useState<any[]>([])

  return (
    <div className="max-w-2xl">
      <FileDropzone
        {...args}
        onFilesAdded={(newFiles) => {
          console.log('Files added:', newFiles)
          setFiles([...files, ...newFiles])
        }}
        onFilesRejected={(fileErrors) => {
          console.log('Files rejected:', fileErrors)
          setErrors(fileErrors)
        }}
      />

      {files.length > 0 && (
        <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h4 className="font-semibold mb-2">Selected Files ({files.length})</h4>
          <ul className="text-sm space-y-1">
            {files.map((file, idx) => (
              <li key={idx} className="flex justify-between">
                <span>{file.name}</span>
                <span className="text-gray-500">{(file.size / 1024).toFixed(1)} KB</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {errors.length > 0 && (
        <div className="mt-4 p-4 bg-error-50 dark:bg-error-900/20 rounded-lg">
          <h4 className="font-semibold text-error-700 dark:text-error-300 mb-2">
            Validation Errors ({errors.length})
          </h4>
          <ul className="text-sm space-y-1 text-error-600 dark:text-error-400">
            {errors.map((err, idx) => (
              <li key={idx}>{err.message}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export const Default: Story = {
  render: (args) => <DropzoneWrapper {...args} />,
  args: {
    dropzoneText: 'Drag and drop files here',
    browseText: 'or click to browse',
  },
}

export const DocumentsOnly: Story = {
  render: (args) => <DropzoneWrapper {...args} />,
  args: {
    config: {
      acceptedFileTypes: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ],
      maxFileSize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    },
    dropzoneText: 'Upload your documents',
    browseText: 'PDF, DOC, DOCX only',
  },
}

export const ImagesOnly: Story = {
  render: (args) => <DropzoneWrapper {...args} />,
  args: {
    config: {
      acceptedFileTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      maxFileSize: 5 * 1024 * 1024, // 5MB
      maxFiles: 10,
    },
    dropzoneText: 'Upload images',
    browseText: 'JPG, PNG, GIF, WEBP',
  },
}

export const SingleFile: Story = {
  render: (args) => <DropzoneWrapper {...args} />,
  args: {
    config: {
      multiple: false,
      maxFiles: 1,
    },
    dropzoneText: 'Upload single file',
    browseText: 'Click to select one file',
  },
}

export const SmallFilesOnly: Story = {
  render: (args) => <DropzoneWrapper {...args} />,
  args: {
    config: {
      maxFileSize: 1 * 1024 * 1024, // 1MB
      maxFiles: 20,
    },
    dropzoneText: 'Small files only',
    browseText: 'Maximum 1MB per file',
  },
}

export const Disabled: Story = {
  render: (args) => <DropzoneWrapper {...args} />,
  args: {
    disabled: true,
    dropzoneText: 'Upload is currently disabled',
  },
}

export const CustomStyling: Story = {
  render: (args) => <DropzoneWrapper {...args} />,
  args: {
    className: 'min-h-[300px] border-4',
    dropzoneText: 'Drop your files anywhere in this large area',
    browseText: 'or click anywhere to browse',
  },
}
