import type { Meta, StoryObj } from '@storybook/react-vite'
import { AttemptTimeline } from './AttemptTimeline'

const meta: Meta<typeof AttemptTimeline> = {
  title: 'Evidence/AttemptTimeline',
  component: AttemptTimeline,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof AttemptTimeline>

/**
 * Passed attempt with steps and quizzes
 */
export const PassedAttempt: Story = {
  args: {
    attempt: {
      id: 'att-1',
      status: 'passed',
      score: 92,
      started_at: '2026-03-10T09:00:00Z',
      completed_at: '2026-03-10T10:30:00Z',
      step_completions: [
        {
          step_title: 'Verify Customer Identity',
          status: 'completed',
          started_at: '2026-03-10T09:00:00Z',
          completed_at: '2026-03-10T09:15:00Z',
        },
        {
          step_title: 'Document Review',
          status: 'completed',
          started_at: '2026-03-10T09:15:00Z',
          completed_at: '2026-03-10T09:45:00Z',
        },
        {
          step_title: 'Risk Assessment',
          status: 'completed',
          started_at: '2026-03-10T09:45:00Z',
          completed_at: '2026-03-10T10:00:00Z',
        },
      ],
      quiz_attempts: [
        {
          quiz_title: 'KYC Knowledge Check',
          score: 92,
          passed: true,
          started_at: '2026-03-10T10:00:00Z',
          completed_at: '2026-03-10T10:20:00Z',
        },
      ],
    },
    index: 0,
  },
}

/**
 * Failed attempt
 */
export const FailedAttempt: Story = {
  args: {
    attempt: {
      id: 'att-2',
      status: 'failed',
      score: 45,
      started_at: '2026-03-08T09:00:00Z',
      completed_at: '2026-03-08T10:00:00Z',
      step_completions: [
        {
          step_title: 'AML Overview',
          status: 'completed',
          started_at: '2026-03-08T09:00:00Z',
          completed_at: '2026-03-08T09:20:00Z',
        },
        {
          step_title: 'Transaction Monitoring',
          status: 'completed',
          started_at: '2026-03-08T09:20:00Z',
          completed_at: '2026-03-08T09:40:00Z',
        },
      ],
      quiz_attempts: [
        {
          quiz_title: 'AML Assessment',
          score: 45,
          passed: false,
          started_at: '2026-03-08T09:40:00Z',
          completed_at: '2026-03-08T10:00:00Z',
        },
      ],
    },
    index: 0,
  },
}

/**
 * In-progress attempt (no completion time)
 */
export const InProgress: Story = {
  args: {
    attempt: {
      id: 'att-3',
      status: 'in_progress',
      score: null,
      started_at: '2026-03-10T14:00:00Z',
      completed_at: null,
      step_completions: [
        {
          step_title: 'Introduction',
          status: 'completed',
          started_at: '2026-03-10T14:00:00Z',
          completed_at: '2026-03-10T14:10:00Z',
        },
        {
          step_title: 'Core Content',
          status: 'started',
          started_at: '2026-03-10T14:10:00Z',
          completed_at: null,
        },
      ],
      quiz_attempts: [],
    },
    index: 0,
  },
}

/**
 * Empty attempt (no steps or quizzes)
 */
export const EmptyAttempt: Story = {
  args: {
    attempt: {
      id: 'att-4',
      status: 'in_progress',
      score: null,
      started_at: '2026-03-10T15:00:00Z',
      completed_at: null,
      step_completions: [],
      quiz_attempts: [],
    },
    index: 0,
  },
}

/**
 * Multi-attempt timeline
 */
export const MultipleAttempts: Story = {
  render: () => (
    <div className="space-y-3 max-w-2xl">
      <AttemptTimeline
        attempt={{
          id: 'att-a',
          status: 'failed',
          score: 50,
          started_at: '2026-03-05T09:00:00Z',
          completed_at: '2026-03-05T10:00:00Z',
          step_completions: [
            {
              step_title: 'Step 1',
              status: 'completed',
              started_at: '2026-03-05T09:00:00Z',
              completed_at: '2026-03-05T09:30:00Z',
            },
          ],
          quiz_attempts: [
            {
              quiz_title: 'Quiz 1',
              score: 50,
              passed: false,
              started_at: '2026-03-05T09:30:00Z',
              completed_at: '2026-03-05T10:00:00Z',
            },
          ],
        }}
        index={0}
      />
      <AttemptTimeline
        attempt={{
          id: 'att-b',
          status: 'passed',
          score: 85,
          started_at: '2026-03-07T09:00:00Z',
          completed_at: '2026-03-07T10:00:00Z',
          step_completions: [
            {
              step_title: 'Step 1',
              status: 'completed',
              started_at: '2026-03-07T09:00:00Z',
              completed_at: '2026-03-07T09:30:00Z',
            },
          ],
          quiz_attempts: [
            {
              quiz_title: 'Quiz 1',
              score: 85,
              passed: true,
              started_at: '2026-03-07T09:30:00Z',
              completed_at: '2026-03-07T10:00:00Z',
            },
          ],
        }}
        index={1}
      />
    </div>
  ),
}
