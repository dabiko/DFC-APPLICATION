/**
 * Search Service
 * API service for global search, suggestions, and recent searches
 */

import apiClient from './apiClient'
import type {
  SearchQuery,
  SearchResult,
  SearchSuggestion,
  RecentSearch,
  SearchResponse,
} from '@/types/search'

// Development mode - use mock data if API not available
const DEV_MODE = import.meta.env.DEV

// Mock data for development
const MOCK_RECENT_SEARCHES: RecentSearch[] = [
  { id: '1', query: 'Q4 Budget', executedAt: new Date().toISOString(), resultCount: 45 },
  { id: '2', query: 'Contract templates', executedAt: new Date().toISOString(), resultCount: 12 },
  { id: '3', query: 'Invoice 2024', executedAt: new Date().toISOString(), resultCount: 89 },
]

const MOCK_SUGGESTIONS: SearchSuggestion[] = [
  {
    text: 'Financial reports',
    type: 'document',
    score: 95,
    metadata: { description: '23 documents' },
  },
  {
    text: 'compliance',
    type: 'tag',
    score: 90,
    metadata: { description: 'Tag with 156 documents' },
  },
]

const MOCK_SEARCH_RESULTS: SearchResult[] = [
  {
    id: '1',
    documentId: 'doc-001',
    fileName: 'Q4_Financial_Report_2024.pdf',
    filePath: '/Accounting/Reports/2024',
    fileSize: 2547896,
    mimeType: 'application/pdf',
    extension: 'pdf',
    score: 95,
    highlights: [
      {
        field: 'content',
        snippet: 'Quarterly financial performance exceeded expectations...',
        matches: [
          { text: 'Quarterly ', isMatch: false },
          { text: 'financial', isMatch: true },
          { text: ' performance exceeded expectations', isMatch: false },
        ],
      },
    ],
    createdAt: new Date().toISOString(),
    modifiedAt: new Date().toISOString(),
    createdBy: 'John Doe',
    modifiedBy: 'Jane Smith',
    confidentialityLevel: 'Confidential',
    isShared: true,
    isLocked: false,
    hasVersions: true,
    currentVersion: 3,
    permissions: {
      canView: true,
      canEdit: false,
      canDelete: false,
      canDownload: true,
      canShare: false,
    },
  },
  {
    id: '2',
    documentId: 'doc-002',
    fileName: 'Budget_Presentation_2024.pptx',
    filePath: '/Accounting/Budget/2024',
    fileSize: 15847253,
    mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    extension: 'pptx',
    score: 88,
    highlights: [
      {
        field: 'filename',
        snippet: 'Budget presentation for 2024',
        matches: [{ text: 'Budget presentation for 2024', isMatch: true }],
      },
    ],
    createdAt: new Date().toISOString(),
    modifiedAt: new Date().toISOString(),
    createdBy: 'Alice Johnson',
    modifiedBy: 'Alice Johnson',
    confidentialityLevel: 'Internal',
    isShared: false,
    isLocked: false,
    hasVersions: false,
    permissions: {
      canView: true,
      canEdit: true,
      canDelete: false,
      canDownload: true,
      canShare: true,
    },
  },
]

/**
 * Convert backend confidentiality level to frontend format
 */
const transformConfidentialityLevel = (level: string): string => {
  const mapping: Record<string, string> = {
    PUBLIC: 'Public',
    INTERNAL: 'Internal',
    CONFIDENTIAL: 'Confidential',
    HIGHLY_CONFIDENTIAL: 'Highly Confidential',
  }
  return mapping[level?.toUpperCase()] || level || 'Internal'
}

/**
 * Transform backend search result to frontend format
 */
const transformSearchResult = (backendResult: any): SearchResult => {
  return {
    id: String(backendResult.id),
    documentId: String(backendResult.id),
    fileName: backendResult.file_name || backendResult.title || 'Untitled',
    filePath: backendResult.folder_path || `/${backendResult.department_name || 'Documents'}`,
    fileSize: (backendResult.file_size_mb || 0) * 1024 * 1024, // Convert MB to bytes
    mimeType: backendResult.file_type || 'application/octet-stream',
    extension: backendResult.file_name?.split('.').pop() || backendResult.file_type || '',
    score: backendResult.score || 100,
    highlights: backendResult.highlights || [],
    thumbnailUrl: backendResult.thumbnail_url,
    createdAt: backendResult.created_at || new Date().toISOString(),
    modifiedAt: backendResult.updated_at || backendResult.created_at || new Date().toISOString(),
    createdBy: backendResult.owner_name || 'Unknown',
    modifiedBy: backendResult.owner_name || 'Unknown',
    confidentialityLevel: transformConfidentialityLevel(backendResult.confidentiality_level),
    isShared: backendResult.is_shared || false,
    isLocked: backendResult.is_locked || false,
    hasVersions: (backendResult.version_number || 1) > 1,
    currentVersion: backendResult.version_number || 1,
    permissions: backendResult.permissions || {
      canView: true,
      canEdit: false,
      canDelete: false,
      canDownload: true,
      canShare: false,
    },
  }
}

