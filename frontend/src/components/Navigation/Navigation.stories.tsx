import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { Breadcrumbs, Tabs, Pagination, SimplePagination, TreeView } from './index'
import type { TreeNode } from './TreeView'
import {
  DocumentTextIcon,
  FolderIcon,
  ChartBarIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline'

const meta: Meta = {
  title: 'Components/Navigation',
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
}

export default meta

/**
 * Breadcrumbs - Basic
 */
export const BreadcrumbsBasic: StoryObj = {
  render: () => (
    <Breadcrumbs
      items={[
        { label: 'Home', href: '/' },
        { label: 'Documents', href: '/documents' },
        { label: 'Financial Reports', href: '/documents/financial' },
        { label: 'Q4 2024' },
      ]}
    />
  ),
}

/**
 * Breadcrumbs - With custom icons
 */
export const BreadcrumbsWithIcons: StoryObj = {
  render: () => (
    <Breadcrumbs
      items={[
        { label: 'Documents', href: '/', icon: <FolderIcon className="h-4 w-4" /> },
        { label: 'Reports', href: '/reports', icon: <DocumentTextIcon className="h-4 w-4" /> },
        { label: 'Analytics', icon: <ChartBarIcon className="h-4 w-4" /> },
      ]}
      showHomeIcon={false}
    />
  ),
}

/**
 * Breadcrumbs - Long path with collapse
 */
export const BreadcrumbsCollapsed: StoryObj = {
  render: () => (
    <div className="w-full max-w-2xl">
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: 'Customer Records', href: '/customers' },
          { label: 'Client-123456', href: '/customers/123456' },
          { label: 'Documents', href: '/customers/123456/documents' },
          { label: 'Contracts', href: '/customers/123456/documents/contracts' },
          { label: 'Employment', href: '/customers/123456/documents/contracts/employment' },
          { label: 'Contract-2024.pdf' },
        ]}
        maxItems={5}
      />
    </div>
  ),
}

/**
 * Breadcrumbs - Interactive navigation
 */
export const BreadcrumbsInteractive: StoryObj = {
  render: () => {
    const [path, setPath] = useState([
      { label: 'Documents', onClick: () => setPath([{ label: 'Documents', onClick: () => {} }]) },
      {
        label: 'Financial',
        onClick: () =>
          setPath([
            { label: 'Documents', onClick: () => {} },
            { label: 'Financial', onClick: () => {} },
          ]),
      },
      { label: 'Q4 2024' },
    ])

    return (
      <div className="space-y-4">
        <Breadcrumbs items={path} />
        <p className="text-sm text-gray-600 dark:text-gray-400">Click on breadcrumbs to navigate</p>
      </div>
    )
  },
}

/**
 * Tabs - Basic line style
 */
export const TabsLine: StoryObj = {
  render: () => (
    <div className="w-full max-w-2xl">
      <Tabs
        variant="line"
        items={[
          {
            label: 'Details',
            content: (
              <div className="p-4">
                <h3 className="text-lg font-semibold mb-2">Document Details</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  View document metadata, tags, and properties.
                </p>
              </div>
            ),
          },
          {
            label: 'Preview',
            content: (
              <div className="p-4">
                <h3 className="text-lg font-semibold mb-2">Document Preview</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Preview the document content here.
                </p>
              </div>
            ),
          },
          {
            label: 'Activity',
            content: (
              <div className="p-4">
                <h3 className="text-lg font-semibold mb-2">Activity Log</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  View document access and edit history.
                </p>
              </div>
            ),
            badge: 5,
          },
        ]}
      />
    </div>
  ),
}

/**
 * Tabs - Pill style
 */
export const TabsPill: StoryObj = {
  render: () => (
    <div className="w-full max-w-2xl">
      <Tabs
        variant="pill"
        items={[
          {
            label: 'Overview',
            icon: <ChartBarIcon className="h-4 w-4" />,
            content: <div className="p-4">Overview content</div>,
          },
          {
            label: 'Documents',
            icon: <DocumentTextIcon className="h-4 w-4" />,
            content: <div className="p-4">Documents content</div>,
            badge: 12,
          },
          {
            label: 'Settings',
            icon: <Cog6ToothIcon className="h-4 w-4" />,
            content: <div className="p-4">Settings content</div>,
          },
        ]}
      />
    </div>
  ),
}

/**
 * Tabs - Enclosed style
 */
export const TabsEnclosed: StoryObj = {
  render: () => (
    <div className="w-full max-w-2xl">
      <Tabs
        variant="enclosed"
        items={[
          { label: 'Profile', content: <div className="p-4">Profile content</div> },
          { label: 'Security', content: <div className="p-4">Security content</div> },
          {
            label: 'Notifications',
            content: <div className="p-4">Notifications content</div>,
            badge: 3,
          },
        ]}
      />
    </div>
  ),
}

