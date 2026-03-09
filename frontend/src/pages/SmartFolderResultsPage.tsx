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
  Star,
  Clock,
  Filter,
  Search,
  Bookmark,
  Tag,
  Calendar,
  Briefcase,
  Shield,
  CircleDot,
  type LucideIcon,
} from 'lucide-react'
import { DashboardSidebar } from '@/components/Dashboard/DashboardSidebar'
import { DashboardHeader } from '@/components/Dashboard/DashboardHeader'
import { authService } from '@/services/auth.service'
import {
  getSmartFolder,
  getSmartFolderDocuments,
  refreshSmartFolderCount,
  getSmartFolderColorClasses,
  getRelativeDateLabel,
  type SmartFolder,
  type SmartFolderCriteria,
  type SmartFolderDocument,
} from '@/services/smartFolderService'
import { SmartFolderModal } from '@/components/SmartFolder'
import { cn } from '@utils/cn'

// Map icon names to Lucide components
const ICON_MAP: Record<string, LucideIcon> = {
  'folder-search': FolderSearch,
  'folder-star': Star,
  'folder-clock': Clock,
  filter: Filter,
  search: Search,
  star: Star,
  bookmark: Bookmark,
  tag: Tag,
  calendar: Calendar,
  briefcase: Briefcase,
  folder_special: FolderSearch,
}

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

// Friendly labels
const DOC_TYPE_LABELS: Record<string, string> = {
  CONTRACT: 'Contract',
  INVOICE: 'Invoice',
  REPORT: 'Report',
  KYC_RECORD: 'KYC Record',
  STATEMENT: 'Statement',
  CORRESPONDENCE: 'Correspondence',
  POLICY_DOCUMENT: 'Policy',
  PROCEDURE_DOCUMENT: 'Procedure',
  AUDIT_REPORT: 'Audit Report',
  TAX_DOCUMENT: 'Tax Document',
  LEGAL_DOCUMENT: 'Legal Document',
}

const CONF_LABELS: Record<string, { label: string; className: string }> = {
  PUBLIC: {
    label: 'Public',
    className: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
  },
  INTERNAL: {
    label: 'Internal',
    className: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  },
  CONFIDENTIAL: {
    label: 'Confidential',
    className: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
  },
  HIGHLY_CONFIDENTIAL: {
    label: 'Highly Confidential',
    className: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
  },
}

const STATE_LABELS: Record<string, { label: string; className: string }> = {
  DRAFT: {
    label: 'Draft',
    className: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
  },
  IN_REVIEW: {
    label: 'In Review',
    className: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
  },
  APPROVED: {
    label: 'Approved',
    className: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
  },
  PUBLISHED: {
    label: 'Published',
    className: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  },
  ARCHIVED: {
    label: 'Archived',
    className: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
  },
}

// Confidentiality badge colors for document table
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

// State badge colors for document table
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

/**
 * Header criteria chips component for the detail page
 */
