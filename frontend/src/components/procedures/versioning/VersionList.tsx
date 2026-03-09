/**
 * VersionList — List of published versions.
 */

import { History } from 'lucide-react'
import { VersionCard } from './VersionCard'
import type { ProcedureVersionListItem } from '@/types/procedure'

interface VersionListProps {
  versions: ProcedureVersionListItem[]
  selectedId?: string
  onSelect: (version: ProcedureVersionListItem) => void
  onRetire?: (versionNumber: number) => void
}

export function VersionList({ versions, selectedId, onSelect, onRetire }: VersionListProps) {
  if (versions.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-gray-400">
        <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
        No published versions yet.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {versions.map((v) => (
        <VersionCard
          key={v.id}
          version={v}
          selected={v.id === selectedId}
          onView={() => onSelect(v)}
          onRetire={onRetire ? () => onRetire(v.version_number) : undefined}
        />
      ))}
    </div>
  )
}
