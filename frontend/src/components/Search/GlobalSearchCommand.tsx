/**
 * GlobalSearchCommand Component
 * Command palette-style global search overlay
 * Accessible via Ctrl+K or clicking search in header
 * Features: instant search, keyboard navigation, filters, recent searches
 */

import { FC, useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { XMarkIcon, Squares2X2Icon, ListBulletIcon } from '@heroicons/react/24/outline'
import { cn } from '@utils/cn'
import { useDebounce } from '@/hooks/useDebounce'
import { SearchBar } from './SearchBar'
import { SearchResultsList } from './SearchResultsList'
import { searchService } from '@/services/search.service'
import type {
  SearchQuery,
  SearchResult,
  SearchSuggestion,
  RecentSearch,
  SearchFilters,
} from '@/types/search'

export interface GlobalSearchCommandProps {
  isOpen: boolean
  onClose: () => void
  onSearch?: (query: string) => void
  onResultClick?: (result: SearchResult) => void
  className?: string
}

export const GlobalSearchCommand: FC<GlobalSearchCommandProps> = ({
  isOpen,
  onClose,
  onSearch,
  onResultClick,
  className,
}) => {
  const navigate = useNavigate()
  const overlayRef = useRef<HTMLDivElement>(null)

  // State
  const [searchQuery, setSearchQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([])
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([])
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Debounce search query for API calls
  const debouncedSearchQuery = useDebounce(searchQuery, 300)

  // Load recent searches when modal opens
  useEffect(() => {
    if (isOpen) {
      searchService.getRecentSearches().then(setRecentSearches).catch(console.error)
    }
  }, [isOpen])

  // Perform search when debounced query changes
  useEffect(() => {
    if (debouncedSearchQuery.trim()) {
      performQuickSearch(debouncedSearchQuery)
      // Also get suggestions
      searchService.getSuggestions(debouncedSearchQuery).then(setSuggestions).catch(console.error)
    } else {
      setResults([])
      setSuggestions([])
      setHasSearched(false)
    }
  }, [debouncedSearchQuery])

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('')
      setResults([])
      setSuggestions([])
      setHasSearched(false)
      setSelectedIds(new Set())
    }
  }, [isOpen])

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  // Perform quick search (lightweight, for command palette)
  const performQuickSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setResults([])
      return
    }

    setIsSearching(true)
    setHasSearched(true)

    try {
      const searchResults = await searchService.quickSearch(query)
      setResults(searchResults)
    } catch (error) {
      console.error('Quick search failed:', error)
      setResults([])
    } finally {
      setIsSearching(false)
    }
  }, [])

  // Handle search (triggered by Enter key or clicking search button)
  const handleSearch = useCallback(
    async (query: string) => {
      setSearchQuery(query)

      if (!query.trim()) {
        return
      }

      try {
        // Save to recent searches
        await searchService.saveRecentSearch(query)

        // Close the command palette and navigate to search results page
        onClose()
        navigate(`/search?q=${encodeURIComponent(query)}`)

        // Call optional callback
        if (onSearch) {
          onSearch(query)
        }
      } catch (error) {
        console.error('Search failed:', error)
        setResults([])
      } finally {
        setIsSearching(false)
      }
    },
    [onSearch]
  )

  // Handle result click
  const handleResultClick = useCallback(
    (result: SearchResult) => {
      if (onResultClick) {
        onResultClick(result)
      } else {
        // Default: Navigate to document detail page
        navigate(`/documents/${result.documentId}`)
      }
      onClose()
    },
    [onResultClick, navigate, onClose]
  )

  // Handle result preview
  const handleResultPreview = useCallback((result: SearchResult) => {
    console.log('Preview document:', result.documentId)
    // TODO: Implement preview modal
  }, [])

  // Handle advanced search
  const handleAdvancedSearch = useCallback(() => {
    navigate('/search')
    onClose()
  }, [navigate, onClose])

  // Close on backdrop click
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose()
      }
    },
    [onClose]
  )

  if (!isOpen) return null

  return (
    <div
      ref={overlayRef}
      className={cn(
        'fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-start justify-center pt-[10vh] px-4',
        'animate-in fade-in duration-200',
        className
      )}
      onClick={handleBackdropClick}
    >
      <div
        className={cn(
          'w-full max-w-3xl bg-white dark:bg-gray-900 rounded-xl shadow-2xl',
          'flex flex-col max-h-[80vh]',
          'animate-in slide-in-from-top-4 duration-300'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Global Search</h2>
          <div className="flex items-center gap-2">
            {/* View mode toggle (only show when there are results) */}
            {results.length > 0 && (
              <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode('list')}
                  className={cn(
                    'p-2 transition-colors',
                    viewMode === 'list'
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'
                  )}
                  title="List view"
                >
                  <ListBulletIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    'p-2 transition-colors',
                    viewMode === 'grid'
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'
                  )}
                  title="Grid view"
                >
                  <Squares2X2Icon className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Close button */}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              title="Close (Esc)"
            >
              <XMarkIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <SearchBar
            value={searchQuery}
            placeholder="Search documents, folders, smart folders..."
            onSearch={handleSearch}
            onAdvancedSearch={handleAdvancedSearch}
            showAdvancedButton={true}
            showSuggestions={!hasSearched}
            suggestions={suggestions}
            recentSearches={recentSearches}
            isLoading={isSearching}
            autoFocus={true}
          />
        </div>

        {/* Results */}
        <div className="flex-1 overflow-auto p-4">
          {!hasSearched ? (
            // Initial state - show help text
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <svg
                className="w-16 h-16 text-gray-400 dark:text-gray-600 mb-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Search across all documents
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md">
                Find documents, folders, and smart folders instantly. Use advanced search for
                filters and precise queries.
              </p>
              <div className="mt-6 flex flex-wrap gap-2 justify-center">
                <kbd className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-700">
                  Ctrl + K
                </kbd>
                <span className="text-sm text-gray-500 dark:text-gray-400">to open anytime</span>
              </div>
            </div>
          ) : (
            // Search results
            <>
              {/* Results count */}
              {results.length > 0 && (
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200 dark:border-gray-800">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Found{' '}
                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                      {results.length}
                    </span>{' '}
                    {results.length === 1 ? 'result' : 'results'}
                    {searchQuery && (
                      <>
                        {' '}
                        for <span className="font-semibold">"{searchQuery}"</span>
                      </>
                    )}
                  </p>
                </div>
              )}

              <SearchResultsList
                results={results}
                viewMode={viewMode}
                selectedIds={selectedIds}
                onSelectionChange={setSelectedIds}
                onResultClick={handleResultClick}
                onResultPreview={handleResultPreview}
                isLoading={isSearching}
                emptyState={
                  <div className="text-center py-12">
                    <svg
                      className="mx-auto h-16 w-16 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
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
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                      We couldn't find any documents matching "{searchQuery}". Try different
                      keywords or use advanced search for filters.
                    </p>
                    <button
                      onClick={handleAdvancedSearch}
                      className="mt-4 px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                    >
                      Try Advanced Search
                    </button>
                  </div>
                }
              />
            </>
          )}
        </div>

        {/* Footer with keyboard shortcuts */}
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-900 rounded border border-gray-300 dark:border-gray-700">
                  ↑↓
                </kbd>
                Navigate
              </span>
              <span className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-900 rounded border border-gray-300 dark:border-gray-700">
                  Enter
                </kbd>
                Select
              </span>
              <span className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-900 rounded border border-gray-300 dark:border-gray-700">
                  Esc
                </kbd>
                Close
              </span>
            </div>
            {selectedIds.size > 0 && (
              <span className="font-medium">{selectedIds.size} selected</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