/**
 * Tabs - Full width
 */
export const TabsFullWidth: StoryObj = {
  render: () => (
    <div className="w-full max-w-2xl">
      <Tabs
        variant="line"
        fullWidth
        items={[
          { label: 'All', content: <div className="p-4">All documents</div>, badge: 48 },
          { label: 'Recent', content: <div className="p-4">Recent documents</div>, badge: 12 },
          { label: 'Shared', content: <div className="p-4">Shared documents</div>, badge: 5 },
          { label: 'Archived', content: <div className="p-4">Archived documents</div> },
        ]}
      />
    </div>
  ),
}

/**
 * Tabs - Controlled state
 */
export const TabsControlled: StoryObj = {
  render: () => {
    const [selectedIndex, setSelectedIndex] = useState(0)

    return (
      <div className="w-full max-w-2xl space-y-4">
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedIndex(0)}
            className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 rounded"
          >
            Go to Details
          </button>
          <button
            onClick={() => setSelectedIndex(1)}
            className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 rounded"
          >
            Go to Preview
          </button>
        </div>

        <Tabs
          selectedIndex={selectedIndex}
          onChange={setSelectedIndex}
          items={[
            { label: 'Details', content: <div className="p-4">Document details</div> },
            { label: 'Preview', content: <div className="p-4">Document preview</div> },
            { label: 'Activity', content: <div className="p-4">Activity log</div> },
          ]}
        />
      </div>
    )
  },
}

/**
 * Pagination - Basic
 */
export const PaginationBasic: StoryObj = {
  render: () => {
    const [currentPage, setCurrentPage] = useState(1)

    return <Pagination currentPage={currentPage} totalPages={10} onPageChange={setCurrentPage} />
  },
}

/**
 * Pagination - Sizes
 */
export const PaginationSizes: StoryObj = {
  render: () => {
    const [page1, setPage1] = useState(1)
    const [page2, setPage2] = useState(1)
    const [page3, setPage3] = useState(1)

    return (
      <div className="space-y-6">
        <div>
          <p className="text-sm mb-2">Small</p>
          <Pagination currentPage={page1} totalPages={10} onPageChange={setPage1} size="sm" />
        </div>

        <div>
          <p className="text-sm mb-2">Medium (default)</p>
          <Pagination currentPage={page2} totalPages={10} onPageChange={setPage2} size="md" />
        </div>

        <div>
          <p className="text-sm mb-2">Large</p>
          <Pagination currentPage={page3} totalPages={10} onPageChange={setPage3} size="lg" />
        </div>
      </div>
    )
  },
}

/**
 * Pagination - Many pages
 */
export const PaginationManyPages: StoryObj = {
  render: () => {
    const [currentPage, setCurrentPage] = useState(15)

    return <Pagination currentPage={currentPage} totalPages={100} onPageChange={setCurrentPage} />
  },
}

/**
 * Pagination - Without first/last buttons
 */
export const PaginationNoFirstLast: StoryObj = {
  render: () => {
    const [currentPage, setCurrentPage] = useState(5)

    return (
      <Pagination
        currentPage={currentPage}
        totalPages={10}
        onPageChange={setCurrentPage}
        showFirstLast={false}
      />
    )
  },
}

/**
 * SimplePagination - Basic
 */
export const SimplePaginationBasic: StoryObj = {
  render: () => {
    const [currentPage, setCurrentPage] = useState(1)

    return (
      <SimplePagination currentPage={currentPage} totalPages={10} onPageChange={setCurrentPage} />
    )
  },
}

/**
 * TreeView - Folder structure
 */
export const TreeViewFolders: StoryObj = {
  render: () => {
    const [selectedId, setSelectedId] = useState<string>('folder-2-1')

    const folderData: TreeNode[] = [
      {
        id: 'folder-1',
        label: 'Customer Records',
        children: [
          {
            id: 'folder-1-1',
            label: 'Client-123456',
            children: [
              { id: 'file-1-1-1', label: 'Profile.pdf' },
              { id: 'file-1-1-2', label: 'Contract.docx' },
            ],
          },
          {
            id: 'folder-1-2',
            label: 'Client-789012',
            children: [{ id: 'file-1-2-1', label: 'Application.pdf' }],
          },
        ],
      },
      {
        id: 'folder-2',
        label: 'Financial Reports',
        children: [
          {
            id: 'folder-2-1',
            label: 'Q4 2024',
            badge: 12,
            children: [
              { id: 'file-2-1-1', label: 'Summary.xlsx' },
              { id: 'file-2-1-2', label: 'Analysis.pdf' },
            ],
          },
          {
            id: 'folder-2-2',
            label: 'Q3 2024',
          },
        ],
      },
      {
        id: 'folder-3',
        label: 'Compliance',
        badge: 5,
      },
    ]

    return (
      <div className="w-96 p-4 border border-gray-200 dark:border-gray-800 rounded-lg">
        <TreeView
          data={folderData}
          selectedId={selectedId}
          onSelect={(node) => setSelectedId(node.id)}
          defaultExpandedIds={['folder-1', 'folder-2', 'folder-2-1']}
        />
      </div>
    )
  },
}

