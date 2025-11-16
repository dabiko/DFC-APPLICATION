import { useState, ReactNode } from 'react'
import {
  ChevronRightIcon,
  ChevronDownIcon,
  FolderIcon,
  FolderOpenIcon,
} from '@heroicons/react/24/outline'
import { cn } from '@utils/cn'

export interface TreeNode {
  /** Unique identifier */
  id: string
  /** Node label */
  label: string
  /** Child nodes */
  children?: TreeNode[]
  /** Custom icon */
  icon?: ReactNode
  /** Badge/count */
  badge?: number | string
  /** Disabled state */
  disabled?: boolean
  /** Additional metadata */
  metadata?: Record<string, any>
}

export interface TreeViewProps {
  /** Tree data */
  data: TreeNode[]
  /** Selected node ID */
  selectedId?: string
  /** Callback when node is selected */
  onSelect?: (node: TreeNode) => void
  /** Expanded node IDs */
  expandedIds?: string[]
  /** Callback when node expand/collapse changes */
  onExpandChange?: (nodeId: string, expanded: boolean) => void
  /** Default expanded node IDs */
  defaultExpandedIds?: string[]
  /** Show folder icons */
  showIcons?: boolean
  /** Indent size per level (in pixels) */
  indentSize?: number
  /** Allow multi-selection */
  multiSelect?: boolean
  /** Custom class name */
  className?: string
}

/**
 * TreeView component
 *
 * A hierarchical tree structure for navigation.
 * Essential for the DFC folder navigation in the left panel.
 *
 * @example
 * ```tsx
 * <TreeView
 *   data={folderStructure}
 *   selectedId={selectedFolderId}
 *   onSelect={(node) => navigateToFolder(node.id)}
 *   showIcons
 * />
 * ```
 */
export function TreeView({
  data,
  selectedId,
  onSelect,
  expandedIds,
  onExpandChange,
  defaultExpandedIds = [],
  showIcons = true,
  indentSize = 20,
  className,
}: TreeViewProps) {
  const [internalExpandedIds, setInternalExpandedIds] = useState<Set<string>>(
    new Set(defaultExpandedIds)
  )

  const currentExpandedIds = expandedIds !== undefined ? new Set(expandedIds) : internalExpandedIds

  const handleToggle = (nodeId: string) => {
    const isExpanded = currentExpandedIds.has(nodeId)
    const newExpanded = !isExpanded

    if (expandedIds === undefined) {
      // Uncontrolled mode
      setInternalExpandedIds((prev) => {
        const next = new Set(prev)
        if (newExpanded) {
          next.add(nodeId)
        } else {
          next.delete(nodeId)
        }
        return next
      })
    }

    onExpandChange?.(nodeId, newExpanded)
  }

  const handleSelect = (node: TreeNode) => {
    if (node.disabled) return
    onSelect?.(node)
  }

  return (
    <div className={cn('text-sm', className)} role="tree">
      {data.map((node) => (
        <TreeNode
          key={node.id}
          node={node}
          level={0}
          selectedId={selectedId}
          expandedIds={currentExpandedIds}
          onToggle={handleToggle}
          onSelect={handleSelect}
          showIcons={showIcons}
          indentSize={indentSize}
        />
      ))}
    </div>
  )
}

interface TreeNodeProps {
  node: TreeNode
  level: number
  selectedId?: string
  expandedIds: Set<string>
  onToggle: (nodeId: string) => void
  onSelect: (node: TreeNode) => void
  showIcons: boolean
  indentSize: number
}

function TreeNode({
  node,
  level,
  selectedId,
  expandedIds,
  onToggle,
  onSelect,
  showIcons,
  indentSize,
}: TreeNodeProps) {
  const hasChildren = node.children && node.children.length > 0
  const isExpanded = expandedIds.has(node.id)
  const isSelected = selectedId === node.id

  const handleClick = () => {
    if (hasChildren) {
      onToggle(node.id)
    }
    onSelect(node)
  }

  const handleChevronClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (hasChildren) {
      onToggle(node.id)
    }
  }

  return (
    <div role="treeitem" aria-expanded={hasChildren ? isExpanded : undefined}>
      <button
        type="button"
        onClick={handleClick}
        disabled={node.disabled}
        className={cn(
          'w-full flex items-center gap-2 px-2 py-1.5 text-left rounded-md transition-colors',
          'hover:bg-gray-100 dark:hover:bg-gray-800',
          'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
          isSelected &&
            'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300',
          node.disabled && 'opacity-50 cursor-not-allowed'
        )}
        style={{ paddingLeft: `${level * indentSize + 8}px` }}
      >
        {/* Chevron icon for expandable nodes */}
        <span
          onClick={handleChevronClick}
          className={cn('flex-shrink-0 transition-transform', !hasChildren && 'invisible')}
        >
          {isExpanded ? (
            <ChevronDownIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          ) : (
            <ChevronRightIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          )}
        </span>

        {/* Node icon */}
        {showIcons && (
          <span className="flex-shrink-0">
            {node.icon ? (
              node.icon
            ) : hasChildren ? (
              isExpanded ? (
                <FolderOpenIcon className="h-4 w-4 text-primary-600 dark:text-primary-400" />
              ) : (
                <FolderIcon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              )
            ) : (
              <div className="h-4 w-4" /> // Placeholder for alignment
            )}
          </span>
        )}

        {/* Node label */}
        <span className="flex-1 truncate font-medium text-gray-900 dark:text-gray-100">
          {node.label}
        </span>

        {/* Badge */}
        {node.badge !== undefined && (
          <span className="flex-shrink-0 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 text-xs font-semibold rounded-full bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
            {node.badge}
          </span>
        )}
      </button>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div role="group">
          {node.children!.map((childNode) => (
            <TreeNode
              key={childNode.id}
              node={childNode}
              level={level + 1}
              selectedId={selectedId}
              expandedIds={expandedIds}
              onToggle={onToggle}
              onSelect={onSelect}
              showIcons={showIcons}
              indentSize={indentSize}
            />
          ))}
        </div>
      )}
    </div>
  )
}
