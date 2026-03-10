import type { Meta, StoryObj } from '@storybook/react-vite'
import { QuizPlayer } from './QuizPlayer'

const meta: Meta<typeof QuizPlayer> = {
  title: 'Training/QuizPlayer',
  component: QuizPlayer,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof QuizPlayer>

/**
 * Active quiz session (requires API — shown as loading in Storybook)
 */
export const Default: Story = {
  args: {
    attemptId: 'att-sample-1',
    quizId: 'quiz-sample-1',
  },
}
