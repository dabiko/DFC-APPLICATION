import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { AccessControlList } from './AccessControlList'
import type { AccessControlList as ACLType, PermissionGrantRequest } from '@/types/rbac'

const meta: Meta<typeof AccessControlList> = {
  title: 'Components/RBAC/AccessControlList',
  component: AccessControlList,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof AccessControlList>

const mockACL: ACLType = {
  resourceId: 'doc-123',
  resourceType: 'document',
  resourceName: 'Q4 Financial Report.pdf',
  inheritanceEnabled: true,
  parentFolderId: 'folder-456',
  entries: [
    {
      id: 'entry-1',
      resourceId: 'doc-123',
      resourceType: 'document',
      subjectType: 'user',
      subjectId: 'user-1',
      subjectName: 'John Doe',
      accessLevel: 'admin',
      permissions: [
        'view_document',
        'edit_document',
        'delete_document',
        'share_document',
        'download_document',
      ],
      inherited: false,
      grantedBy: 'admin@example.com',
      grantedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'entry-2',
      resourceId: 'doc-123',
      resourceType: 'document',
      subjectType: 'department',
      subjectId: 'dept-finance',
      subjectName: 'Finance Department',
      accessLevel: 'write',
      permissions: ['view_document', 'edit_document', 'download_document'],
      inherited: false,
      grantedBy: 'manager@example.com',
      grantedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'entry-3',
      resourceId: 'doc-123',
      resourceType: 'document',
      subjectType: 'user',
      subjectId: 'user-2',
      subjectName: 'Jane Smith',
      accessLevel: 'read',
      permissions: ['view_document', 'download_document'],
      inherited: true,
      inheritedFrom: 'folder-456',
      grantedBy: 'system',
      grantedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'entry-4',
      resourceId: 'doc-123',
      resourceType: 'document',
      subjectType: 'role',
      subjectId: 'role-manager',
      subjectName: 'Manager',
      accessLevel: 'write',
      permissions: ['view_document', 'edit_document', 'download_document', 'share_document'],
      inherited: true,
      inheritedFrom: 'folder-456',
      grantedBy: 'system',
      grantedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ],
  effectivePermissions: new Map(),
}

/**
 * Default ACL with mixed entries
 */
export const Default: Story = {
  args: {
    acl: mockACL,
    onEntryAdd: (request: PermissionGrantRequest) => console.log('Add entry:', request),
    onEntryModify: (entryId: string, permissions) =>
      console.log('Modify entry:', entryId, permissions),
    onEntryRemove: (entryId: string) => console.log('Remove entry:', entryId),
    onInheritanceToggle: (enabled: boolean) => console.log('Inheritance toggled:', enabled),
    canManagePermissions: true,
    showInherited: true,
  },
}

/**
 * Direct permissions only
 */
export const DirectOnly: Story = {
  args: {
    acl: {
      ...mockACL,
      entries: mockACL.entries.filter((e) => !e.inherited),
      inheritanceEnabled: false,
    },
    onEntryAdd: () => {},
    onEntryModify: () => {},
    onEntryRemove: () => {},
    canManagePermissions: true,
    showInherited: false,
  },
}

/**
 * Inherited permissions only
 */
export const InheritedOnly: Story = {
  args: {
    acl: {
      ...mockACL,
      entries: mockACL.entries.filter((e) => e.inherited),
    },
    onEntryAdd: () => {},
    onEntryModify: () => {},
    onEntryRemove: () => {},
    canManagePermissions: true,
    showInherited: true,
  },
}

/**
 * Empty ACL (no permissions set)
 */
export const EmptyACL: Story = {
  args: {
    acl: {
      ...mockACL,
      entries: [],
    },
    onEntryAdd: () => {},
    onEntryModify: () => {},
    onEntryRemove: () => {},
    canManagePermissions: true,
    showInherited: true,
  },
}

/**
 * Read-only mode
 */
export const ReadOnly: Story = {
  args: {
    acl: mockACL,
    onEntryAdd: () => {},
    onEntryModify: () => {},
    onEntryRemove: () => {},
    canManagePermissions: false,
    showInherited: true,
  },
}

/**
 * Folder ACL
 */
export const FolderACL: Story = {
  args: {
    acl: {
      resourceId: 'folder-789',
      resourceType: 'folder',
      resourceName: 'Financial Reports',
      inheritanceEnabled: true,
      parentFolderId: 'folder-root',
      entries: [
        {
          id: 'entry-f1',
          resourceId: 'folder-789',
          resourceType: 'folder',
          subjectType: 'department',
          subjectId: 'dept-finance',
          subjectName: 'Finance Department',
          accessLevel: 'admin',
          permissions: [
            'view_document',
            'edit_document',
            'delete_document',
            'manage_folder',
            'share_document',
          ],
          inherited: false,
          grantedBy: 'admin@example.com',
          grantedAt: new Date().toISOString(),
        },
        {
          id: 'entry-f2',
          resourceId: 'folder-789',
          resourceType: 'folder',
          subjectType: 'role',
          subjectId: 'role-viewer',
          subjectName: 'Viewer',
          accessLevel: 'read',
          permissions: ['view_document'],
          inherited: false,
          grantedBy: 'admin@example.com',
          grantedAt: new Date().toISOString(),
        },
      ],
      effectivePermissions: new Map(),
    },
    onEntryAdd: () => {},
    onEntryModify: () => {},
    onEntryRemove: () => {},
    canManagePermissions: true,
    showInherited: true,
  },
}

/**
 * Interactive ACL management
 */
export const Interactive: Story = {
  render: () => {
    const [acl, setACL] = useState<ACLType>(mockACL)

    const handleEntryRemove = (entryId: string) => {
      if (window.confirm('Remove this access entry?')) {
        setACL((prev) => ({
          ...prev,
          entries: prev.entries.filter((e) => e.id !== entryId),
        }))
        alert('Entry removed successfully!')
      }
    }

    const handleInheritanceToggle = (enabled: boolean) => {
      setACL((prev) => ({ ...prev, inheritanceEnabled: enabled }))
      alert(`Inheritance ${enabled ? 'enabled' : 'disabled'}`)
    }

    return (
      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
          <strong>Interactive Demo:</strong> Try removing entries and toggling inheritance. Direct
          permissions can be removed, inherited permissions are read-only.
        </div>
        <AccessControlList
          acl={acl}
          onEntryAdd={(request) => alert(`Add entry: ${JSON.stringify(request, null, 2)}`)}
          onEntryModify={(entryId, permissions) =>
            alert(`Modify entry ${entryId}: ${permissions.join(', ')}`)
          }
          onEntryRemove={handleEntryRemove}
          onInheritanceToggle={handleInheritanceToggle}
          canManagePermissions={true}
          showInherited={true}
        />
        <div className="p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold mb-2">Current State:</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>Total Entries: {acl.entries.length}</div>
            <div>Direct: {acl.entries.filter((e) => !e.inherited).length}</div>
            <div>Inherited: {acl.entries.filter((e) => e.inherited).length}</div>
            <div>Inheritance: {acl.inheritanceEnabled ? 'Enabled' : 'Disabled'}</div>
          </div>
        </div>
      </div>
    )
  },
}

/**
 * Dark mode
 */
export const DarkMode: Story = {
  render: () => (
    <div className="dark bg-gray-950 p-8 min-h-screen">
      <AccessControlList
        acl={mockACL}
        onEntryAdd={() => {}}
        onEntryModify={() => {}}
        onEntryRemove={() => {}}
        onInheritanceToggle={() => {}}
        canManagePermissions={true}
        showInherited={true}
      />
    </div>
  ),
}
