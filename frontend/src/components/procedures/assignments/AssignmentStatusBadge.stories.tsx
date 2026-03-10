import type { Meta, StoryObj } from '@storybook/react-vite'
import { AssignmentStatusBadge } from './AssignmentStatusBadge'

const meta: Meta<typeof AssignmentStatusBadge> = {
  title: 'Assignments/AssignmentStatusBadge',
  component: AssignmentStatusBadge,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof AssignmentStatusBadge>

export const Assigned: Story = { args: { status: 'assigned' } }
export const InProgress: Story = { args: { status: 'in_progress' } }
export const Completed: Story = { args: { status: 'completed' } }
export const Failed: Story = { args: { status: 'failed' } }
export const Overdue: Story = { args: { status: 'overdue' } }
export const Waived: Story = { args: { status: 'waived' } }

/**
 * All statuses
 */
export const AllStatuses: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      {['assigned', 'in_progress', 'completed', 'failed', 'overdue', 'waived'].map((status) => (
        <AssignmentStatusBadge key={status} status={status} />
      ))}
    </div>
  ),
}
