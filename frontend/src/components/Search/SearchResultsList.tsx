/**
 * SearchResultsList Component
 * Displays a list of search results
 */

import { FC, useState, useEffect } from 'react'
import { cn } from '@utils/cn'
import type { SearchResultsListProps, SearchResult } from '@/types/search'
import { SearchResultCard } from './SearchResultCard'

export const SearchResultsList: FC<SearchResultsListProps> = ({
  results,
  viewMode = 'list',
  selectedIds = new Set(),
  onSelectionChange,
  onResultClick,
  onResultPreview,
  isLoading = false,
  emptyState,
  className,
}) => {
  const [localSelectedIds, setLocalSelectedIds] = useState<Set<string>>(selectedIds)

  // Sync with external selection
  useEffect(() => {
    setLocalSelectedIds(selectedIds)
  }, [selectedIds])

  const handleResultSelect = (resultId: string, selected: boolean) => {
    const newSelection = new Set(localSelectedIds)
    if (selected) {
      newSelection.add(resultId)
    } else {
      newSelection.delete(resultId)
    }
    setLocalSelectedIds(newSelection)
    if (onSelectionChange) {
      onSelectionChange(newSelection)
    }
  }

  const handleResultClick = (result: SearchResult) => {
    if (onResultClick) {
      onResultClick(result)
    }
  }

  const handleResultPreview = (result: SearchResult) => {
    if (onResultPreview) {
      onResultPreview(result)
    }
  }

  const handleResultDownload = (result: SearchResult) => {
    // Download logic would go here
    // TODO: Implement download functionality
    void result.documentId
  }

  // Loading state
  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center min-h-[400px]', className)}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-600 dark:text-gray-400">Searching...</p>
        </div>
      </div>
    )
  }

  // Empty state
  if (results.length === 0) {
    return (
      <div className={cn('flex items-center justify-center min-h-[400px]', className)}>
        {emptyState || (
          <div className="text-center max-w-sm">
            <svg
              className="mx-auto h-16 w-16 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
              No results found
            </h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Try adjusting your search query or filters to find what you're looking for.
            </p>
          </div>
        )}
      </div>
    )
  }

  // Grid view
  if (viewMode === 'grid') {
    return (
      <div
        className={cn(
          'grid gap-4',
          'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
          className
        )}
      >
        {results.map((result) => (
          <SearchResultCard
            key={result.id}
            result={result}
            viewMode="grid"
            isSelected={localSelectedIds.has(result.id)}
            onSelect={(selected) => handleResultSelect(result.id, selected)}
            onClick={() => handleResultClick(result)}
            onPreview={() => handleResultPreview(result)}
            onDownload={() => handleResultDownload(result)}
            showHighlights={true}
          />
        ))}
      </div>
    )
  }

  // List view
  return (
    <div className={cn('space-y-2', className)}>
      {results.map((result) => (
        <SearchResultCard
          key={result.id}
          result={result}
          viewMode="list"
          isSelected={localSelectedIds.has(result.id)}
          onSelect={
            onSelectionChange ? (selected) => handleResultSelect(result.id, selected) : undefined
          }
          onClick={() => handleResultClick(result)}
          onPreview={() => handleResultPreview(result)}
          onDownload={() => handleResultDownload(result)}
          showHighlights={true}
        />
      ))}
    </div>
  )
}
