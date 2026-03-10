import type { Meta, StoryObj } from '@storybook/react-vite'
import { OverdueAlertList } from './OverdueAlertList'
import type { ProcedureAssignment } from '@/services/assignmentService'

const meta: Meta<typeof OverdueAlertList> = {
  title: 'Assignments/OverdueAlertList',
  component: OverdueAlertList,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof OverdueAlertList>

const makeAssignment = (
  id: string,
  name: string,
  procedure: string,
  dueDate: string
): ProcedureAssignment => ({
  id,
  procedure: 'proc-1',
  procedure_title: procedure,
  version: 'v1',
  version_number: 1,
  assigned_to: `user-${id}`,
  assigned_to_name: name,
  assigned_by: 'user-admin',
  assigned_by_name: 'Admin',
  status: 'overdue',
  due_date: dueDate,
  completed_at: null,
  waived_at: null,
  waived_by: null,
  waiver_reason: '',
  source: 'manual',
  created_at: '2026-01-01T10:00:00Z',
})

/**
 * With overdue items
 */
export const WithOverdue: Story = {
  args: {
    assignments: [
      makeAssignment('1', 'Alice Johnson', 'KYC Onboarding', '2026-02-15T00:00:00Z'),
      makeAssignment('2', 'Bob Smith', 'AML Compliance', '2026-02-20T00:00:00Z'),
      makeAssignment('3', 'Carol White', 'Risk Assessment', '2026-03-01T00:00:00Z'),
    ],
  },
}

/**
 * More than 5 overdue (shows "+N more" text)
 */
export const MoreThanFive: Story = {
  args: {
    assignments: Array.from({ length: 8 }, (_, i) =>
      makeAssignment(
        `${i + 1}`,
        `User ${i + 1}`,
        `Procedure ${i + 1}`,
        `2026-02-${10 + i}T00:00:00Z`
      )
    ),
  },
}

/**
 * No overdue (renders nothing)
 */
export const NoOverdue: Story = {
  args: {
    assignments: [
      {
        ...makeAssignment('1', 'Alice', 'KYC', '2026-04-01T00:00:00Z'),
        status: 'assigned' as const,
      },
    ],
  },
}