/**
 * Perform a search with filters
 */
export const search = async (query: SearchQuery): Promise<SearchResponse> => {
  try {
    const response = await apiClient.post<any>('/search/', {
      query: query.query,
      mode: query.mode,
      scope: query.scope,
      folder_id: query.folderId,
      department_id: query.departmentId,
      filters: query.filters,
      sort_by: query.sortBy,
      sort_order: query.sortOrder,
      page: query.page || 1,
      page_size: query.pageSize || 20,
    })

    // Transform backend response to frontend format
    const backendData = response.data
    const transformedResults = (backendData.results || []).map(transformSearchResult)

    return {
      query: query,
      results: transformedResults,
      totalResults: backendData.count || backendData.total_results || 0,
      totalPages: backendData.total_pages || 1,
      currentPage: backendData.page || 1,
      pageSize: backendData.page_size || 20,
      executionTime: backendData.took_ms || 0,
      facets: backendData.facets || {},
      suggestions: backendData.suggestions,
    }
  } catch (error) {
    console.error('Search error:', error)
    throw error
  }
}

/**
 * Get autocomplete suggestions based on partial query
 */
export const getSuggestions = async (partialQuery: string): Promise<SearchSuggestion[]> => {
  if (!partialQuery.trim()) {
    return []
  }

  try {
    const response = await apiClient.get<{ suggestions: SearchSuggestion[] }>(
      '/search/suggestions/',
      {
        params: { q: partialQuery },
      }
    )
    return response.data.suggestions
  } catch (error: any) {
    // In development, return mock data if API not available
    if (DEV_MODE && error?.response?.status === 404) {
      console.warn('Search API not available, using mock suggestions')
      return MOCK_SUGGESTIONS.filter((s) =>
        s.text.toLowerCase().includes(partialQuery.toLowerCase())
      )
    }
    console.error('Get suggestions error:', error)
    return []
  }
}

/**
 * Get recent searches for current user
 */
export const getRecentSearches = async (): Promise<RecentSearch[]> => {
  try {
    const response = await apiClient.get<{ results: RecentSearch[] }>('/search/recent/')
    return response.data.results
  } catch (error: any) {
    // In development, return mock data if API not available
    if (DEV_MODE && error?.response?.status === 404) {
      console.warn('Search API not available, using mock recent searches')
      return MOCK_RECENT_SEARCHES
    }
    console.error('Get recent searches error:', error)
    return []
  }
}

/**
 * Save a search to recent searches
 */
export const saveRecentSearch = async (query: string): Promise<void> => {
  try {
    await apiClient.post('/search/recent/', { query })
  } catch (error: any) {
    // Silently fail in development if API not available
    if (DEV_MODE && error?.response?.status === 404) {
      console.warn('Search API not available, cannot save recent search')
      return
    }
    console.error('Save recent search error:', error)
  }
}

/**
 * Clear all recent searches for current user
 */
export const clearRecentSearches = async (): Promise<void> => {
  try {
    await apiClient.delete('/search/recent/')
  } catch (error) {
    console.error('Clear recent searches error:', error)
    throw error
  }
}

/**
 * Quick search - lightweight search for command palette
 * Returns top 10 results without heavy filtering
 */
export const quickSearch = async (query: string): Promise<SearchResult[]> => {
  if (!query.trim()) {
    return []
  }

  try {
    const response = await apiClient.get<{ results: SearchResult[] }>('/search/quick/', {
      params: { q: query },
    })
    return response.data.results
  } catch (error: any) {
    // In development, return mock data if API not available
    if (DEV_MODE && error?.response?.status === 404) {
      console.warn('Search API not available, using mock search results')
      return MOCK_SEARCH_RESULTS.filter((result) =>
        result.fileName.toLowerCase().includes(query.toLowerCase())
      )
    }
    console.error('Quick search error:', error)
    return []
  }
}

/**
 * Export search results to CSV/Excel
 */
export const exportSearchResults = async (
  query: SearchQuery,
  format: 'csv' | 'excel' = 'csv'
): Promise<Blob> => {
  try {
    const response = await apiClient.post(
      '/search/export/',
      {
        query: query.query,
        filters: query.filters,
        sort_by: query.sortBy,
        sort_order: query.sortOrder,
        format,
      },
      {
        responseType: 'blob',
      }
    )
    return response.data
  } catch (error) {
    console.error('Export search results error:', error)
    throw error
  }
}

export const searchService = {
  search,
  getSuggestions,
  getRecentSearches,
  saveRecentSearch,
  clearRecentSearches,
  quickSearch,
  exportSearchResults,
}

export default searchService
