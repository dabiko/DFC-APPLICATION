import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { ThreePanelLayout, PanelHeader, PanelContent, PanelFooter } from './index'
import { TreeView } from '@components/Navigation/TreeView'
import type { TreeNode } from '@components/Navigation/TreeView'
import { HorizontalMenu } from '@components/Navigation/HorizontalMenu'
import { Table } from '@components/Table/Table'
import type { Column } from '@components/Table/Table'
import { Button } from '@components/Button'
import { Input } from '@components/Input'
import { ConfidentialityBadge } from '@components/Badge'
import { Tabs } from '@components/Navigation/Tabs'
import {
  DocumentTextIcon,
  MagnifyingGlassIcon,
  HomeIcon,
  FolderIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  BellIcon,
} from '@heroicons/react/24/outline'

const meta: Meta<typeof ThreePanelLayout> = {
  title: 'Components/Layout',
  component: ThreePanelLayout,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof ThreePanelLayout>

/**
 * Basic three-panel layout
 */
export const Basic: Story = {
  render: () => (
    <ThreePanelLayout
      header={
        <div className="px-4 py-3">
          <h1 className="text-xl font-bold">Digital Filing Cabinet</h1>
        </div>
      }
      leftPanel={
        <div className="p-4">
          <h2 className="font-semibold mb-4">Navigation</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">Left panel content</p>
        </div>
      }
      centerPanel={
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-4">Main Content</h2>
          <p className="text-gray-600 dark:text-gray-400">Center panel content</p>
        </div>
      }
      rightPanel={
        <div className="p-4">
          <h2 className="font-semibold mb-4">Details</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">Right panel content</p>
        </div>
      }
    />
  ),
}

/**
 * Without right panel
 */
export const WithoutRightPanel: Story = {
  render: () => (
    <ThreePanelLayout
      header={
        <div className="px-4 py-3">
          <h1 className="text-xl font-bold">Two Panel Layout</h1>
        </div>
      }
      leftPanel={
        <div className="p-4">
          <h2 className="font-semibold">Navigation</h2>
        </div>
      }
      centerPanel={
        <div className="p-6">
          <h2 className="text-2xl font-bold">Main Content</h2>
        </div>
      }
    />
  ),
}

/**
 * Complete DFC Application Example
 */
export const CompleteDFCApplication: Story = {
  render: () => {
    const [selectedFolderId, setSelectedFolderId] = useState('current')
    const [selectedDocId, setSelectedDocId] = useState<string>()

    const folderData: TreeNode[] = [
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
        id: 'financial',
        label: 'Financial Reports',
        children: [
          {
            id: 'q4-2024',
            label: 'Q4 2024',
            badge: 12,
          },
          {
            id: 'q3-2024',
            label: 'Q3 2024',
          },
        ],
      },
      {
        id: 'compliance',
        label: 'Compliance Documents',
        badge: 67,
      },
    ]

    interface Document {
      id: string
      name: string
      type: string
      size: string
      confidentiality: 'public' | 'internal' | 'confidential' | 'highly-confidential'
      dateModified: string
    }

    const documents: Document[] = [
      {
        id: '1',
        name: 'Financial Report Q4 2024.pdf',
        type: 'PDF',
        size: '2.4 MB',
        confidentiality: 'confidential',
        dateModified: '2024-01-15',
      },
      {
        id: '2',
        name: 'Employee Contract.docx',
        type: 'DOCX',
        size: '845 KB',
        confidentiality: 'highly-confidential',
        dateModified: '2024-01-14',
      },
      {
        id: '3',
        name: 'Company Policy.pdf',
        type: 'PDF',
        size: '156 KB',
        confidentiality: 'public',
        dateModified: '2024-01-13',
      },
    ]

    const columns: Column<Document>[] = [
      {
        id: 'name',
        header: 'Name',
        accessor: 'name',
        sortable: true,
        cell: (row) => (
          <div className="flex items-center gap-2">
            <DocumentTextIcon className="h-5 w-5 text-gray-400" />
            <span className="font-medium">{row.name}</span>
          </div>
        ),
      },
      {
        id: 'confidentiality',
        header: 'Confidentiality',
        width: 180,
        cell: (row) => <ConfidentialityBadge level={row.confidentiality} />,
      },
      {
        id: 'size',
        header: 'Size',
        accessor: 'size',
        width: 100,
        align: 'right',
      },
      {
        id: 'dateModified',
        header: 'Modified',
        accessor: 'dateModified',
        width: 120,
      },
    ]

    const selectedDoc = documents.find((d) => d.id === selectedDocId)

    return (
      <ThreePanelLayout
        header={
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Digital Filing Cabinet
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost">
                Settings
              </Button>
              <Button size="sm">Upload</Button>
            </div>
          </div>
        }
        leftPanel={
          <>
            <PanelHeader title="Folders" />
            <PanelContent>
              <TreeView
                data={folderData}
                selectedId={selectedFolderId}
                onSelect={(node) => setSelectedFolderId(node.id)}
                defaultExpandedIds={['customer-records', 'financial']}
              />
            </PanelContent>
          </>
        }
        centerPanel={
          <>
            <PanelHeader
              title="Documents"
              subtitle={`${documents.length} documents`}
              action={
                <Input
                  type="search"
                  placeholder="Search..."
                  leftIcon={<MagnifyingGlassIcon className="h-4 w-4" />}
                  className="w-64"
                />
              }
            />
            <PanelContent padding={false}>
              <Table
                columns={columns}
                data={documents}
                onRowClick={(doc) => setSelectedDocId(doc.id)}
                selectable
              />
            </PanelContent>
          </>
        }
        rightPanel={
          selectedDoc ? (
            <>
              <PanelHeader title="Document Details" />
              <PanelContent>
                <Tabs
                  variant="line"
                  items={[
                    {
                      label: 'Details',
                      content: (
                        <div className="space-y-4">
                          <div>
                            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                              Name
                            </label>
                            <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                              {selectedDoc.name}
                            </p>
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                              Type
                            </label>
                            <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                              {selectedDoc.type}
                            </p>
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                              Size
                            </label>
                            <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                              {selectedDoc.size}
                            </p>
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                              Confidentiality
                            </label>
                            <div className="mt-2">
                              <ConfidentialityBadge level={selectedDoc.confidentiality} />
                            </div>
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                              Last Modified
                            </label>
                            <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                              {selectedDoc.dateModified}
                            </p>
                          </div>
                        </div>
                      ),
                    },
                    {
                      label: 'Activity',
                      content: (
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          <p>No recent activity</p>
                        </div>
                      ),
                    },
                  ]}
                />
              </PanelContent>
              <PanelFooter>
                <div className="flex gap-2">
                  <Button size="sm" variant="primary" fullWidth>
                    Download
                  </Button>
                  <Button size="sm" variant="ghost" fullWidth>
                    Share
                  </Button>
                </div>
              </PanelFooter>
            </>
          ) : (
            <PanelContent>
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Select a document to view details
                </p>
              </div>
            </PanelContent>
          )
        }
      />
    )
  },
}

