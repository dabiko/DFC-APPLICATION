/**
 * VersionDiffViewer — Side-by-side diff display for version comparisons.
 */

import { useState, useEffect } from 'react'
import { Loader2, AlertTriangle, RefreshCw } from 'lucide-react'
import { VersionSelector } from './VersionSelector'
import { DiffStepCard } from './DiffStepCard'
import { DiffFieldHighlight } from './DiffFieldHighlight'
import { diffVersions } from '@/services/procedureService'
import type { ProcedureVersionListItem, VersionDiff } from '@/types/procedure'

interface VersionDiffViewerProps {
  procedureId: string
  versions: ProcedureVersionListItem[]
}

export function VersionDiffViewer({ procedureId, versions }: VersionDiffViewerProps) {
  const [fromVersion, setFromVersion] = useState<number | null>(
    versions.length >= 2 ? versions[versions.length - 2].version_number : null
  )
  const [toVersion, setToVersion] = useState<number | null>(
    versions.length >= 1 ? versions[versions.length - 1].version_number : null
  )
  const [diff, setDiff] = useState<VersionDiff | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!fromVersion || !toVersion || fromVersion === toVersion) {
      setDiff(null)
      return
    }
    setLoading(true)
    setError(null)
    diffVersions(procedureId, fromVersion, toVersion)
      .then(setDiff)
      .catch((err) => {
        setError(err?.response?.data?.detail || 'Failed to load diff')
      })
      .finally(() => setLoading(false))
  }, [procedureId, fromVersion, toVersion])

  return (
    <div className="space-y-4">
      <VersionSelector
        versions={versions}
        fromVersion={fromVersion}
        toVersion={toVersion}
        onFromChange={setFromVersion}
        onToChange={setToVersion}
      />

      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
          <span className="ml-2 text-sm text-gray-500">Computing diff...</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
          <AlertTriangle className="h-4 w-4" />
          {error}
        </div>
      )}

      {diff && !loading && (
        <div className="space-y-4">
          {/* Metadata changes */}
          {Object.keys(diff.metadata_changes).length > 0 && (
            <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-yellow-500" />
                Metadata Changes
              </h3>
              <div className="space-y-2">
                {Object.entries(diff.metadata_changes).map(([field, { from, to }]) => (
                  <DiffFieldHighlight key={field} label={field} from={from} to={to} />
                ))}
              </div>
            </div>
          )}

          {/* Step changes */}
          {diff.step_changes.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                Step Changes ({diff.step_changes.length})
              </h3>
              <div className="space-y-2">
                {diff.step_changes.map((change, idx) => (
                  <DiffStepCard key={idx} change={change} />
                ))}
              </div>
            </div>
          )}

          {/* Summary */}
          {Object.keys(diff.metadata_changes).length === 0 && diff.step_changes.length === 0 && (
            <div className="text-center py-8 text-sm text-gray-400">
              No differences found between v{fromVersion} and v{toVersion}.
            </div>
          )}
        </div>
      )}

      {!fromVersion || !toVersion ? (
        <div className="text-center py-8 text-sm text-gray-400">
          Select two versions to compare.
        </div>
      ) : null}
    </div>
  )
}
