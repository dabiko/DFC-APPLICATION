import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { AuditLogFilters } from './AuditLogFilters'
import type { AuditLogFilters as FiltersType } from '@/types/audit'
import { getDefaultFilters } from '@/types/audit'

const meta: Meta<typeof AuditLogFilters> = {
  title: 'Components/Audit/AuditLogFilters',
  component: AuditLogFilters,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof AuditLogFilters>

const mockUsers = [
  { id: '1', name: 'John Doe', email: 'john@example.com' },
  { id: '2', name: 'Jane Smith', email: 'jane@example.com' },
  { id: '3', name: 'Bob Johnson', email: 'bob@example.com' },
]

/**
 * Default filters panel
 */
export const Default: Story = {
  args: {
    filters: getDefaultFilters(),
    onFiltersChange: (filters) => console.log('Filters changed:', filters),
    onClearFilters: () => console.log('Filters cleared'),
    availableUsers: mockUsers,
  },
}

/**
 * With active filters
 */
export const WithActiveFilters: Story = {
  args: {
    filters: {
      dateFrom: '2024-01-01T00:00',
      dateTo: '2024-12-31T23:59',
      actionTypes: ['document_created', 'document_updated'],
      resourceTypes: ['document'],
      outcomes: ['success'],
      severities: ['info', 'warning'],
      userId: '1',
    },
    onFiltersChange: () => {},
    onClearFilters: () => {},
    availableUsers: mockUsers,
  },
}

/**
 * Interactive demo
 */
export const Interactive: Story = {
  render: () => {
    const [filters, setFilters] = useState<FiltersType>(getDefaultFilters())

    return (
      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
          <strong>Interactive Demo:</strong> Toggle filters and see the active filter count update.
        </div>

        <AuditLogFilters
          filters={filters}
          onFiltersChange={setFilters}
          onClearFilters={() => setFilters(getDefaultFilters())}
          availableUsers={mockUsers}
        />

        <div className="p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold mb-2">Current Filters:</h3>
          <pre className="text-xs overflow-auto">{JSON.stringify(filters, null, 2)}</pre>
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
      <AuditLogFilters
        filters={getDefaultFilters()}
        onFiltersChange={() => {}}
        onClearFilters={() => {}}
        availableUsers={mockUsers}
      />
    </div>
  ),
}
