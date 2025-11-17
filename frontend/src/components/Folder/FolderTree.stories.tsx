/**
 * FolderTree Storybook Stories
 */

import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { FolderTree } from './FolderTree'
import type { Folder, FolderOperation } from '@/types/folder'

const meta: Meta<typeof FolderTree> = {
  title: 'Components/Folder/FolderTree',
  component: FolderTree,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof FolderTree>

// Generate mock folder data
const generateMockFolders = (count: number = 100): Folder[] => {
  const folders: Folder[] = []
  const rootCount = Math.min(5, Math.ceil(count / 10))

  // Create root folders
  for (let i = 0; i < rootCount; i++) {
    const rootId = `root-${i + 1}`
    folders.push({
      id: rootId,
      name: `Department ${i + 1}`,
      parentId: null,
      path: `/Department ${i + 1}`,
      level: 0,
      isLocked: i === 3, // Lock one folder for demo
      confidentiality: ['public', 'internal', 'confidential', 'highly_confidential'][i % 4] as any,
      createdBy: 'admin@cccplc.net',
      createdAt: new Date(2024, 0, i + 1).toISOString(),
      modifiedBy: 'admin@cccplc.net',
      modifiedAt: new Date(2024, 10, i + 1).toISOString(),
      childrenCount: 5,
      documentCount: Math.floor(Math.random() * 50),
      hasChildren: true,
      permissions: {
        canView: true,
        canEdit: i !== 3, // Can't edit locked folder
        canDelete: i !== 3,
        canShare: true,
        canManage: true,
      },
    })

    // Create child folders
    for (let j = 0; j < 5; j++) {
      const childId = `${rootId}-child-${j + 1}`
      folders.push({
        id: childId,
        name: `${String.fromCharCode(65 + j)} - Category ${j + 1}`,
        parentId: rootId,
        path: `/Department ${i + 1}/${String.fromCharCode(65 + j)} - Category ${j + 1}`,
        level: 1,
        isLocked: false,
        confidentiality: 'internal',
        createdBy: 'user@cccplc.net',
        createdAt: new Date(2024, 1, j + 1).toISOString(),
        modifiedBy: 'user@cccplc.net',
        modifiedAt: new Date(2024, 10, j + 1).toISOString(),
        childrenCount: 3,
        documentCount: Math.floor(Math.random() * 20),
        hasChildren: true,
        permissions: {
          canView: true,
          canEdit: true,
          canDelete: true,
          canShare: true,
          canManage: false,
        },
      })

      // Create grandchild folders
      for (let k = 0; k < 3; k++) {
        folders.push({
          id: `${childId}-grandchild-${k + 1}`,
          name: `Project ${(j * 3 + k + 1).toString().padStart(3, '0')}`,
          parentId: childId,
          path: `/Department ${i + 1}/${String.fromCharCode(65 + j)} - Category ${j + 1}/Project ${(j * 3 + k + 1).toString().padStart(3, '0')}`,
          level: 2,
          isLocked: false,
          confidentiality: 'confidential',
          createdBy: 'user@cccplc.net',
          createdAt: new Date(2024, 2, k + 1).toISOString(),
          modifiedBy: 'user@cccplc.net',
          modifiedAt: new Date(2024, 10, k + 1).toISOString(),
          childrenCount: 0,
          documentCount: Math.floor(Math.random() * 10),
          hasChildren: false,
          permissions: {
            canView: true,
            canEdit: true,
            canDelete: true,
            canShare: true,
            canManage: false,
          },
        })
      }
    }
  }

  return folders
}

const mockFolders = generateMockFolders(100)

// Interactive wrapper
const FolderTreeWrapper = (props: any) => {
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)

  const handleFolderSelect = (folder: Folder) => {
    setSelectedFolderId(folder.id)
    console.log('Selected folder:', folder)
  }

  const handleFolderExpand = (folderId: string, expanded: boolean) => {
    console.log(`Folder ${folderId} ${expanded ? 'expanded' : 'collapsed'}`)
  }

  const handleFolderOperation = (operation: FolderOperation, folder: Folder) => {
    console.log(`Operation: ${operation} on folder:`, folder)
    alert(`${operation.toUpperCase()}: ${folder.name}`)
  }

  return (
    <div style={{ height: '600px', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
      <FolderTree
        {...props}
        selectedFolderId={selectedFolderId}
        onFolderSelect={handleFolderSelect}
        onFolderExpand={handleFolderExpand}
        onFolderOperation={handleFolderOperation}
      />
    </div>
  )
}

// Stories
export const Default: Story = {
  render: () => <FolderTreeWrapper folders={mockFolders} />,
}

export const WithDocumentCount: Story = {
  render: () => <FolderTreeWrapper folders={mockFolders} showDocumentCount />,
}

export const WithoutIcons: Story = {
  render: () => <FolderTreeWrapper folders={mockFolders} showIcons={false} />,
}

export const WithoutContextMenu: Story = {
  render: () => <FolderTreeWrapper folders={mockFolders} enableContextMenu={false} />,
}

export const SmallList: Story = {
  render: () => <FolderTreeWrapper folders={mockFolders.slice(0, 20)} />,
}

export const LargeList: Story = {
  render: () => <FolderTreeWrapper folders={generateMockFolders(500)} />,
}

export const WithSearch: Story = {
  render: () => {
    const [searchQuery, setSearchQuery] = useState('')

    return (
      <div>
        <div style={{ marginBottom: '16px' }}>
          <input
            type="text"
            placeholder="Search folders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              fontSize: '14px',
            }}
          />
        </div>
        <FolderTreeWrapper folders={mockFolders} searchQuery={searchQuery} />
      </div>
    )
  },
}

export const EmptyState: Story = {
  render: () => <FolderTreeWrapper folders={[]} />,
}

export const NoSearchResults: Story = {
  render: () => <FolderTreeWrapper folders={mockFolders} searchQuery="xyz123notfound" />,
}

// Performance test
export const VeryLargeList: Story = {
  render: () => {
    const [folders] = useState(() => generateMockFolders(1000))
    return (
      <div>
        <p style={{ marginBottom: '16px', fontSize: '14px', color: '#666' }}>
          Testing with 1000+ folders. Tree should remain smooth with virtualization.
        </p>
        <FolderTreeWrapper folders={folders} />
      </div>
    )
  },
}
