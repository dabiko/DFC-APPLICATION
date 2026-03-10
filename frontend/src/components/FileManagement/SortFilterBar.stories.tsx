/**
 * SortFilterBar Storybook Stories
 */

import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { SortFilterBar } from './SortFilterBar'
import type { SortField, SortOrder, FilterOptions, ViewMode } from '@/types/fileManagement'

const meta: Meta<typeof SortFilterBar> = {
  title: 'Components/FileManagement/SortFilterBar',
  component: SortFilterBar,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof SortFilterBar>

const SortFilterBarWrapper = (args: any) => {
  const [sortBy, setSortBy] = useState<SortField>(args.sortBy || 'name')
  const [sortOrder, setSortOrder] = useState<SortOrder>(args.sortOrder || 'asc')
  const [filters, setFilters] = useState<FilterOptions>(args.filters || {})
  const [viewMode, setViewMode] = useState<ViewMode>(args.viewMode || 'grid')

  return (
    <div className="h-screen">
      <SortFilterBar
        {...args}
        sortBy={sortBy}
        sortOrder={sortOrder}
        filters={filters}
        viewMode={viewMode}
        onSortChange={(field, order) => {
          console.log('Sort changed:', field, order)
          setSortBy(field)
          setSortOrder(order)
        }}
        onFilterChange={(newFilters) => {
          console.log('Filters changed:', newFilters)
          setFilters(newFilters)
        }}
        onViewModeChange={(mode) => {
          console.log('View mode changed:', mode)
          setViewMode(mode)
        }}
        onClearFilters={() => {
          console.log('Clear filters')
          setFilters({})
        }}
      />
    </div>
  )
}

export const Default: Story = {
  render: (args) => <SortFilterBarWrapper {...args} />,
  args: {
    sortBy: 'name',
    sortOrder: 'asc',
    filters: {},
    viewMode: 'grid',
    itemCount: 24,
    selectedCount: 0,
  },
}

export const WithSelection: Story = {
  render: (args) => <SortFilterBarWrapper {...args} />,
  args: {
    sortBy: 'name',
    sortOrder: 'asc',
    filters: {},
    viewMode: 'grid',
    itemCount: 24,
    selectedCount: 5,
  },
}

export const ListView: Story = {
  render: (args) => <SortFilterBarWrapper {...args} />,
  args: {
    sortBy: 'dateModified',
    sortOrder: 'desc',
    filters: {},
    viewMode: 'list',
    itemCount: 48,
    selectedCount: 0,
  },
}

export const SortedBySize: Story = {
  render: (args) => <SortFilterBarWrapper {...args} />,
  args: {
    sortBy: 'size',
    sortOrder: 'desc',
    filters: {},
    viewMode: 'grid',
    itemCount: 15,
    selectedCount: 0,
  },
}

export const SortedByDate: Story = {
  render: (args) => <SortFilterBarWrapper {...args} />,
  args: {
    sortBy: 'dateModified',
    sortOrder: 'desc',
    filters: {},
    viewMode: 'list',
    itemCount: 32,
    selectedCount: 0,
  },
}

export const WithActiveFilters: Story = {
  render: (args) => <SortFilterBarWrapper {...args} />,
  args: {
    sortBy: 'name',
    sortOrder: 'asc',
    filters: {
      documentTypes: ['Invoice', 'Contract'],
      confidentialityLevels: ['Confidential'],
      hasVersions: true,
    },
    viewMode: 'grid',
    itemCount: 8,
    selectedCount: 0,
  },
}

export const WithDateFilter: Story = {
  render: (args) => <SortFilterBarWrapper {...args} />,
  args: {
    sortBy: 'dateModified',
    sortOrder: 'desc',
    filters: {
      dateRange: {
        from: '2024-01-01',
        to: '2024-12-31',
      },
    },
    viewMode: 'list',
    itemCount: 18,
    selectedCount: 0,
  },
}

export const WithMultipleFilters: Story = {
  render: (args) => <SortFilterBarWrapper {...args} />,
  args: {
    sortBy: 'name',
    sortOrder: 'asc',
    filters: {
      documentTypes: ['Invoice', 'Report', 'Contract'],
      confidentialityLevels: ['Confidential', 'Highly Confidential'],
      dateRange: {
        from: '2024-10-01',
        to: '2024-12-31',
      },
      hasVersions: true,
      isShared: false,
    },
    viewMode: 'grid',
    itemCount: 3,
    selectedCount: 0,
  },
}

export const EmptyResults: Story = {
  render: (args) => <SortFilterBarWrapper {...args} />,
  args: {
    sortBy: 'name',
    sortOrder: 'asc',
    filters: {
      documentTypes: ['Invoice'],
    },
    viewMode: 'grid',
    itemCount: 0,
    selectedCount: 0,
  },
}

export const LargeItemCount: Story = {
  render: (args) => <SortFilterBarWrapper {...args} />,
  args: {
    sortBy: 'name',
    sortOrder: 'asc',
    filters: {},
    viewMode: 'grid',
    itemCount: 1247,
    selectedCount: 0,
  },
}

export const WithoutViewToggle: Story = {
  render: (args) => <SortFilterBarWrapper {...args} />,
  args: {
    sortBy: 'name',
    sortOrder: 'asc',
    filters: {},
    viewMode: 'grid',
    itemCount: 24,
    selectedCount: 0,
    showViewToggle: false,
  },
}

export const AllFilesSelected: Story = {
  render: (args) => <SortFilterBarWrapper {...args} />,
  args: {
    sortBy: 'name',
    sortOrder: 'asc',
    filters: {},
    viewMode: 'list',
    itemCount: 24,
    selectedCount: 24,
  },
}
