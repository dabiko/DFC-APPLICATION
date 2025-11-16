import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { Table, ListView, GridView } from './index'
import type { Column } from './Table'
import { Badge, ConfidentialityBadge } from '@components/Badge'
import { Button } from '@components/Button'
import { DocumentTextIcon, FolderIcon, EllipsisVerticalIcon } from '@heroicons/react/24/outline'

const meta: Meta = {
  title: 'Components/Table & Lists',
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
}

export default meta

// Sample document data
interface Document {
  id: string
  name: string
  type: string
  size: string
  confidentiality: 'public' | 'internal' | 'confidential' | 'highly-confidential'
  dateModified: string
  owner: string
}

const sampleDocuments: Document[] = [
  {
    id: '1',
    name: 'Financial Report Q4 2024.pdf',
    type: 'PDF',
    size: '2.4 MB',
    confidentiality: 'confidential',
    dateModified: '2024-01-15',
    owner: 'John Doe',
  },
  {
    id: '2',
    name: 'Employee Contract - Jane Smith.docx',
    type: 'DOCX',
    size: '845 KB',
    confidentiality: 'highly-confidential',
    dateModified: '2024-01-14',
    owner: 'HR Department',
  },
  {
    id: '3',
    name: 'Company Policy.pdf',
    type: 'PDF',
    size: '156 KB',
    confidentiality: 'public',
    dateModified: '2024-01-13',
    owner: 'Admin',
  },
  {
    id: '4',
    name: 'Board Meeting Minutes.pdf',
    type: 'PDF',
    size: '1.2 MB',
    confidentiality: 'highly-confidential',
    dateModified: '2024-01-12',
    owner: 'Executive Team',
  },
  {
    id: '5',
    name: 'Marketing Plan 2024.pptx',
    type: 'PPTX',
    size: '5.8 MB',
    confidentiality: 'internal',
    dateModified: '2024-01-11',
    owner: 'Marketing',
  },
]

/**
 * Table - Basic
 */
export const TableBasic: StoryObj = {
  render: () => {
    const columns: Column<Document>[] = [
      {
        id: 'name',
        header: 'Name',
        accessor: 'name',
        sortable: true,
      },
      {
        id: 'type',
        header: 'Type',
        accessor: 'type',
        width: 100,
        sortable: true,
      },
      {
        id: 'size',
        header: 'Size',
        accessor: 'size',
        width: 120,
        align: 'right',
        sortable: true,
      },
      {
        id: 'dateModified',
        header: 'Date Modified',
        accessor: 'dateModified',
        width: 140,
        sortable: true,
      },
    ]

    return <Table columns={columns} data={sampleDocuments} />
  },
}

/**
 * Table - With selection
 */
export const TableWithSelection: StoryObj = {
  render: () => {
    const [selectedIds, setSelectedIds] = useState<string[]>([])

    const columns: Column<Document>[] = [
      { id: 'name', header: 'Name', accessor: 'name', sortable: true },
      { id: 'type', header: 'Type', accessor: 'type', width: 100 },
      { id: 'size', header: 'Size', accessor: 'size', width: 120, align: 'right' },
      { id: 'dateModified', header: 'Date Modified', accessor: 'dateModified', width: 140 },
    ]

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {selectedIds.length} item(s) selected
          </p>
          {selectedIds.length > 0 && (
            <div className="flex gap-2">
              <Button size="sm">Download</Button>
              <Button size="sm" variant="danger">
                Delete
              </Button>
            </div>
          )}
        </div>

        <Table
          columns={columns}
          data={sampleDocuments}
          selectable
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
        />
      </div>
    )
  },
}

/**
 * Table - With custom cells and sorting
 */
