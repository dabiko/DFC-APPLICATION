/**
 * FileList Storybook Stories
 */

import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { FileList } from './FileList'
import type { FileListItem, ViewMode, SortField, SortOrder } from '@/types/fileManagement'

const meta: Meta<typeof FileList> = {
  title: 'Components/FileManagement/FileList',
  component: FileList,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof FileList>

const mockItems: FileListItem[] = [
  {
    id: '1',
    name: 'Customer Documents',
    type: 'folder',
    itemCount: 24,
    hasSubfolders: true,
    path: '/Customer Records',
    createdBy: 'Admin',
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    modifiedBy: 'John Doe',
    modifiedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    confidentialityLevel: 'Internal',
    permissions: {
      canView: true,
      canEdit: true,
      canDelete: false,
      canShare: false,
      canDownload: false,
    },
    isShared: false,
    isLocked: false,
    hasVersions: false,
    isFavorite: true,
  },
  {
    id: '2',
    name: 'Financial_Report_Q4_2024.pdf',
    type: 'file',
    fileSize: 2548976,
    mimeType: 'application/pdf',
    extension: 'pdf',
    path: '/Customer Records/Reports',
    createdBy: 'John Doe',
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    modifiedBy: 'Jane Smith',
    modifiedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
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
    isFavorite: false,
    tags: ['Q4', 'Financial', '2024'],
  },
  {
    id: '3',
    name: 'Executive_Compensation_Plan.docx',
    type: 'file',
    fileSize: 1048576,
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    extension: 'docx',
    path: '/HR/Confidential',
    createdBy: 'HR Manager',
    createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    modifiedBy: 'HR Manager',
    modifiedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    confidentialityLevel: 'Highly Confidential',
    permissions: {
      canView: true,
      canEdit: false,
      canDelete: false,
      canShare: false,
      canDownload: false,
    },
    isShared: false,
    isLocked: true,
    hasVersions: false,
    isFavorite: false,
  },
  {
    id: '4',
    name: 'Company_Newsletter_Jan2024.pdf',
    type: 'file',
    fileSize: 524288,
    mimeType: 'application/pdf',
    extension: 'pdf',
    path: '/Public/Newsletters',
    createdBy: 'Marketing',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    modifiedBy: 'Marketing',
    modifiedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    confidentialityLevel: 'Public',
    permissions: {
      canView: true,
      canEdit: true,
      canDelete: true,
      canShare: true,
      canDownload: true,
    },
    isShared: true,
    isLocked: false,
    hasVersions: false,
    isFavorite: false,
  },
  {
    id: '5',
    name: 'Photo_ID_Front.jpg',
    type: 'file',
    fileSize: 1024000,
    mimeType: 'image/jpeg',
    extension: 'jpg',
    thumbnailUrl: 'https://via.placeholder.com/300',
    path: '/Customer Records/123456/Identification',
    createdBy: 'Operations',
    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    modifiedBy: 'Operations',
    modifiedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    confidentialityLevel: 'Confidential',
    permissions: {
      canView: true,
      canEdit: true,
      canDelete: true,
      canShare: false,
      canDownload: true,
    },
    isShared: false,
    isLocked: false,
    hasVersions: false,
    isFavorite: true,
  },
]

const FileListWrapper = (args: any) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [viewMode, setViewMode] = useState<ViewMode>(args.viewMode || 'grid')
  const [sortBy, setSortBy] = useState<SortField>(args.sortBy || 'name')
  const [sortOrder, setSortOrder] = useState<SortOrder>(args.sortOrder || 'asc')

  return (
    <div className="max-w-6xl">
      <FileList
        {...args}
        selectedIds={selectedIds}
        viewMode={viewMode}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSelectionChange={(ids) => {
          console.log('Selection changed:', ids)
          setSelectedIds(ids)
        }}
        onItemClick={(item) => console.log('Item clicked:', item)}
        onItemDoubleClick={(item) => console.log('Item double clicked:', item)}
        onViewModeChange={(mode) => {
          console.log('View mode changed:', mode)
          setViewMode(mode)
        }}
        onSortChange={(field, order) => {
          console.log('Sort changed:', field, order)
          setSortBy(field)
          setSortOrder(order)
        }}
      />
    </div>
  )
}

export const GridView: Story = {
  render: (args) => <FileListWrapper {...args} />,
  args: {
    items: mockItems,
    viewMode: 'grid',
  },
}

export const ListView: Story = {
  render: (args) => <FileListWrapper {...args} />,
  args: {
    items: mockItems,
    viewMode: 'list',
  },
}

export const Loading: Story = {
  args: {
    items: [],
    isLoading: true,
  },
}

export const Empty: Story = {
  args: {
    items: [],
    isLoading: false,
  },
}

export const CustomEmptyState: Story = {
  args: {
    items: [],
    isLoading: false,
    emptyState: (
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900">No files found</h3>
        <p className="mt-2 text-sm text-gray-500">
          Try adjusting your search or filters
        </p>
      </div>
    ),
  },
}

export const SortedBySize: Story = {
  render: (args) => <FileListWrapper {...args} />,
  args: {
    items: mockItems,
    viewMode: 'grid',
    sortBy: 'size',
    sortOrder: 'desc',
  },
}

export const SortedByDate: Story = {
  render: (args) => <FileListWrapper {...args} />,
  args: {
    items: mockItems,
    viewMode: 'list',
    sortBy: 'dateModified',
    sortOrder: 'desc',
  },
}

export const WithSelection: Story = {
  render: (args) => <FileListWrapper {...args} />,
  args: {
    items: mockItems,
    viewMode: 'grid',
    selectedIds: new Set(['2', '4']),
  },
}

export const LargeList: Story = {
  render: (args) => <FileListWrapper {...args} />,
  args: {
    items: Array.from({ length: 20 }, (_, i) => ({
      ...mockItems[i % mockItems.length],
      id: `item-${i}`,
      name: `Document_${i + 1}.pdf`,
    })),
    viewMode: 'grid',
  },
}

export const OnlyFolders: Story = {
  render: (args) => <FileListWrapper {...args} />,
  args: {
    items: mockItems.filter((item) => item.type === 'folder'),
    viewMode: 'grid',
  },
}

export const OnlyFiles: Story = {
  render: (args) => <FileListWrapper {...args} />,
  args: {
    items: mockItems.filter((item) => item.type === 'file'),
    viewMode: 'list',
  },
}
