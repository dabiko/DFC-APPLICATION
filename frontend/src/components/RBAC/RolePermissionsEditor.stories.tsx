import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { RolePermissionsEditor } from './RolePermissionsEditor'
import { SYSTEM_ROLES, ALL_PERMISSIONS } from '@/types/rbac'
import type { Role } from '@/types/rbac'

const meta: Meta<typeof RolePermissionsEditor> = {
  title: 'Components/RBAC/RolePermissionsEditor',
  component: RolePermissionsEditor,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof RolePermissionsEditor>

/**
 * Default - Viewer role
 */
export const Viewer: Story = {
  args: {
    role: SYSTEM_ROLES[0], // viewer
    availablePermissions: ALL_PERMISSIONS,
    onPermissionsChange: (roleId, permissions) => {
      console.log('Permissions changed:', roleId, permissions)
    },
    canEditRole: true,
    isSystemRole: true,
  },
}

/**
 * Editor role
 */
export const Editor: Story = {
  args: {
    role: SYSTEM_ROLES[1], // editor
    availablePermissions: ALL_PERMISSIONS,
    onPermissionsChange: () => {},
    canEditRole: true,
    isSystemRole: true,
  },
}

/**
 * Manager role
 */
export const Manager: Story = {
  args: {
    role: SYSTEM_ROLES[2], // manager
    availablePermissions: ALL_PERMISSIONS,
    onPermissionsChange: () => {},
    canEditRole: true,
    isSystemRole: true,
  },
}

/**
 * Admin role
 */
export const Admin: Story = {
  args: {
    role: SYSTEM_ROLES[3], // admin
    availablePermissions: ALL_PERMISSIONS,
    onPermissionsChange: () => {},
    canEditRole: true,
    isSystemRole: true,
  },
}

/**
 * Custom role (editable)
 */
export const CustomRole: Story = {
  render: () => {
    const customRole: Role = {
      id: 'custom-1',
      name: 'content-moderator',
      displayName: 'Content Moderator',
      description: 'Can review and approve content submissions',
      permissions: ['view_document', 'edit_document', 'manage_metadata'],
      isSystemRole: false,
      isCustomRole: true,
      color: 'purple',
      icon: '🛡️',
      level: 2,
    }

    const [selectedPermissions, setSelectedPermissions] = useState(customRole.permissions)

    return (
      <RolePermissionsEditor
        role={{ ...customRole, permissions: selectedPermissions }}
        availablePermissions={ALL_PERMISSIONS}
        onPermissionsChange={(roleId, permissions) => {
          setSelectedPermissions(permissions)
          console.log('Custom role permissions updated:', permissions)
        }}
        canEditRole={true}
        isSystemRole={false}
      />
    )
  },
}

/**
 * Read-only mode (cannot edit)
 */
export const ReadOnly: Story = {
  args: {
    role: SYSTEM_ROLES[2], // manager
    availablePermissions: ALL_PERMISSIONS,
    onPermissionsChange: () => {},
    canEditRole: false,
    isSystemRole: false,
  },
}

/**
 * System role (cannot edit)
 */
export const SystemRoleLocked: Story = {
  args: {
    role: SYSTEM_ROLES[3], // admin
    availablePermissions: ALL_PERMISSIONS,
    onPermissionsChange: () => {},
    canEditRole: true,
    isSystemRole: true,
  },
}

/**
 * Interactive - Edit and save custom role
 */
export const Interactive: Story = {
  render: () => {
    const [role, setRole] = useState<Role>({
      id: 'custom-2',
      name: 'department-lead',
      displayName: 'Department Lead',
      description: 'Leads a department with document and folder management capabilities',
      permissions: ['view_document', 'edit_document', 'download_document', 'manage_folder'],
      isSystemRole: false,
      isCustomRole: true,
      color: 'green',
      icon: '👨‍💼',
      level: 2,
    })

    return (
      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
          <strong>Interactive Demo:</strong> Toggle permissions to see changes. Click "Save Changes"
          to apply.
        </div>
        <RolePermissionsEditor
          role={role}
          availablePermissions={ALL_PERMISSIONS}
          onPermissionsChange={(roleId, permissions) => {
            setRole((prev) => ({ ...prev, permissions }))
            alert(`Permissions saved! New count: ${permissions.length}`)
          }}
          canEditRole={true}
          isSystemRole={false}
        />
        <div className="p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold mb-2">Current Permissions ({role.permissions.length}):</h3>
          <div className="flex flex-wrap gap-1">
            {role.permissions.map((p) => (
              <span key={p} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                {p}
              </span>
            ))}
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
      <RolePermissionsEditor
        role={SYSTEM_ROLES[2]} // manager
        availablePermissions={ALL_PERMISSIONS}
        onPermissionsChange={() => {}}
        canEditRole={false}
        isSystemRole={true}
      />
    </div>
  ),
}

/**
 * All system roles comparison
 */
export const CompareRoles: Story = {
  render: () => (
    <div className="space-y-6">
      {SYSTEM_ROLES.map((role) => (
        <div key={role.id} className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-6 py-3 border-b">
            <h3 className="font-semibold">{role.displayName}</h3>
          </div>
          <div className="p-6">
            <div className="flex flex-wrap gap-2">
              {role.permissions.map((p) => {
                const perm = ALL_PERMISSIONS.find((ap) => ap.type === p)
                return (
                  <span
                    key={p}
                    className="px-2.5 py-1 bg-blue-100 text-blue-700 text-sm rounded-full"
                  >
                    {perm?.label || p}
                  </span>
                )
              })}
            </div>
            <p className="text-sm text-gray-500 mt-4">{role.permissions.length} permissions</p>
          </div>
        </div>
      ))}
    </div>
  ),
}
