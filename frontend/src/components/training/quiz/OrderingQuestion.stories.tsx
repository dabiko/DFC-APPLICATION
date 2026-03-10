import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { OrderingQuestion } from './OrderingQuestion'
import type { VersionOption } from '../types'

const meta: Meta<typeof OrderingQuestion> = {
  title: 'Training/OrderingQuestion',
  component: OrderingQuestion,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof OrderingQuestion>

const options: VersionOption[] = [
  { id: 'o1', text: 'Collect customer documents', order: 1, correct_order: 1 },
  { id: 'o2', text: 'Verify identity against records', order: 2, correct_order: 2 },
  { id: 'o3', text: 'Perform risk assessment', order: 3, correct_order: 3 },
  { id: 'o4', text: 'Approve or reject application', order: 4, correct_order: 4 },
]

/**
 * Default ordering
 */
export const Default: Story = {
  args: {
    options,
    ordering: ['o1', 'o2', 'o3', 'o4'],
    onReorder: (from, to) => console.log('reorder', from, to),
  },
}

/**
 * Shuffled ordering
 */
export const Shuffled: Story = {
  args: {
    options,
    ordering: ['o3', 'o1', 'o4', 'o2'],
    onReorder: (from, to) => console.log('reorder', from, to),
  },
}

/**
 * Interactive
 */
export const Interactive: Story = {
  render: () => {
    const [ordering, setOrdering] = useState(['o3', 'o1', 'o4', 'o2'])
    const handleReorder = (fromIndex: number, toIndex: number) => {
      const newOrder = [...ordering]
      const [moved] = newOrder.splice(fromIndex, 1)
      newOrder.splice(toIndex, 0, moved)
      setOrdering(newOrder)
    }
    return (
      <div className="max-w-md">
        <p className="text-sm text-gray-500 mb-3">Arrange the KYC steps in the correct order:</p>
        <OrderingQuestion options={options} ordering={ordering} onReorder={handleReorder} />
      </div>
    )
  },
}
