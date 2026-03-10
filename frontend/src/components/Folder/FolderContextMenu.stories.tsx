/**
 * FolderContextMenu Storybook Stories
 */

import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { FolderContextMenu } from './FolderContextMenu'
import type { Folder, FolderOperation } from '@/types/folder'

const meta: Meta<typeof FolderContextMenu> = {
  title: 'Components/Folder/FolderContextMenu',
  component: FolderContextMenu,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof FolderContextMenu>

// Mock folder data
const mockFolder: Folder = {
  id: 'folder-1',
  name: 'Financial Reports',
  parentId: null,
  path: '/Financial Reports',
  level: 0,
  isLocked: false,
  confidentiality: 'confidential',
  createdBy: 'admin@cccplc.net',
  createdAt: new Date().toISOString(),
  modifiedBy: 'admin@cccplc.net',
  modifiedAt: new Date().toISOString(),
  childrenCount: 5,
  documentCount: 12,
  hasChildren: true,
  permissions: {
    canView: true,
    canEdit: true,
    canDelete: true,
    canShare: true,
    canManage: true,
  },
}

const lockedFolder: Folder = {
  ...mockFolder,
  id: 'folder-locked',
  name: 'Locked Folder',
  isLocked: true,
  permissions: {
    canView: true,
    canEdit: false,
    canDelete: false,
    canShare: false,
    canManage: false,
  },
}

const readOnlyFolder: Folder = {
  ...mockFolder,
  id: 'folder-readonly',
  name: 'Read-Only Folder',
  permissions: {
    canView: true,
    canEdit: false,
    canDelete: false,
    canShare: false,
    canManage: false,
  },
}

// Interactive wrapper
const ContextMenuWrapper = (props: any) => {
  const [isOpen, setIsOpen] = useState(true)
  const [position] = useState({ x: 100, y: 100 })

  const handleAction = (operation: FolderOperation) => {
    console.log(`Action: ${operation}`)
    alert(`Operation: ${operation.toUpperCase()}\nFolder: ${props.folder.name}`)
    setIsOpen(false)
  }

  const handleClose = () => {
    console.log('Context menu closed')
    setIsOpen(false)
  }

  if (!isOpen) {
    return (
      <div className="p-4">
        <p className="text-sm text-gray-600 mb-4">
          Context menu was closed. Reload the story to see it again.
        </p>
        <button
          className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
          onClick={() => setIsOpen(true)}
        >
          Show Context Menu
        </button>
      </div>
    )
  }

  return (
    <div className="relative w-[400px] h-[400px] bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg">
      <p className="absolute top-4 left-4 text-sm text-gray-600 dark:text-gray-400">
        Right-click area (context menu shown at fixed position)
      </p>
      <FolderContextMenu
        folder={props.folder}
        position={position}
        onAction={handleAction}
        onClose={handleClose}
      />
    </div>
  )
}

// Stories
export const Default: Story = {
  render: () => <ContextMenuWrapper folder={mockFolder} />,
}

export const LockedFolder: Story = {
  render: () => <ContextMenuWrapper folder={lockedFolder} />,
}

export const ReadOnlyFolder: Story = {
  render: () => <ContextMenuWrapper folder={readOnlyFolder} />,
}

export const BottomRightPosition: Story = {
  render: () => {
    const [position] = useState({ x: 300, y: 300 })
    return (
      <div className="relative w-[500px] h-[500px] bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg">
        <p className="absolute top-4 left-4 text-sm text-gray-600 dark:text-gray-400">
          Context menu positioned at bottom-right (should auto-adjust to stay in viewport)
        </p>
        <FolderContextMenu
          folder={mockFolder}
          position={position}
          onAction={(operation) => console.log(operation)}
          onClose={() => console.log('Closed')}
        />
      </div>
    )
  },
}

export const KeyboardNavigation: Story = {
  render: () => {
    return (
      <div className="p-4">
        <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded">
          <h3 className="font-semibold text-sm mb-2">Keyboard Navigation Instructions:</h3>
          <ul className="text-sm space-y-1 text-gray-700 dark:text-gray-300">
            <li>
              <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs">↓</kbd> Move
              down
            </li>
            <li>
              <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs">↑</kbd> Move
              up
            </li>
            <li>
              <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs">Enter</kbd> or{' '}
              <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs">Space</kbd>{' '}
              Activate item
            </li>
            <li>
              <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs">Esc</kbd>{' '}
              Close menu
            </li>
          </ul>
        </div>
        <ContextMenuWrapper folder={mockFolder} />
      </div>
    )
  },
}

export const AllPermissionsDisabled: Story = {
  render: () => {
    const disabledFolder: Folder = {
      ...mockFolder,
      permissions: {
        canView: true,
        canEdit: false,
        canDelete: false,
        canShare: false,
        canManage: false,
      },
    }
    return <ContextMenuWrapper folder={disabledFolder} />
  },
}
