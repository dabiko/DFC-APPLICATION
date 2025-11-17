import type { Meta, StoryObj } from '@storybook/react'
import { PermissionBadge } from './PermissionBadge'
import { ALL_PERMISSIONS } from '@/types/rbac'

const meta: Meta<typeof PermissionBadge> = {
  title: 'Components/RBAC/PermissionBadge',
  component: PermissionBadge,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof PermissionBadge>

/**
 * Default permission badge
 */
export const Default: Story = {
  args: {
    permission: 'view_document',
    variant: 'permission',
    size: 'md',
    showTooltip: true,
  },
}

/**
 * Access level badges
 */
export const AccessLevels: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <PermissionBadge permission="none" variant="access-level" />
        <PermissionBadge permission="read" variant="access-level" />
        <PermissionBadge permission="write" variant="access-level" />
        <PermissionBadge permission="admin" variant="access-level" />
      </div>
    </div>
  ),
}

/**
 * All sizes
 */
export const Sizes: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <PermissionBadge permission="view_document" size="sm" />
        <PermissionBadge permission="view_document" size="md" />
        <PermissionBadge permission="view_document" size="lg" />
      </div>
      <div className="flex items-center gap-2">
        <PermissionBadge permission="read" variant="access-level" size="sm" />
        <PermissionBadge permission="read" variant="access-level" size="md" />
        <PermissionBadge permission="read" variant="access-level" size="lg" />
      </div>
    </div>
  ),
}

/**
 * Permission categories
 */
export const PermissionsByCategory: Story = {
  render: () => {
    const documentPerms = ALL_PERMISSIONS.filter((p) => p.category === 'document')
    const folderPerms = ALL_PERMISSIONS.filter((p) => p.category === 'folder')
    const systemPerms = ALL_PERMISSIONS.filter((p) => p.category === 'system')
    const compliancePerms = ALL_PERMISSIONS.filter((p) => p.category === 'compliance')

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-semibold mb-2">Document Permissions</h3>
          <div className="flex flex-wrap gap-2">
            {documentPerms.map((p) => (
              <PermissionBadge key={p.type} permission={p.type} />
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-2">Folder Permissions</h3>
          <div className="flex flex-wrap gap-2">
            {folderPerms.map((p) => (
              <PermissionBadge key={p.type} permission={p.type} />
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-2">System Permissions</h3>
          <div className="flex flex-wrap gap-2">
            {systemPerms.map((p) => (
              <PermissionBadge key={p.type} permission={p.type} />
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-2">Compliance Permissions</h3>
          <div className="flex flex-wrap gap-2">
            {compliancePerms.map((p) => (
              <PermissionBadge key={p.type} permission={p.type} />
            ))}
          </div>
        </div>
      </div>
    )
  },
}

/**
 * All permission badges
 */
export const AllPermissions: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2 max-w-2xl">
      {ALL_PERMISSIONS.map((p) => (
        <PermissionBadge key={p.type} permission={p.type} />
      ))}
    </div>
  ),
}

/**
 * With and without tooltips
 */
export const Tooltips: Story = {
  render: () => (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-gray-600 mb-2">With tooltip (hover to see description):</p>
        <PermissionBadge permission="edit_document" showTooltip={true} />
      </div>
      <div>
        <p className="text-sm text-gray-600 mb-2">Without tooltip:</p>
        <PermissionBadge permission="edit_document" showTooltip={false} />
      </div>
    </div>
  ),
}

/**
 * Dark mode
 */
export const DarkMode: Story = {
  render: () => (
    <div className="dark bg-gray-900 p-8 rounded-lg">
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <PermissionBadge permission="view_document" />
          <PermissionBadge permission="edit_document" />
          <PermissionBadge permission="delete_document" />
          <PermissionBadge permission="manage_folder" />
        </div>
        <div className="flex gap-2">
          <PermissionBadge permission="read" variant="access-level" />
          <PermissionBadge permission="write" variant="access-level" />
          <PermissionBadge permission="admin" variant="access-level" />
        </div>
      </div>
    </div>
  ),
}

/**
 * In a list context
 */
export const InListContext: Story = {
  render: () => (
    <div className="max-w-md border border-gray-200 rounded-lg divide-y">
      <div className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">John Doe</span>
          <PermissionBadge permission="admin" variant="access-level" size="sm" />
        </div>
        <div className="flex flex-wrap gap-1 mt-2">
          <PermissionBadge permission="view_document" size="sm" />
          <PermissionBadge permission="edit_document" size="sm" />
          <PermissionBadge permission="delete_document" size="sm" />
          <PermissionBadge permission="share_document" size="sm" />
        </div>
      </div>
      <div className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Jane Smith</span>
          <PermissionBadge permission="write" variant="access-level" size="sm" />
        </div>
        <div className="flex flex-wrap gap-1 mt-2">
          <PermissionBadge permission="view_document" size="sm" />
          <PermissionBadge permission="edit_document" size="sm" />
        </div>
      </div>
      <div className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Bob Johnson</span>
          <PermissionBadge permission="read" variant="access-level" size="sm" />
        </div>
        <div className="flex flex-wrap gap-1 mt-2">
          <PermissionBadge permission="view_document" size="sm" />
        </div>
      </div>
    </div>
  ),
}
