/**
 * VersionHistoryList Component
 * Displays a list of document versions with comparison and management features
 */

import { FC, useState, useMemo } from 'react'
import { VersionCard } from './VersionCard'
import { Button } from '@components/Button/Button'
import { Select } from '@components/Input/Select'
import type { VersionHistoryListProps, DocumentVersion } from '@/types/version'
import { sortVersions, calculateVersionStatistics, formatFileSize } from '@/utils/versionUtils'
import { cn } from '@utils/cn'

export const VersionHistoryList: FC<VersionHistoryListProps> = ({
  documentId,
  versions,
  currentVersionId,
  onViewVersion,
  onDownloadVersion,
  onRestoreVersion,
  onCompareVersions,
  isLoading = false,
  canRestore = true,
  canDelete = true,
  className,
}) => {
  const [sortBy, setSortBy] = useState<'versionNumber' | 'createdAt' | 'fileSize'>('versionNumber')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [selectedVersions, setSelectedVersions] = useState<Set<string>>(new Set())

  // Sort and calculate statistics
  const sortedVersions = useMemo(() => {
    return sortVersions(versions, sortBy, sortOrder)
  }, [versions, sortBy, sortOrder])

  const stats = useMemo(() => {
    return calculateVersionStatistics(versions)
  }, [versions])

  // Handle version selection for comparison
  const handleSelectVersion = (version: DocumentVersion) => {
    const newSelected = new Set(selectedVersions)

    if (newSelected.has(version.id)) {
      newSelected.delete(version.id)
    } else {
      // Only allow 2 versions to be selected
      if (newSelected.size >= 2) {
        const firstItem = Array.from(newSelected)[0]
        newSelected.delete(firstItem)
      }
      newSelected.add(version.id)
    }

    setSelectedVersions(newSelected)
  }

  // Handle compare action
  const handleCompare = () => {
    if (selectedVersions.size === 2 && onCompareVersions) {
      const selectedIds = Array.from(selectedVersions)
      const version1 = versions.find((v) => v.id === selectedIds[0])
      const version2 = versions.find((v) => v.id === selectedIds[1])

      if (version1 && version2) {
        onCompareVersions(version1, version2)
        setSelectedVersions(new Set())
      }
    }
  }

  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center py-12', className)}>
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Loading versions...</p>
        </div>
      </div>
    )
  }

  if (versions.length === 0) {
    return (
      <div
        className={cn(
          'text-center py-12 bg-gray-50 dark:bg-gray-900 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700',
          className
        )}
      >
        <p className="text-gray-600 dark:text-gray-400">No version history available</p>
        <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
          Versions will appear here as you upload new files
        </p>
      </div>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Statistics Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Total Versions
          </p>
          <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            {stats.totalVersions}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Current Version
          </p>
          <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            v{stats.currentVersion}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Total Storage
          </p>
          <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            {formatFileSize(stats.totalStorageSize)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Contributors
          </p>
          <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            {stats.contributorCount}
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="min-w-[160px]"
          >
            <option value="versionNumber">Version Number</option>
            <option value="createdAt">Date Created</option>
            <option value="fileSize">File Size</option>
          </Select>

          <Select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as typeof sortOrder)}
            className="min-w-[120px]"
          >
            <option value="desc">Newest First</option>
            <option value="asc">Oldest First</option>
          </Select>
        </div>

        {onCompareVersions && (
          <Button
            variant="secondary"
            size="sm"
            onClick={handleCompare}
            disabled={selectedVersions.size !== 2}
          >
            Compare Selected ({selectedVersions.size}/2)
          </Button>
        )}
      </div>

      {/* Version List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {sortedVersions.map((version) => (
          <VersionCard
            key={version.id}
            version={version}
            isCurrent={version.id === currentVersionId || version.isCurrent}
            isSelected={selectedVersions.has(version.id)}
            onView={onViewVersion}
            onDownload={onDownloadVersion}
            onRestore={onRestoreVersion}
            onSelectForComparison={onCompareVersions ? handleSelectVersion : undefined}
            canRestore={canRestore}
            canDelete={canDelete}
          />
        ))}
      </div>

      {/* Footer Info */}
      <div className="text-center text-sm text-gray-500 dark:text-gray-400 pt-4 border-t border-gray-200 dark:border-gray-700">
        <p>
          Document ID: <span className="font-mono">{documentId}</span>
        </p>
        {stats.contributors.length > 0 && (
          <p className="mt-1">Contributors: {stats.contributors.join(', ')}</p>
        )}
      </div>
    </div>
  )
}
