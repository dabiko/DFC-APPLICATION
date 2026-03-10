import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { TrueFalseQuestion } from './TrueFalseQuestion'
import type { VersionOption } from '../types'

const meta: Meta<typeof TrueFalseQuestion> = {
  title: 'Training/TrueFalseQuestion',
  component: TrueFalseQuestion,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof TrueFalseQuestion>

const options: VersionOption[] = [
  { id: 'true-opt', text: 'True', order: 1, correct_order: null },
  { id: 'false-opt', text: 'False', order: 2, correct_order: null },
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
 * True selected
 */
export const TrueSelected: Story = {
  args: {
    options,
    selectedOptionIds: ['true-opt'],
    onSelect: (id) => console.log('selected', id),
  },
}

/**
 * False selected
 */
export const FalseSelected: Story = {
  args: {
    options,
    selectedOptionIds: ['false-opt'],
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
          KYC is mandatory for all financial institutions.
        </p>
        <TrueFalseQuestion
          options={options}
          selectedOptionIds={selected}
          onSelect={(id) => setSelected([id])}
        />
      </div>
    )
  },
}
