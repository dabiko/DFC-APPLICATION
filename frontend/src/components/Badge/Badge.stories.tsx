import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { Badge, Tag, ConfidentialityBadge } from './index'

const meta: Meta<typeof Badge> = {
  title: 'Components/Badge & Tag',
  component: Badge,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof Badge>

/**
 * Basic badge
 */
export const BasicBadge: Story = {
  render: () => <Badge>New</Badge>,
}

/**
 * Badge variants
 */
export const BadgeVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <Badge variant="primary">Primary</Badge>
      <Badge variant="secondary">Secondary</Badge>
      <Badge variant="success">Success</Badge>
      <Badge variant="warning">Warning</Badge>
      <Badge variant="error">Error</Badge>
      <Badge variant="info">Info</Badge>
      <Badge variant="gray">Gray</Badge>
    </div>
  ),
}

/**
 * Badge sizes
 */
export const BadgeSizes: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Badge size="sm">Small</Badge>
      <Badge size="md">Medium</Badge>
      <Badge size="lg">Large</Badge>
    </div>
  ),
}

/**
 * Badge with dot
 */
export const BadgeWithDot: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <Badge variant="success" dot>
        Active
      </Badge>
      <Badge variant="error" dot>
        Offline
      </Badge>
      <Badge variant="warning" dot>
        Pending
      </Badge>
      <Badge variant="info" dot>
        In Progress
      </Badge>
    </div>
  ),
}

/**
 * Status badges
 */
export const StatusBadges: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <Badge variant="success" dot>
        Published
      </Badge>
      <Badge variant="warning" dot>
        Draft
      </Badge>
      <Badge variant="error" dot>
        Rejected
      </Badge>
      <Badge variant="info" dot>
        In Review
      </Badge>
      <Badge variant="gray" dot>
        Archived
      </Badge>
    </div>
  ),
}

/**
 * Notification badges
 */
export const NotificationBadges: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <span className="text-gray-700 dark:text-gray-300">Messages</span>
        <Badge variant="error" size="sm">
          5
        </Badge>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-gray-700 dark:text-gray-300">Notifications</span>
        <Badge variant="primary" size="sm">
          12
        </Badge>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-gray-700 dark:text-gray-300">Updates</span>
        <Badge variant="success" size="sm" dot>
          3 New
        </Badge>
      </div>
    </div>
  ),
}

/**
 * Basic tag
 */
export const BasicTag: Story = {
  render: () => <Tag>Design</Tag>,
}

/**
 * Tag variants
 */
export const TagVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Tag variant="primary">React</Tag>
      <Tag variant="secondary">TypeScript</Tag>
      <Tag variant="success">Approved</Tag>
      <Tag variant="warning">Pending</Tag>
      <Tag variant="error">Rejected</Tag>
      <Tag variant="info">New</Tag>
      <Tag variant="gray">Archive</Tag>
    </div>
  ),
}

/**
 * Tag sizes
 */
export const TagSizes: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-2">
      <Tag size="sm">Small</Tag>
      <Tag size="md">Medium</Tag>
      <Tag size="lg">Large</Tag>
    </div>
  ),
}

/**
 * Removable tags
 */
export const RemovableTags: Story = {
  render: () => {
    const [tags, setTags] = useState(['React', 'TypeScript', 'Tailwind', 'Vite'])

    return (
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <Tag
            key={tag}
            variant="primary"
            removable
            onRemove={() => setTags(tags.filter((t) => t !== tag))}
          >
            {tag}
          </Tag>
        ))}
        {tags.length === 0 && <span className="text-gray-500 text-sm">All tags removed</span>}
      </div>
    )
  },
}

/**
 * Tag input example
 */
export const TagInputExample: Story = {
  render: () => {
    const [tags, setTags] = useState(['Design', 'Development', 'Marketing'])
    const [input, setInput] = useState('')

    const addTag = () => {
      if (input.trim() && !tags.includes(input.trim())) {
        setTags([...tags, input.trim()])
        setInput('')
      }
    }

    return (
      <div className="w-96 space-y-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addTag()}
            placeholder="Add a tag..."
            className="flex-1 px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <button
            onClick={addTag}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
          >
            Add
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Tag
              key={tag}
              variant="gray"
              removable
              onRemove={() => setTags(tags.filter((t) => t !== tag))}
            >
              {tag}
            </Tag>
          ))}
        </div>
      </div>
    )
  },
}

/**
 * Confidentiality badges - All levels
 */
export const ConfidentialityBadges: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <ConfidentialityBadge level="public" />
      <ConfidentialityBadge level="internal" />
      <ConfidentialityBadge level="confidential" />
      <ConfidentialityBadge level="highly-confidential" />
    </div>
  ),
}

/**
 * Confidentiality badges with icons
 */
export const ConfidentialityBadgesWithIcons: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <ConfidentialityBadge level="public" showIcon />
      <ConfidentialityBadge level="internal" showIcon />
      <ConfidentialityBadge level="confidential" showIcon />
      <ConfidentialityBadge level="highly-confidential" showIcon />
    </div>
  ),
}

/**
 * Confidentiality dots
 */
export const ConfidentialityDots: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-4">
      <div className="flex items-center gap-2">
        <ConfidentialityBadge level="public" dotOnly />
        <span className="text-sm text-gray-600 dark:text-gray-400">Public Document</span>
      </div>
      <div className="flex items-center gap-2">
        <ConfidentialityBadge level="internal" dotOnly />
        <span className="text-sm text-gray-600 dark:text-gray-400">Internal Document</span>
      </div>
      <div className="flex items-center gap-2">
        <ConfidentialityBadge level="confidential" dotOnly />
        <span className="text-sm text-gray-600 dark:text-gray-400">Confidential Document</span>
      </div>
      <div className="flex items-center gap-2">
        <ConfidentialityBadge level="highly-confidential" dotOnly />
        <span className="text-sm text-gray-600 dark:text-gray-400">
          Highly Confidential Document
        </span>
      </div>
    </div>
  ),
}

/**
 * Document card with confidentiality badge
 */
export const DocumentCardExample: Story = {
  render: () => (
    <div className="w-96 p-6 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              Financial Report Q4 2024
            </h3>
            <ConfidentialityBadge level="confidential" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Last modified: 2 hours ago</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <Tag variant="primary" size="sm">
          Finance
        </Tag>
        <Tag variant="info" size="sm">
          Q4
        </Tag>
        <Tag variant="success" size="sm">
          Approved
        </Tag>
      </div>

      <div className="flex gap-2">
        <button className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
          Preview
        </button>
        <button className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors">
          Download
        </button>
      </div>
    </div>
  ),
}

/**
 * Document list with confidentiality indicators
 */
export const DocumentListExample: Story = {
  render: () => (
    <div className="w-full max-w-2xl space-y-2">
      {[
        { name: 'Annual Report 2024.pdf', level: 'internal' as const, size: '2.4 MB' },
        {
          name: 'Employee Contract - John Doe.pdf',
          level: 'confidential' as const,
          size: '845 KB',
        },
        { name: 'Company Policy.docx', level: 'public' as const, size: '156 KB' },
        {
          name: 'Board Meeting Minutes.pdf',
          level: 'highly-confidential' as const,
          size: '1.2 MB',
        },
      ].map((doc, index) => (
        <div
          key={index}
          className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <div className="flex items-center gap-3 flex-1">
            <ConfidentialityBadge level={doc.level} dotOnly />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{doc.name}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{doc.size}</p>
            </div>
          </div>
          <ConfidentialityBadge level={doc.level} />
        </div>
      ))}
    </div>
  ),
}