/**
 * Layout with Horizontal Menu in Header
 */
export const WithHorizontalMenu: Story = {
  render: () => {
    const [activeTab, setActiveTab] = useState(0)

    const menuItems = [
      { label: 'Dashboard', icon: <HomeIcon className="h-5 w-5" /> },
      { label: 'Documents', icon: <DocumentTextIcon className="h-5 w-5" />, badge: 24 },
      { label: 'Folders', icon: <FolderIcon className="h-5 w-5" /> },
      { label: 'Analytics', icon: <ChartBarIcon className="h-5 w-5" /> },
      { label: 'Settings', icon: <Cog6ToothIcon className="h-5 w-5" /> },
    ]

    return (
      <ThreePanelLayout
        header={
          <div>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Digital Filing Cabinet
              </h1>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg relative"
                >
                  <BellIcon className="h-5 w-5" />
                  <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full" />
                </button>
                <Button size="sm">Upload</Button>
              </div>
            </div>
            <div className="px-4">
              <HorizontalMenu
                variant="underline"
                items={menuItems.map((item, idx) => ({
                  ...item,
                  active: idx === activeTab,
                  onClick: () => setActiveTab(idx),
                }))}
              />
            </div>
          </div>
        }
        leftPanel={
          <div className="p-4">
            <h2 className="font-semibold mb-4">Folders</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Active: {menuItems[activeTab].label}
            </p>
          </div>
        }
        centerPanel={
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">{menuItems[activeTab].label}</h2>
            <p className="text-gray-600 dark:text-gray-400">
              Content for {menuItems[activeTab].label} section
            </p>
          </div>
        }
      />
    )
  },
}

/**
 * Layout with Pills Variant Horizontal Menu
 */
