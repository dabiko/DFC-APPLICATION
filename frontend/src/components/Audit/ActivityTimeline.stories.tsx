import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { ActivityTimeline } from './ActivityTimeline'
import type { TimelineEvent, AuditLogEntry } from '@/types/audit'

const meta: Meta<typeof ActivityTimeline> = {
  title: 'Components/Audit/ActivityTimeline',
  component: ActivityTimeline,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof ActivityTimeline>

const createMockEntry = (actionType: string, timestamp: string): AuditLogEntry => ({
  id: Math.random().toString(),
  timestamp,
  userId: 'user-1',
  userName: 'John Doe',
  userEmail: 'john@example.com',
  userRole: 'admin',
  actionType: actionType as any,
  resourceType: 'document',
  resourceId: 'doc-123',
  resourceName: 'Sample Document',
  outcome: 'success',
  severity: 'info',
  ipAddress: '192.168.1.1',
  userAgent: 'Mozilla/5.0',
})

const mockTimelineEvents: TimelineEvent[] = [
  {
    id: '1',
    timestamp: new Date().toISOString(),
    type: 'action',
    title: 'Document Approved',
    description: 'Q4 Financial Report was approved by management',
    userId: 'user-1',
    userName: 'John Doe',
    color: 'green',
    relatedEntries: [createMockEntry('document_updated', new Date().toISOString())],
  },
  {
    id: '2',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    type: 'alert',
    title: 'Failed Login Attempt',
    description: 'Multiple failed login attempts detected from unusual location',
    userId: 'user-2',
    userName: 'Security System',
    color: 'red',
    relatedEntries: [
      createMockEntry('user_login_failed', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()),
    ],
  },
  {
    id: '3',
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    type: 'milestone',
    title: 'Project Milestone Reached',
    description: 'All documents reviewed and submitted for Q4',
    userId: 'user-3',
    userName: 'Jane Smith',
    color: 'blue',
    relatedEntries: [
      createMockEntry('document_created', new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()),
    ],
  },
  {
    id: '4',
    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    type: 'action',
    title: 'Permissions Updated',
    description: 'Finance team granted access to budget documents',
    userId: 'user-1',
    userName: 'John Doe',
    color: 'yellow',
    relatedEntries: [
      createMockEntry(
        'permission_granted',
        new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      ),
    ],
  },
  {
    id: '5',
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    type: 'action',
    title: 'Document Created',
    description: 'New financial report created for review',
    userId: 'user-2',
    userName: 'Bob Johnson',
    color: 'green',
    relatedEntries: [
      createMockEntry(
        'document_created',
        new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      ),
    ],
  },
]

/**
 * Default timeline
 */
export const Default: Story = {
  args: {
    events: mockTimelineEvents,
    onEventClick: (event) => console.log('Event clicked:', event),
  },
}

/**
 * Loading state
 */
export const Loading: Story = {
  args: {
    events: [],
    isLoading: true,
  },
}

/**
 * Empty state
 */
export const Empty: Story = {
  args: {
    events: [],
    isLoading: false,
  },
}

/**
 * Alerts only
 */
export const AlertsOnly: Story = {
  args: {
    events: mockTimelineEvents.filter((e) => e.type === 'alert'),
  },
}

/**
 * With load more
 */
export const WithLoadMore: Story = {
  args: {
    events: mockTimelineEvents.slice(0, 3),
    hasMore: true,
    onLoadMore: () => console.log('Load more clicked'),
  },
}

/**
 * Interactive demo
 */
export const Interactive: Story = {
  render: () => {
    const [events, setEvents] = useState(mockTimelineEvents.slice(0, 3))
    const [isLoading, setIsLoading] = useState(false)

    const handleLoadMore = () => {
      setIsLoading(true)
      setTimeout(() => {
        setEvents(mockTimelineEvents)
        setIsLoading(false)
      }, 1000)
    }

    return (
      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
          <strong>Interactive Demo:</strong> Click events to see details, use "Load More" to fetch
          additional events.
        </div>

        <ActivityTimeline
          events={events}
          hasMore={events.length < mockTimelineEvents.length}
          isLoading={isLoading}
          onEventClick={(event) => alert(`Event: ${event.title}\n${event.description}`)}
          onLoadMore={handleLoadMore}
        />
      </div>
    )
  },
}

/**
 * Dark mode
 */
export const DarkMode: Story = {
  render: () => (
    <div className="dark bg-gray-950 p-8 min-h-screen">
      <ActivityTimeline
        events={mockTimelineEvents}
        onEventClick={(event) => console.log('Event clicked:', event)}
      />
    </div>
  ),
}
