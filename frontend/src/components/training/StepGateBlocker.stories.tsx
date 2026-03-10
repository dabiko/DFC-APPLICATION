import type { Meta, StoryObj } from '@storybook/react-vite'
import { StepGateBlocker } from './StepGateBlocker'
import type { VersionStep } from './types'

const meta: Meta<typeof StepGateBlocker> = {
  title: 'Training/StepGateBlocker',
  component: StepGateBlocker,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof StepGateBlocker>

const baseStep: VersionStep = {
  id: 's1',
  title: 'Step 1',
  description: '',
  order: 1,
  estimated_duration_minutes: 10,
  require_manual_open: false,
  require_media_completion: false,
  require_quiz_pass: false,
  attachments: [],
}

const noop = () => {}

/**
 * Manual open gate — not yet opened
 */
export const ManualOpenPending: Story = {
  args: {
    step: { ...baseStep, require_manual_open: true },
    completion: null,
    actionLoading: false,
    attemptId: 'att-1',
    onMarkManualOpened: noop,
    onMarkMediaCompleted: noop,
    onTakeQuiz: noop,
  },
}

/**
 * Media completion gate — not yet completed
 */
export const MediaCompletionPending: Story = {
  args: {
    step: { ...baseStep, require_media_completion: true },
    completion: null,
    actionLoading: false,
    attemptId: 'att-1',
    onMarkManualOpened: noop,
    onMarkMediaCompleted: noop,
    onTakeQuiz: noop,
  },
}

/**
 * Quiz pass gate — not yet passed
 */
export const QuizPassPending: Story = {
  args: {
    step: { ...baseStep, require_quiz_pass: true },
    completion: null,
    actionLoading: false,
    attemptId: 'att-1',
    onMarkManualOpened: noop,
    onMarkMediaCompleted: noop,
    onTakeQuiz: noop,
  },
}

/**
 * All gates enabled — none completed
 */
export const AllGatesPending: Story = {
  args: {
    step: {
      ...baseStep,
      require_manual_open: true,
      require_media_completion: true,
      require_quiz_pass: true,
    },
    completion: null,
    actionLoading: false,
    attemptId: 'att-1',
    onMarkManualOpened: noop,
    onMarkMediaCompleted: noop,
    onTakeQuiz: noop,
  },
}

/**
 * Loading state (action in progress)
 */
export const Loading: Story = {
  args: {
    step: { ...baseStep, require_manual_open: true },
    completion: null,
    actionLoading: true,
    attemptId: 'att-1',
    onMarkManualOpened: noop,
    onMarkMediaCompleted: noop,
    onTakeQuiz: noop,
  },
}

/**
 * No gates (no blockers shown)
 */
export const NoGates: Story = {
  args: {
    step: baseStep,
    completion: null,
    actionLoading: false,
    attemptId: 'att-1',
    onMarkManualOpened: noop,
    onMarkMediaCompleted: noop,
    onTakeQuiz: noop,
  },
}
