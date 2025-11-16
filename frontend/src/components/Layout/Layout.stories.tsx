import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { ThreePanelLayout, PanelHeader, PanelContent, PanelFooter } from './index'
import { TreeView } from '@components/Navigation/TreeView'
import type { TreeNode } from '@components/Navigation/TreeView'
import { Table } from '@components/Table/Table'
import type { Column } from '@components/Table/Table'
import { Button } from '@components/Button'
import { Input } from '@components/Input'
import { ConfidentialityBadge } from '@components/Badge'
import { Tabs } from '@components/Navigation/Tabs'
import { DocumentTextIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'

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
