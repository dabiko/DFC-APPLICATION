/**
 * FileCard Storybook Stories
 */

import type { Meta, StoryObj } from '@storybook/react'
import { FileCard } from './FileCard'
import type { FileListItem } from '@/types/fileManagement'

const meta: Meta<typeof FileCard> = {
  title: 'Components/FileManagement/FileCard',
  component: FileCard,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof FileCard>

const mockFileItem: FileListItem = {
  id: '1',
  name: 'Financial_Report_Q4_2024.pdf',
  type: 'file',
  fileSize: 2548976,
  mimeType: 'application/pdf',
  extension: 'pdf',
  path: '/Customer Records/123456/Reports',
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
}

const mockFolderItem: FileListItem = {
  id: '2',
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
}

export const FileGridView: Story = {
  args: {
    item: mockFileItem,
    viewMode: 'grid',
    showCheckbox: true,
    showActions: true,
    onSelect: (selected) => console.log('Selected:', selected),
    onClick: () => console.log('Clicked'),
    onDoubleClick: () => console.log('Double clicked'),
    onFavoriteToggle: () => console.log('Favorite toggled'),
  },
}

export const FileListView: Story = {
  args: {
    item: mockFileItem,
    viewMode: 'list',
    showCheckbox: true,
    showActions: true,
    onSelect: (selected) => console.log('Selected:', selected),
    onClick: () => console.log('Clicked'),
    onDoubleClick: () => console.log('Double clicked'),
    onFavoriteToggle: () => console.log('Favorite toggled'),
  },
}

export const FolderGridView: Story = {
  args: {
    item: mockFolderItem,
    viewMode: 'grid',
    showCheckbox: true,
    showActions: true,
  },
}

export const FolderListView: Story = {
  args: {
    item: mockFolderItem,
    viewMode: 'list',
    showCheckbox: true,
    showActions: true,
  },
}

export const SelectedFile: Story = {
  args: {
    item: mockFileItem,
    viewMode: 'grid',
    isSelected: true,
    showCheckbox: true,
  },
}

export const HighlyConfidential: Story = {
  args: {
    item: {
      ...mockFileItem,
      confidentialityLevel: 'Highly Confidential',
      name: 'Executive_Compensation_Plan.docx',
      isLocked: true,
    },
    viewMode: 'grid',
    showCheckbox: true,
  },
}

export const PublicDocument: Story = {
  args: {
    item: {
      ...mockFileItem,
      confidentialityLevel: 'Public',
      name: 'Company_Newsletter_Jan2024.pdf',
    },
    viewMode: 'grid',
    showCheckbox: true,
  },
}

export const SharedFile: Story = {
  args: {
    item: {
      ...mockFileItem,
      isShared: true,
      name: 'Shared_Project_Plan.xlsx',
    },
    viewMode: 'grid',
    showCheckbox: true,
  },
}

export const LockedFile: Story = {
  args: {
    item: {
      ...mockFileItem,
      isLocked: true,
      name: 'Legal_Hold_Document.pdf',
      confidentialityLevel: 'Highly Confidential',
    },
    viewMode: 'grid',
    showCheckbox: true,
  },
}

export const FavoriteFile: Story = {
  args: {
    item: {
      ...mockFileItem,
      isFavorite: true,
    },
    viewMode: 'grid',
    showCheckbox: true,
  },
}

export const WithoutCheckbox: Story = {
  args: {
    item: mockFileItem,
    viewMode: 'grid',
    showCheckbox: false,
    showActions: true,
  },
}

export const WithoutActions: Story = {
  args: {
    item: mockFileItem,
    viewMode: 'grid',
    showCheckbox: true,
    showActions: false,
  },
}

export const ImageFile: Story = {
  args: {
    item: {
      ...mockFileItem,
      name: 'Photo_ID_Front.jpg',
      mimeType: 'image/jpeg',
      extension: 'jpg',
      fileSize: 1024000,
      thumbnailUrl: 'https://via.placeholder.com/300',
    },
    viewMode: 'grid',
    showCheckbox: true,
  },
}

export const LargeFile: Story = {
  args: {
    item: {
      ...mockFileItem,
      name: 'Video_Conference_Recording.mp4',
      mimeType: 'video/mp4',
      extension: 'mp4',
      fileSize: 450 * 1024 * 1024,
    },
    viewMode: 'grid',
    showCheckbox: true,
  },
}

export const MultipleFilesGrid: Story = {
  render: () => (
    <div className="grid grid-cols-4 gap-4 max-w-4xl">
      <FileCard item={mockFileItem} viewMode="grid" showCheckbox />
      <FileCard item={mockFolderItem} viewMode="grid" showCheckbox />
      <FileCard
        item={{ ...mockFileItem, id: '3', confidentialityLevel: 'Highly Confidential', isLocked: true }}
        viewMode="grid"
        showCheckbox
      />
      <FileCard
        item={{ ...mockFileItem, id: '4', confidentialityLevel: 'Public', isShared: true }}
        viewMode="grid"
        showCheckbox
      />
    </div>
  ),
}

export const MultipleFilesList: Story = {
  render: () => (
    <div className="space-y-1 max-w-4xl">
      <FileCard item={mockFileItem} viewMode="list" showCheckbox />
      <FileCard item={mockFolderItem} viewMode="list" showCheckbox />
      <FileCard
        item={{ ...mockFileItem, id: '3', confidentialityLevel: 'Highly Confidential', isLocked: true }}
        viewMode="list"
        showCheckbox
      />
      <FileCard
        item={{ ...mockFileItem, id: '4', confidentialityLevel: 'Public', isShared: true }}
        viewMode="list"
        showCheckbox
      />
    </div>
  ),
}
