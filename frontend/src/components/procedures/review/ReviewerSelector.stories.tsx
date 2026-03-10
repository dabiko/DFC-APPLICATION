import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { ReviewerSelector } from './ReviewerSelector'

const meta: Meta<typeof ReviewerSelector> = {
  title: 'Procedures/ReviewerSelector',
  component: ReviewerSelector,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof ReviewerSelector>

/**
 * No reviewers selected
 */
export const Empty: Story = {
  args: {
    selected: [],
    onChange: (ids) => console.log('changed', ids),
  },
}

/**
 * With pre-selected reviewers
 */
export const WithSelected: Story = {
  args: {
    selected: ['user-1', 'user-2'],
    onChange: (ids) => console.log('changed', ids),
  },
}

/**
 * Interactive selector
 */
export const Interactive: Story = {
  render: () => {
    const [selected, setSelected] = useState<string[]>([])
    return (
      <div className="max-w-md space-y-3">
        <ReviewerSelector selected={selected} onChange={setSelected} />
        <p className="text-xs text-gray-500">
          Selected: {selected.length === 0 ? 'none' : selected.join(', ')}
        </p>
      </div>
    )
  },
}
