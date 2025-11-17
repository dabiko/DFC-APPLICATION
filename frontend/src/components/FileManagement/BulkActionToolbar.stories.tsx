/**
 * BulkActionToolbar Storybook Stories
 */

import type { Meta, StoryObj } from '@storybook/react'
import { BulkActionToolbar } from './BulkActionToolbar'
import type { FileListItem } from '@/types/fileManagement'

const meta: Meta<typeof BulkActionToolbar> = {
  title: 'Components/FileManagement/BulkActionToolbar',
  component: BulkActionToolbar,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof BulkActionToolbar>

const mockSelectedItems: FileListItem[] = [
  {
    id: '1',
    name: 'Financial_Report_Q4_2024.pdf',
    type: 'file',
    fileSize: 2548976,
    mimeType: 'application/pdf',
    extension: 'pdf',
    path: '/Customer Records/Reports',
    createdBy: 'John Doe',
    createdAt: new Date().toISOString(),
    modifiedBy: 'Jane Smith',
    modifiedAt: new Date().toISOString(),
    confidentialityLevel: 'Confidential',
    permissions: {
      canView: true,
      canEdit: true,
      canDelete: true,
      canShare: true,
      canDownload: true,
    },
    isShared: false,
    isLocked: false,
    hasVersions: true,
    currentVersion: 3,
  },
  {
    id: '2',
    name: 'Executive_Compensation_Plan.docx',
    type: 'file',
    fileSize: 1048576,
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    extension: 'docx',
    path: '/HR/Confidential',
    createdBy: 'HR Manager',
    createdAt: new Date().toISOString(),
    modifiedBy: 'HR Manager',
    modifiedAt: new Date().toISOString(),
    confidentialityLevel: 'Highly Confidential',
    permissions: {
      canView: true,
      canEdit: true,
      canDelete: true,
      canShare: true,
      canDownload: true,
    },
    isShared: false,
    isLocked: false,
    hasVersions: false,
  },
]

export const WithSelectedFiles: Story = {
  args: {
    selectedCount: 2,
    selectedItems: mockSelectedItems,
    onMove: (ids) => console.log('Move:', ids),
    onCopy: (ids) => console.log('Copy:', ids),
    onDelete: (ids) => console.log('Delete:', ids),
    onDownload: (ids) => console.log('Download:', ids),
    onShare: (ids) => console.log('Share:', ids),
    onAddTags: (ids) => console.log('Add tags:', ids),
    onChangeConfidentiality: (ids) => console.log('Change confidentiality:', ids),
    onClearSelection: () => console.log('Clear selection'),
  },
}

export const SingleFileSelected: Story = {
  args: {
    selectedCount: 1,
    selectedItems: [mockSelectedItems[0]],
    onMove: (ids) => console.log('Move:', ids),
    onCopy: (ids) => console.log('Copy:', ids),
    onDelete: (ids) => console.log('Delete:', ids),
    onDownload: (ids) => console.log('Download:', ids),
    onShare: (ids) => console.log('Share:', ids),
    onClearSelection: () => console.log('Clear selection'),
  },
}

export const MultipleFiles: Story = {
  args: {
    selectedCount: 5,
    selectedItems: Array.from({ length: 5 }, (_, i) => ({
      ...mockSelectedItems[0],
      id: `${i + 1}`,
      name: `Document_${i + 1}.pdf`,
    })),
    onMove: (ids) => console.log('Move:', ids),
    onCopy: (ids) => console.log('Copy:', ids),
    onDelete: (ids) => console.log('Delete:', ids),
    onDownload: (ids) => console.log('Download:', ids),
    onShare: (ids) => console.log('Share:', ids),
    onAddTags: (ids) => console.log('Add tags:', ids),
    onChangeConfidentiality: (ids) => console.log('Change confidentiality:', ids),
    onClearSelection: () => console.log('Clear selection'),
  },
}

export const MixedFilesAndFolders: Story = {
  args: {
    selectedCount: 3,
    selectedItems: [
      ...mockSelectedItems,
      {
        id: '3',
        name: 'Customer Documents',
        type: 'folder',
        itemCount: 24,
        path: '/Customer Records',
        createdBy: 'Admin',
        createdAt: new Date().toISOString(),
        modifiedBy: 'John Doe',
        modifiedAt: new Date().toISOString(),
        confidentialityLevel: 'Internal',
        permissions: {
          canView: true,
          canEdit: true,
          canDelete: true,
          canShare: true,
          canDownload: false,
        },
        isShared: false,
        isLocked: false,
        hasVersions: false,
      },
    ],
    onMove: (ids) => console.log('Move:', ids),
    onCopy: (ids) => console.log('Copy:', ids),
    onDelete: (ids) => console.log('Delete:', ids),
    onShare: (ids) => console.log('Share:', ids),
    onAddTags: (ids) => console.log('Add tags:', ids),
    onChangeConfidentiality: (ids) => console.log('Change confidentiality:', ids),
    onClearSelection: () => console.log('Clear selection'),
  },
}

export const RestrictedPermissions: Story = {
  args: {
    selectedCount: 2,
    selectedItems: mockSelectedItems.map((item) => ({
      ...item,
      permissions: {
        ...item.permissions,
        canDelete: false,
        canDownload: false,
        canShare: false,
      },
    })),
    onMove: (ids) => console.log('Move:', ids),
    onCopy: (ids) => console.log('Copy:', ids),
    onDelete: (ids) => console.log('Delete:', ids),
    onDownload: (ids) => console.log('Download:', ids),
    onShare: (ids) => console.log('Share:', ids),
    onAddTags: (ids) => console.log('Add tags:', ids),
    onClearSelection: () => console.log('Clear selection'),
  },
}

export const NoSelection: Story = {
  args: {
    selectedCount: 0,
    selectedItems: [],
    onClearSelection: () => console.log('Clear selection'),
  },
}

export const PartialActions: Story = {
  args: {
    selectedCount: 2,
    selectedItems: mockSelectedItems,
    onMove: (ids) => console.log('Move:', ids),
    onDelete: (ids) => console.log('Delete:', ids),
    onClearSelection: () => console.log('Clear selection'),
  },
}
