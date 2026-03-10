import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { BranchConditionEditor } from './BranchConditionEditor'
import type { BranchCondition } from '@/types/procedure'

const meta: Meta<typeof BranchConditionEditor> = {
  title: 'Procedures/BranchConditionEditor',
  component: BranchConditionEditor,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof BranchConditionEditor>

/**
 * Empty — no condition set
 */
export const Empty: Story = {
  args: {
    value: null,
    onChange: (v) => console.log('changed', v),
  },
}

/**
 * Simple leaf condition
 */
export const SimpleCondition: Story = {
  args: {
    value: { field: 'step_completed', operator: 'equals', value: true, step_id: 'step-1' },
    onChange: (v) => console.log('changed', v),
  },
}

/**
 * Compound AND condition
 */
export const CompoundAnd: Story = {
  args: {
    value: {
      all: [
        { field: 'step_completed', operator: 'equals', value: true, step_id: 'step-1' },
        { field: 'quiz_score', operator: 'gte', value: 80, quiz_id: 'quiz-1' },
      ],
    },
    onChange: (v) => console.log('changed', v),
  },
}

/**
 * Nested condition
 */
export const NestedCondition: Story = {
  args: {
    value: {
      all: [
        {
          any: [
            { field: 'step_completed', operator: 'equals', value: true, step_id: 'step-1' },
            { field: 'step_completed', operator: 'equals', value: true, step_id: 'step-2' },
          ],
        },
        { field: 'quiz_score', operator: 'gte', value: 70, quiz_id: 'quiz-1' },
      ],
    },
    onChange: (v) => console.log('changed', v),
  },
}

/**
 * Interactive editor
 */
export const Interactive: Story = {
  render: () => {
    const [value, setValue] = useState<BranchCondition | null>(null)
    return (
      <div className="space-y-4">
        <BranchConditionEditor value={value} onChange={setValue} />
        <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-3 rounded-lg overflow-auto">
          {JSON.stringify(value, null, 2)}
        </pre>
      </div>
    )
  },
}
