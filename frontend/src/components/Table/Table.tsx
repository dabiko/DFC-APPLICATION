import { ReactNode, useState } from 'react'
import { ChevronUpIcon, ChevronDownIcon, ChevronUpDownIcon } from '@heroicons/react/24/outline'
import { Checkbox } from '@components/Checkbox'
import { cn } from '@utils/cn'

export type SortDirection = 'asc' | 'desc' | null

export interface Column<T = any> {
  /** Unique column identifier */
  id: string
  /** Column header label */
  header: string | ReactNode
  /** Accessor function or key */
  accessor?: keyof T | ((row: T) => any)
  /** Custom cell renderer */
  cell?: (row: T, index: number) => ReactNode
  /** Enable sorting for this column */
  sortable?: boolean
  /** Column width */
  width?: string | number
  /** Column alignment */
  align?: 'left' | 'center' | 'right'
  /** Hide column on small screens */
  hideOnMobile?: boolean
}

export interface TableProps<T = any> {
  /** Table columns configuration */
  columns: Column<T>[]
  /** Table data */
  data: T[]
  /** Enable row selection */
  selectable?: boolean
  /** Selected row IDs */
  selectedIds?: string[]
  /** Callback when selection changes */
  onSelectionChange?: (selectedIds: string[]) => void
  /** Row ID accessor */
  getRowId?: (row: T, index: number) => string
  /** Callback when row is clicked */
  onRowClick?: (row: T, index: number) => void
  /** Sort column ID */
  sortColumn?: string
  /** Sort direction */
  sortDirection?: SortDirection
  /** Callback when sort changes */
  onSortChange?: (columnId: string, direction: SortDirection) => void
  /** Enable hover effect on rows */
  hoverable?: boolean
  /** Enable striped rows */
  striped?: boolean
  /** Dense padding */
  dense?: boolean
  /** Loading state */
  loading?: boolean
  /** Empty state message */
  emptyMessage?: string
  /** Custom class name */
  className?: string
}

/**
 * Table component
 *
 * A flexible data table with sorting, selection, and customizable columns.
 * Essential for displaying document lists in the DFC application.
 *
 * @example
 * ```tsx
 * <Table
 *   columns={[
 *     { id: 'name', header: 'Name', accessor: 'name', sortable: true },
 *     { id: 'date', header: 'Date', accessor: 'date', sortable: true }
 *   ]}
 *   data={documents}
 *   selectable
 *   onRowClick={(doc) => openDocument(doc.id)}
 * />
 * ```
 */
