/**
 * TagInput Storybook Stories
 */

import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { TagInput } from './TagInput'

const meta: Meta<typeof TagInput> = {
  title: 'Components/Input/TagInput',
  component: TagInput,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof TagInput>

// Wrapper component to handle state
const TagInputWrapper = (args: any) => {
  const [tags, setTags] = useState<string[]>(args.value || [])

  return (
    <div className="max-w-2xl">
      <TagInput {...args} value={tags} onChange={setTags} />
      <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Current Tags:</p>
        <pre className="text-xs">{JSON.stringify(tags, null, 2)}</pre>
      </div>
    </div>
  )
}

export const Default: Story = {
  render: (args) => <TagInputWrapper {...args} />,
  args: {
    value: [],
    placeholder: 'Type and press Enter to add tags...',
    label: 'Tags',
  },
}

export const WithInitialTags: Story = {
  render: (args) => <TagInputWrapper {...args} />,
  args: {
    value: ['invoice', 'urgent', 'payment'],
    label: 'Document Tags',
  },
}

export const WithSuggestions: Story = {
  render: (args) => <TagInputWrapper {...args} />,
  args: {
    value: ['financial'],
    label: 'Tags',
    suggestions: [
      'urgent',
      'payment',
      'invoice',
      'expense',
      'revenue',
      'budget',
      'forecast',
      'financial',
      'accounting',
      'audit',
    ],
    helpText: 'Type to see suggestions',
  },
}

export const Required: Story = {
  render: (args) => <TagInputWrapper {...args} />,
  args: {
    value: [],
    label: 'Required Tags',
    required: true,
    helpText: 'At least one tag is required',
  },
}

export const WithError: Story = {
  render: (args) => <TagInputWrapper {...args} />,
  args: {
    value: [],
    label: 'Tags',
    required: true,
    error: 'At least one tag is required',
  },
}

export const Disabled: Story = {
  render: (args) => <TagInputWrapper {...args} />,
  args: {
    value: ['locked-tag', 'readonly'],
    label: 'Read-only Tags',
    disabled: true,
  },
}

export const LimitedTags: Story = {
  render: (args) => <TagInputWrapper {...args} />,
  args: {
    value: ['tag1', 'tag2'],
    label: 'Tags (Max 5)',
    maxTags: 5,
    helpText: 'Maximum 5 tags allowed',
  },
}

export const NoCustomTags: Story = {
  render: (args) => <TagInputWrapper {...args} />,
  args: {
    value: [],
    label: 'Predefined Tags Only',
    allowCustom: false,
    suggestions: ['approved', 'pending', 'rejected', 'in-review'],
    helpText: 'Only predefined tags are allowed',
  },
}

export const ManyTags: Story = {
  render: (args) => <TagInputWrapper {...args} />,
  args: {
    value: [
      'financial',
      'urgent',
      'payment',
      'invoice',
      'expense',
      'revenue',
      'budget',
      'forecast',
      'accounting',
      'audit',
      'compliance',
      'tax',
      'regulatory',
      'internal',
      'external',
    ],
    label: 'Multiple Tags',
  },
}
