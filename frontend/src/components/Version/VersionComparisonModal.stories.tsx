/**
 * VersionComparisonModal Storybook Stories
 */

import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { VersionComparisonModal } from './VersionComparisonModal'
import { Button } from '@components/Button/Button'
import type { VersionComparison } from '@/types/version'

const meta: Meta<typeof VersionComparisonModal> = {
  title: 'Components/Version/VersionComparisonModal',
  component: VersionComparisonModal,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof VersionComparisonModal>

// Sample comparison data
const sampleComparison: VersionComparison = {
  fromVersion: {
    id: 'v2',
    documentId: 'doc-123',
    versionNumber: 2,
    fileName: 'Q4_Financial_Report.pdf',
    fileSize: 2650123,
    mimeType: 'application/pdf',
    checksum: 'sha256:b7e2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6',
    createdBy: 'Jane Smith',
    createdAt: '2025-01-05T14:30:00Z',
    changeDescription: 'Updated revenue figures',
    isCurrent: false,
    storagePath: '/docs/doc-123/v2.pdf',
  },
  toVersion: {
    id: 'v4',
    documentId: 'doc-123',
    versionNumber: 4,
    fileName: 'Q4_Financial_Report_Final.pdf',
    fileSize: 2750450,
    mimeType: 'application/pdf',
    checksum: 'sha256:d1a5f6b7c8d9e0f1g2h3i4j5k6l7m8n9o0p1q2r3s4t5u6v7w8x9',
    createdBy: 'John Doe',
    createdAt: '2025-01-15T16:45:00Z',
    changeDescription: 'Final version with corrections',
    isCurrent: true,
    storagePath: '/docs/doc-123/v4.pdf',
  },
  changes: [
    {
      type: 'file',
      field: 'fileName',
      oldValue: 'Q4_Financial_Report.pdf',
      newValue: 'Q4_Financial_Report_Final.pdf',
      description: 'File renamed',
    },
    {
      type: 'file',
      field: 'fileSize',
      oldValue: 2650123,
      newValue: 2750450,
      description: 'File size increased',
    },
  ],
  metadataChanges: [
    {
      field: 'Confidentiality Level',
      oldValue: 'Internal',
      newValue: 'Confidential',
      changedBy: 'John Doe',
      changedAt: '2025-01-15T16:45:00Z',
    },
    {
      field: 'Tags',
      oldValue: 'draft, q4',
      newValue: 'final, approved, q4',
      changedBy: 'John Doe',
      changedAt: '2025-01-15T16:45:00Z',
    },
  ],
}

// Wrapper component to handle state
const ComparisonModalWrapper = (args: any) => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>Open Comparison Modal</Button>
      <VersionComparisonModal {...args} isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  )
}

export const Default: Story = {
  render: (args) => <ComparisonModalWrapper {...args} />,
  args: {
    comparison: sampleComparison,
    isLoading: false,
  },
}

export const Loading: Story = {
  render: (args) => <ComparisonModalWrapper {...args} />,
  args: {
    comparison: sampleComparison,
    isLoading: true,
  },
}

export const MinimalChanges: Story = {
  render: (args) => <ComparisonModalWrapper {...args} />,
  args: {
    comparison: {
      fromVersion: sampleComparison.fromVersion,
      toVersion: {
        ...sampleComparison.toVersion,
        fileName: sampleComparison.fromVersion.fileName,
        fileSize: sampleComparison.fromVersion.fileSize,
        changeDescription: 'Minor typo corrections only',
      },
      changes: [
        {
          type: 'content',
          field: 'content',
          oldValue: 'Original content',
          newValue: 'Updated content',
          description: 'Minor typo corrections',
        },
      ],
    },
    isLoading: false,
  },
}

export const MajorChanges: Story = {
  render: (args) => <ComparisonModalWrapper {...args} />,
  args: {
    comparison: {
      fromVersion: sampleComparison.fromVersion,
      toVersion: {
        ...sampleComparison.toVersion,
        fileName: 'Q4_Report_2024_FINAL_APPROVED.pdf',
        fileSize: 5500000,
        mimeType: 'application/pdf',
        changeDescription: 'Complete restructure with additional sections',
      },
      changes: [
        {
          type: 'file',
          field: 'fileName',
          oldValue: 'Q4_Financial_Report.pdf',
          newValue: 'Q4_Report_2024_FINAL_APPROVED.pdf',
          description: 'File renamed to reflect approval status',
        },
        {
          type: 'file',
          field: 'fileSize',
          oldValue: 2650123,
          newValue: 5500000,
          description: 'File size increased by 107.5% due to additional content',
        },
        {
          type: 'content',
          field: 'structure',
          oldValue: '5 sections',
          newValue: '12 sections',
          description: 'Added executive summary, detailed analysis, and appendices',
        },
      ],
      metadataChanges: [
        {
          field: 'Document Type',
          oldValue: 'Draft Report',
          newValue: 'Final Report',
          changedBy: 'John Doe',
          changedAt: '2025-01-15T16:45:00Z',
        },
        {
          field: 'Confidentiality Level',
          oldValue: 'Internal',
          newValue: 'Highly Confidential',
          changedBy: 'Jane Smith',
          changedAt: '2025-01-15T17:00:00Z',
        },
        {
          field: 'Retention Period',
          oldValue: '3 years',
          newValue: '7 years',
          changedBy: 'Legal Team',
          changedAt: '2025-01-15T17:15:00Z',
        },
      ],
    },
    isLoading: false,
  },
}

export const FileTypeChange: Story = {
  render: (args) => <ComparisonModalWrapper {...args} />,
  args: {
    comparison: {
      fromVersion: {
        ...sampleComparison.fromVersion,
        fileName: 'presentation.pptx',
        mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        fileSize: 5248976,
      },
      toVersion: {
        ...sampleComparison.toVersion,
        fileName: 'presentation.pdf',
        mimeType: 'application/pdf',
        fileSize: 3150000,
        changeDescription: 'Converted to PDF for wider compatibility',
      },
      changes: [
        {
          type: 'file',
          field: 'mimeType',
          oldValue: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          newValue: 'application/pdf',
          description: 'File type changed from PPTX to PDF',
        },
        {
          type: 'file',
          field: 'fileSize',
          oldValue: 5248976,
          newValue: 3150000,
          description: 'File size decreased by 40.0% due to format conversion',
        },
      ],
    },
    isLoading: false,
  },
}

export const NoMetadataChanges: Story = {
  render: (args) => <ComparisonModalWrapper {...args} />,
  args: {
    comparison: {
      ...sampleComparison,
      metadataChanges: undefined,
    },
    isLoading: false,
  },
}

export const SameCreator: Story = {
  render: (args) => <ComparisonModalWrapper {...args} />,
  args: {
    comparison: {
      ...sampleComparison,
      toVersion: {
        ...sampleComparison.toVersion,
        createdBy: sampleComparison.fromVersion.createdBy,
      },
    },
    isLoading: false,
  },
}
