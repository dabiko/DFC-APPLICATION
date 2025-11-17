import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { UserRoleManager } from './UserRoleManager'
import { SYSTEM_ROLES } from '@/types/rbac'
import type { UserWithRole } from '@/types/rbac'

const meta: Meta<typeof UserRoleManager> = {
  title: 'Components/RBAC/UserRoleManager',
  component: UserRoleManager,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof UserRoleManager>

const mockUsers: UserWithRole[] = [
  {
    id: '1',
    email: 'john.doe@example.com',
    name: 'John Doe',
    role: 'admin',
    department: 'IT',
    isActive: true,
    lastLogin: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '2',
    email: 'jane.smith@example.com',
    name: 'Jane Smith',
    role: 'manager',
    department: 'Finance',
    isActive: true,
    lastLogin: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '3',
    email: 'bob.johnson@example.com',
    name: 'Bob Johnson',
    role: 'editor',
    department: 'Marketing',
    isActive: true,
    lastLogin: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '4',
    email: 'alice.williams@example.com',
    name: 'Alice Williams',
    role: 'viewer',
    department: 'Sales',
    isActive: true,
    lastLogin: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '5',
    email: 'charlie.brown@example.com',
    name: 'Charlie Brown',
    role: 'editor',
    department: 'Engineering',
    isActive: false,
    lastLogin: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 500 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '6',
    email: 'diana.prince@example.com',
    name: 'Diana Prince',
    role: 'manager',
    department: 'HR',
    isActive: true,
    lastLogin: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '7',
    email: 'eve.davis@example.com',
    name: 'Eve Davis',
    role: 'viewer',
    department: 'Legal',
    isActive: true,
    lastLogin: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '8',
    email: 'frank.miller@example.com',
    name: 'Frank Miller',
    role: 'editor',
    department: 'IT',
    isActive: false,
    lastLogin: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000).toISOString(),
  },
]

/**
 * Default user role manager with full permissions
 */
export const Default: Story = {
  render: () => {
    const [users, setUsers] = useState(mockUsers)

    const handleRoleChange = (userId: string, newRole: string, reason?: string) => {
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)))
      console.log(`Role changed for user ${userId} to ${newRole}. Reason: ${reason || 'N/A'}`)
    }

    const handleUserDeactivate = (userId: string) => {
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, isActive: false } : u)))
      console.log(`User ${userId} deactivated`)
    }

    const handleUserActivate = (userId: string) => {
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, isActive: true } : u)))
      console.log(`User ${userId} activated`)
    }

    return (
      <UserRoleManager
        users={users}
        availableRoles={SYSTEM_ROLES}
        onRoleChange={handleRoleChange}
        onUserDeactivate={handleUserDeactivate}
        onUserActivate={handleUserActivate}
        canManageRoles={true}
      />
    )
  },
}

/**
 * Read-only mode (user without manage permissions)
 */
export const ReadOnly: Story = {
  args: {
    users: mockUsers,
    availableRoles: SYSTEM_ROLES,
    onRoleChange: (userId, newRole) => console.log(`Role change: ${userId} -> ${newRole}`),
    canManageRoles: false,
  },
}

/**
 * Small user list
 */
export const SmallUserList: Story = {
  render: () => {
    const [users, setUsers] = useState(mockUsers.slice(0, 3))

    return (
      <UserRoleManager
        users={users}
        availableRoles={SYSTEM_ROLES}
        onRoleChange={(userId, newRole) => {
          setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)))
        }}
        canManageRoles={true}
      />
    )
  },
}

/**
 * All users inactive
 */
export const AllInactive: Story = {
  args: {
    users: mockUsers.map((u) => ({ ...u, isActive: false })),
    availableRoles: SYSTEM_ROLES,
    onRoleChange: () => {},
    canManageRoles: true,
  },
}

/**
 * Only admins
 */
export const OnlyAdmins: Story = {
  args: {
    users: mockUsers.map((u) => ({ ...u, role: 'admin' })),
    availableRoles: SYSTEM_ROLES,
    onRoleChange: () => {},
    canManageRoles: true,
  },
}

/**
 * Mixed roles distribution
 */
export const MixedRoles: Story = {
  args: {
    users: [
      ...mockUsers.slice(0, 2).map((u) => ({ ...u, role: 'admin' })),
      ...mockUsers.slice(2, 4).map((u) => ({ ...u, role: 'manager' })),
      ...mockUsers.slice(4, 6).map((u) => ({ ...u, role: 'editor' })),
      ...mockUsers.slice(6).map((u) => ({ ...u, role: 'viewer' })),
    ],
    availableRoles: SYSTEM_ROLES,
    onRoleChange: () => {},
    canManageRoles: true,
  },
}

/**
 * With avatars
 */
export const WithAvatars: Story = {
  args: {
    users: mockUsers.map((u, i) => ({
      ...u,
      avatar: `https://i.pravatar.cc/150?img=${i + 1}`,
    })),
    availableRoles: SYSTEM_ROLES,
    onRoleChange: () => {},
    canManageRoles: true,
  },
}

/**
 * Empty state
 */
export const EmptyState: Story = {
  args: {
    users: [],
    availableRoles: SYSTEM_ROLES,
    onRoleChange: () => {},
    canManageRoles: true,
  },
}

/**
 * Dark mode
 */
export const DarkMode: Story = {
  render: () => (
    <div className="dark bg-gray-950 p-8 min-h-screen">
      <UserRoleManager
        users={mockUsers}
        availableRoles={SYSTEM_ROLES}
        onRoleChange={() => {}}
        canManageRoles={true}
      />
    </div>
  ),
}

/**
 * Interactive with all features
 */
export const Interactive: Story = {
  render: () => {
    const [users, setUsers] = useState(mockUsers)

    const handleRoleChange = (userId: string, newRole: string, reason?: string) => {
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)))
      alert(
        `Role changed:\nUser: ${users.find((u) => u.id === userId)?.name}\nNew Role: ${newRole}\nReason: ${reason || 'N/A'}`
      )
    }

    const handleUserDeactivate = (userId: string) => {
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, isActive: false } : u)))
      alert(`User ${users.find((u) => u.id === userId)?.name} deactivated`)
    }

    const handleUserActivate = (userId: string) => {
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, isActive: true } : u)))
      alert(`User ${users.find((u) => u.id === userId)?.name} activated`)
    }

    return (
      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
          <strong>Interactive Demo:</strong> Try searching, filtering, changing roles, and
          activating/deactivating users. Role changes will prompt for a reason.
        </div>
        <UserRoleManager
          users={users}
          availableRoles={SYSTEM_ROLES}
          onRoleChange={handleRoleChange}
          onUserDeactivate={handleUserDeactivate}
          onUserActivate={handleUserActivate}
          canManageRoles={true}
        />
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold mb-2">Current State:</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>Total Users: {users.length}</div>
            <div>Active Users: {users.filter((u) => u.isActive).length}</div>
            <div>Admins: {users.filter((u) => u.role === 'admin').length}</div>
            <div>Managers: {users.filter((u) => u.role === 'manager').length}</div>
            <div>Editors: {users.filter((u) => u.role === 'editor').length}</div>
            <div>Viewers: {users.filter((u) => u.role === 'viewer').length}</div>
          </div>
        </div>
      </div>
    )
  },
}
