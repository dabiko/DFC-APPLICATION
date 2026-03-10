import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { ShortAnswerQuestion } from './ShortAnswerQuestion'

const meta: Meta<typeof ShortAnswerQuestion> = {
  title: 'Training/ShortAnswerQuestion',
  component: ShortAnswerQuestion,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof ShortAnswerQuestion>

/**
 * Empty
 */
export const Empty: Story = {
  args: {
    value: '',
    onChange: (v) => console.log('changed', v),
  },
}

/**
 * With answer
 */
export const WithAnswer: Story = {
  args: {
    value:
      'Customer Due Diligence (CDD) is a standard process, while Enhanced Due Diligence (EDD) applies to higher-risk customers and involves more thorough investigation.',
    onChange: (v) => console.log('changed', v),
  },
}

/**
 * Interactive
 */
export const Interactive: Story = {
  render: () => {
    const [value, setValue] = useState('')
    return (
      <div className="max-w-md">
        <p className="text-sm text-gray-500 mb-3">Explain the difference between CDD and EDD.</p>
        <ShortAnswerQuestion value={value} onChange={setValue} />
        <p className="text-xs text-gray-400 mt-2">{value.length} characters</p>
      </div>
    )
  },
}
