/**
 * SmartFolderResultsPage
 * Displays documents matching a user-created smart folder's criteria
 */

import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  RefreshCw,
  Settings,
  FileText,
  FolderSearch,
  AlertCircle,
  Loader2,
  MoreVertical,
  Grid,
  List,
} from 'lucide-react'
import { DashboardSidebar } from '@/components/Dashboard/DashboardSidebar'
import { DashboardHeader } from '@/components/Dashboard/DashboardHeader'
import { authService } from '@/services/auth.service'
import {
  getSmartFolder,
  getSmartFolderDocuments,
  refreshSmartFolderCount,
  describeCriteria,
  getSmartFolderColorClasses,
  type SmartFolder,
  type SmartFolderDocument,
} from '@/services/smartFolderService'
import { SmartFolderModal } from '@/components/SmartFolder'
import { cn } from '@utils/cn'

// Helper to format file size
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

// Helper to format date
function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

// Confidentiality badge colors
const CONFIDENTIALITY_COLORS: Record<string, { bg: string; text: string }> = {
  PUBLIC: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-400' },
  INTERNAL: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400' },
  CONFIDENTIAL: {
    bg: 'bg-orange-100 dark:bg-orange-900/30',
    text: 'text-orange-600 dark:text-orange-400',
  },
  HIGHLY_CONFIDENTIAL: {
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-600 dark:text-red-400',
  },
}

// State badge colors
const STATE_COLORS: Record<string, { bg: string; text: string }> = {
  DRAFT: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-400' },
  IN_REVIEW: {
    bg: 'bg-yellow-100 dark:bg-yellow-900/30',
    text: 'text-yellow-600 dark:text-yellow-400',
  },
  APPROVED: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-600 dark:text-green-400' },
  PUBLISHED: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400' },
  ARCHIVED: {
    bg: 'bg-purple-100 dark:bg-purple-900/30',
    text: 'text-purple-600 dark:text-purple-400',
  },
}