/**
 * TreeView - Without icons
 */
export const TreeViewNoIcons: StoryObj = {
  render: () => {
    const [selectedId, setSelectedId] = useState<string>()

    const data: TreeNode[] = [
      {
        id: '1',
        label: 'Parent 1',
        children: [
          { id: '1-1', label: 'Child 1.1' },
          { id: '1-2', label: 'Child 1.2' },
        ],
      },
      {
        id: '2',
        label: 'Parent 2',
        children: [{ id: '2-1', label: 'Child 2.1' }],
      },
    ]

    return (
      <div className="w-80 p-4 border border-gray-200 dark:border-gray-800 rounded-lg">
        <TreeView
          data={data}
          selectedId={selectedId}
          onSelect={(node) => setSelectedId(node.id)}
          showIcons={false}
        />
      </div>
    )
  },
}

/**
 * TreeView - Custom icons
 */
export const TreeViewCustomIcons: StoryObj = {
  render: () => {
    const [selectedId, setSelectedId] = useState<string>()

    const data: TreeNode[] = [
      {
        id: 'docs',
        label: 'Documents',
        icon: <FolderIcon className="h-4 w-4 text-blue-600" />,
        children: [
          {
            id: 'reports',
            label: 'Reports',
            icon: <DocumentTextIcon className="h-4 w-4 text-green-600" />,
          },
          {
            id: 'analytics',
            label: 'Analytics',
            icon: <ChartBarIcon className="h-4 w-4 text-purple-600" />,
          },
        ],
      },
      {
        id: 'settings',
        label: 'Settings',
        icon: <Cog6ToothIcon className="h-4 w-4 text-gray-600" />,
      },
    ]

    return (
      <div className="w-80 p-4 border border-gray-200 dark:border-gray-800 rounded-lg">
        <TreeView
          data={data}
          selectedId={selectedId}
          onSelect={(node) => setSelectedId(node.id)}
          defaultExpandedIds={['docs']}
        />
      </div>
    )
  },
}

/**
 * DFC Navigation Panel Example
 */
export const DFCNavigationPanel: StoryObj = {
  render: () => {
    const [selectedFolderId, setSelectedFolderId] = useState('current')

    const dfcFolders: TreeNode[] = [
      {
        id: 'recent',
        label: 'Recent',
        badge: 8,
      },
      {
        id: 'shared',
        label: 'Shared with me',
        badge: 3,
      },
      {
        id: 'starred',
        label: 'Starred',
      },
      {
        id: 'customer-records',
        label: 'Customer Records',
        children: [
          {
            id: 'profiles',
            label: 'Profiles',
            badge: 156,
          },
          {
            id: 'identification',
            label: 'Identification',
            badge: 98,
          },
        ],
      },
      {
        id: 'accounts',
        label: 'Accounts and Transactions',
        children: [
          {
            id: 'statements',
            label: 'Statements',
            children: [
              { id: 'statements-2024', label: '2024', badge: 48 },
              { id: 'statements-2023', label: '2023' },
            ],
          },
          {
            id: 'receipts',
            label: 'Receipts',
            badge: 234,
          },
        ],
      },
      {
        id: 'compliance',
        label: 'Compliance Documents',
        children: [
          { id: 'kyc', label: 'KYC Records', badge: 67 },
          { id: 'aml', label: 'AML Reports', badge: 12 },
        ],
      },
      {
        id: 'trash',
        label: 'Trash',
        badge: 5,
      },
    ]

    return (
      <div className="w-80 h-[600px] border border-gray-200 dark:border-gray-800 rounded-lg bg-white dark:bg-gray-900 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-semibold">Digital Filing Cabinet</h2>
        </div>

        <div className="p-2 overflow-y-auto h-[calc(100%-60px)]">
          <TreeView
            data={dfcFolders}
            selectedId={selectedFolderId}
            onSelect={(node) => setSelectedFolderId(node.id)}
            defaultExpandedIds={['customer-records', 'accounts', 'statements']}
          />
        </div>
      </div>
    )
  },
}
