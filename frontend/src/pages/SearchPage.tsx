/**
 * SearchPage
 * Full-featured search results page with filters and sorting
 * Accessible at /search with query params
 */

import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  AdjustmentsHorizontalIcon,
  ArrowDownTrayIcon,
  Squares2X2Icon,
  ListBulletIcon,
} from '@heroicons/react/24/outline'
import { ThreePanelLayout } from '@/components/Layout/ThreePanelLayout'
import { DashboardSidebar } from '@/components/Dashboard/DashboardSidebar'
import { DashboardHeader } from '@/components/Dashboard/DashboardHeader'
import { SearchBar } from '@/components/Search/SearchBar'
import { SearchResultsList } from '@/components/Search/SearchResultsList'
import { SearchFiltersPanel } from '@/components/Search/SearchFiltersPanel'
import { FilePreviewModal } from '@/components/FileManagement/FilePreviewModal'
import { authService } from '@/services/auth.service'
import { searchService } from '@/services/search.service'
import { getDocumentPreview, downloadDocument } from '@/services/documentService'
import { cn } from '@/utils/cn'
import { toast } from '@/utils/toast'
import type { SearchQuery, SearchResult, SearchFilters } from '@/types/search'
import type { FilePreview } from '@/types/fileManagement'

export function SearchPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  // Get initial query from URL
  const initialQuery = searchParams.get('q') || ''

  // State
  const [searchQuery, setSearchQuery] = useState(initialQuery)
  const [results, setResults] = useState<SearchResult[]>([])
  const [totalResults, setTotalResults] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<SearchFilters>({})
  const [isSearching, setIsSearching] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [previewData, setPreviewData] = useState<FilePreview | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [isPreviewLoading, setIsPreviewLoading] = useState(false)

  // Get current user
  const userData = authService.getUser()
  const user = {
    firstName: userData?.first_name || 'User',
    lastName: userData?.last_name || '',
    email: userData?.email || '',
    is_staff: userData?.is_staff || false,
    is_superuser: userData?.is_superuser || false,
  }

  // Handle logout
  const handleLogout = async () => {
    await authService.logout()
    navigate('/login')
  }

  // Perform search
  const performSearch = useCallback(
    async (query: string, page: number = 1, searchFilters: SearchFilters = {}) => {
      if (!query.trim()) {
        setResults([])
        setTotalResults(0)
        return
      }

      setIsSearching(true)

      try {
        const searchQuery: SearchQuery = {
          query,
          mode: 'simple',
          scope: 'all',
          filters: searchFilters,
          page,
          pageSize: 20,
        }

        const response = await searchService.search(searchQuery)
        setResults(response.results || [])
        setTotalResults(response.totalResults || 0)
        setCurrentPage(page)
      } catch (error) {
        console.error('Search failed:', error)
        toast.error('Search failed. Please try again.')
        setResults([])
        setTotalResults(0)
      } finally {
        setIsSearching(false)
      }
    },
    []
  )

  // Search when query or filters change
  useEffect(() => {
    if (searchQuery) {
      performSearch(searchQuery, 1, filters)
    }
  }, [searchQuery, filters, performSearch])

  // Update URL when search query changes
  const handleSearch = useCallback(
    (query: string) => {
      setSearchQuery(query)
      setSearchParams({ q: query })
      setCurrentPage(1)
    },
    [setSearchParams]
  )

  // Handle pagination
  const handlePageChange = useCallback(
    (page: number) => {
      performSearch(searchQuery, page, filters)
    },
    [searchQuery, filters, performSearch]
  )

  // Handle filter changes
  const handleFiltersChange = useCallback((newFilters: SearchFilters) => {
    setFilters(newFilters)
    setCurrentPage(1)
  }, [])

  // Open file preview modal (fetches presigned URL from backend)
  const openFilePreview = useCallback(async (documentId: string) => {
    setIsPreviewLoading(true)
    setIsPreviewOpen(true)
    try {
      const preview = await getDocumentPreview(documentId)
      setPreviewData(preview)
    } catch (error) {
      console.error('Failed to load preview:', error)
      toast.error('Failed to load file preview. Please try again.')
      setIsPreviewOpen(false)
    } finally {
      setIsPreviewLoading(false)
    }
  }, [])

  // Handle result click - open preview
  const handleResultClick = useCallback(
    (result: SearchResult) => {
      openFilePreview(result.documentId)
    },
    [openFilePreview]
  )

  // Handle preview button click
  const handleResultPreview = useCallback(
    (result: SearchResult) => {
      openFilePreview(result.documentId)
    },
    [openFilePreview]
  )

  // Handle download (for modal)
  const handleDownload = useCallback(async (documentId: string, fileName?: string) => {
    try {
      const blob = await downloadDocument(documentId)
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = fileName || 'download'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Download failed:', error)
      toast.error('Failed to download file. Please try again.')
    }
  }, [])

  // Handle download from search result card
  const handleResultDownload = useCallback(
    (result: SearchResult) => {
      handleDownload(result.documentId, result.fileName)
    },
    [handleDownload]
  )

  // Handle export
  const handleExport = useCallback(async () => {
    try {
      const blob = await searchService.exportSearchResults(
        {
          query: searchQuery,
          mode: 'simple',
          scope: 'all',
          filters,
        },
        'csv'
      )

      // Create download link
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `search-results-${Date.now()}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success('Search results exported successfully')
    } catch (error) {
      console.error('Export failed:', error)
      toast.error('Failed to export search results')
    }
  }, [searchQuery, filters])

  return (
    <>
      <ThreePanelLayout
        header={<DashboardHeader user={user} notifications={[]} onLogout={handleLogout} />}
        leftPanel={<DashboardSidebar />}
        leftPanelWidth="auto"
        collapsibleLeft={false}
        centerPanel={
          <div className="flex flex-col h-full">
            {/* Search Header */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Search Results
              </h1>

              {/* Search Bar */}
              <div className="mb-4">
                <SearchBar
                  value={searchQuery}
                  placeholder="Search documents..."
                  onSearch={handleSearch}
                  showSuggestions={false}
                  isLoading={isSearching}
                />
              </div>

              {/* Results Info and Actions */}
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {isSearching ? (
                    'Searching...'
                  ) : totalResults > 0 ? (
                    <>
                      Found{' '}
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {totalResults}
                      </span>{' '}
                      {totalResults === 1 ? 'result' : 'results'}
                      {searchQuery && (
                        <>
                          {' '}
                          for <span className="font-semibold">"{searchQuery}"</span>
                        </>
                      )}
                    </>
                  ) : searchQuery ? (
                    'No results found'
                  ) : (
                    'Enter a search query to get started'
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {/* Filter Toggle */}
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                      showFilters
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    )}
                    title="Filters"
                  >
                    <AdjustmentsHorizontalIcon className="w-4 h-4" />
                    <span>Filters</span>
                  </button>

                  {/* View Mode Toggle */}
                  <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                    <button
                      onClick={() => setViewMode('list')}
                      className={cn(
                        'p-2 transition-colors',
                        viewMode === 'list'
                          ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
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
                          : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
                      )}
                      title="Grid view"
                    >
                      <Squares2X2Icon className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Export */}
                  {results.length > 0 && (
                    <button
                      onClick={handleExport}
                      className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      title="Export results"
                    >
                      <ArrowDownTrayIcon className="w-4 h-4" />
                      <span>Export</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 flex overflow-hidden">
              {/* Filters Panel */}
              {showFilters && (
                <div className="w-80 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
                  <SearchFiltersPanel filters={filters} onFilterChange={handleFiltersChange} />
                </div>
              )}

              {/* Results */}
              <div className="flex-1 overflow-y-auto p-6">
                <SearchResultsList
                  results={results}
                  viewMode={viewMode}
                  selectedIds={selectedIds}
                  onSelectionChange={setSelectedIds}
                  onResultClick={handleResultClick}
                  onResultPreview={handleResultPreview}
                  onResultDownload={handleResultDownload}
                  isLoading={isSearching}
                  emptyState={
                    searchQuery ? (
                      <div className="text-center py-16">
                        <p className="text-gray-500 dark:text-gray-400">
                          No documents match your search criteria.
                        </p>
                        <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                          Try adjusting your filters or search query.
                        </p>
                      </div>
                    ) : (
                      <div className="text-center py-16">
                        <p className="text-gray-500 dark:text-gray-400">
                          Enter a search query to find documents.
                        </p>
                      </div>
                    )
                  }
                />

                {/* Pagination */}
                {totalResults > 20 && (
                  <div className="flex justify-center mt-6">
                    <nav className="flex items-center gap-2">
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>

                      <span className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">
                        Page {currentPage} of {Math.ceil(totalResults / 20)}
                      </span>

                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage >= Math.ceil(totalResults / 20)}
                        className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </nav>
                  </div>
                )}
              </div>
            </div>
          </div>
        }
        collapsibleRight={false}
      />

      {/* File Preview Modal */}
      <FilePreviewModal
        preview={previewData}
        isOpen={isPreviewOpen}
        isLoading={isPreviewLoading}
        onClose={() => {
          setIsPreviewOpen(false)
          setPreviewData(null)
        }}
        onDownload={(docId) => handleDownload(docId, previewData?.fileName)}
      />
    </>
  )
}
