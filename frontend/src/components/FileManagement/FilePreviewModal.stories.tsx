/**
 * FilePreviewModal Storybook Stories
 */

import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { FilePreviewModal } from './FilePreviewModal'
import type { FilePreview } from '@/types/fileManagement'
import type { DocumentMetadata } from '@/types/metadata'
import type { DocumentVersion } from '@/types/version'

const meta: Meta<typeof FilePreviewModal> = {
  title: 'Components/FileManagement/FilePreviewModal',
  component: FilePreviewModal,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof FilePreviewModal>

const mockMetadata: DocumentMetadata = {
  title: 'Financial Report Q4 2024',
  documentType: 'Report',
  identifier: 'FIN-2024-Q4-001',
  date: '2024-12-31',
  creator: 'John Doe',
  department: 'Finance',
  confidentialityLevel: 'Confidential',
  retentionPeriod: '7 years',
  keywords: ['Financial', 'Q4', '2024', 'Annual'],
  description: 'Comprehensive financial report for Q4 2024 including revenue, expenses, and projections.',
  createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  modifiedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
}

const mockVersions: DocumentVersion[] = [
  {
    id: 'v3',
    documentId: 'doc-123',
    versionNumber: 3,
    fileName: 'Financial_Report_Q4_2024_v3.pdf',
    fileSize: 2548976,
    mimeType: 'application/pdf',
    checksum: 'sha256-abc123',
    createdBy: 'Jane Smith',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    changeDescription: 'Updated revenue projections and added Q5 forecast',
    isCurrent: true,
    storagePath: '/storage/doc-123/v3.pdf',
  },
  {
    id: 'v2',
    documentId: 'doc-123',
    versionNumber: 2,
    fileName: 'Financial_Report_Q4_2024_v2.pdf',
    fileSize: 2450000,
    mimeType: 'application/pdf',
    checksum: 'sha256-def456',
    createdBy: 'John Doe',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    changeDescription: 'Fixed calculation errors in expense section',
    isCurrent: false,
    storagePath: '/storage/doc-123/v2.pdf',
  },
  {
    id: 'v1',
    documentId: 'doc-123',
    versionNumber: 1,
    fileName: 'Financial_Report_Q4_2024_v1.pdf',
    fileSize: 2300000,
    mimeType: 'application/pdf',
    checksum: 'sha256-ghi789',
    createdBy: 'John Doe',
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    changeDescription: 'Initial version',
    isCurrent: false,
    storagePath: '/storage/doc-123/v1.pdf',
  },
]

const basePDFPreview: FilePreview = {
  documentId: 'doc-123',
  fileName: 'Financial_Report_Q4_2024.pdf',
  fileSize: 2548976,
  mimeType: 'application/pdf',
  previewUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
  downloadUrl: '/api/documents/doc-123/download',
  metadata: mockMetadata,
  versions: mockVersions,
  canEdit: true,
  canDelete: true,
  canDownload: true,
  canShare: true,
}

const baseImagePreview: FilePreview = {
  documentId: 'doc-456',
  fileName: 'Photo_ID_Front.jpg',
  fileSize: 1024000,
  mimeType: 'image/jpeg',
  previewUrl: 'https://via.placeholder.com/800x600',
  downloadUrl: '/api/documents/doc-456/download',
  metadata: {
    ...mockMetadata,
    title: 'Customer Photo ID - Front',
    documentType: 'Identification',
    confidentialityLevel: 'Highly Confidential',
  },
  canEdit: true,
  canDelete: true,
  canDownload: true,
  canShare: false,
}

const FilePreviewModalWrapper = (args: any) => {
  const [isOpen, setIsOpen] = useState(true)

  return (
    <div>
      <button
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-primary-600 text-white rounded-lg"
      >
        Open Preview
      </button>
      <FilePreviewModal
        {...args}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </div>
  )
}

export const PDFDocument: Story = {
  render: (args) => <FilePreviewModalWrapper {...args} />,
  args: {
    preview: basePDFPreview,
    onEdit: (id) => console.log('Edit:', id),
    onDelete: (id) => console.log('Delete:', id),
    onDownload: (id) => console.log('Download:', id),
    onShare: (id) => console.log('Share:', id),
    onVersionChange: (versionId) => console.log('Version changed:', versionId),
  },
}

export const ImageDocument: Story = {
  render: (args) => <FilePreviewModalWrapper {...args} />,
  args: {
    preview: baseImagePreview,
    onEdit: (id) => console.log('Edit:', id),
    onDelete: (id) => console.log('Delete:', id),
    onDownload: (id) => console.log('Download:', id),
  },
}

export const WithoutVersions: Story = {
  render: (args) => <FilePreviewModalWrapper {...args} />,
  args: {
    preview: {
      ...basePDFPreview,
      versions: undefined,
    },
    onEdit: (id) => console.log('Edit:', id),
    onDelete: (id) => console.log('Delete:', id),
    onDownload: (id) => console.log('Download:', id),
    onShare: (id) => console.log('Share:', id),
  },
}

export const RestrictedPermissions: Story = {
  render: (args) => <FilePreviewModalWrapper {...args} />,
  args: {
    preview: {
      ...basePDFPreview,
      canEdit: false,
      canDelete: false,
      canDownload: false,
      canShare: false,
    },
  },
}

export const ViewOnlyPermissions: Story = {
  render: (args) => <FilePreviewModalWrapper {...args} />,
  args: {
    preview: {
      ...basePDFPreview,
      canEdit: false,
      canDelete: false,
      canShare: false,
    },
    onDownload: (id) => console.log('Download:', id),
  },
}

export const HighlyConfidentialDocument: Story = {
  render: (args) => <FilePreviewModalWrapper {...args} />,
  args: {
    preview: {
      ...basePDFPreview,
      metadata: {
        ...mockMetadata,
        confidentialityLevel: 'Highly Confidential',
        title: 'Executive Compensation Plan',
        documentType: 'Contract',
        department: 'HR',
      },
      canEdit: false,
      canDelete: false,
      canDownload: false,
      canShare: false,
    },
  },
}

export const PublicDocument: Story = {
  render: (args) => <FilePreviewModalWrapper {...args} />,
  args: {
    preview: {
      ...basePDFPreview,
      fileName: 'Company_Newsletter_Jan2024.pdf',
      metadata: {
        ...mockMetadata,
        confidentialityLevel: 'Public',
        title: 'Company Newsletter - January 2024',
        documentType: 'Newsletter',
        department: 'Marketing',
      },
    },
    onEdit: (id) => console.log('Edit:', id),
    onDelete: (id) => console.log('Delete:', id),
    onDownload: (id) => console.log('Download:', id),
    onShare: (id) => console.log('Share:', id),
  },
}

export const UnsupportedFileType: Story = {
  render: (args) => <FilePreviewModalWrapper {...args} />,
  args: {
    preview: {
      documentId: 'doc-789',
      fileName: 'Spreadsheet_Data.xlsx',
      fileSize: 512000,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      downloadUrl: '/api/documents/doc-789/download',
      metadata: {
        ...mockMetadata,
        title: 'Financial Data Spreadsheet',
        documentType: 'Spreadsheet',
      },
      canEdit: true,
      canDelete: true,
      canDownload: true,
      canShare: true,
    },
    onEdit: (id) => console.log('Edit:', id),
    onDelete: (id) => console.log('Delete:', id),
    onDownload: (id) => console.log('Download:', id),
    onShare: (id) => console.log('Share:', id),
  },
}

export const Loading: Story = {
  render: (args) => <FilePreviewModalWrapper {...args} />,
  args: {
    preview: basePDFPreview,
    isLoading: true,
  },
}

export const WithoutMetadata: Story = {
  render: (args) => <FilePreviewModalWrapper {...args} />,
  args: {
    preview: {
      ...basePDFPreview,
      metadata: undefined,
    },
    onDownload: (id) => console.log('Download:', id),
  },
}

export const MinimalActions: Story = {
  render: (args) => <FilePreviewModalWrapper {...args} />,
  args: {
    preview: basePDFPreview,
    onDownload: (id) => console.log('Download:', id),
  },
}