function HeaderCriteriaChips({ criteria }: { criteria: SmartFolderCriteria }) {
  if (!criteria) return null

  const toArray = (val: string | string[] | undefined): string[] => {
    if (!val) return []
    return Array.isArray(val) ? val : [val]
  }

  const docTypes = toArray(criteria.document_type)
  const confLevels = toArray(criteria.confidentiality_level)
  const states = toArray(criteria.state)
  const tags = toArray(criteria.tags)
  const hasNameFilter = !!criteria.name_contains
  const hasDateFilter = !!criteria.relative_date

  const hasAnyCriteria =
    hasNameFilter ||
    docTypes.length > 0 ||
    confLevels.length > 0 ||
    states.length > 0 ||
    tags.length > 0 ||
    hasDateFilter

  if (!hasAnyCriteria) {
    return <p className="text-sm text-gray-400 dark:text-gray-500 italic">No criteria defined</p>
  }

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      {/* Name contains */}
      {hasNameFilter && (
        <div className="flex items-center gap-1.5">
          <Search className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
          <span className="text-sm text-gray-600 dark:text-gray-300">
            &ldquo;{criteria.name_contains}&rdquo;
          </span>
        </div>
      )}

      {/* Document types */}
      {docTypes.length > 0 && (
        <div className="flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
          <div className="flex flex-wrap gap-1">
            {docTypes.map((type) => (
              <span
                key={type}
                className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300"
              >
                {DOC_TYPE_LABELS[type] || type}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Confidentiality levels */}
      {confLevels.length > 0 && (
        <div className="flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
          <div className="flex flex-wrap gap-1">
            {confLevels.map((level) => {
              const conf = CONF_LABELS[level]
              return (
                <span
                  key={level}
                  className={cn(
                    'inline-flex px-2 py-0.5 text-xs font-medium rounded-full',
                    conf?.className ||
                      'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                  )}
                >
                  {conf?.label || level}
                </span>
              )
            })}
          </div>
        </div>
      )}

      {/* Document states */}
      {states.length > 0 && (
        <div className="flex items-center gap-1.5">
          <CircleDot className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
          <div className="flex flex-wrap gap-1">
            {states.map((state) => {
              const stateInfo = STATE_LABELS[state]
              return (
                <span
                  key={state}
                  className={cn(
                    'inline-flex px-2 py-0.5 text-xs font-medium rounded-full',
                    stateInfo?.className ||
                      'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                  )}
                >
                  {stateInfo?.label || state}
                </span>
              )
            })}
          </div>
        </div>
      )}

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex items-center gap-1.5">
          <Tag className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
          <div className="flex flex-wrap gap-1">
            {tags.map((t) => (
              <span
                key={t}
                className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Date filter */}
      {hasDateFilter && (
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
          <span className="text-sm text-gray-600 dark:text-gray-300">
            {getRelativeDateLabel(criteria.relative_date!)}
          </span>
        </div>
      )}
    </div>
  )
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

  // Get icon component
  const IconComponent = smartFolder ? ICON_MAP[smartFolder.icon] || FolderSearch : FolderSearch

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
          <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            {/* Top row: back button, title, actions */}
            <div className="px-6 pt-4 pb-3 flex items-start gap-4">
              {/* Back button */}
              <button
                onClick={() => navigate(-1)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors mt-0.5"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>

              {/* Icon + title + description */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
                      colorClasses?.bg
                    )}
                  >
                    <IconComponent className={cn('w-5 h-5', colorClasses?.text)} />
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-xl font-semibold text-gray-900 dark:text-white truncate">
                      {smartFolder.name}
                    </h1>
                    {smartFolder.description && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {smartFolder.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
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

            {/* Criteria chips row */}
            <div className="px-6 pb-3 pl-[72px]">
              <HeaderCriteriaChips criteria={smartFolder.criteria} />
            </div>

            {/* Stats bar */}
            <div className="px-6 pb-3 pl-[72px]">
              <div className="flex items-center gap-5 pt-3 border-t border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-1.5 text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Documents:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {documents.length}
                  </span>
                </div>
                {smartFolder.last_count_update && (
                  <div className="flex items-center gap-1.5 text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Last updated:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {formatDate(smartFolder.last_count_update)}
                    </span>
                  </div>
                )}
                {smartFolder.is_global && (
                  <span className="px-2 py-0.5 text-xs font-medium text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                    Global
                  </span>
                )}
                {!smartFolder.is_personal && !smartFolder.is_global && (
                  <span className="px-2 py-0.5 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                    Department
                  </span>
                )}
              </div>
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
                          {DOC_TYPE_LABELS[doc.document_type] || doc.document_type}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              'px-2 py-1 text-xs font-medium rounded-full',
                              CONFIDENTIALITY_COLORS[doc.confidentiality_level]?.bg,
                              CONFIDENTIALITY_COLORS[doc.confidentiality_level]?.text
                            )}
                          >
                            {CONF_LABELS[doc.confidentiality_level]?.label ||
                              doc.confidentiality_level.replace('_', ' ')}
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
                              {STATE_LABELS[doc.state]?.label || doc.state.replace('_', ' ')}
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
                        {CONF_LABELS[doc.confidentiality_level]?.label?.charAt(0) ||
                          doc.confidentiality_level.charAt(0)}
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
