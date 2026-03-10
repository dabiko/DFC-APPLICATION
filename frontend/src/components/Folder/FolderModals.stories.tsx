/**
 * Folder Modals Storybook Stories
 * Combined stories for all folder operation modals
 */

import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { CreateFolderModal } from './CreateFolderModal'
import { RenameFolderModal } from './RenameFolderModal'
import { MoveFolderModal } from './MoveFolderModal'
import { DeleteFolderModal } from './DeleteFolderModal'
import type { Folder, CreateFolderData } from '@/types/folder'

const meta: Meta = {
  title: 'Components/Folder/Modals',
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
}

export default meta

// Mock folder data
const mockParentFolder: Folder = {
  id: 'parent-1',
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
  childrenCount: 3,
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

const mockFolderToRename: Folder = {
  ...mockParentFolder,
  id: 'folder-rename',
  name: '2024 Q1 Reports',
  path: '/Financial Reports/2024 Q1 Reports',
  childrenCount: 5,
  documentCount: 24,
}

const mockLockedFolder: Folder = {
  ...mockFolderToRename,
  id: 'folder-locked',
  name: 'Locked Folder',
  isLocked: true,
  permissions: {
    ...mockFolderToRename.permissions,
    canEdit: false,
    canDelete: false,
  },
}

const mockFolderWithContents: Folder = {
  ...mockFolderToRename,
  id: 'folder-contents',
  name: 'Department Files',
  childrenCount: 12,
  documentCount: 145,
}

const generateMockFolders = (): Folder[] => {
  return [
    {
      id: 'root-1',
      name: 'Engagements',
      parentId: null,
      path: '/Engagements',
      level: 0,
      isLocked: false,
      confidentiality: 'internal',
      createdBy: 'admin@cccplc.net',
      createdAt: new Date().toISOString(),
      modifiedBy: 'admin@cccplc.net',
      modifiedAt: new Date().toISOString(),
      childrenCount: 2,
      documentCount: 10,
      hasChildren: true,
      permissions: {
        canView: true,
        canEdit: true,
        canDelete: true,
        canShare: true,
        canManage: true,
      },
      children: [
        {
          id: 'child-1',
          name: 'Client A',
          parentId: 'root-1',
          path: '/Engagements/Client A',
          level: 1,
          isLocked: false,
          confidentiality: 'confidential',
          createdBy: 'user@cccplc.net',
          createdAt: new Date().toISOString(),
          modifiedBy: 'user@cccplc.net',
          modifiedAt: new Date().toISOString(),
          childrenCount: 0,
          documentCount: 5,
          hasChildren: false,
          permissions: {
            canView: true,
            canEdit: true,
            canDelete: true,
            canShare: true,
            canManage: true,
          },
        },
      ],
    },
    {
      id: 'root-2',
      name: 'Compliance',
      parentId: null,
      path: '/Compliance',
      level: 0,
      isLocked: false,
      confidentiality: 'highly_confidential',
      createdBy: 'admin@cccplc.net',
      createdAt: new Date().toISOString(),
      modifiedBy: 'admin@cccplc.net',
      modifiedAt: new Date().toISOString(),
      childrenCount: 1,
      documentCount: 8,
      hasChildren: true,
      permissions: {
        canView: true,
        canEdit: true,
        canDelete: false,
        canShare: false,
        canManage: true,
      },
    },
  ]
}

// CreateFolderModal Stories
export const CreateFolder: StoryObj = {
  render: () => {
    const [isOpen, setIsOpen] = useState(true)

    const handleCreate = async (data: CreateFolderData) => {
      console.log('Creating folder:', data)
      await new Promise((resolve) => setTimeout(resolve, 1000))
      alert(
        `Created folder: ${data.name}\nParent: ${data.parentId || 'Root'}\nConfidentiality: ${data.confidentiality}`
      )
    }

    return (
      <div className="p-4">
        <button
          onClick={() => setIsOpen(true)}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          Open Create Folder Modal
        </button>
        <CreateFolderModal
          isOpen={isOpen}
          parentFolder={mockParentFolder}
          onClose={() => setIsOpen(false)}
          onCreate={handleCreate}
          existingFolderNames={['2024 Q1 Reports', '2024 Q2 Reports', '2024 Q3 Reports']}
        />
      </div>
    )
  },
}

export const CreateFolderAtRoot: StoryObj = {
  render: () => {
    const [isOpen, setIsOpen] = useState(true)

    const handleCreate = async (data: CreateFolderData) => {
      console.log('Creating folder at root:', data)
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }

    return (
      <div className="p-4">
        <button
          onClick={() => setIsOpen(true)}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          Open Create Folder Modal (Root)
        </button>
        <CreateFolderModal
          isOpen={isOpen}
          parentFolder={null}
          onClose={() => setIsOpen(false)}
          onCreate={handleCreate}
        />
      </div>
    )
  },
}

// RenameFolderModal Stories
export const RenameFolder: StoryObj = {
  render: () => {
    const [isOpen, setIsOpen] = useState(true)

    const handleRename = async (folderId: string, newName: string) => {
      console.log('Renaming folder:', folderId, 'to', newName)
      await new Promise((resolve) => setTimeout(resolve, 1000))
      alert(`Renamed folder to: ${newName}`)
    }

    return (
      <div className="p-4">
        <button
          onClick={() => setIsOpen(true)}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          Open Rename Folder Modal
        </button>
        <RenameFolderModal
          isOpen={isOpen}
          folder={mockFolderToRename}
          onClose={() => setIsOpen(false)}
          onRename={handleRename}
          existingFolderNames={['2024 Q2 Reports', '2024 Q3 Reports']}
        />
      </div>
    )
  },
}

export const RenameLockedFolder: StoryObj = {
  render: () => {
    const [isOpen, setIsOpen] = useState(true)

    const handleRename = async (folderId: string, _newName: string) => {
      console.warn('Attempting to rename locked folder:', folderId)
      throw new Error('Cannot rename a locked folder')
    }

    return (
      <div className="p-4">
        <button
          onClick={() => setIsOpen(true)}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          Open Rename Locked Folder Modal
        </button>
        <RenameFolderModal
          isOpen={isOpen}
          folder={mockLockedFolder}
          onClose={() => setIsOpen(false)}
          onRename={handleRename}
        />
      </div>
    )
  },
}

// MoveFolderModal Stories
export const MoveFolder: StoryObj = {
  render: () => {
    const [isOpen, setIsOpen] = useState(true)
    const folders = generateMockFolders()

    const handleMove = async (folderId: string, newParentId: string | null) => {
      console.log('Moving folder:', folderId, 'to', newParentId || 'root')
      await new Promise((resolve) => setTimeout(resolve, 1000))
      alert(`Moved folder to: ${newParentId || 'Root'}`)
    }

    return (
      <div className="p-4">
        <button
          onClick={() => setIsOpen(true)}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          Open Move Folder Modal
        </button>
        <MoveFolderModal
          isOpen={isOpen}
          folder={mockFolderToRename}
          folders={folders}
          onClose={() => setIsOpen(false)}
          onMove={handleMove}
        />
      </div>
    )
  },
}

// DeleteFolderModal Stories
export const DeleteFolder: StoryObj = {
  render: () => {
    const [isOpen, setIsOpen] = useState(true)

    const handleDelete = async (folderId: string, force?: boolean) => {
      console.log('Deleting folder:', folderId, 'Force:', force)
      await new Promise((resolve) => setTimeout(resolve, 1500))
      alert(`Deleted folder${force ? ' (forced)' : ''}`)
    }

    return (
      <div className="p-4">
        <button
          onClick={() => setIsOpen(true)}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Open Delete Folder Modal
        </button>
        <DeleteFolderModal
          isOpen={isOpen}
          folder={mockFolderToRename}
          onClose={() => setIsOpen(false)}
          onDelete={handleDelete}
        />
      </div>
    )
  },
}

export const DeleteFolderWithContents: StoryObj = {
  render: () => {
    const [isOpen, setIsOpen] = useState(true)

    const handleDelete = async (folderId: string, force?: boolean) => {
      console.log('Deleting folder with contents:', folderId, 'Force:', force)
      await new Promise((resolve) => setTimeout(resolve, 1500))
    }

    return (
      <div className="p-4">
        <button
          onClick={() => setIsOpen(true)}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Open Delete Folder with Contents
        </button>
        <DeleteFolderModal
          isOpen={isOpen}
          folder={mockFolderWithContents}
          onClose={() => setIsOpen(false)}
          onDelete={handleDelete}
        />
      </div>
    )
  },
}

export const DeleteLockedFolder: StoryObj = {
  render: () => {
    const [isOpen, setIsOpen] = useState(true)

    const handleDelete = async (folderId: string, force?: boolean) => {
      console.log('Deleting locked folder:', folderId, 'Force:', force)
      if (!force) {
        throw new Error('Cannot delete locked folder without force option')
      }
      await new Promise((resolve) => setTimeout(resolve, 1500))
    }

    return (
      <div className="p-4">
        <button
          onClick={() => setIsOpen(true)}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Open Delete Locked Folder
        </button>
        <DeleteFolderModal
          isOpen={isOpen}
          folder={mockLockedFolder}
          onClose={() => setIsOpen(false)}
          onDelete={handleDelete}
        />
      </div>
    )
  },
}

// All Modals Flow
export const AllModalsFlow: StoryObj = {
  render: () => {
    const [activeModal, setActiveModal] = useState<'create' | 'rename' | 'move' | 'delete' | null>(
      null
    )

    return (
      <div className="p-8 space-y-4">
        <h2 className="text-2xl font-bold mb-4">Folder Operation Modals</h2>
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => setActiveModal('create')}
            className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Create Folder
          </button>
          <button
            onClick={() => setActiveModal('rename')}
            className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Rename Folder
          </button>
          <button
            onClick={() => setActiveModal('move')}
            className="px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Move Folder
          </button>
          <button
            onClick={() => setActiveModal('delete')}
            className="px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Delete Folder
          </button>
        </div>

        <CreateFolderModal
          isOpen={activeModal === 'create'}
          parentFolder={mockParentFolder}
          onClose={() => setActiveModal(null)}
          onCreate={async (data) => {
            console.log('Create:', data)
            await new Promise((resolve) => setTimeout(resolve, 1000))
            setActiveModal(null)
          }}
        />

        <RenameFolderModal
          isOpen={activeModal === 'rename'}
          folder={mockFolderToRename}
          onClose={() => setActiveModal(null)}
          onRename={async (id, name) => {
            console.log('Rename:', id, name)
            await new Promise((resolve) => setTimeout(resolve, 1000))
            setActiveModal(null)
          }}
        />

        <MoveFolderModal
          isOpen={activeModal === 'move'}
          folder={mockFolderToRename}
          folders={generateMockFolders()}
          onClose={() => setActiveModal(null)}
          onMove={async (id, parentId) => {
            console.log('Move:', id, parentId)
            await new Promise((resolve) => setTimeout(resolve, 1000))
            setActiveModal(null)
          }}
        />

        <DeleteFolderModal
          isOpen={activeModal === 'delete'}
          folder={mockFolderToRename}
          onClose={() => setActiveModal(null)}
          onDelete={async (id, force) => {
            console.log('Delete:', id, force)
            await new Promise((resolve) => setTimeout(resolve, 1500))
            setActiveModal(null)
          }}
        />
      </div>
    )
  },
}
