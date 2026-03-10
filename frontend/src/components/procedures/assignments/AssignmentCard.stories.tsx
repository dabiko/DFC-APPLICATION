import type { Meta, StoryObj } from '@storybook/react-vite'
import { AssignmentCard } from './AssignmentCard'
import type { ProcedureAssignment } from '@/services/assignmentService'

const meta: Meta<typeof AssignmentCard> = {
  title: 'Assignments/AssignmentCard',
  component: AssignmentCard,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof AssignmentCard>

const baseAssignment: ProcedureAssignment = {
  id: 'a1',
  procedure: 'proc-1',
  procedure_title: 'KYC Customer Onboarding',
  version: 'v1',
  version_number: 2,
  assigned_to: 'user-1',
  assigned_to_name: 'Alice Johnson',
  assigned_by: 'user-2',
  assigned_by_name: 'Bob Smith',
  status: 'assigned',
  due_date: '2026-04-01T00:00:00Z',
  completed_at: null,
  waived_at: null,
  waived_by: null,
  waiver_reason: '',
  source: 'manual',
  created_at: '2026-03-01T10:00:00Z',
}

/**
 * Assigned status
 */
export const Assigned: Story = {
  args: {
    assignment: baseAssignment,
    onWaive: (id) => console.log('waive', id),
  },
}

/**
 * In progress
 */
export const InProgress: Story = {
  args: {
    assignment: { ...baseAssignment, status: 'in_progress' },
    onWaive: (id) => console.log('waive', id),
  },
}

/**
 * Completed
 */
export const Completed: Story = {
  args: {
    assignment: {
      ...baseAssignment,
      status: 'completed',
      completed_at: '2026-03-20T14:00:00Z',
    },
  },
}

/**
 * Failed
 */
export const Failed: Story = {
  args: {
    assignment: { ...baseAssignment, status: 'failed' },
  },
}

/**
 * Overdue
 */
export const Overdue: Story = {
  args: {
    assignment: {
      ...baseAssignment,
      status: 'overdue',
      due_date: '2026-02-15T00:00:00Z',
    },
    onWaive: (id) => console.log('waive', id),
  },
}

/**
 * Waived
 */
export const Waived: Story = {
  args: {
    assignment: {
      ...baseAssignment,
      status: 'waived',
      waived_at: '2026-03-10T09:00:00Z',
      waived_by: 'user-3',
      waiver_reason: 'Employee transferred to different department.',
    },
  },
}

/**
 * All statuses
 */
export const AllStatuses: Story = {
  render: () => (
    <div className="space-y-3 w-96">
      {(['assigned', 'in_progress', 'completed', 'failed', 'overdue', 'waived'] as const).map(
        (status) => (
          <AssignmentCard
            key={status}
            assignment={{ ...baseAssignment, status }}
            onWaive={(id) => console.log('waive', id)}
          />
        )
      )}
    </div>
  ),
}
