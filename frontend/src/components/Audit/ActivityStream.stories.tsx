import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { ActivityStream } from './ActivityStream'
import type { AuditLogEntry } from '@/types/audit'

const meta: Meta<typeof ActivityStream> = {
  title: 'Components/Audit/ActivityStream',
  component: ActivityStream,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof ActivityStream>

const mockActivities: AuditLogEntry[] = [
  {
    id: '1',
    timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    userId: 'user-1',
    userName: 'John Doe',
    userEmail: 'john@example.com',
    userRole: 'admin',
    actionType: 'document_created',
    resourceType: 'document',
    resourceId: 'doc-123',
    resourceName: 'Q4 Report.pdf',
    outcome: 'success',
    severity: 'info',
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0',
    details: 'Created new financial report',
  },
  {
    id: '2',
    timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    userId: 'user-2',
    userName: 'Jane Smith',
    userEmail: 'jane@example.com',
    userRole: 'editor',
    actionType: 'document_updated',
    resourceType: 'document',
    resourceId: 'doc-456',
    resourceName: 'Budget 2024.xlsx',
    outcome: 'success',
    severity: 'info',
    ipAddress: '192.168.1.101',
    userAgent: 'Mozilla/5.0',
  },
  {
    id: '3',
    timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    userId: 'user-1',
    userName: 'John Doe',
    userEmail: 'john@example.com',
    userRole: 'admin',
    actionType: 'permission_granted',
    resourceType: 'document',
    resourceId: 'doc-789',
    resourceName: 'Confidential.pdf',
    outcome: 'success',
    severity: 'warning',
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0',
    details: 'Granted edit access to Finance team',
  },
  {
    id: '4',
    timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    userId: 'user-3',
    userName: 'Bob Johnson',
    userEmail: 'bob@example.com',
    userRole: 'viewer',
    actionType: 'document_downloaded',
    resourceType: 'document',
    resourceId: 'doc-123',
    resourceName: 'Q4 Report.pdf',
    outcome: 'success',
    severity: 'info',
    ipAddress: '192.168.1.102',
    userAgent: 'Mozilla/5.0',
  },
  {
    id: '5',
    timestamp: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
    userId: 'user-2',
    userName: 'Jane Smith',
    userEmail: 'jane@example.com',
    userRole: 'editor',
    actionType: 'folder_created',
    resourceType: 'folder',
    resourceId: 'folder-123',
    resourceName: 'Financial Reports 2024',
    outcome: 'success',
    severity: 'info',
    ipAddress: '192.168.1.101',
    userAgent: 'Mozilla/5.0',
  },
  {
    id: '6',
    timestamp: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    userId: 'user-4',
    userName: 'Alice Williams',
    userEmail: 'alice@example.com',
    userRole: 'manager',
    actionType: 'document_deleted',
    resourceType: 'document',
    resourceId: 'doc-old',
    resourceName: 'Old Draft.docx',
    outcome: 'success',
    severity: 'critical',
    ipAddress: '192.168.1.103',
    userAgent: 'Mozilla/5.0',
    details: 'Deleted outdated draft document',
  },
  {
    id: '7',
    timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    userId: 'user-3',
    userName: 'Bob Johnson',
    userEmail: 'bob@example.com',
    userRole: 'viewer',
    actionType: 'user_login_failed',
    resourceType: 'user',
    resourceId: 'user-3',
    resourceName: 'bob@example.com',
    outcome: 'failure',
    severity: 'error',
    ipAddress: '192.168.1.102',
    userAgent: 'Mozilla/5.0',
    errorMessage: 'Invalid password',
  },
]

/**
 * Default activity stream showing all activities
 */
export const Default: Story = {
  args: {
    entries: mockActivities,
    currentUserId: 'user-1',
    scope: 'all',
    enableRealtime: true,
    connectionStatus: 'connected',
    maxEntries: 50,
    relativeTime: true,
  },
}

/**
 * Current folder scope
 */
export const CurrentFolder: Story = {
  args: {
    entries: mockActivities.filter((e) => e.resourceId.startsWith('doc-')),
    currentUserId: 'user-1',
    scope: 'current-folder',
    currentFolderId: 'folder-123',
    enableRealtime: true,
    connectionStatus: 'connected',
  },
}

/**
 * Offline mode (disconnected)
 */
export const Offline: Story = {
  args: {
    entries: mockActivities,
    currentUserId: 'user-1',
    enableRealtime: true,
    connectionStatus: 'disconnected',
  },
}

/**
 * Connecting state
 */
export const Connecting: Story = {
  args: {
    entries: mockActivities,
    currentUserId: 'user-1',
    enableRealtime: true,
    connectionStatus: 'connecting',
  },
}

/**
 * Empty state
 */
export const Empty: Story = {
  args: {
    entries: [],
    currentUserId: 'user-1',
    enableRealtime: true,
    connectionStatus: 'connected',
  },
}

/**
 * With "You" indicators
 */
export const WithYouIndicators: Story = {
  args: {
    entries: mockActivities,
    currentUserId: 'user-1', // John Doe
    enableRealtime: true,
    connectionStatus: 'connected',
  },
}

/**
 * Interactive demo with simulated real-time updates
 */
export const Interactive: Story = {
  render: () => {
    const [entries, setEntries] = useState(mockActivities)
    const [scope, setScope] = useState<'all' | 'current-folder'>('all')

    // Simulate real-time updates
    const addNewActivity = () => {
      const newActivity: AuditLogEntry = {
        id: Math.random().toString(),
        timestamp: new Date().toISOString(),
        userId: 'user-' + Math.floor(Math.random() * 4 + 1),
        userName: ['John Doe', 'Jane Smith', 'Bob Johnson', 'Alice Williams'][
          Math.floor(Math.random() * 4)
        ],
        userEmail: 'user@example.com',
        userRole: 'editor',
        actionType: ['document_created', 'document_updated', 'document_viewed'][
          Math.floor(Math.random() * 3)
        ] as any,
        resourceType: 'document',
        resourceId: 'doc-' + Math.random(),
        resourceName: 'New Document.pdf',
        outcome: 'success',
        severity: 'info',
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0',
      }

      setEntries([newActivity, ...entries])
    }

    return (
      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
          <strong>Interactive Demo:</strong> Toggle between "All Activity" and "Current Folder", use
          filters, and click "Simulate Activity" to see real-time updates.
        </div>

        <button
          onClick={addNewActivity}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          Simulate New Activity
        </button>

        <ActivityStream
          entries={entries}
          currentUserId="user-1"
          scope={scope}
          currentFolderId="folder-123"
          onScopeChange={setScope}
          enableRealtime={true}
          connectionStatus="connected"
          onEntryClick={(entry) => alert(`Clicked: ${entry.userName} ${entry.actionType}`)}
        />

        <div className="p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold mb-2">Stats:</h3>
          <div className="text-sm space-y-1">
            <div>Total Activities: {entries.length}</div>
            <div>Current Scope: {scope}</div>
            <div>Your Actions: {entries.filter((e) => e.userId === 'user-1').length}</div>
          </div>
        </div>
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
      <ActivityStream
        entries={mockActivities}
        currentUserId="user-1"
        scope="all"
        enableRealtime={true}
        connectionStatus="connected"
      />
    </div>
  ),
}

/**
 * Collapsed state
 */
export const Collapsed: Story = {
  render: () => {
    const [_isExpanded] = useState(false)

    return (
      <div className="bg-white p-4">
        <p className="text-sm text-gray-600 mb-4">
          The activity stream can be collapsed to save space. Click the expand button to view.
        </p>
        <ActivityStream entries={mockActivities} currentUserId="user-1" />
      </div>
    )
  },
}
