import type { Meta, StoryObj } from '@storybook/react-vite'
import { QuestionPreview } from './QuestionPreview'
import type { Question } from '@/types/procedure'

const meta: Meta<typeof QuestionPreview> = {
  title: 'Procedures/QuestionPreview',
  component: QuestionPreview,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof QuestionPreview>

const baseQuestion: Question = {
  id: 'q1',
  quiz: 'quiz-1',
  question_type: 'multiple_choice',
  text: 'What is the primary purpose of KYC?',
  explanation: 'KYC helps prevent financial fraud and money laundering.',
  order: 1,
  points: 10,
  is_mandatory: true,
  auto_grade_keywords: null,
  options: [
    {
      id: 'o1',
      question: 'q1',
      text: 'Prevent fraud',
      is_correct: true,
      correct_order: null,
      order: 1,
    },
    {
      id: 'o2',
      question: 'q1',
      text: 'Increase sales',
      is_correct: false,
      correct_order: null,
      order: 2,
    },
    {
      id: 'o3',
      question: 'q1',
      text: 'Reduce costs',
      is_correct: false,
      correct_order: null,
      order: 3,
    },
  ],
}

/**
 * Multiple choice question
 */
export const MultipleChoice: Story = {
  args: { question: baseQuestion, index: 0 },
}

/**
 * True/False question
 */
export const TrueFalse: Story = {
  args: {
    question: {
      ...baseQuestion,
      id: 'q2',
      question_type: 'true_false',
      text: 'AML regulations apply only to banks.',
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
    index: 1,
  },
}

/**
 * Multi-select question
 */
export const MultiSelect: Story = {
  args: {
    question: {
      ...baseQuestion,
      id: 'q3',
      question_type: 'multi_select',
      text: 'Which of the following are valid ID documents? (Select all that apply)',
      options: [
        {
          id: 'o6',
          question: 'q3',
          text: 'Passport',
          is_correct: true,
          correct_order: null,
          order: 1,
        },
        {
          id: 'o7',
          question: 'q3',
          text: "Driver's license",
          is_correct: true,
          correct_order: null,
          order: 2,
        },
        {
          id: 'o8',
          question: 'q3',
          text: 'Business card',
          is_correct: false,
          correct_order: null,
          order: 3,
        },
        {
          id: 'o9',
          question: 'q3',
          text: 'National ID card',
          is_correct: true,
          correct_order: null,
          order: 4,
        },
      ],
    },
    index: 2,
  },
}

/**
 * Short answer question
 */
export const ShortAnswer: Story = {
  args: {
    question: {
      ...baseQuestion,
      id: 'q4',
      question_type: 'short_answer',
      text: 'Explain the difference between CDD and EDD.',
      options: [],
      auto_grade_keywords: ['customer', 'due', 'diligence', 'enhanced'],
    },
    index: 3,
  },
}

/**
 * Ordering question
 */
export const Ordering: Story = {
  args: {
    question: {
      ...baseQuestion,
      id: 'q5',
      question_type: 'ordering',
      text: 'Arrange the KYC steps in correct order:',
      options: [
        {
          id: 'o10',
          question: 'q5',
          text: 'Collect documents',
          is_correct: false,
          correct_order: 1,
          order: 1,
        },
        {
          id: 'o11',
          question: 'q5',
          text: 'Verify identity',
          is_correct: false,
          correct_order: 2,
          order: 2,
        },
        {
          id: 'o12',
          question: 'q5',
          text: 'Risk assessment',
          is_correct: false,
          correct_order: 3,
          order: 3,
        },
        {
          id: 'o13',
          question: 'q5',
          text: 'Approve account',
          is_correct: false,
          correct_order: 4,
          order: 4,
        },
      ],
    },
    index: 4,
  },
}

/**
 * All question types together
 */
export const AllTypes: Story = {
  render: () => (
    <div className="space-y-4 max-w-2xl">
      <QuestionPreview question={baseQuestion} index={0} />
      <QuestionPreview
        question={{
          ...baseQuestion,
          id: 'q-tf',
          question_type: 'true_false',
          text: 'KYC is mandatory for all customers.',
          options: [
            {
              id: 'tf1',
              question: 'q-tf',
              text: 'True',
              is_correct: true,
              correct_order: null,
              order: 1,
            },
            {
              id: 'tf2',
              question: 'q-tf',
              text: 'False',
              is_correct: false,
              correct_order: null,
              order: 2,
            },
          ],
        }}
        index={1}
      />
      <QuestionPreview
        question={{
          ...baseQuestion,
          id: 'q-sa',
          question_type: 'short_answer',
          text: 'Describe the KYC process.',
          options: [],
        }}
        index={2}
      />
    </div>
  ),
}