export const WithPillsMenu: Story = {
  render: () => {
    const [activeView, setActiveView] = useState(0)

    const views = [
      { label: 'All Files', badge: 156 },
      { label: 'Recent', badge: 12 },
      { label: 'Shared', badge: 8 },
      { label: 'Favorites' },
    ]

    return (
      <ThreePanelLayout
        header={
          <div className="px-4 py-3">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">File Manager</h1>
              <Button size="sm" variant="primary">
                New Folder
              </Button>
            </div>
            <HorizontalMenu
              variant="pills"
              items={views.map((item, idx) => ({
                ...item,
                active: idx === activeView,
                onClick: () => setActiveView(idx),
              }))}
            />
          </div>
        }
        leftPanel={
          <>
            <PanelHeader title="Quick Access" />
            <PanelContent>
              <div className="space-y-2">
                {views.map((view, idx) => (
                  <div
                    key={idx}
                    className="text-sm text-gray-600 dark:text-gray-400 flex justify-between items-center"
                  >
                    <span>{view.label}</span>
                    {view.badge && (
                      <span className="px-2 py-0.5 text-xs bg-gray-200 dark:bg-gray-700 rounded-full">
                        {view.badge}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </PanelContent>
          </>
        }
        centerPanel={
          <>
            <PanelHeader
              title={views[activeView].label}
              subtitle={`${views[activeView].badge || 0} items`}
            />
            <PanelContent>
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <DocumentTextIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No documents in {views[activeView].label}</p>
              </div>
            </PanelContent>
          </>
        }
      />
    )
  },
}

/**
 * Full Width Horizontal Menu with Tabs
 */
export const WithFullWidthMenu: Story = {
  render: () => {
    const [activeSection, setActiveSection] = useState(0)

    const sections = [
      { label: 'Files' },
      { label: 'Shared' },
      { label: 'Recent' },
      { label: 'Trash' },
    ]

    return (
      <ThreePanelLayout
        header={
          <div>
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Document Workspace
              </h1>
            </div>
            <HorizontalMenu
              variant="underline"
              fullWidth
              items={sections.map((item, idx) => ({
                ...item,
                active: idx === activeSection,
                onClick: () => setActiveSection(idx),
              }))}
            />
          </div>
        }
        leftPanel={
          <div className="p-4">
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-3">
              Categories
            </h2>
            <div className="space-y-1">
              <div className="px-3 py-2 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-lg text-sm font-medium">
                All Documents
              </div>
              <div className="px-3 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-sm">
                Images
              </div>
              <div className="px-3 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-sm">
                Videos
              </div>
            </div>
          </div>
        }
        centerPanel={
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">{sections[activeSection].label}</h2>
            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center"
                >
                  <span className="text-gray-400">Item {i}</span>
                </div>
              ))}
            </div>
          </div>
        }
        rightPanel={
          <PanelContent>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              <p>Select an item to view details</p>
            </div>
          </PanelContent>
        }
      />
    )
  },
}

/**
 * Compact Layout with Small Horizontal Menu
 */
export const CompactWithSmallMenu: Story = {
  render: () => {
    const [filter, setFilter] = useState(0)

    const filters = [
      { label: 'All', badge: 48 },
      { label: 'Active', badge: 12 },
      { label: 'Pending', badge: 5 },
      { label: 'Complete', badge: 31 },
    ]

    return (
      <ThreePanelLayout
        header={
          <div className="px-4 py-2 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Tasks</h1>
              <Button size="sm" variant="ghost">
                + New
              </Button>
            </div>
            <HorizontalMenu
              variant="pills"
              size="sm"
              items={filters.map((item, idx) => ({
                ...item,
                active: idx === filter,
                onClick: () => setFilter(idx),
              }))}
            />
          </div>
        }
        leftPanel={
          <div className="p-3">
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
              Projects
            </div>
            <div className="space-y-1 text-sm">
              <div className="px-2 py-1.5 bg-gray-100 dark:bg-gray-800 rounded">Project A</div>
              <div className="px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-800 rounded">
                Project B
              </div>
            </div>
          </div>
        }
        centerPanel={
          <PanelContent>
            <div className="space-y-2">
              {Array.from({ length: filters[filter].badge || 0 }).map((_, i) => (
                <div
                  key={i}
                  className="p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg"
                >
                  <div className="font-medium text-sm">Task {i + 1}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Status: {filters[filter].label}
                  </div>
                </div>
              ))}
            </div>
          </PanelContent>
        }
      />
    )
  },
}
