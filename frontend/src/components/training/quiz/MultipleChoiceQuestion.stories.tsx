import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { MultipleChoiceQuestion } from './MultipleChoiceQuestion'
import type { VersionOption } from '../types'

const meta: Meta<typeof MultipleChoiceQuestion> = {
  title: 'Training/MultipleChoiceQuestion',
  component: MultipleChoiceQuestion,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof MultipleChoiceQuestion>

const options: VersionOption[] = [
  { id: 'o1', text: 'Passport', order: 1, correct_order: null },
  { id: 'o2', text: "Driver's License", order: 2, correct_order: null },
  { id: 'o3', text: 'Utility Bill', order: 3, correct_order: null },
  { id: 'o4', text: 'Business Card', order: 4, correct_order: null },
]

/**
 * No selection
 */
export const NoSelection: Story = {
  args: {
    options,
    selectedOptionIds: [],
    onSelect: (id) => console.log('selected', id),
  },
}

/**
 * With selection
 */
export const WithSelection: Story = {
  args: {
    options,
    selectedOptionIds: ['o1'],
    onSelect: (id) => console.log('selected', id),
  },
}

/**
 * Interactive
 */
export const Interactive: Story = {
  render: () => {
    const [selected, setSelected] = useState<string[]>([])
    return (
      <div className="max-w-md">
        <p className="text-sm text-gray-500 mb-3">
          Which document is required for identity verification?
        </p>
        <MultipleChoiceQuestion
          options={options}
          selectedOptionIds={selected}
          onSelect={(id) => setSelected([id])}
        />
      </div>
    )
  },
}