export function Table<T = any>({
  columns,
  data,
  selectable = false,
  selectedIds = [],
  onSelectionChange,
  getRowId = (_, index) => String(index),
  onRowClick,
  sortColumn,
  sortDirection,
  onSortChange,
  hoverable = true,
  striped = false,
  dense = false,
  loading = false,
  emptyMessage = 'No data available',
  className,
}: TableProps<T>) {
  const [internalSelectedIds, setInternalSelectedIds] = useState<Set<string>>(new Set())
  const currentSelectedIds = selectedIds.length > 0 ? new Set(selectedIds) : internalSelectedIds

  const allRowIds = data.map((row, index) => getRowId(row, index))
  const isAllSelected = allRowIds.length > 0 && allRowIds.every((id) => currentSelectedIds.has(id))
  const isSomeSelected = allRowIds.some((id) => currentSelectedIds.has(id)) && !isAllSelected

  const handleSelectAll = () => {
    const newSelectedIds = isAllSelected ? new Set<string>() : new Set(allRowIds)

    if (selectedIds.length === 0) {
      setInternalSelectedIds(newSelectedIds)
    }

    onSelectionChange?.(Array.from(newSelectedIds))
  }

  const handleSelectRow = (rowId: string) => {
    const newSelectedIds = new Set(currentSelectedIds)

    if (newSelectedIds.has(rowId)) {
      newSelectedIds.delete(rowId)
    } else {
      newSelectedIds.add(rowId)
    }

    if (selectedIds.length === 0) {
      setInternalSelectedIds(newSelectedIds)
    }

    onSelectionChange?.(Array.from(newSelectedIds))
  }

  const handleSort = (columnId: string) => {
    let newDirection: SortDirection = 'asc'

    if (sortColumn === columnId) {
      if (sortDirection === 'asc') {
        newDirection = 'desc'
      } else if (sortDirection === 'desc') {
        newDirection = null
      }
    }

    onSortChange?.(columnId, newDirection)
  }

  const getCellValue = (row: T, column: Column<T>) => {
    if (column.cell) {
      return null // Will be handled by custom cell renderer
    }

    if (typeof column.accessor === 'function') {
      return column.accessor(row)
    }

    if (column.accessor) {
      return row[column.accessor]
    }

    return null
  }

  if (loading) {
    return (
      <div
        className={cn('w-full rounded-lg border border-gray-200 dark:border-gray-800', className)}
      >
        <div className="p-8 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div
        className={cn('w-full rounded-lg border border-gray-200 dark:border-gray-800', className)}
      >
        <div className="p-8 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">{emptyMessage}</p>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'w-full overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800',
        className
      )}
    >
      <table className="w-full divide-y divide-gray-200 dark:divide-gray-800">
        <thead className="bg-gray-50 dark:bg-gray-900">
          <tr>
            {selectable && (
              <th className={cn('px-4', dense ? 'py-2' : 'py-3', 'w-12')}>
                <Checkbox
                  checked={isAllSelected}
                  indeterminate={isSomeSelected}
                  onChange={handleSelectAll}
                  aria-label="Select all rows"
                />
              </th>
            )}

            {columns.map((column) => (
              <th
                key={column.id}
                className={cn(
                  'px-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider',
                  dense ? 'py-2' : 'py-3',
                  column.align === 'center' && 'text-center',
                  column.align === 'right' && 'text-right',
                  column.hideOnMobile && 'hidden md:table-cell',
                  column.sortable &&
                    'cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-gray-800'
                )}
                style={{ width: column.width }}
                onClick={() => column.sortable && handleSort(column.id)}
              >
                <div className="flex items-center gap-2">
                  {column.header}
                  {column.sortable && (
                    <span className="flex-shrink-0">
                      {sortColumn === column.id ? (
                        sortDirection === 'asc' ? (
                          <ChevronUpIcon className="h-4 w-4" />
                        ) : sortDirection === 'desc' ? (
                          <ChevronDownIcon className="h-4 w-4" />
                        ) : (
                          <ChevronUpDownIcon className="h-4 w-4 text-gray-400" />
                        )
                      ) : (
                        <ChevronUpDownIcon className="h-4 w-4 text-gray-400" />
                      )}
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>

        <tbody
          className={cn(
            'bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800',
            striped && 'divide-y-0'
          )}
        >
          {data.map((row, rowIndex) => {
            const rowId = getRowId(row, rowIndex)
            const isSelected = currentSelectedIds.has(rowId)

            return (
              <tr
                key={rowId}
                onClick={() => onRowClick?.(row, rowIndex)}
                className={cn(
                  'transition-colors',
                  hoverable && 'hover:bg-gray-50 dark:hover:bg-gray-800',
                  striped && rowIndex % 2 === 1 && 'bg-gray-50 dark:bg-gray-800/50',
                  isSelected && 'bg-primary-50 dark:bg-primary-900/20',
                  onRowClick && 'cursor-pointer'
                )}
              >
                {selectable && (
                  <td className={cn('px-4', dense ? 'py-2' : 'py-3')}>
                    <Checkbox
                      checked={isSelected}
                      onChange={() => handleSelectRow(rowId)}
                      aria-label={`Select row ${rowIndex + 1}`}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </td>
                )}

                {columns.map((column) => (
                  <td
                    key={column.id}
                    className={cn(
                      'px-4 text-sm text-gray-900 dark:text-gray-100',
                      dense ? 'py-2' : 'py-3',
                      column.align === 'center' && 'text-center',
                      column.align === 'right' && 'text-right',
                      column.hideOnMobile && 'hidden md:table-cell'
                    )}
                  >
                    {column.cell ? column.cell(row, rowIndex) : getCellValue(row, column)}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
