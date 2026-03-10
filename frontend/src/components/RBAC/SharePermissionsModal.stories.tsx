import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { SharePermissionsModal } from './SharePermissionsModal'
import type { UserWithRole, AccessControlList as ACLType } from '@/types/rbac'

const meta: Meta<typeof SharePermissionsModal> = {
  title: 'Components/RBAC/SharePermissionsModal',
  component: SharePermissionsModal,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof SharePermissionsModal>

const mockUsers: UserWithRole[] = [
  {
    id: '1',
    email: 'john.doe@example.com',
    name: 'John Doe',
    role: 'admin',
    department: 'IT',
    isActive: true,
    lastLogin: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  },
  {
    id: '2',
    email: 'jane.smith@example.com',
    name: 'Jane Smith',
    role: 'manager',
    department: 'Finance',
    isActive: true,
    lastLogin: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  },
  {
    id: '3',
    email: 'bob.johnson@example.com',
    name: 'Bob Johnson',
    role: 'editor',
    department: 'Marketing',
    isActive: true,
    lastLogin: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  },
  {
    id: '4',
    email: 'alice.williams@example.com',
    name: 'Alice Williams',
    role: 'viewer',
    department: 'Sales',
    isActive: true,
    lastLogin: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  },
  {
    id: '5',
    email: 'charlie.brown@example.com',
    name: 'Charlie Brown',
    role: 'editor',
    department: 'Engineering',
    isActive: true,
    lastLogin: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  },
]

const mockDepartments = [
  { id: 'dept-1', name: 'Finance' },
  { id: 'dept-2', name: 'IT' },
  { id: 'dept-3', name: 'Marketing' },
  { id: 'dept-4', name: 'Sales' },
  { id: 'dept-5', name: 'Engineering' },
  { id: 'dept-6', name: 'HR' },
]

const mockACL: ACLType = {
  resourceId: 'doc-123',
  resourceType: 'document',
  resourceName: 'Q4 Financial Report.pdf',
  inheritanceEnabled: true,
  entries: [],
  effectivePermissions: new Map(),
}

/**
 * Default - Share document
 */
export const ShareDocument: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(true)

    return (
      <>
        <button
          onClick={() => setIsOpen(true)}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          Open Share Modal
        </button>
        <SharePermissionsModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          resourceId="doc-123"
          resourceType="document"
          resourceName="Q4 Financial Report.pdf"
          currentACL={mockACL}
          onShare={(request) => {
            console.log('Share request:', request)
            alert(`Shared with:\n${JSON.stringify(request, null, 2)}`)
            setIsOpen(false)
          }}
          availableUsers={mockUsers}
          availableDepartments={mockDepartments}
        />
      </>
    )
  },
}

/**
 * Share folder
 */
export const ShareFolder: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(true)

    return (
      <>
        <button
          onClick={() => setIsOpen(true)}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          Open Share Modal
        </button>
        <SharePermissionsModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          resourceId="folder-456"
          resourceType="folder"
          resourceName="Financial Reports"
          currentACL={mockACL}
          onShare={(request) => {
            console.log('Share request:', request)
            setIsOpen(false)
          }}
          availableUsers={mockUsers}
          availableDepartments={mockDepartments}
        />
      </>
    )
  },
}

/**
 * With existing access
 */
export const WithExistingAccess: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(true)

    const aclWithEntries: ACLType = {
      ...mockACL,
      entries: [
        {
          id: 'entry-1',
          resourceId: 'doc-123',
          resourceType: 'document',
          subjectType: 'user',
          subjectId: '2', // Jane Smith already has access
          subjectName: 'Jane Smith',
          accessLevel: 'read',
          permissions: ['view_document'],
          inherited: false,
          grantedBy: 'admin',
          grantedAt: new Date().toISOString(),
        },
      ],
    }

    return (
      <>
        <button
          onClick={() => setIsOpen(true)}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          Open Share Modal
        </button>
        <SharePermissionsModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          resourceId="doc-123"
          resourceType="document"
          resourceName="Q4 Financial Report.pdf"
          currentACL={aclWithEntries}
          onShare={(request) => {
            console.log('Share request:', request)
            setIsOpen(false)
          }}
          availableUsers={mockUsers}
          availableDepartments={mockDepartments}
        />
      </>
    )
  },
}

