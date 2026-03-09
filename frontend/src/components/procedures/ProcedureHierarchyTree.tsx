/**
 * ProcedureHierarchyTree — Parent-child procedure tree view.
 */

import { useState, useEffect } from 'react'
import { ChevronDown, ChevronRight, FileText, Loader2 } from 'lucide-react'
import { listProcedures } from '@/services/procedureService'
import { ProcedureStatusBadge } from './ProcedureStatusBadge'
import type { Procedure } from '@/types/procedure'

interface ProcedureHierarchyTreeProps {
  onSelect: (procedureId: string) => void
  selectedId?: string
}

interface TreeNode {
  procedure: Procedure
  children: TreeNode[]
}

function buildTree(procedures: Procedure[]): TreeNode[] {
  const byId = new Map<string, TreeNode>()
  const roots: TreeNode[] = []

  procedures.forEach((p) => {
    byId.set(p.id, { procedure: p, children: [] })
  })

  procedures.forEach((p) => {
    const node = byId.get(p.id)!
    if (p.parent_procedure && byId.has(p.parent_procedure)) {
      byId.get(p.parent_procedure)!.children.push(node)
    } else {
      roots.push(node)
    }
  })

  return roots
}

export function ProcedureHierarchyTree({ onSelect, selectedId }: ProcedureHierarchyTreeProps) {
  const [nodes, setNodes] = useState<TreeNode[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    listProcedures()
      .then((data) => setNodes(buildTree(data.results)))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
      </div>
    )
  }

  if (nodes.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-4">No procedures found.</p>
  }

  return (
    <div className="space-y-0.5">
      {nodes.map((node) => (
        <TreeNodeItem
          key={node.procedure.id}
          node={node}
          depth={0}
          onSelect={onSelect}
          selectedId={selectedId}
        />
      ))}
    </div>
  )
}

function TreeNodeItem({
  node,
  depth,
  onSelect,
  selectedId,
}: {
  node: TreeNode
  depth: number
  onSelect: (id: string) => void
  selectedId?: string
}) {
  const [expanded, setExpanded] = useState(false)
  const hasChildren = node.children.length > 0
  const isSelected = node.procedure.id === selectedId

  return (
    <div>
      <div
        className={`flex items-center gap-2 rounded-md px-2 py-1.5 cursor-pointer transition-colors ${
          isSelected
            ? 'bg-blue-100 dark:bg-blue-900/30'
            : 'hover:bg-gray-100 dark:hover:bg-gray-700'
        }`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => onSelect(node.procedure.id)}
      >
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation()
              setExpanded(!expanded)
            }}
            className="p-0.5"
          >
            {expanded ? (
              <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
            )}
          </button>
        ) : (
          <span className="w-4.5" />
        )}
        <FileText className="h-4 w-4 text-blue-500 flex-shrink-0" />
        <span className="flex-1 text-sm text-gray-900 dark:text-gray-100 truncate">
          {node.procedure.title}
        </span>
        <ProcedureStatusBadge state={node.procedure.state} className="text-[10px] px-1.5 py-0" />
      </div>

      {expanded &&
        node.children.map((child) => (
          <TreeNodeItem
            key={child.procedure.id}
            node={child}
            depth={depth + 1}
            onSelect={onSelect}
            selectedId={selectedId}
          />
        ))}
    </div>
  )
}
