import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { AuditLogViewer } from './AuditLogViewer'
import type { AuditLogEntry, AuditLogFilters } from '@/types/audit'
import { getDefaultFilters } from '@/types/audit'

const meta: Meta<typeof AuditLogViewer> = {
  title: 'Components/Audit/AuditLogViewer',
  component: AuditLogViewer,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof AuditLogViewer>

const mockAuditLogs: AuditLogEntry[] = [
  {
    id: '1',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    userId: 'user-1',
    userName: 'John Doe',
    userEmail: 'john.doe@example.com',
    userRole: 'admin',
    actionType: 'document_created',
    resourceType: 'document',
    resourceId: 'doc-123',
    resourceName: 'Q4 Financial Report.pdf',
    outcome: 'success',
    severity: 'info',
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0',
    details: 'Created new financial report document',
  },
  {
    id: '2',
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    userId: 'user-2',
    userName: 'Jane Smith',
    userEmail: 'jane.smith@example.com',
    userRole: 'manager',
    actionType: 'permission_granted',
    resourceType: 'document',
    resourceId: 'doc-456',
    resourceName: 'Budget 2024.xlsx',
    outcome: 'success',
    severity: 'warning',
    ipAddress: '192.168.1.101',
    userAgent: 'Mozilla/5.0',
    details: 'Granted edit permissions to Finance team',
    location: 'New York, USA',
  },
  {
    id: '3',
    timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    userId: 'user-3',
    userName: 'Bob Johnson',
    userEmail: 'bob.johnson@example.com',
    userRole: 'editor',
    actionType: 'user_login_failed',
    resourceType: 'user',
    resourceId: 'user-3',
    resourceName: 'bob.johnson@example.com',
    outcome: 'failure',
    severity: 'error',
    ipAddress: '192.168.1.102',
    userAgent: 'Mozilla/5.0',
    errorMessage: 'Invalid password attempt',
  },
  {
    id: '4',
    timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    userId: 'user-1',
    userName: 'John Doe',
    userEmail: 'john.doe@example.com',
    userRole: 'admin',
    actionType: 'document_deleted',
    resourceType: 'document',
    resourceId: 'doc-789',
    resourceName: 'Old Contract.pdf',
    outcome: 'success',
    severity: 'critical',
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0',
    details: 'Permanently deleted expired contract document',
  },
  {
    id: '5',
    timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    userId: 'user-2',
    userName: 'Jane Smith',
    userEmail: 'jane.smith@example.com',
    userRole: 'manager',
    actionType: 'document_updated',
    resourceType: 'document',
    resourceId: 'doc-123',
    resourceName: 'Q4 Financial Report.pdf',
    outcome: 'success',
    severity: 'info',
    ipAddress: '192.168.1.101',
    userAgent: 'Mozilla/5.0',
    changes: [
      {
        field: 'status',
        fieldLabel: 'Status',
        oldValue: 'Draft',
        newValue: 'Final',
        changeType: 'modified',
      },
      {
        field: 'confidentiality',
        fieldLabel: 'Confidentiality',
        oldValue: 'Internal',
        newValue: 'Confidential',
        changeType: 'modified',
      },
    ],
  },
]

/**
 * Default audit log viewer
 */
export const Default: Story = {
  render: () => {
    const [currentPage, setCurrentPage] = useState(1)
    const [filters, setFilters] = useState<AuditLogFilters>(getDefaultFilters())

    return (
      <AuditLogViewer
        entries={mockAuditLogs}
        total={50}
        currentPage={currentPage}
        pageSize={10}
        filters={filters}
        onFiltersChange={setFilters}
        onPageChange={setCurrentPage}
        onEntryClick={(entry) => console.log('Entry clicked:', entry)}
        onExport={(format) => console.log('Export as:', format)}
      />
    )
  },
}

/**
 * Loading state
 */
export const Loading: Story = {
  args: {
    entries: [],
    total: 0,
    currentPage: 1,
    pageSize: 10,
    filters: getDefaultFilters(),
    onFiltersChange: () => {},
    onPageChange: () => {},
    isLoading: true,
  },
}

/**
 * Empty state
 */
export const Empty: Story = {
  args: {
    entries: [],
    total: 0,
    currentPage: 1,
    pageSize: 10,
    filters: getDefaultFilters(),
    onFiltersChange: () => {},
    onPageChange: () => {},
    isLoading: false,
  },
}

/**
 * With errors
 */
export const WithErrors: Story = {
  args: {
    entries: mockAuditLogs.filter((log) => log.outcome === 'failure'),
    total: 5,
    currentPage: 1,
    pageSize: 10,
    filters: getDefaultFilters(),
    onFiltersChange: () => {},
    onPageChange: () => {},
  },
}

/**
 * Sensitive actions only
 */
export const SensitiveActions: Story = {
  args: {
    entries: mockAuditLogs.filter((log) =>
      ['document_deleted', 'permission_granted'].includes(log.actionType)
    ),
    total: 2,
    currentPage: 1,
    pageSize: 10,
    filters: getDefaultFilters(),
    onFiltersChange: () => {},
    onPageChange: () => {},
  },
}

/**
 * With change history
 */
export const WithChangeHistory: Story = {
  args: {
    entries: mockAuditLogs.filter((log) => log.changes && log.changes.length > 0),
    total: 1,
    currentPage: 1,
    pageSize: 10,
    filters: getDefaultFilters(),
    onFiltersChange: () => {},
    onPageChange: () => {},
  },
}

/**
 * Interactive with pagination
 */
export const Interactive: Story = {
  render: () => {
    const [currentPage, setCurrentPage] = useState(1)
    const [filters, setFilters] = useState<AuditLogFilters>(getDefaultFilters())

    // Generate more entries for pagination
    const allEntries = Array.from({ length: 50 }, (_, i) => ({
      ...mockAuditLogs[i % mockAuditLogs.length],
      id: `entry-${i}`,
      timestamp: new Date(Date.now() - i * 60 * 60 * 1000).toISOString(),
    }))

    const pageSize = 10
    const startIndex = (currentPage - 1) * pageSize
    const endIndex = startIndex + pageSize
    const currentEntries = allEntries.slice(startIndex, endIndex)

    return (
      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
          <strong>Interactive Demo:</strong> Browse through pages, click entries to expand details,
          and test export functionality.
        </div>

        <AuditLogViewer
          entries={currentEntries}
          total={allEntries.length}
          currentPage={currentPage}
          pageSize={pageSize}
          filters={filters}
          onFiltersChange={setFilters}
          onPageChange={setCurrentPage}
          onEntryClick={(entry) => console.log('Entry clicked:', entry)}
          onExport={(format) =>
            alert(`Exporting ${allEntries.length} entries as ${format.toUpperCase()}`)
          }
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
      <AuditLogViewer
        entries={mockAuditLogs}
        total={50}
        currentPage={1}
        pageSize={10}
        filters={getDefaultFilters()}
        onFiltersChange={() => {}}
        onPageChange={() => {}}
        onEntryClick={(entry) => console.log('Entry clicked:', entry)}
        onExport={(format) => console.log('Export as:', format)}
      />
    </div>
  ),
}