export const TableWithCustomCells: StoryObj = {
  render: () => {
    const [sortColumn, setSortColumn] = useState<string>('name')
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>('asc')

    const columns: Column<Document>[] = [
      {
        id: 'name',
        header: 'Document Name',
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
        accessor: 'confidentiality',
        width: 180,
        sortable: true,
        cell: (row) => <ConfidentialityBadge level={row.confidentiality} />,
      },
      {
        id: 'owner',
        header: 'Owner',
        accessor: 'owner',
        width: 150,
      },
      {
        id: 'dateModified',
        header: 'Last Modified',
        accessor: 'dateModified',
        width: 140,
        sortable: true,
      },
      {
        id: 'actions',
        header: 'Actions',
        width: 80,
        align: 'center',
        cell: () => (
          <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
            <EllipsisVerticalIcon className="h-5 w-5 text-gray-500" />
          </button>
        ),
      },
    ]

    // Simple client-side sorting
    const sortedData = [...sampleDocuments].sort((a, b) => {
      if (!sortColumn || !sortDirection) return 0

      const aValue = a[sortColumn as keyof Document]
      const bValue = b[sortColumn as keyof Document]

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    return (
      <Table
        columns={columns}
        data={sortedData}
        sortColumn={sortColumn}
        sortDirection={sortDirection}
        onSortChange={(column, direction) => {
          setSortColumn(column)
          setSortDirection(direction)
        }}
        onRowClick={(row) => console.log('Clicked:', row.name)}
      />
    )
  },
}

/**
 * Table - Dense and striped
 */
export const TableDenseStriped: StoryObj = {
  render: () => {
    const columns: Column<Document>[] = [
      { id: 'name', header: 'Name', accessor: 'name' },
      { id: 'type', header: 'Type', accessor: 'type', width: 100 },
      { id: 'size', header: 'Size', accessor: 'size', width: 100 },
    ]

    return <Table columns={columns} data={sampleDocuments} dense striped />
  },
}

/**
 * Table - Loading and empty states
 */
export const TableStates: StoryObj = {
  render: () => {
    const [isLoading, setIsLoading] = useState(false)
    const [showEmpty, setShowEmpty] = useState(false)

    const columns: Column<Document>[] = [
      { id: 'name', header: 'Name', accessor: 'name' },
      { id: 'type', header: 'Type', accessor: 'type' },
    ]

    return (
      <div className="space-y-4">
        <div className="flex gap-2">
          <Button size="sm" onClick={() => setIsLoading(!isLoading)}>
            Toggle Loading
          </Button>
          <Button size="sm" onClick={() => setShowEmpty(!showEmpty)}>
            Toggle Empty
          </Button>
        </div>

        <Table
          columns={columns}
          data={showEmpty ? [] : sampleDocuments}
          loading={isLoading}
          emptyMessage="No documents found. Try adjusting your filters."
        />
      </div>
    )
  },
}

/**
 * ListView - Basic
 */
export const ListViewBasic: StoryObj = {
  render: () => {
    const items = sampleDocuments.map((doc) => ({
      id: doc.id,
      title: doc.name,
      subtitle: `${doc.type} • ${doc.size} • Modified ${doc.dateModified}`,
      leading: <DocumentTextIcon className="h-5 w-5" />,
      trailing: <ConfidentialityBadge level={doc.confidentiality} />,
    }))

    return <ListView items={items} />
  },
}

/**
 * ListView - With selection
 */
export const ListViewWithSelection: StoryObj = {
  render: () => {
    const [selectedIds, setSelectedIds] = useState<string[]>([])

    const items = sampleDocuments.map((doc) => ({
      id: doc.id,
      title: doc.name,
      subtitle: `Owner: ${doc.owner} • ${doc.dateModified}`,
      leading: <DocumentTextIcon className="h-5 w-5" />,
      trailing: <ConfidentialityBadge level={doc.confidentiality} dotOnly />,
    }))

    return (
      <div className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {selectedIds.length} item(s) selected
        </p>

        <ListView
          items={items}
          selectable
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          onItemClick={(item) => console.log('Clicked:', item.title)}
        />
      </div>
    )
  },
}

/**
 * ListView - Dense variant
 */
export const ListViewDense: StoryObj = {
  render: () => {
    const items = sampleDocuments.map((doc) => ({
      id: doc.id,
      title: doc.name,
      subtitle: doc.type,
      trailing: (
        <Badge variant="gray" size="sm">
          {doc.size}
        </Badge>
      ),
    }))

    return <ListView items={items} dense divided={false} />
  },
}

/**
 * GridView - Folders
 */
export const GridViewFolders: StoryObj = {
  render: () => {
    const folders = [
      { id: '1', name: 'Customer Records', count: 156 },
      { id: '2', name: 'Financial Reports', count: 48 },
      { id: '3', name: 'Compliance', count: 67 },
      { id: '4', name: 'HR Documents', count: 234 },
      { id: '5', name: 'Legal', count: 89 },
      { id: '6', name: 'Marketing', count: 123 },
    ]

    const items = folders.map((folder) => ({
      id: folder.id,
      title: folder.name,
      subtitle: `${folder.count} items`,
      icon: <FolderIcon className="h-12 w-12 text-blue-600 dark:text-blue-400" />,
    }))

    return (
      <GridView
        items={items}
        columns={4}
        onItemClick={(item) => console.log('Open:', item.title)}
      />
    )
  },
}

/**
 * GridView - Documents with selection
 */
export const GridViewDocuments: StoryObj = {
  render: () => {
    const [selectedIds, setSelectedIds] = useState<string[]>([])

    const items = sampleDocuments.map((doc) => ({
      id: doc.id,
      title: doc.name,
      subtitle: doc.size,
      icon: <DocumentTextIcon className="h-12 w-12" />,
      badge: <ConfidentialityBadge level={doc.confidentiality} dotOnly />,
    }))

    return (
      <div className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {selectedIds.length} item(s) selected
        </p>

        <GridView
          items={items}
          columns={4}
          selectable
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          onItemClick={(item) => console.log('Open:', item.title)}
        />
      </div>
    )
  },
}

/**
 * GridView - Different sizes
 */
export const GridViewSizes: StoryObj = {
  render: () => {
    const items = [
      { id: '1', title: 'Document 1', icon: <DocumentTextIcon /> },
      { id: '2', title: 'Document 2', icon: <DocumentTextIcon /> },
      { id: '3', title: 'Document 3', icon: <DocumentTextIcon /> },
    ]

    return (
      <div className="space-y-8">
        <div>
          <h3 className="text-sm font-semibold mb-3">Small</h3>
          <GridView items={items} columns={3} size="sm" />
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-3">Medium (default)</h3>
          <GridView items={items} columns={3} size="md" />
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-3">Large</h3>
          <GridView items={items} columns={3} size="lg" />
        </div>
      </div>
    )
  },
}

/**
 * DFC Document Browser Example
 */
export const DFCDocumentBrowser: StoryObj = {
  render: () => {
    const [view, setView] = useState<'table' | 'list' | 'grid'>('table')
    const [selectedIds, setSelectedIds] = useState<string[]>([])

    const tableColumns: Column<Document>[] = [
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

    const listItems = sampleDocuments.map((doc) => ({
      id: doc.id,
      title: doc.name,
      subtitle: `${doc.size} • ${doc.dateModified} • ${doc.owner}`,
      leading: <DocumentTextIcon className="h-5 w-5" />,
      trailing: <ConfidentialityBadge level={doc.confidentiality} />,
    }))

    const gridItems = sampleDocuments.map((doc) => ({
      id: doc.id,
      title: doc.name,
      subtitle: doc.size,
      icon: <DocumentTextIcon className="h-12 w-12" />,
      badge: <ConfidentialityBadge level={doc.confidentiality} dotOnly />,
    }))

    return (
      <div className="w-full space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Documents</h2>
            <p className="text-sm text-gray-500">
              {sampleDocuments.length} documents • {selectedIds.length} selected
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              size="sm"
              variant={view === 'table' ? 'primary' : 'ghost'}
              onClick={() => setView('table')}
            >
              Table
            </Button>
            <Button
              size="sm"
              variant={view === 'list' ? 'primary' : 'ghost'}
              onClick={() => setView('list')}
            >
              List
            </Button>
            <Button
              size="sm"
              variant={view === 'grid' ? 'primary' : 'ghost'}
              onClick={() => setView('grid')}
            >
              Grid
            </Button>
          </div>
        </div>

        {view === 'table' && (
          <Table
            columns={tableColumns}
            data={sampleDocuments}
            selectable
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
          />
        )}

        {view === 'list' && (
          <ListView
            items={listItems}
            selectable
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
          />
        )}

        {view === 'grid' && (
          <GridView
            items={gridItems}
            columns={4}
            selectable
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
          />
        )}
      </div>
    )
  },
}
