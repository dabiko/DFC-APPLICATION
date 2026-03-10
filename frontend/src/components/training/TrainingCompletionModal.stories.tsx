import type { Meta, StoryObj } from '@storybook/react-vite'
import { TrainingCompletionModal } from './TrainingCompletionModal'

const meta: Meta<typeof TrainingCompletionModal> = {
  title: 'Training/TrainingCompletionModal',
  component: TrainingCompletionModal,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof TrainingCompletionModal>

/**
 * Passed with high score
 */
export const Passed: Story = {
  args: {
    isOpen: true,
    passed: true,
    score: 92,
    onClose: () => console.log('close'),
    onBackToTraining: () => console.log('back'),
  },
}

/**
 * Failed with low score
 */
export const Failed: Story = {
  args: {
    isOpen: true,
    passed: false,
    score: 45,
    onClose: () => console.log('close'),
    onBackToTraining: () => console.log('back'),
  },
}

/**
 * Passed with no score (non-quiz completion)
 */
export const PassedNoScore: Story = {
  args: {
    isOpen: true,
    passed: true,
    score: null,
    onClose: () => console.log('close'),
    onBackToTraining: () => console.log('back'),
  },
}

/**
 * Closed state (renders nothing)
 */
export const Closed: Story = {
  args: {
    isOpen: false,
    passed: true,
    score: 90,
    onClose: () => {},
    onBackToTraining: () => {},
  },
}