export default function SmartFolderResultsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [smartFolder, setSmartFolder] = useState<SmartFolder | null>(null)
  const [documents, setDocuments] = useState<SmartFolderDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')

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

  // Fetch smart folder and documents
  const fetchData = useCallback(async () => {
    if (!id) return

    setLoading(true)
    setError(null)

    try {
      const [folderData, documentsData] = await Promise.all([
        getSmartFolder(id),
        getSmartFolderDocuments(id),
      ])
      setSmartFolder(folderData)
      setDocuments(documentsData.documents || documentsData.results || [])
    } catch (err) {
      console.error('Failed to fetch smart folder data:', err)
      setError('Failed to load smart folder. It may have been deleted or you may not have access.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Refresh document count
  const handleRefresh = async () => {
    if (!id) return

    setRefreshing(true)
    try {
      await refreshSmartFolderCount(id)
      await fetchData()
    } catch (err) {
      console.error('Failed to refresh:', err)
    } finally {
      setRefreshing(false)
    }
  }

  // Handle edit save
  const handleEditSave = () => {
    setShowEditModal(false)
    fetchData()
  }

  // Navigate to document
  const handleDocumentClick = (doc: SmartFolderDocument) => {
    navigate(`/documents/${doc.id}`)
  }

  // Get color classes for the smart folder
  const colorClasses = smartFolder ? getSmartFolderColorClasses(smartFolder.color) : null

  // Loading state
  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
        <DashboardSidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <DashboardHeader user={user} notifications={[]} onLogout={handleLogout} />
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error || !smartFolder) {
    return (
      <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
        <DashboardSidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <DashboardHeader user={user} notifications={[]} onLogout={handleLogout} />
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <AlertCircle className="w-12 h-12 text-red-500" />
            <p className="text-gray-600 dark:text-gray-400">{error || 'Smart folder not found'}</p>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <DashboardSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <DashboardHeader user={user} notifications={[]} onLogout={handleLogout} />
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
            <div className="flex items-center gap-4">
              {/* Back button */}
              <button
                onClick={() => navigate(-1)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>

              {/* Smart folder icon and name */}
              <div className="flex items-center gap-3 flex-1">
                <div
                  className={cn(
                    'w-10 h-10 rounded-lg flex items-center justify-center',
                    colorClasses?.bg
                  )}
                >
                  <FolderSearch className={cn('w-5 h-5', colorClasses?.text)} />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {smartFolder.name}
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {describeCriteria(smartFolder.criteria)}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                {/* View mode toggle */}
                <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setViewMode('list')}
                    className={cn(
                      'p-2 transition-colors',
                      viewMode === 'list'
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
                    )}
                  >
                    <List className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('grid')}
                    className={cn(
                      'p-2 transition-colors',
                      viewMode === 'grid'
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
                    )}
                  >
                    <Grid className="w-4 h-4" />
                  </button>
                </div>

                {/* Refresh button */}
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
                  Refresh
                </button>

                {/* Edit button */}
                <button
                  onClick={() => setShowEditModal(true)}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  Edit Criteria
                </button>
              </div>
            </div>

            {/* Stats bar */}
            <div className="flex items-center gap-6 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="text-sm">
                <span className="text-gray-500 dark:text-gray-400">Documents: </span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {documents.length}
                </span>
              </div>
              {smartFolder.last_count_update && (
                <div className="text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Last updated: </span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formatDate(smartFolder.last_count_update)}
                  </span>
                </div>
              )}
              {smartFolder.description && (
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {smartFolder.description}
                </div>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto p-6">
            {documents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <FileText className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No documents found
                </h3>
                <p className="text-gray-500 dark:text-gray-400 text-center max-w-md">
                  No documents match the criteria for this smart folder. Try adjusting the search
                  criteria or add documents that match.
                </p>
                <button
                  onClick={() => setShowEditModal(true)}
                  className="mt-4 px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                >
                  Edit Criteria
                </button>
              </div>
            ) : viewMode === 'list' ? (
              /* List View */
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        Name
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        Type
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        Confidentiality
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        State
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        Size
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        Modified
                      </th>
                      <th className="w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {documents.map((doc) => (
                      <tr
                        key={doc.id}
                        onClick={() => handleDocumentClick(doc)}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <FileText className="w-5 h-5 text-gray-400" />
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {doc.title}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {doc.file_name}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                          {doc.document_type}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              'px-2 py-1 text-xs font-medium rounded-full',
                              CONFIDENTIALITY_COLORS[doc.confidentiality_level]?.bg,
                              CONFIDENTIALITY_COLORS[doc.confidentiality_level]?.text
                            )}
                          >
                            {doc.confidentiality_level.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {doc.state ? (
                            <span
                              className={cn(
                                'px-2 py-1 text-xs font-medium rounded-full',
                                STATE_COLORS[doc.state]?.bg,
                                STATE_COLORS[doc.state]?.text
                              )}
                            >
                              {doc.state.replace('_', ' ')}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                          {formatFileSize(doc.file_size)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                          {formatDate(doc.updated_at)}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              // Open context menu or actions
                            }}
                            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                          >
                            <MoreVertical className="w-4 h-4 text-gray-500" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              /* Grid View */
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => handleDocumentClick(doc)}
                    className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow cursor-pointer"
                  >
                    <div className="flex items-center justify-center h-24 bg-gray-50 dark:bg-gray-900 rounded-lg mb-3">
                      <FileText className="w-12 h-12 text-gray-300 dark:text-gray-600" />
                    </div>
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {doc.title}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">
                      {doc.file_name}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span
                        className={cn(
                          'px-1.5 py-0.5 text-xs font-medium rounded',
                          CONFIDENTIALITY_COLORS[doc.confidentiality_level]?.bg,
                          CONFIDENTIALITY_COLORS[doc.confidentiality_level]?.text
                        )}
                      >
                        {doc.confidentiality_level.charAt(0)}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatFileSize(doc.file_size)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Edit Modal */}
          <SmartFolderModal
            isOpen={showEditModal}
            onClose={() => setShowEditModal(false)}
            onSave={handleEditSave}
            smartFolder={smartFolder}
          />
        </main>
      </div>
    </div>
  )
}
