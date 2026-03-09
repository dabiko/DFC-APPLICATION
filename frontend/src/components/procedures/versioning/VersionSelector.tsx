/**
 * VersionSelector — Dropdowns for selecting from/to versions for comparison.
 */

import { ArrowRight } from 'lucide-react'
import type { ProcedureVersionListItem } from '@/types/procedure'

interface VersionSelectorProps {
  versions: ProcedureVersionListItem[]
  fromVersion: number | null
  toVersion: number | null
  onFromChange: (version: number) => void
  onToChange: (version: number) => void
}

export function VersionSelector({
  versions,
  fromVersion,
  toVersion,
  onFromChange,
  onToChange,
}: VersionSelectorProps) {
  return (
    <div className="flex items-center gap-3">
      <div>
        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">From</label>
        <select
          value={fromVersion ?? ''}
          onChange={(e) => onFromChange(Number(e.target.value))}
          className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
        >
          <option value="">Select version...</option>
          {versions.map((v) => (
            <option key={v.id} value={v.version_number} disabled={v.version_number === toVersion}>
              v{v.version_number} — {v.title}
            </option>
          ))}
        </select>
      </div>

      <ArrowRight className="h-4 w-4 text-gray-400 mt-5" />

      <div>
        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">To</label>
        <select
          value={toVersion ?? ''}
          onChange={(e) => onToChange(Number(e.target.value))}
          className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
        >
          <option value="">Select version...</option>
          {versions.map((v) => (
            <option key={v.id} value={v.version_number} disabled={v.version_number === fromVersion}>
              v{v.version_number} — {v.title}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
