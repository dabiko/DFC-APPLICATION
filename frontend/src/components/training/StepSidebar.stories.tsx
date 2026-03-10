import type { Meta, StoryObj } from '@storybook/react-vite'
import { StepSidebar } from './StepSidebar'
import type { VersionStep } from './types'
import type { StepCompletionResponse } from '@/services/trainingService'

const meta: Meta<typeof StepSidebar> = {
  title: 'Training/StepSidebar',
  component: StepSidebar,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof StepSidebar>

const sampleSteps: VersionStep[] = [
  {
    id: 's1',
    title: 'Introduction',
    description: '',
    order: 1,
    estimated_duration_minutes: 5,
    require_manual_open: false,
    require_media_completion: false,
    require_quiz_pass: false,
    attachments: [],
  },
  {
    id: 's2',
    title: 'Core Concepts',
    description: '',
    order: 2,
    estimated_duration_minutes: 15,
    require_manual_open: true,
    require_media_completion: false,
    require_quiz_pass: false,
    attachments: [],
  },
  {
    id: 's3',
    title: 'Practical Exercise',
    description: '',
    order: 3,
    estimated_duration_minutes: 20,
    require_manual_open: false,
    require_media_completion: true,
    require_quiz_pass: false,
    attachments: [],
  },
  {
    id: 's4',
    title: 'Knowledge Check',
    description: '',
    order: 4,
    estimated_duration_minutes: 10,
    require_manual_open: false,
    require_media_completion: false,
    require_quiz_pass: true,
    attachments: [],
  },
  {
    id: 's5',
    title: 'Summary',
    description: '',
    order: 5,
    estimated_duration_minutes: 5,
    require_manual_open: false,
    require_media_completion: false,
    require_quiz_pass: false,
    attachments: [],
  },
]

const completions: Record<string, StepCompletionResponse> = {
  s1: {
    id: 'sc1',
    training_attempt: 'att-1',
    version_step: 's1',
    status: 'completed',
    started_at: '',
    completed_at: '2026-03-10T09:10:00Z',
  },
  s2: {
    id: 'sc2',
    training_attempt: 'att-1',
    version_step: 's2',
    status: 'completed',
    started_at: '',
    completed_at: '2026-03-10T09:30:00Z',
  },
}

/**
 * Mid-progress: 2 of 5 steps completed, on step 3
 */
export const MidProgress: Story = {
  args: {
    steps: sampleSteps,
    currentStepIndex: 2,
    getStepCompletion: (stepId: string) => completions[stepId],
    onNavigate: (idx) => console.log('navigate', idx),
  },
}

/**
 * All completed, viewing last step
 */
export const AllCompleted: Story = {
  args: {
    steps: sampleSteps,
    currentStepIndex: 4,
    getStepCompletion: (stepId: string) => ({
      id: `sc-${stepId}`,
      training_attempt: 'att-1',
      version_step: stepId,
      status: 'completed',
      started_at: '',
      completed_at: '2026-03-10T10:00:00Z',
    }),
    onNavigate: (idx) => console.log('navigate', idx),
  },
}

/**
 * Just started, on first step
 */
export const JustStarted: Story = {
  args: {
    steps: sampleSteps,
    currentStepIndex: 0,
    getStepCompletion: () => undefined,
    onNavigate: (idx) => console.log('navigate', idx),
  },
}
