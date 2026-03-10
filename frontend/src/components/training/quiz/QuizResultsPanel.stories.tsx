import type { Meta, StoryObj } from '@storybook/react-vite'
import { QuizResultsPanel } from './QuizResultsPanel'
import type { VersionQuiz } from '../types'
import type { QuizAttemptResponse } from '@/services/trainingService'

const meta: Meta<typeof QuizResultsPanel> = {
  title: 'Training/QuizResultsPanel',
  component: QuizResultsPanel,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof QuizResultsPanel>

const sampleQuiz: VersionQuiz = {
  id: 'quiz-1',
  title: 'KYC Knowledge Check',
  description: 'Test your understanding of KYC procedures.',
  quiz_type: 'step_level',
  passing_score_percent: 70,
  max_attempts: 3,
  time_limit_minutes: 15,
  shuffle_questions: false,
  shuffle_answers: false,
  show_correct_answers_after: true,
  questions: [
    {
      id: 'q1',
      question_type: 'multiple_choice',
      text: 'Which document is required for identity verification?',
      explanation: 'A government-issued photo ID is always required.',
      order: 1,
      points: 10,
      is_mandatory: true,
      options: [
        { id: 'o1', text: 'Passport', order: 1, correct_order: null },
        { id: 'o2', text: 'Utility Bill', order: 2, correct_order: null },
        { id: 'o3', text: 'Business Card', order: 3, correct_order: null },
      ],
    },
    {
      id: 'q2',
      question_type: 'true_false',
      text: 'KYC checks are only required for new customers.',
      explanation: 'KYC must be performed periodically for existing customers too.',
      order: 2,
      points: 5,
      is_mandatory: true,
      options: [
        { id: 'o4', text: 'True', order: 1, correct_order: null },
        { id: 'o5', text: 'False', order: 2, correct_order: null },
      ],
    },
  ],
}

/**
 * Passed result
 */
export const Passed: Story = {
  args: {
    quiz: sampleQuiz,
    quizAttempt: {
      id: 'qa-1',
      version_quiz: 'quiz-1',
      score: 90,
      passed: true,
      started_at: '2026-03-10T09:00:00Z',
      completed_at: '2026-03-10T09:15:00Z',
      responses: [
        {
          id: 'r1',
          version_question: 'q1',
          selected_option_ids: ['o1'],
          text_answer: '',
          ordering_answer: [],
          is_correct: true,
          points_awarded: 10,
        },
        {
          id: 'r2',
          version_question: 'q2',
          selected_option_ids: ['o5'],
          text_answer: '',
          ordering_answer: [],
          is_correct: true,
          points_awarded: 5,
        },
      ],
    },
    onBack: () => console.log('back'),
  },
}

/**
 * Failed result
 */
export const Failed: Story = {
  args: {
    quiz: sampleQuiz,
    quizAttempt: {
      id: 'qa-2',
      version_quiz: 'quiz-1',
      score: 40,
      passed: false,
      started_at: '2026-03-10T09:00:00Z',
      completed_at: '2026-03-10T09:12:00Z',
      responses: [
        {
          id: 'r1',
          version_question: 'q1',
          selected_option_ids: ['o2'],
          text_answer: '',
          ordering_answer: [],
          is_correct: false,
          points_awarded: 0,
        },
        {
          id: 'r2',
          version_question: 'q2',
          selected_option_ids: ['o4'],
          text_answer: '',
          ordering_answer: [],
          is_correct: false,
          points_awarded: 0,
        },
      ],
    },
    onBack: () => console.log('back'),
  },
}

/**
 * Borderline pass
 */
export const BorderlinePass: Story = {
  args: {
    quiz: sampleQuiz,
    quizAttempt: {
      id: 'qa-3',
      version_quiz: 'quiz-1',
      score: 70,
      passed: true,
      started_at: '2026-03-10T09:00:00Z',
      completed_at: '2026-03-10T09:14:00Z',
      responses: [
        {
          id: 'r1',
          version_question: 'q1',
          selected_option_ids: ['o1'],
          text_answer: '',
          ordering_answer: [],
          is_correct: true,
          points_awarded: 10,
        },
        {
          id: 'r2',
          version_question: 'q2',
          selected_option_ids: ['o4'],
          text_answer: '',
          ordering_answer: [],
          is_correct: false,
          points_awarded: 0,
        },
      ],
    },
    onBack: () => console.log('back'),
  },
}
