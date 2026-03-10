/**
 * SearchBar Storybook Stories
 */

import type { Meta, StoryObj } from '@storybook/react-vite'
import { SearchBar } from './SearchBar'
import type { SearchSuggestion, RecentSearch } from '@/types/search'

const meta: Meta<typeof SearchBar> = {
  title: 'Components/Search/SearchBar',
  component: SearchBar,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof SearchBar>

const mockSuggestions: SearchSuggestion[] = [
  {
    text: 'Financial Report Q4 2024',
    type: 'document',
    score: 95,
    metadata: { description: 'Last updated 2 days ago' },
  },
  {
    text: 'Invoice',
    type: 'tag',
    score: 90,
    metadata: { description: '245 documents' },
  },
  {
    text: 'Finance',
    type: 'department',
    score: 85,
    metadata: { description: '1,240 documents' },
  },
  {
    text: 'contract agreements',
    type: 'query',
    score: 80,
    metadata: { description: 'Popular search' },
  },
]

const mockRecentSearches: RecentSearch[] = [
  {
    id: '1',
    query: 'customer invoices 2024',
    executedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    resultCount: 45,
  },
  {
    id: '2',
    query: 'compliance reports',
    executedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    resultCount: 12,
  },
  {
    id: '3',
    query: 'employee contracts',
    executedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    resultCount: 8,
  },
]

export const Default: Story = {
  args: {
    onSearch: (query) => console.log('Search:', query),
    onAdvancedSearch: () => console.log('Open advanced search'),
  },
}

export const WithPlaceholder: Story = {
  args: {
    placeholder: 'Search for documents, invoices, contracts...',
    onSearch: (query) => console.log('Search:', query),
  },
}

export const WithValue: Story = {
  args: {
    value: 'Financial Reports',
    onSearch: (query) => console.log('Search:', query),
  },
}

export const WithSuggestions: Story = {
  args: {
    suggestions: mockSuggestions,
    onSearch: (query) => console.log('Search:', query),
    onAdvancedSearch: () => console.log('Open advanced search'),
  },
}

export const WithRecentSearches: Story = {
  args: {
    recentSearches: mockRecentSearches,
    onSearch: (query) => console.log('Search:', query),
    onAdvancedSearch: () => console.log('Open advanced search'),
  },
}

export const WithSuggestionsAndRecent: Story = {
  args: {
    suggestions: mockSuggestions,
    recentSearches: mockRecentSearches,
    onSearch: (query) => console.log('Search:', query),
    onAdvancedSearch: () => console.log('Open advanced search'),
  },
}

export const Loading: Story = {
  args: {
    isLoading: true,
    onSearch: (query) => console.log('Search:', query),
  },
}

export const AutoFocused: Story = {
  args: {
    autoFocus: true,
    onSearch: (query) => console.log('Search:', query),
  },
}

export const WithoutAdvancedButton: Story = {
  args: {
    showAdvancedButton: false,
    suggestions: mockSuggestions,
    onSearch: (query) => console.log('Search:', query),
  },
}

export const WithoutSuggestions: Story = {
  args: {
    showSuggestions: false,
    suggestions: mockSuggestions,
    onSearch: (query) => console.log('Search:', query),
  },
}

export const FullWidth: Story = {
  args: {
    className: 'w-full',
    suggestions: mockSuggestions,
    onSearch: (query) => console.log('Search:', query),
    onAdvancedSearch: () => console.log('Open advanced search'),
  },
}

export const Interactive: Story = {
  render: () => (
    <div className="max-w-2xl">
      <h2 className="text-lg font-semibold mb-4">Try typing to see suggestions</h2>
      <SearchBar
        placeholder="Search for anything..."
        suggestions={mockSuggestions}
        recentSearches={mockRecentSearches}
        onSearch={(query) => {
          console.log('Search:', query)
          alert(`Searching for: ${query}`)
        }}
        onAdvancedSearch={() => {
          console.log('Open advanced search')
          alert('Opening advanced search modal')
        }}
      />
    </div>
  ),
}
