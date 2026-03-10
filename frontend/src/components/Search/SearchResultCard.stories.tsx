/**
 * SearchResultCard Storybook Stories
 */

import type { Meta, StoryObj } from '@storybook/react-vite'
import { SearchResultCard } from './SearchResultCard'
import type { SearchResult } from '@/types/search'

const meta: Meta<typeof SearchResultCard> = {
  title: 'Components/Search/SearchResultCard',
  component: SearchResultCard,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof SearchResultCard>

const baseResult: SearchResult = {
  id: '1',
  documentId: 'doc-123',
  fileName: 'Financial_Report_Q4_2024.pdf',
  filePath: '/Customer Records/123456/Reports',
  fileSize: 2548976,
  mimeType: 'application/pdf',
  extension: 'pdf',
  score: 95,
  highlights: [
    {
      field: 'content',
      snippet: 'revenue increased by 25% in Q4',
      matches: [
        { text: 'revenue increased by ', isMatch: false },
        { text: '25%', isMatch: true },
        { text: ' in Q4', isMatch: false },
      ],
    },
  ],
  createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  modifiedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  createdBy: 'John Doe',
  modifiedBy: 'Jane Smith',
  confidentialityLevel: 'Confidential',
  isShared: false,
  isLocked: false,
  hasVersions: true,
  currentVersion: 3,
  permissions: {
    canView: true,
    canEdit: true,
    canDelete: true,
    canDownload: true,
    canShare: true,
  },
}

export const ListView: Story = {
  args: {
    result: baseResult,
    viewMode: 'list',
    onSelect: (selected) => console.log('Selected:', selected),
    onClick: () => console.log('Clicked'),
    onPreview: () => console.log('Preview'),
    onDownload: () => console.log('Download'),
  },
}

export const GridView: Story = {
  args: {
    result: baseResult,
    viewMode: 'grid',
    onSelect: (selected) => console.log('Selected:', selected),
    onClick: () => console.log('Clicked'),
    onPreview: () => console.log('Preview'),
    onDownload: () => console.log('Download'),
  },
}

export const HighRelevance: Story = {
  args: {
    result: { ...baseResult, score: 98 },
    viewMode: 'list',
  },
}

export const LowRelevance: Story = {
  args: {
    result: { ...baseResult, score: 45 },
    viewMode: 'list',
  },
}

export const HighlyConfidential: Story = {
  args: {
    result: {
      ...baseResult,
      confidentialityLevel: 'Highly Confidential',
      isLocked: true,
    },
    viewMode: 'list',
  },
}

export const PublicDocument: Story = {
  args: {
    result: {
      ...baseResult,
      confidentialityLevel: 'Public',
      fileName: 'Company_Newsletter_Jan2024.pdf',
    },
    viewMode: 'list',
  },
}

export const SharedDocument: Story = {
  args: {
    result: {
      ...baseResult,
      isShared: true,
      fileName: 'Shared_Project_Plan.xlsx',
    },
    viewMode: 'list',
  },
}

export const LockedDocument: Story = {
  args: {
    result: {
      ...baseResult,
      isLocked: true,
      fileName: 'Legal_Hold_Document.pdf',
    },
    viewMode: 'list',
  },
}

export const WithMultipleHighlights: Story = {
  args: {
    result: {
      ...baseResult,
      highlights: [
        {
          field: 'content',
          snippet: 'revenue increased by 25% in Q4',
          matches: [
            { text: 'revenue increased by ', isMatch: false },
            { text: '25%', isMatch: true },
            { text: ' in Q4', isMatch: false },
          ],
        },
        {
          field: 'metadata',
          snippet: 'Financial Report',
          matches: [
            { text: 'Financial', isMatch: true },
            { text: ' Report', isMatch: false },
          ],
        },
        {
          field: 'filename',
          snippet: 'Q4_2024',
          matches: [
            { text: 'Q4', isMatch: true },
            { text: '_2024', isMatch: false },
          ],
        },
      ],
    },
    viewMode: 'list',
  },
}

export const WithoutHighlights: Story = {
  args: {
    result: baseResult,
    viewMode: 'list',
    showHighlights: false,
  },
}

export const RestrictedPermissions: Story = {
  args: {
    result: {
      ...baseResult,
      permissions: {
        canView: true,
        canEdit: false,
        canDelete: false,
        canDownload: false,
        canShare: false,
      },
    },
    viewMode: 'list',
  },
}

export const Selected: Story = {
  args: {
    result: baseResult,
    viewMode: 'list',
    isSelected: true,
  },
}

export const GridViewMultiple: Story = {
  render: () => (
    <div className="grid grid-cols-3 gap-4 max-w-5xl">
      <SearchResultCard
        result={baseResult}
        viewMode="grid"
        onSelect={(selected) => console.log('Selected:', selected)}
      />
      <SearchResultCard
        result={{
          ...baseResult,
          id: '2',
          confidentialityLevel: 'Highly Confidential',
          isLocked: true,
        }}
        viewMode="grid"
      />
      <SearchResultCard
        result={{
          ...baseResult,
          id: '3',
          confidentialityLevel: 'Public',
          isShared: true,
          score: 78,
        }}
        viewMode="grid"
      />
    </div>
  ),
}

export const ListViewMultiple: Story = {
  render: () => (
    <div className="space-y-2 max-w-4xl">
      <SearchResultCard result={baseResult} viewMode="list" />
      <SearchResultCard
        result={{
          ...baseResult,
          id: '2',
          confidentialityLevel: 'Highly Confidential',
          isLocked: true,
          score: 88,
        }}
        viewMode="list"
      />
      <SearchResultCard
        result={{
          ...baseResult,
          id: '3',
          confidentialityLevel: 'Public',
          isShared: true,
          score: 72,
        }}
        viewMode="list"
      />
    </div>
  ),
}
