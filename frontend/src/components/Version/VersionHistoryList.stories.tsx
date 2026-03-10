/**
 * VersionHistoryList Storybook Stories
 */

import type { Meta, StoryObj } from '@storybook/react-vite'
import { VersionHistoryList } from './VersionHistoryList'
import type { DocumentVersion } from '@/types/version'

const meta: Meta<typeof VersionHistoryList> = {
  title: 'Components/Version/VersionHistoryList',
  component: VersionHistoryList,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof VersionHistoryList>

// Sample versions data
const sampleVersions: DocumentVersion[] = [
  {
    id: 'v1',
    documentId: 'doc-123',
    versionNumber: 1,
    fileName: 'Q4_Financial_Report.pdf',
    fileSize: 2548976,
    mimeType: 'application/pdf',
    checksum: 'sha256:a3f8d...',
    createdBy: 'John Doe',
    createdAt: '2025-01-01T10:00:00Z',
    changeDescription: 'Initial version',
    tags: ['initial', 'draft'],
    isCurrent: false,
    storagePath: '/docs/doc-123/v1.pdf',
  },
  {
    id: 'v2',
    documentId: 'doc-123',
    versionNumber: 2,
    fileName: 'Q4_Financial_Report.pdf',
    fileSize: 2650123,
    mimeType: 'application/pdf',
    checksum: 'sha256:b7e2c...',
    createdBy: 'Jane Smith',
    createdAt: '2025-01-05T14:30:00Z',
    changeDescription: 'Updated revenue figures and added charts',
    tags: ['revised'],
    isCurrent: false,
    storagePath: '/docs/doc-123/v2.pdf',
  },
  {
    id: 'v3',
    documentId: 'doc-123',
    versionNumber: 3,
    fileName: 'Q4_Financial_Report_Final.pdf',
    fileSize: 2750450,
    mimeType: 'application/pdf',
    checksum: 'sha256:c9d4e...',
    createdBy: 'John Doe',
    createdAt: '2025-01-10T09:15:00Z',
    changeDescription: 'Final version with executive summary',
    tags: ['final', 'approved'],
    isCurrent: false,
    storagePath: '/docs/doc-123/v3.pdf',
  },
  {
    id: 'v4',
    documentId: 'doc-123',
    versionNumber: 4,
    fileName: 'Q4_Financial_Report_Final.pdf',
    fileSize: 2750450,
    mimeType: 'application/pdf',
    checksum: 'sha256:d1a5f...',
    createdBy: 'Jane Smith',
    createdAt: '2025-01-15T16:45:00Z',
    changeDescription: 'Minor typo corrections',
    tags: ['final'],
    isCurrent: true,
    storagePath: '/docs/doc-123/v4.pdf',
  },
]

export const Default: Story = {
  args: {
    documentId: 'doc-123',
    versions: sampleVersions,
    currentVersionId: 'v4',
    onViewVersion: (version) => console.log('View version:', version),
    onDownloadVersion: (version) => console.log('Download version:', version),
    onRestoreVersion: (version) => console.log('Restore version:', version),
    onCompareVersions: (v1, v2) => console.log('Compare:', v1, v2),
    canRestore: true,
    canDelete: true,
  },
}

export const Loading: Story = {
  args: {
    documentId: 'doc-123',
    versions: [],
    isLoading: true,
  },
}

export const EmptyState: Story = {
  args: {
    documentId: 'doc-123',
    versions: [],
    isLoading: false,
  },
}

export const SingleVersion: Story = {
  args: {
    documentId: 'doc-456',
    versions: [sampleVersions[0]],
    currentVersionId: 'v1',
    canRestore: true,
    canDelete: true,
  },
}

export const ManyVersions: Story = {
  args: {
    documentId: 'doc-789',
    versions: [
      ...sampleVersions,
      {
        id: 'v5',
        documentId: 'doc-789',
        versionNumber: 5,
        fileName: 'Q4_Financial_Report_Final_v2.pdf',
        fileSize: 2800000,
        mimeType: 'application/pdf',
        checksum: 'sha256:e2b6g...',
        createdBy: 'Mike Johnson',
        createdAt: '2025-01-20T11:00:00Z',
        changeDescription: 'Added appendix',
        isCurrent: false,
        storagePath: '/docs/doc-789/v5.pdf',
      },
      {
        id: 'v6',
        documentId: 'doc-789',
        versionNumber: 6,
        fileName: 'Q4_Financial_Report_Final_v2.pdf',
        fileSize: 2850000,
        mimeType: 'application/pdf',
        checksum: 'sha256:f3c7h...',
        createdBy: 'Sarah Williams',
        createdAt: '2025-01-25T13:30:00Z',
        changeDescription: 'Updated appendix with additional data',
        isCurrent: true,
        storagePath: '/docs/doc-789/v6.pdf',
      },
    ],
    currentVersionId: 'v6',
    onViewVersion: (version) => alert(`View version ${version.versionNumber}`),
    onDownloadVersion: (version) => alert(`Download version ${version.versionNumber}`),
    onRestoreVersion: (version) => alert(`Restore version ${version.versionNumber}`),
    onCompareVersions: (v1, v2) => alert(`Compare v${v1.versionNumber} with v${v2.versionNumber}`),
  },
}

export const WithoutComparisonFeature: Story = {
  args: {
    documentId: 'doc-321',
    versions: sampleVersions,
    currentVersionId: 'v4',
    onViewVersion: (version) => console.log('View version:', version),
    onDownloadVersion: (version) => console.log('Download version:', version),
    onRestoreVersion: (version) => console.log('Restore version:', version),
    // onCompareVersions is undefined - comparison feature disabled
    canRestore: true,
    canDelete: true,
  },
}

export const ReadOnlyMode: Story = {
  args: {
    documentId: 'doc-654',
    versions: sampleVersions,
    currentVersionId: 'v4',
    onViewVersion: (version) => console.log('View version:', version),
    onDownloadVersion: (version) => console.log('Download version:', version),
    // No restore or delete callbacks - read-only mode
    canRestore: false,
    canDelete: false,
  },
}

export const DifferentFileTypes: Story = {
  args: {
    documentId: 'doc-999',
    versions: [
      {
        id: 'v1',
        documentId: 'doc-999',
        versionNumber: 1,
        fileName: 'presentation.pptx',
        fileSize: 5248976,
        mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        checksum: 'sha256:a1b2c...',
        createdBy: 'Alice Brown',
        createdAt: '2025-01-01T10:00:00Z',
        isCurrent: false,
        storagePath: '/docs/doc-999/v1.pptx',
      },
      {
        id: 'v2',
        documentId: 'doc-999',
        versionNumber: 2,
        fileName: 'presentation.pdf',
        fileSize: 3150000,
        mimeType: 'application/pdf',
        checksum: 'sha256:d3e4f...',
        createdBy: 'Alice Brown',
        createdAt: '2025-01-05T11:00:00Z',
        changeDescription: 'Converted to PDF for wider compatibility',
        isCurrent: false,
        storagePath: '/docs/doc-999/v2.pdf',
      },
      {
        id: 'v3',
        documentId: 'doc-999',
        versionNumber: 3,
        fileName: 'presentation_updated.pdf',
        fileSize: 3250000,
        mimeType: 'application/pdf',
        checksum: 'sha256:g5h6i...',
        createdBy: 'Bob Wilson',
        createdAt: '2025-01-10T14:00:00Z',
        changeDescription: 'Added new slides with Q1 projections',
        isCurrent: true,
        storagePath: '/docs/doc-999/v3.pdf',
      },
    ],
    currentVersionId: 'v3',
    onViewVersion: (version) => console.log('View version:', version),
    onDownloadVersion: (version) => console.log('Download version:', version),
    onRestoreVersion: (version) => console.log('Restore version:', version),
    onCompareVersions: (v1, v2) => console.log('Compare:', v1, v2),
  },
}
