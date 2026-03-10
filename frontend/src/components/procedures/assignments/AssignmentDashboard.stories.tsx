import type { Meta, StoryObj } from '@storybook/react-vite'
import { AssignmentDashboard } from './AssignmentDashboard'
import type { AssignmentDashboard as DashboardData } from '@/services/assignmentService'

const meta: Meta<typeof AssignmentDashboard> = {
  title: 'Assignments/AssignmentDashboard',
  component: AssignmentDashboard,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof AssignmentDashboard>

/**
 * Healthy metrics — high completion rate
 */
export const Healthy: Story = {
  args: {
    dashboard: {
      total: 150,
      assigned: 10,
      in_progress: 15,
      completed: 110,
      failed: 5,
      overdue: 3,
      waived: 7,
      completion_rate: 73.3,
      average_score: 87.5,
    },
  },
}

/**
 * Low completion rate
 */
export const LowCompletion: Story = {
  args: {
    dashboard: {
      total: 80,
      assigned: 30,
      in_progress: 20,
      completed: 15,
      failed: 10,
      overdue: 5,
      waived: 0,
      completion_rate: 18.75,
      average_score: 62.0,
    },
  },
}

/**
 * Empty state — no assignments yet
 */
export const Empty: Story = {
  args: {
    dashboard: {
      total: 0,
      assigned: 0,
      in_progress: 0,
      completed: 0,
      failed: 0,
      overdue: 0,
      waived: 0,
      completion_rate: 0,
      average_score: null,
    },
  },
}

/**
 * 100% completion
 */
export const FullCompletion: Story = {
  args: {
    dashboard: {
      total: 50,
      assigned: 0,
      in_progress: 0,
      completed: 50,
      failed: 0,
      overdue: 0,
      waived: 0,
      completion_rate: 100,
      average_score: 92.4,
    },
  },
}
