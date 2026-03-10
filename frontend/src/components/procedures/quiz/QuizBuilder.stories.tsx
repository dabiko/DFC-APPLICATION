import type { Meta, StoryObj } from '@storybook/react-vite'
import { QuizBuilder } from './QuizBuilder'
import type { Quiz } from '@/types/procedure'

const meta: Meta<typeof QuizBuilder> = {
  title: 'Procedures/QuizBuilder',
  component: QuizBuilder,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof QuizBuilder>

/**
 * New quiz — blank form
 */
export const NewQuiz: Story = {
  args: {
    quiz: null,
    procedureId: 'proc-1',
    stepId: 'step-1',
    onSave: async (data) => console.log('save', data),
    onCancel: () => console.log('cancel'),
  },
}

/**
 * Editing existing quiz with multiple choice questions
 */
export const ExistingQuiz: Story = {
  args: {
    quiz: {
      id: 'quiz-1',
      procedure: 'proc-1',
      step: 'step-1',
      quiz_type: 'step_level',
      title: 'KYC Knowledge Check',
      description: 'Test your understanding of KYC procedures.',
      passing_score_percent: 80,
      max_attempts: 3,
      time_limit_minutes: 15,
      shuffle_questions: true,
      shuffle_answers: true,
      show_correct_answers_after: true,
      questions: [
        {
          id: 'q1',
          quiz: 'quiz-1',
          question_type: 'multiple_choice',
          text: 'Which document is required for identity verification?',
          explanation: 'A government-issued photo ID is always required.',
          order: 1,
          points: 10,
          is_mandatory: true,
          auto_grade_keywords: null,
          options: [
            {
              id: 'o1',
              question: 'q1',
              text: 'Passport',
              is_correct: true,
              correct_order: null,
              order: 1,
            },
            {
              id: 'o2',
              question: 'q1',
              text: 'Utility bill',
              is_correct: false,
              correct_order: null,
              order: 2,
            },
            {
              id: 'o3',
              question: 'q1',
              text: 'Business card',
              is_correct: false,
              correct_order: null,
              order: 3,
            },
          ],
        },
        {
          id: 'q2',
          quiz: 'quiz-1',
          question_type: 'true_false',
          text: 'KYC checks are only required for new customers.',
          explanation: 'KYC must be performed periodically for existing customers too.',
          order: 2,
          points: 5,
          is_mandatory: true,
          auto_grade_keywords: null,
          options: [
            {
              id: 'o4',
              question: 'q2',
              text: 'True',
              is_correct: false,
              correct_order: null,
              order: 1,
            },
            {
              id: 'o5',
              question: 'q2',
              text: 'False',
              is_correct: true,
              correct_order: null,
              order: 2,
            },
          ],
        },
      ],
    } as Quiz,
    procedureId: 'proc-1',
    stepId: 'step-1',
    onSave: async (data) => console.log('save', data),
    onCancel: () => console.log('cancel'),
  },
}

/**
 * End-of-procedure quiz (no step)
 */
export const EndOfProcedureQuiz: Story = {
  args: {
    quiz: {
      id: 'quiz-2',
      quiz_type: 'end_of_procedure',
      title: 'Final Assessment',
      description: 'Comprehensive test covering all procedure steps.',
      passing_score_percent: 70,
      max_attempts: 2,
      time_limit_minutes: 30,
      shuffle_questions: false,
      shuffle_answers: false,
      show_correct_answers_after: false,
      questions: [],
    },
    procedureId: 'proc-1',
    stepId: null,
    onSave: async (data) => console.log('save', data),
    onCancel: () => console.log('cancel'),
  },
}
