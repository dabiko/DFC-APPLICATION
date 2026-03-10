import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { MultiSelectQuestion } from './MultiSelectQuestion'
import type { VersionOption } from '../types'

const meta: Meta<typeof MultiSelectQuestion> = {
  title: 'Training/MultiSelectQuestion',
  component: MultiSelectQuestion,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof MultiSelectQuestion>

const options: VersionOption[] = [
  { id: 'o1', text: 'Passport', order: 1, correct_order: null },
  { id: 'o2', text: "Driver's License", order: 2, correct_order: null },
  { id: 'o3', text: 'National ID Card', order: 3, correct_order: null },
  { id: 'o4', text: 'Business Card', order: 4, correct_order: null },
]

/**
 * No selections
 */
export const NoSelections: Story = {
  args: {
    options,
    selectedOptionIds: [],
    onToggle: (id) => console.log('toggled', id),
  },
}

/**
 * With multiple selections
 */
export const WithSelections: Story = {
  args: {
    options,
    selectedOptionIds: ['o1', 'o3'],
    onToggle: (id) => console.log('toggled', id),
  },
}

/**
 * Interactive
 */
export const Interactive: Story = {
  render: () => {
    const [selected, setSelected] = useState<string[]>([])
    const toggle = (id: string) => {
      setSelected((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]))
    }
    return (
      <div className="max-w-md">
        <p className="text-sm text-gray-500 mb-3">Select all valid ID documents:</p>
        <MultiSelectQuestion options={options} selectedOptionIds={selected} onToggle={toggle} />
      </div>
    )
  },
}