/**
 * Small user list
 */
export const SmallUserList: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(true)

    return (
      <>
        <button
          onClick={() => setIsOpen(true)}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          Open Share Modal
        </button>
        <SharePermissionsModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          resourceId="doc-123"
          resourceType="document"
          resourceName="Q4 Financial Report.pdf"
          currentACL={mockACL}
          onShare={(request) => {
            console.log('Share request:', request)
            setIsOpen(false)
          }}
          availableUsers={mockUsers.slice(0, 3)}
          availableDepartments={mockDepartments.slice(0, 3)}
        />
      </>
    )
  },
}

/**
 * Interactive demo
 */
export const Interactive: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false)
    const [shares, setShares] = useState<string[]>([])

    return (
      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
          <strong>Interactive Demo:</strong> Share the document with users or departments. Try
          different access levels and set expiry dates.
        </div>

        <button
          onClick={() => setIsOpen(true)}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          Share Document
        </button>

        <SharePermissionsModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          resourceId="doc-123"
          resourceType="document"
          resourceName="Q4 Financial Report.pdf"
          currentACL={mockACL}
          onShare={(request) => {
            const user = mockUsers.find((u) => u.id === request.subjectId)
            const dept = mockDepartments.find((d) => d.id === request.subjectId)
            const subjectName = user?.name || dept?.name || 'Unknown'

            setShares((prev) => [
              ...prev,
              `${subjectName} (${request.accessLevel})${request.expiresAt ? ` - Expires: ${new Date(request.expiresAt).toLocaleDateString()}` : ''}`,
            ])
            setIsOpen(false)
          }}
          availableUsers={mockUsers}
          availableDepartments={mockDepartments}
        />

        {shares.length > 0 && (
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold mb-2">Shared with ({shares.length}):</h3>
            <ul className="space-y-1 text-sm">
              {shares.map((share, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  {share}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    )
  },
}

/**
 * Dark mode
 */
export const DarkMode: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(true)

    return (
      <div className="dark bg-gray-950 p-8 min-h-screen">
        <button
          onClick={() => setIsOpen(true)}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          Open Share Modal
        </button>
        <SharePermissionsModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          resourceId="doc-123"
          resourceType="document"
          resourceName="Q4 Financial Report.pdf"
          currentACL={mockACL}
          onShare={(request) => {
            console.log('Share request:', request)
            setIsOpen(false)
          }}
          availableUsers={mockUsers}
          availableDepartments={mockDepartments}
        />
      </div>
    )
  },
}

/**
 * Large user list (scrollable)
 */
export const LargeUserList: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(true)

    // Generate 50 users
    const largeUserList = Array.from({ length: 50 }, (_, i) => ({
      id: `user-${i}`,
      email: `user${i}@example.com`,
      name: `User ${i}`,
      role: (['viewer', 'editor', 'manager', 'admin'] as const)[i % 4],
      department: (['IT', 'Finance', 'Marketing', 'Sales'] as const)[i % 4],
      isActive: true,
      lastLogin: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    }))

    return (
      <>
        <button
          onClick={() => setIsOpen(true)}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          Open Share Modal (50 users)
        </button>
        <SharePermissionsModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          resourceId="doc-123"
          resourceType="document"
          resourceName="Q4 Financial Report.pdf"
          currentACL={mockACL}
          onShare={(request) => {
            console.log('Share request:', request)
            setIsOpen(false)
          }}
          availableUsers={largeUserList}
          availableDepartments={mockDepartments}
        />
      </>
    )
  },
}
