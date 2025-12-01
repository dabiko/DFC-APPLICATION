/**
 * Documents Page
 * Displays documents for the selected folder with upload functionality
 */

import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Upload, Filter, Grid, List, Plus } from 'lucide-react'
import { FileIcon } from '@/components/FileIcon'
import { ThreePanelLayout } from '@components/Layout/ThreePanelLayout'
import { DashboardHeader } from '@components/Dashboard/DashboardHeader'
import { DashboardSidebar } from '@components/Dashboard/DashboardSidebar'
import { useAppSelector, useAppDispatch } from '@/store'
import { selectSelectedFolder, fetchFolders, selectFolder } from '@/store/slices/folderSlice'
import { authService } from '@/services/auth.service'
import { cn } from '@utils/cn'

// Mock document type
interface Document {
  id: string
  name: string
  type: string
  size: number
  modifiedAt: string
  createdBy: string
  confidentiality: string
}

export function Documents() {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const [searchParams] = useSearchParams()
  const selectedFolder = useAppSelector(selectSelectedFolder)

  const [documents, setDocuments] = useState<Document[]>([])
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')
  const [showUploadModal, setShowUploadModal] = useState(false)

  // Get user data
  const userData = authService.getUser()
  const user = {
    firstName: userData?.first_name || 'User',
    lastName: userData?.last_name || '',
    email: userData?.email || '',
    is_staff: userData?.is_staff || false,
    is_superuser: userData?.is_superuser || false,
  }

  // Fetch folders on mount
  useEffect(() => {
    // Only fetch if user is authenticated
    const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token')
    if (token) {
      dispatch(fetchFolders()).catch((error) => {
        console.error('Failed to fetch folders:', error)
      })
    }
  }, [dispatch])

  // Handle folder selection from URL
  useEffect(() => {
    const folderId = searchParams.get('folder')
    if (folderId) {
      dispatch(selectFolder(folderId))
    }
  }, [searchParams, dispatch])

  // Mock documents for selected folder
  useEffect(() => {
    if (selectedFolder) {
      // TODO: Fetch actual documents from API
      setDocuments([
        {
          id: '1',
          name: 'Annual Report 2024.pdf',
          type: 'application/pdf',
          size: 2457600,
          modifiedAt: '2024-11-20T10:30:00Z',
          createdBy: 'John Doe',
          confidentiality: 'internal',
        },
        {
          id: '2',
          name: 'Budget Proposal.xlsx',
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          size: 102400,
          modifiedAt: '2024-11-19T14:15:00Z',
          createdBy: 'Jane Smith',
          confidentiality: 'confidential',
        },
      ])
    } else {
      setDocuments([])
    }
  }, [selectedFolder])

  const handleLogout = () => {
    authService.clearTokens()
    navigate('/login')
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return (
      date.toLocaleDateString() +
      ' ' +
      date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    )
  }

  return (
    <ThreePanelLayout
      header={<DashboardHeader user={user} notifications={[]} onLogout={handleLogout} />}
      leftPanel={<DashboardSidebar />}
      leftPanelWidth="auto"
      collapsibleLeft={false}
      centerPanel={
        <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-950">
          {/* Toolbar */}
          <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {selectedFolder ? selectedFolder.name : 'Documents'}
              </h1>
              {selectedFolder && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {selectedFolder.path}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* View Toggle */}
              <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('list')}
                  className={cn(
                    'p-1.5 rounded transition-colors',
                    viewMode === 'list'
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                  )}
                  title="List view"
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    'p-1.5 rounded transition-colors',
                    viewMode === 'grid'
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                  )}
                  title="Grid view"
                >
                  <Grid className="w-4 h-4" />
                </button>
              </div>

              <button
                className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                title="Filter"
              >
                <Filter className="w-4 h-4" />
              </button>

              <button
                onClick={() => setShowUploadModal(true)}
                disabled={!selectedFolder}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Upload className="w-4 h-4" />
                Upload
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {!selectedFolder ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-16 h-16 bg-gray-200 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                  <Plus className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  No Folder Selected
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Select a folder from the sidebar to view its documents
                </p>
              </div>
            ) : documents.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-16 h-16 bg-gray-200 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                  <Upload className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  No Documents Yet
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Upload your first document to this folder
                </p>
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  Upload Document
                </button>
              </div>
            ) : viewMode === 'list' ? (
              <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Size
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Modified
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Created By
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {documents.map((doc) => (
                      <tr
                        key={doc.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {doc.name}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {formatFileSize(doc.size)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {formatDate(doc.modifiedAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {doc.createdBy}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                  >
                    <div className="flex flex-col items-center text-center">
                      <div className="w-16 h-16 flex items-center justify-center mb-3">
                        <FileIcon fileName={doc.name} size="xl" />
                      </div>
                      <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1 truncate w-full">
                        {doc.name}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatFileSize(doc.size)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      }
      collapsibleRight={false}
    />
  )
}
