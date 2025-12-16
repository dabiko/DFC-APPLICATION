/**
 * FolderContentView Component
 * Enterprise-standard folder browsing with full file management capabilities
 */

import React, { FC, useEffect, useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/store'
import { useEncodedNavigation } from '@/hooks/useEncodedNavigation'
import {
  fetchFolders,
  selectFolders,
  createFolder,
  renameFolder,
  deleteFolder,
  moveFolder,
} from '@/store/slices/folderSlice'
import { selectNavigation } from '@/store/slices/departmentSlice'
import { Breadcrumbs } from '@components/Navigation/Breadcrumbs'
import { FileList } from '@components/FileManagement/FileList'
import { SortFilterBar } from '@components/FileManagement/SortFilterBar'
import { BulkActionToolbar } from '@components/FileManagement/BulkActionToolbar'
import { FilePreviewModal } from '@components/FileManagement/FilePreviewModal'
import {
  FileDetailsDrawer,
  type FileDetailsData,
} from '@components/FileManagement/FileDetailsDrawer'
import { FolderDetailsDrawer, type FolderDetailsData } from '@components/Folder/FolderDetailsDrawer'
import { FolderContextMenu } from '@components/Folder/FolderContextMenu'
import {
  DocumentContextMenu,
  type DocumentContextMenuAction,
  MoveDocumentModal,
  ShareDocumentModal,
  CreateShortcutModal,
  RenameDocumentModal,
  DeleteDocumentModal,
  OrphanedDocumentModal,
} from '@components/Document'
import { CreateFolderModal } from '@components/Folder/CreateFolderModal'
import { RenameFolderModal } from '@components/Folder/RenameFolderModal'
import { MoveFolderModal } from '@components/Folder/MoveFolderModal'
import { DeleteFolderModal } from '@components/Folder/DeleteFolderModal'
import { FolderPropertiesModal } from '@components/Folder/FolderPropertiesModal'
import { ShareFolderModal, type FolderShareData } from '@components/Folder/ShareFolderModal'
import { DocumentUploadModal } from '@components/Upload/DocumentUploadModal'
import { Spinner } from '@components/Feedback/Spinner'
import { Upload, FolderPlus, Building2, Folder as FolderIcon } from 'lucide-react'
import { cn } from '@utils/cn'
import type {
  FileListItem,
  ViewMode,
  SortField,
  SortOrder,
  FilterOptions,
  FilePreview,
} from '@/types/fileManagement'
import type { Folder, FolderOperation, ConfidentialityLevel } from '@/types/folder'
import type { BulkUploadResult } from '@/types/upload'
import folderService from '@/services/folderService'
import {
  getDocumentsInFolder,
  getShortcutsInFolder,
  downloadDocument,
  moveDocument,
  getDocumentPreview,
  createShortcut,
  renameDocument,
  deleteDocument,
  deleteShortcut,
  deleteOrphanedDocument,
  isFileMissingError,
  getDocumentVersions,
  downloadDocumentVersion,
  restoreDocumentVersion,
  getDocumentAccess,
  getDocumentActivity,
  getFolderActivity,
  type DocumentFromBackend,
  type DocumentVersionFromBackend,
  type DocumentAccessFromBackend,
  type ActivityFromBackend,
} from '@/services/documentService'
import {
  toggleFolderFavorite,
  toggleDocumentFavorite,
  getFavoriteFolders,
  getFavoriteDocuments,
} from '@/services/favoritesService'
import { toast } from '@/utils/toast'
import type { DocumentShortcutListItem } from '@/types'
import { PermissionGate } from '@/components/Permission'
import { usePermissions } from '@/contexts/PermissionContext'

export const FolderContentView: FC = () => {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()

  // Use encoded navigation hook for URL parameter handling
  const {
    departmentId,
    folderId,
    navigateToDashboard,
    navigateToDepartment,
    navigateToFolder,
    getDepartmentUrl,
    getFolderUrl,
  } = useEncodedNavigation()

  // Get permission checking capabilities
  const { isAdmin, hasGlobalPermission } = usePermissions()

  const allFolders = useAppSelector(selectFolders)
  const departmentNavigation = useAppSelector(selectNavigation)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [sortBy, setSortBy] = useState<SortField>('name')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')
  const [filters, setFilters] = useState<FilterOptions>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isNavigating, setIsNavigating] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Documents state
  const [documents, setDocuments] = useState<DocumentFromBackend[]>([])
  const [documentsLoading, setDocumentsLoading] = useState(false)

  // Shortcuts state
  const [shortcuts, setShortcuts] = useState<DocumentShortcutListItem[]>([])

  // Favorites state (track IDs of favorited items)
  const [favoriteFolderIds, setFavoriteFolderIds] = useState<Set<string>>(new Set())
  const [favoriteDocumentIds, setFavoriteDocumentIds] = useState<Set<string>>(new Set())

  // Modal states
  const [showCreateFolder, setShowCreateFolder] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [contextMenuFolder, setContextMenuFolder] = useState<Folder | null>(null)
  const [contextMenuDocument, setContextMenuDocument] = useState<FileListItem | null>(null)
  const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number; y: number } | null>(
    null
  )
  const [activeOperation, setActiveOperation] = useState<FolderOperation | null>(null)
  const [operationFolder, setOperationFolder] = useState<Folder | null>(null)
  const [previewFile, setPreviewFile] = useState<FilePreview | null>(null)
  const [isPreviewLoading, setIsPreviewLoading] = useState(false)
  const [isDraggingFiles, setIsDraggingFiles] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null)
  const [documentToMove, setDocumentToMove] = useState<FileListItem | null>(null)
  const [documentToShare, setDocumentToShare] = useState<FileListItem | null>(null)
  const [folderToShare, setFolderToShare] = useState<Folder | null>(null)
  const [documentToCreateShortcut, setDocumentToCreateShortcut] = useState<FileListItem | null>(
    null
  )
  const [documentToRename, setDocumentToRename] = useState<FileListItem | null>(null)
  const [documentToDelete, setDocumentToDelete] = useState<FileListItem | null>(null)

  // Orphaned document modal state (when file is missing from storage)
  const [orphanedDocument, setOrphanedDocument] = useState<{ id: string; name?: string } | null>(
    null
  )

  // File details drawer state
  const [fileDetailsDrawerOpen, setFileDetailsDrawerOpen] = useState(false)
  const [fileDetailsData, setFileDetailsData] = useState<FileDetailsData | null>(null)

  // Folder details drawer state
  const [folderDetailsDrawerOpen, setFolderDetailsDrawerOpen] = useState(false)
  const [folderDetailsData, setFolderDetailsData] = useState<FolderDetailsData | null>(null)

  // Fetch folders on mount
  useEffect(() => {
    const loadFolders = async () => {
      setIsLoading(true)
      try {
        await dispatch(fetchFolders({})).unwrap()
      } catch (error) {
        console.error('Failed to fetch folders:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadFolders()
  }, [dispatch])

  // Load favorites on mount
  useEffect(() => {
    const loadFavorites = async () => {
      console.log('=== LOADING FAVORITES ===')
      try {
        const favFoldersResponse = await getFavoriteFolders()
        console.log('Favorite folders API response:', favFoldersResponse)

        const favDocumentsResponse = await getFavoriteDocuments()
        console.log('Favorite documents API response:', favDocumentsResponse)

        // Extract folder IDs from favorite folders
        const folderIds = new Set(favFoldersResponse.map((f) => f.folder_id))
        const documentIds = new Set(favDocumentsResponse.map((d) => d.document_id))

        console.log('Extracted favorite folder IDs:', Array.from(folderIds))
        console.log('Extracted favorite document IDs:', Array.from(documentIds))

        setFavoriteFolderIds(folderIds)
        setFavoriteDocumentIds(documentIds)

        console.log('=== FAVORITES LOADED SUCCESSFULLY ===')
      } catch (error: any) {
        console.error('=== FAILED TO LOAD FAVORITES ===')
        console.error('Error:', error)
        console.error('Error response:', error?.response?.data)
        console.error('Error status:', error?.response?.status)
      }
    }
    loadFavorites()
  }, [])

  // Fetch documents and shortcuts when folder or department changes
  useEffect(() => {
    const loadDocumentsAndShortcuts = async () => {
      setDocumentsLoading(true)
      setIsNavigating(true)
      try {
        // Fetch documents and shortcuts in parallel
        // Pass departmentId when at department root (no folder selected)
        const [docs, shortcutItems] = await Promise.all([
          getDocumentsInFolder(folderId, { departmentId: !folderId ? departmentId : null }),
          getShortcutsInFolder(folderId),
        ])
        setDocuments(docs)
        setShortcuts(shortcutItems)
        console.log('Documents loaded:', docs)
        console.log('Shortcuts loaded:', shortcutItems)
      } catch (error) {
        console.error('Failed to fetch documents/shortcuts:', error)
        setDocuments([])
        setShortcuts([])
      } finally {
        setDocumentsLoading(false)
        // Short delay for smooth transition
        setTimeout(() => {
          setIsNavigating(false)
        }, 150)
      }
    }
    loadDocumentsAndShortcuts()
  }, [folderId, departmentId])

  // Get current folder and its items
  const currentFolder = folderId ? allFolders.find((f) => f.id === folderId) : null

  // Get subfolders based on current context (folder, department, or root)
  const subfolders = useMemo(() => {
    if (folderId) {
      // Inside a folder - show its children
      return allFolders.filter((folder) => folder.parentId === folderId)
    }
    if (departmentId) {
      // At department root - show root folders for this department
      // Compare both as strings and numbers to handle type mismatches
      const deptIdNum = parseInt(String(departmentId), 10)
      const filtered = allFolders.filter((folder) => {
        if (folder.parentId) return false // Only root folders
        const folderDeptId = folder.departmentId
        if (folderDeptId === null || folderDeptId === undefined) return false
        // Compare as strings
        if (String(folderDeptId) === String(departmentId)) return true
        // Compare as numbers
        const folderDeptNum = parseInt(String(folderDeptId), 10)
        if (!isNaN(deptIdNum) && !isNaN(folderDeptNum) && folderDeptNum === deptIdNum) return true
        return false
      })
      console.log(
        `[FolderContentView] Department ${departmentId}: found ${filtered.length} root folders out of ${allFolders.length} total`
      )
      if (filtered.length === 0 && allFolders.length > 0) {
        console.log(
          '[FolderContentView] All folder departmentIds:',
          allFolders.map((f) => ({ name: f.name, deptId: f.departmentId, parentId: f.parentId }))
        )
      }
      return filtered
    }
    // At global root - show all root folders
    return allFolders.filter((folder) => !folder.parentId)
  }, [folderId, departmentId, allFolders])

  // Get department name for breadcrumb when at department root
  const currentDepartmentName = useMemo(() => {
    if (departmentId && !folderId) {
      // First, try to find the department from navigation (most reliable)
      const navItem = departmentNavigation.find(
        (nav) =>
          nav.department.id === departmentId || String(nav.department.id) === String(departmentId)
      )
      if (navItem) {
        return navItem.department.name
      }

      // Fallback: find any folder with this department to get the name
      const deptFolder = allFolders.find(
        (f) => f.departmentId === departmentId || String(f.departmentId) === String(departmentId)
      )
      return deptFolder?.departmentName || `Department ${departmentId}`
    }
    return null
  }, [departmentId, folderId, departmentNavigation, allFolders])

  // Map confidentiality level from backend format to display format
  const mapConfidentialityLevel = (
    level: string
  ): 'Public' | 'Internal' | 'Confidential' | 'Highly Confidential' => {
    const mapping: Record<string, 'Public' | 'Internal' | 'Confidential' | 'Highly Confidential'> =
      {
        public: 'Public',
        internal: 'Internal',
        confidential: 'Confidential',
        highly_confidential: 'Highly Confidential',
      }
    return mapping[level.toLowerCase()] || 'Internal'
  }

  // Helper to get file extension from filename or mime type
  const getFileExtension = (fileName: string, mimeType: string): string => {
    // Try to get from filename first
    const parts = fileName.split('.')
    if (parts.length > 1) {
      return parts.pop()?.toLowerCase() || ''
    }
    // Fallback to mime type mapping
    const mimeToExt: Record<string, string> = {
      'application/pdf': 'pdf',
      'application/msword': 'doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
      'application/vnd.ms-excel': 'xls',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/tiff': 'tiff',
      'text/plain': 'txt',
      'text/csv': 'csv',
    }
    return mimeToExt[mimeType] || ''
  }

  // Convert folders and documents to FileListItem format
  const fileListItems: FileListItem[] = useMemo(() => {
    console.log('=== COMPUTING FILE LIST ITEMS ===')
    console.log('Current favoriteFolderIds:', Array.from(favoriteFolderIds))
    console.log('Current favoriteDocumentIds:', Array.from(favoriteDocumentIds))
    console.log('Subfolders count:', subfolders.length)
    console.log('Documents count:', documents.length)

    // Map folders
    const folderItems: FileListItem[] = subfolders.map((folder) => ({
      id: folder.id,
      name: folder.name,
      type: 'folder' as const,
      itemCount: (folder.childrenCount || 0) + (folder.documentCount || 0),
      hasSubfolders: (folder.childrenCount || 0) > 0,
      departmentId: folder.departmentId,
      path: folder.path,
      createdBy: folder.createdBy,
      createdAt: folder.createdAt,
      modifiedBy: folder.modifiedBy,
      modifiedAt: folder.modifiedAt,
      confidentialityLevel: mapConfidentialityLevel(folder.confidentiality),
      permissions: {
        canView: folder.permissions.canView,
        canEdit: folder.permissions.canEdit,
        canDelete: folder.permissions.canDelete,
        canShare: folder.permissions.canManage,
        canDownload: true,
      },
      isShared: false,
      isLocked: folder.isLocked,
      hasVersions: false,
      isFavorite: favoriteFolderIds.has(folder.id),
      tags: [],
    }))

    // Map documents
    const documentItems: FileListItem[] = documents.map((doc) => ({
      id: doc.id,
      name: doc.title || doc.file_name,
      type: 'file' as const,
      fileSize: doc.file_size,
      mimeType: doc.file_type,
      extension: getFileExtension(doc.file_name, doc.file_type),
      path: doc.folder_name || '',
      createdBy: doc.owner_name || 'Unknown',
      createdAt: doc.created_at,
      modifiedBy: doc.owner_name || 'Unknown',
      modifiedAt: doc.updated_at,
      confidentialityLevel: mapConfidentialityLevel(doc.confidentiality_level),
      permissions: {
        canView: true,
        canEdit: true,
        canDelete: true,
        canShare: true,
        canDownload: true,
      },
      isShared: false,
      isLocked: false,
      hasVersions: doc.version_number > 1,
      currentVersion: doc.version_number,
      isFavorite: favoriteDocumentIds.has(doc.id),
      tags: doc.tags || [],
    }))

    // Map shortcuts (appear as files with shortcut indicator)
    const shortcutItems: FileListItem[] = shortcuts.map((shortcut) => ({
      id: shortcut.id,
      name: shortcut.title || shortcut.fileName,
      type: 'file' as const,
      fileSize: shortcut.fileSize,
      mimeType: shortcut.fileType,
      extension: getFileExtension(shortcut.fileName, shortcut.fileType),
      path: shortcut.originalFolderName || '',
      createdBy: 'Shortcut',
      createdAt: shortcut.createdAt,
      modifiedBy: 'Shortcut',
      modifiedAt: shortcut.createdAt,
      confidentialityLevel: mapConfidentialityLevel(shortcut.confidentialityLevel),
      permissions: {
        canView: true,
        canEdit: false, // Shortcuts cannot be edited directly
        canDelete: true, // Can delete the shortcut (not the original)
        canShare: true,
        canDownload: true,
      },
      isShared: false,
      isLocked: false,
      hasVersions: false,
      isFavorite: false,
      tags: [],
      // Custom properties for shortcut identification
      isShortcut: true,
      originalDocumentId: shortcut.originalDocumentId,
      originalFolderId: shortcut.originalFolderId || undefined,
      originalFolderName: shortcut.originalFolderName || undefined,
    }))

    // Folders first, then documents, then shortcuts
    const allItems = [...folderItems, ...documentItems, ...shortcutItems]
    console.log(
      'Items with isFavorite=true:',
      allItems.filter((item) => item.isFavorite).map((item) => ({ id: item.id, name: item.name }))
    )
    return allItems
  }, [subfolders, documents, shortcuts, favoriteFolderIds, favoriteDocumentIds])

  // Build breadcrumb path with department
  const breadcrumbItems = useMemo(() => {
    const items: Array<{ label: string; onClick: () => void; icon?: React.ReactNode }> = []

    // Always start with Home/Root (no icon - Breadcrumbs will show HomeIcon automatically)
    items.push({
      label: 'Home',
      onClick: () => navigateToDashboard(),
    })

    // Case 1: We're viewing a specific folder
    if (currentFolder) {
      // Add department if available
      if (currentFolder.departmentId && currentFolder.departmentName) {
        items.push({
          label: currentFolder.departmentName,
          onClick: () => navigateToDepartment(currentFolder.departmentId!),
          icon: <Building2 className="h-4 w-4" />,
        })
      }

      // Build folder path
      const folderPath: Array<{ label: string; onClick: () => void; icon?: React.ReactNode }> = []
      let current: Folder | null = currentFolder
      while (current) {
        const fId = current.id
        const deptId = current.departmentId
        folderPath.unshift({
          label: current.name,
          onClick: () => navigateToFolder(fId, deptId),
          icon: <FolderIcon className="h-4 w-4" />,
        })
        current = allFolders.find((f) => f.id === current?.parentId) || null
      }

      return [...items, ...folderPath]
    }

    // Case 2: We're viewing a department root (no folder selected)
    if (departmentId && currentDepartmentName) {
      items.push({
        label: currentDepartmentName,
        onClick: () => navigateToDepartment(departmentId),
        icon: <Building2 className="h-4 w-4" />,
      })
    }

    return items
  }, [
    currentFolder,
    departmentId,
    currentDepartmentName,
    allFolders,
    navigateToDashboard,
    navigateToDepartment,
    navigateToFolder,
  ])

  // Handle folder operations
  const handleFolderOperation = useCallback((operation: FolderOperation, folder: Folder) => {
    setOperationFolder(folder)
    setActiveOperation(operation)
  }, [])

  // Handle item click (single click) - just for selection, no preview
  const handleItemClick = useCallback((_item: FileListItem) => {
    // Single click is handled by FileList for selection
    // No action needed here - the selection is managed by onSelectionChange
  }, [])

  // Open file preview modal (called from drawer or context menu)
  const openFilePreview = useCallback(async (item: FileListItem) => {
    // Get the document ID (for shortcuts, use the original document ID)
    const docId = item.isShortcut ? item.originalDocumentId : item.id
    if (!docId) return

    setIsPreviewLoading(true)
    try {
      const preview = await getDocumentPreview(docId)
      setPreviewFile(preview)
    } catch (error) {
      console.error('Failed to load preview:', error)
      // Check if file is missing from storage (orphaned record)
      if (isFileMissingError(error)) {
        setOrphanedDocument({ id: docId, name: item.name })
      } else {
        toast.error('Failed to load file preview. Please try again.')
      }
    } finally {
      setIsPreviewLoading(false)
    }
  }, [])

  // Convert FileListItem to FileDetailsData
  const convertToFileDetailsData = useCallback(
    (item: FileListItem): FileDetailsData => {
      // Find the original document from documents array for additional data
      const originalDoc = documents.find(
        (doc) => doc.id === item.id || doc.id === item.originalDocumentId
      )

      // Map confidentiality level back to backend format
      const confidentialityMap: Record<string, string> = {
        Public: 'PUBLIC',
        Internal: 'INTERNAL',
        Confidential: 'CONFIDENTIAL',
        'Highly Confidential': 'HIGHLY_CONFIDENTIAL',
      }

      return {
        id: item.isShortcut ? item.originalDocumentId! : item.id,
        title: item.name,
        fileName: item.name,
        fileSize: item.fileSize || 0,
        fileType: item.mimeType || '',
        documentType: originalDoc?.document_type || 'OTHER',
        confidentialityLevel: confidentialityMap[item.confidentialityLevel] || 'INTERNAL',
        folderId: folderId,
        folderName: currentFolder?.name || 'Root',
        folderPath: currentFolder?.path || '/',
        department: currentFolder?.departmentName || null,
        description: originalDoc?.description || undefined,
        keywords: item.tags,
        identifier: originalDoc?.identifier || undefined,
        versionNumber: item.currentVersion || 1,
        createdAt: item.createdAt,
        createdBy: item.createdBy,
        modifiedAt: item.modifiedAt,
        modifiedBy: item.modifiedBy,
        isLocked: item.isLocked,
        isFavorite: item.isFavorite,
        isShared: item.isShared,
        hasVersions: item.hasVersions,
        // Permissions
        canView: item.permissions.canView,
        canEdit: item.permissions.canEdit,
        canDelete: item.permissions.canDelete,
        canDownload: item.permissions.canDownload,
        canShare: item.permissions.canShare,
      }
    },
    [documents, folderId, currentFolder]
  )

  // Handle item double click (navigate into folder or open file details drawer)
  const handleItemDoubleClick = useCallback(
    (item: FileListItem) => {
      if (item.type === 'folder') {
        // Double-click on folder navigates into it (with encoded URL)
        navigateToFolder(item.id, item.departmentId)
      } else {
        // Double-click on file opens the details drawer
        const fileDetails = convertToFileDetailsData(item)
        setFileDetailsData(fileDetails)
        setFileDetailsDrawerOpen(true)
      }
    },
    [navigateToFolder, convertToFileDetailsData]
  )

  // Handle selection change
  const handleSelectionChange = useCallback((newSelection: Set<string>) => {
    setSelectedIds(newSelection)
  }, [])

  // Handle context menu
  const handleContextMenu = useCallback(
    (event: React.MouseEvent, item: FileListItem) => {
      event.preventDefault()

      // Clear any existing context menu state
      setContextMenuFolder(null)
      setContextMenuDocument(null)

      if (item.type === 'folder') {
        // It's a folder - use folder context menu
        const folder = allFolders.find((f) => f.id === item.id)
        if (folder) {
          // Add isFavorite status to folder
          setContextMenuFolder({
            ...folder,
            isFavorite: favoriteFolderIds.has(folder.id),
          })
          setContextMenuPosition({ x: event.clientX, y: event.clientY })
        }
      } else {
        // It's a document or shortcut - use document context menu
        setContextMenuDocument(item)
        setContextMenuPosition({ x: event.clientX, y: event.clientY })
      }
    },
    [allFolders, favoriteFolderIds]
  )

  // Close context menu
  const closeContextMenu = useCallback(() => {
    setContextMenuFolder(null)
    setContextMenuDocument(null)
    setContextMenuPosition(null)
  }, [])

  // Handle context menu action (for folders)
  const handleContextMenuAction = useCallback(
    async (operation: FolderOperation) => {
      if (operation === 'create') {
        // Special handling for create - set parent and open modal
        setOperationFolder(contextMenuFolder)
        setShowCreateFolder(true)
      } else if (operation === 'share' && contextMenuFolder) {
        // Open share folder modal
        setFolderToShare(contextMenuFolder)
      } else if (operation === 'lock' && contextMenuFolder) {
        // Lock folder using folderService
        try {
          await folderService.lockFolder(contextMenuFolder.id)
          // Refresh folders to get updated lock status
          await dispatch(fetchFolders({})).unwrap()
          toast.success(`Folder "${contextMenuFolder.name}" has been locked`)
        } catch (error) {
          console.error('Failed to lock folder:', error)
          toast.error('Failed to lock folder. Please try again.')
        }
      } else if (operation === 'unlock' && contextMenuFolder) {
        // Unlock folder using folderService
        try {
          await folderService.unlockFolder(contextMenuFolder.id)
          // Refresh folders to get updated lock status
          await dispatch(fetchFolders({})).unwrap()
          toast.success(`Folder "${contextMenuFolder.name}" has been unlocked`)
        } catch (error) {
          console.error('Failed to unlock folder:', error)
          toast.error('Failed to unlock folder. Please try again.')
        }
      } else if (operation === 'favorite' && contextMenuFolder) {
        // Toggle folder favorite status
        try {
          const result = await toggleFolderFavorite(contextMenuFolder.id)
          setFavoriteFolderIds((prev) => {
            const newSet = new Set(prev)
            if (result.is_favorite) {
              newSet.add(contextMenuFolder.id)
            } else {
              newSet.delete(contextMenuFolder.id)
            }
            return newSet
          })
          if (result.is_favorite) {
            toast.success(`Added "${contextMenuFolder.name}" to favorites`)
          } else {
            toast.success(`Removed "${contextMenuFolder.name}" from favorites`)
          }
        } catch (error) {
          console.error('Failed to toggle folder favorite:', error)
          toast.error('Failed to update favorites. Please try again.')
        }
      } else if (operation === 'properties' && contextMenuFolder) {
        // Open folder details drawer
        const folderDetails: FolderDetailsData = {
          id: contextMenuFolder.id,
          name: contextMenuFolder.name,
          path: contextMenuFolder.path,
          description: contextMenuFolder.description,
          confidentiality:
            contextMenuFolder.confidentiality.toLowerCase() as FolderDetailsData['confidentiality'],
          parentId: contextMenuFolder.parentId,
          parentName: allFolders.find((f) => f.id === contextMenuFolder.parentId)?.name || null,
          department: contextMenuFolder.departmentName || null,
          isLocked: contextMenuFolder.isLocked,
          isFavorite: favoriteFolderIds.has(contextMenuFolder.id),
          isShared: false,
          childrenCount: contextMenuFolder.childrenCount || 0,
          documentCount: contextMenuFolder.documentCount || 0,
          createdAt: contextMenuFolder.createdAt,
          createdBy: contextMenuFolder.createdBy,
          modifiedAt: contextMenuFolder.modifiedAt,
          modifiedBy: contextMenuFolder.modifiedBy,
          permissions: {
            canView: contextMenuFolder.permissions.canView,
            canEdit: contextMenuFolder.permissions.canEdit,
            canDelete: contextMenuFolder.permissions.canDelete,
            canManage: contextMenuFolder.permissions.canManage,
            canCreateSubfolder: contextMenuFolder.permissions.canEdit,
            canUploadDocuments: contextMenuFolder.permissions.canEdit,
          },
        }
        setFolderDetailsData(folderDetails)
        setFolderDetailsDrawerOpen(true)
      } else if (contextMenuFolder) {
        handleFolderOperation(operation, contextMenuFolder)
      }
      closeContextMenu()
    },
    [
      contextMenuFolder,
      handleFolderOperation,
      closeContextMenu,
      dispatch,
      allFolders,
      favoriteFolderIds,
    ]
  )

  // Handle document context menu action
  const handleDocumentContextMenuAction = useCallback(
    async (action: DocumentContextMenuAction, item: FileListItem) => {
      closeContextMenu()

      switch (action) {
        case 'go-to-original':
          // Navigate to the folder containing the original document
          if (item.isShortcut && item.originalFolderId) {
            // Navigate to the original folder using encoded URL
            navigateToFolder(item.originalFolderId, item.departmentId)
            toast.info(`Navigating to original location`)
          } else if (item.isShortcut) {
            // Fallback: show message if folder ID is not available
            toast.info(`Original location: ${item.originalFolderName || 'Unknown location'}`)
          }
          break

        case 'view-shortcut-locations':
          // TODO: Show modal with all shortcut locations for this document
          console.log('View shortcut locations for:', item.id)
          toast.info('This feature will show all folders where this document has shortcuts.')
          break

        case 'preview':
          // Open preview modal
          openFilePreview(item)
          break

        case 'download':
          // Trigger download
          try {
            // For shortcuts, download the original document
            const docId = item.isShortcut ? item.originalDocumentId : item.id
            if (docId) {
              const blob = await downloadDocument(docId)
              // Create download link
              const url = window.URL.createObjectURL(blob)
              const link = document.createElement('a')
              link.href = url
              link.download = item.name
              document.body.appendChild(link)
              link.click()
              document.body.removeChild(link)
              window.URL.revokeObjectURL(url)
              toast.success(`Downloading "${item.name}"`)
            }
          } catch (error) {
            console.error('Download failed:', error)
            // Check if file is missing from storage (orphaned record)
            if (isFileMissingError(error)) {
              const docId = item.isShortcut ? item.originalDocumentId : item.id
              if (docId) {
                setOrphanedDocument({ id: docId, name: item.name })
              }
            } else {
              toast.error(`Failed to download "${item.name}". Please try again.`)
            }
          }
          break

        case 'share':
          // Open share dialog
          setDocumentToShare(item)
          break

        case 'rename':
          // Open rename modal (only for non-shortcuts)
          if (!item.isShortcut) {
            setDocumentToRename(item)
          }
          break

        case 'move':
          // Open move modal
          setDocumentToMove(item)
          break

        case 'edit':
          // Open edit metadata modal
          console.log('Edit:', item.id)
          toast.info('Edit metadata feature coming soon')
          break

        case 'delete':
          // Open delete confirmation modal
          setDocumentToDelete(item)
          break

        case 'create-shortcut':
          // Open folder picker to create shortcut
          if (!item.isShortcut) {
            setDocumentToCreateShortcut(item)
          } else {
            toast.warning('Cannot create a shortcut from another shortcut')
          }
          break

        case 'favorite':
          // Toggle document favorite status
          if (!item.isShortcut) {
            try {
              const result = await toggleDocumentFavorite(item.id)
              setFavoriteDocumentIds((prev) => {
                const newSet = new Set(prev)
                if (result.is_favorite) {
                  newSet.add(item.id)
                } else {
                  newSet.delete(item.id)
                }
                return newSet
              })
              if (result.is_favorite) {
                toast.success(`Added "${item.name}" to favorites`)
              } else {
                toast.success(`Removed "${item.name}" from favorites`)
              }
            } catch (error) {
              console.error('Failed to toggle document favorite:', error)
              toast.error('Failed to update favorites. Please try again.')
            }
          }
          break
      }
    },
    [navigate, openFilePreview, closeContextMenu]
  )

  // Close context menu on outside click
  useEffect(() => {
    if (contextMenuPosition) {
      const handleClick = () => closeContextMenu()
      document.addEventListener('click', handleClick)
      return () => document.removeEventListener('click', handleClick)
    }
  }, [contextMenuPosition, closeContextMenu])

  // Bulk operations
  const selectedItems = useMemo(() => {
    return fileListItems.filter((item) => selectedIds.has(item.id))
  }, [fileListItems, selectedIds])

  const handleBulkMove = useCallback(() => {
    console.log('Bulk move:', Array.from(selectedIds))
    // TODO: Implement bulk move
  }, [selectedIds])

  const handleBulkCopy = useCallback(() => {
    console.log('Bulk copy:', Array.from(selectedIds))
    // TODO: Implement bulk copy
  }, [selectedIds])

  const handleBulkDelete = useCallback(async () => {
    // Get selected documents (not folders - folder delete is handled separately)
    const selectedDocuments = fileListItems.filter(
      (item) => selectedIds.has(item.id) && item.type === 'file'
    )

    if (selectedDocuments.length === 0) {
      toast.warning('No documents selected for deletion')
      return
    }

    // Confirm deletion
    const confirmMessage =
      selectedDocuments.length === 1
        ? `Are you sure you want to delete "${selectedDocuments[0].name}"?`
        : `Are you sure you want to delete ${selectedDocuments.length} documents?`

    if (!window.confirm(confirmMessage)) {
      return
    }

    setIsNavigating(true)
    try {
      // Separate shortcuts from regular documents
      const shortcuts = selectedDocuments.filter((doc) => doc.isShortcut)
      const regularDocs = selectedDocuments.filter((doc) => !doc.isShortcut)

      // Delete shortcuts one by one (they use a different endpoint)
      for (const shortcut of shortcuts) {
        await deleteShortcut(shortcut.id)
      }

      // Delete regular documents using bulk delete
      if (regularDocs.length > 0) {
        const { bulkDeleteDocuments } = await import('@/services/documentService')
        await bulkDeleteDocuments(regularDocs.map((doc) => doc.id))
      }

      toast.success(`Deleted ${selectedDocuments.length} item(s)`)
      setSelectedIds(new Set())

      // Refresh the view
      const [docs, shortcutItems] = await Promise.all([
        getDocumentsInFolder(folderId),
        getShortcutsInFolder(folderId),
      ])
      setDocuments(docs)
      setShortcuts(shortcutItems)
    } catch (error: any) {
      console.error('Failed to delete items:', error)
      const errorMessage = error?.response?.data?.detail || 'Failed to delete items'
      toast.error(errorMessage)
    } finally {
      setIsNavigating(false)
    }
  }, [selectedIds, fileListItems, folderId])

  const handleBulkDownload = useCallback(() => {
    console.log('Bulk download:', Array.from(selectedIds))
    // TODO: Implement bulk download
  }, [selectedIds])

  const handleBulkShare = useCallback(() => {
    console.log('Bulk share:', Array.from(selectedIds))
    // TODO: Implement bulk share modal
  }, [selectedIds])

  const handleBulkAddTags = useCallback(() => {
    console.log('Bulk add tags:', Array.from(selectedIds))
    // TODO: Implement bulk tag modal
  }, [selectedIds])

  const handleBulkChangeConfidentiality = useCallback(() => {
    console.log('Bulk change confidentiality:', Array.from(selectedIds))
    // TODO: Implement bulk confidentiality modal
  }, [selectedIds])

  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  // Handle favorite toggle from FileList (clicking star icon directly)
  const handleFavoriteToggle = useCallback(async (item: FileListItem) => {
    if (item.type === 'folder') {
      // Toggle folder favorite
      try {
        const result = await toggleFolderFavorite(item.id)
        setFavoriteFolderIds((prev) => {
          const newSet = new Set(prev)
          if (result.is_favorite) {
            newSet.add(item.id)
          } else {
            newSet.delete(item.id)
          }
          return newSet
        })
        if (result.is_favorite) {
          toast.success(`Added "${item.name}" to favorites`)
        } else {
          toast.success(`Removed "${item.name}" from favorites`)
        }
      } catch (error) {
        console.error('Failed to toggle folder favorite:', error)
        toast.error('Failed to update favorites. Please try again.')
      }
    } else if (!item.isShortcut) {
      // Toggle document favorite (not for shortcuts)
      try {
        const result = await toggleDocumentFavorite(item.id)
        setFavoriteDocumentIds((prev) => {
          const newSet = new Set(prev)
          if (result.is_favorite) {
            newSet.add(item.id)
          } else {
            newSet.delete(item.id)
          }
          return newSet
        })
        if (result.is_favorite) {
          toast.success(`Added "${item.name}" to favorites`)
        } else {
          toast.success(`Removed "${item.name}" from favorites`)
        }
      } catch (error) {
        console.error('Failed to toggle document favorite:', error)
        toast.error('Failed to update favorites. Please try again.')
      }
    }
  }, [])

  // Folder operations handlers
  const handleCreateFolder = useCallback(
    async (data: any) => {
      // Use operationFolder as parent if creating from context menu, otherwise use current folder
      const parentId = operationFolder?.id || folderId || null
      try {
        await dispatch(
          createFolder({
            ...data,
            parentId,
          })
        ).unwrap()
        setShowCreateFolder(false)
        setOperationFolder(null)
        toast.success(`Folder "${data.name}" created successfully`)

        // Refresh folders to ensure all data is properly loaded
        // This ensures departmentId and other properties are correctly set
        setIsNavigating(true)
        try {
          await dispatch(fetchFolders({})).unwrap()
        } catch (refreshError) {
          console.error('Failed to refresh folders:', refreshError)
        } finally {
          setIsNavigating(false)
        }
      } catch (error: any) {
        console.error('Failed to create folder:', error)
        // Re-throw error so the modal can display the proper error message
        // The error message is already formatted by handleFolderError in the slice
        throw new Error(
          typeof error === 'string' ? error : error?.message || 'Failed to create folder'
        )
      }
    },
    [dispatch, folderId, operationFolder]
  )

  const handleRenameFolder = useCallback(
    async (folderId: string, newName: string, confidentiality?: ConfidentialityLevel) => {
      try {
        await dispatch(renameFolder({ folderId, newName, confidentiality })).unwrap()
        setActiveOperation(null)
        setOperationFolder(null)
        toast.success(`Folder updated successfully`)
      } catch (error) {
        console.error('Failed to update folder:', error)
        toast.error('Failed to update folder. Please try again.')
      }
    },
    [dispatch]
  )

  const handleMoveFolder = useCallback(
    async (targetFolderId: string | null) => {
      if (!operationFolder) return
      const folderName = operationFolder.name
      try {
        await dispatch(
          moveFolder({ folderId: operationFolder.id, newParentId: targetFolderId })
        ).unwrap()
        setActiveOperation(null)
        setOperationFolder(null)
        toast.success(`Folder "${folderName}" moved successfully`)

        // Show loading state briefly to indicate refresh
        setIsNavigating(true)
        setTimeout(() => {
          setIsNavigating(false)
        }, 300)
      } catch (error) {
        console.error('Failed to move folder:', error)
        toast.error(`Failed to move folder "${folderName}". Please try again.`)
      }
    },
    [dispatch, operationFolder]
  )

  const handleDeleteFolder = useCallback(
    async (folderId: string, force?: boolean) => {
      if (!folderId) return
      const folderName = operationFolder?.name || 'folder'
      try {
        await dispatch(deleteFolder({ folderId, force: force || false })).unwrap()
        setActiveOperation(null)
        setOperationFolder(null)
        toast.success(`Folder "${folderName}" moved to trash`)
      } catch (error) {
        console.error('Failed to delete folder:', error)
        toast.error(`Failed to delete folder "${folderName}". Please try again.`)
      }
    },
    [dispatch, operationFolder]
  )

  // Handle folder share
  const handleShareFolder = useCallback(async (shareData: FolderShareData) => {
    // TODO: Implement folder share API call when backend supports it
    console.log('Share folder data:', shareData)
    setFolderToShare(null)
    toast.info('Folder sharing configured! (Backend integration pending)')
  }, [])

  // Handle delete document or shortcut
  const handleDeleteDocument = useCallback(
    async (documentId: string, isShortcut: boolean) => {
      try {
        if (isShortcut) {
          await deleteShortcut(documentId)
          toast.success('Shortcut removed successfully')
        } else {
          await deleteDocument(documentId)
          toast.success('Document moved to trash')
        }
        setDocumentToDelete(null)

        // Refresh the view after deleting
        setIsNavigating(true)
        try {
          const [docs, shortcutItems] = await Promise.all([
            getDocumentsInFolder(folderId),
            getShortcutsInFolder(folderId),
          ])
          setDocuments(docs)
          setShortcuts(shortcutItems)
        } catch (error) {
          console.error('Failed to refresh documents:', error)
        } finally {
          setTimeout(() => {
            setIsNavigating(false)
          }, 300)
        }
      } catch (error: any) {
        console.error('Failed to delete document:', error)
        // Re-throw so the modal can display the error
        throw error
      }
    },
    [folderId]
  )

  // Handle rename document
  const handleRenameDocument = useCallback(
    async (documentId: string, newTitle: string) => {
      try {
        await renameDocument(documentId, newTitle)
        setDocumentToRename(null)
        toast.success(`Document renamed to "${newTitle}"`)

        // Refresh the view after renaming
        setIsNavigating(true)
        try {
          const docs = await getDocumentsInFolder(folderId)
          setDocuments(docs)
        } catch (error) {
          console.error('Failed to refresh documents:', error)
        } finally {
          setTimeout(() => {
            setIsNavigating(false)
          }, 300)
        }
      } catch (error) {
        console.error('Failed to rename document:', error)
        toast.error('Failed to rename document. Please try again.')
        throw error // Let the modal handle the error display
      }
    },
    [folderId]
  )

  // Handle create shortcut
  const handleCreateShortcut = useCallback(
    async (documentId: string, targetFolderId: string) => {
      try {
        await createShortcut(documentId, targetFolderId)
        setDocumentToCreateShortcut(null)
        toast.success('Shortcut created successfully')

        // Refresh the view after creating shortcut (if we're in the target folder)
        if (targetFolderId === folderId || (targetFolderId === 'root' && !folderId)) {
          setIsNavigating(true)
          try {
            const shortcutItems = await getShortcutsInFolder(folderId)
            setShortcuts(shortcutItems)
          } catch (error) {
            console.error('Failed to refresh shortcuts:', error)
          } finally {
            setTimeout(() => {
              setIsNavigating(false)
            }, 300)
          }
        }
      } catch (error) {
        console.error('Failed to create shortcut:', error)
        toast.error('Failed to create shortcut. Please try again.')
        throw error // Let the modal handle the error display
      }
    },
    [folderId]
  )

  // Handle document move
  const handleMoveDocument = useCallback(
    async (documentId: string, targetFolderId: string) => {
      try {
        await moveDocument(documentId, targetFolderId)
        setDocumentToMove(null)
        toast.success('Document moved successfully')

        // Refresh the view after moving
        setIsNavigating(true)
        try {
          const [docs, shortcutItems] = await Promise.all([
            getDocumentsInFolder(folderId),
            getShortcutsInFolder(folderId),
          ])
          setDocuments(docs)
          setShortcuts(shortcutItems)
        } catch (error) {
          console.error('Failed to refresh documents:', error)
        } finally {
          setTimeout(() => {
            setIsNavigating(false)
          }, 300)
        }
      } catch (error) {
        console.error('Failed to move document:', error)
        toast.error('Failed to move document. Please try again.')
        throw error // Let the modal handle the error display
      }
    },
    [folderId]
  )

  // Handle drag and drop for file uploads (only allowed when inside a folder)
  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      // Only allow drag-drop when inside a folder (documents must be in folders)
      if (e.dataTransfer.types.includes('Files') && folderId) {
        setIsDraggingFiles(true)
      }
    },
    [folderId]
  )

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const target = e.target as HTMLElement
    if (target.id === 'drop-zone-overlay') {
      setIsDraggingFiles(false)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDraggingFiles(false)

      // Only allow file drops when inside a folder (documents must be in folders)
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0 && folderId) {
        // Open upload modal when files are dropped
        setShowUploadModal(true)
      }
    },
    [folderId]
  )

  // Handle upload completion
  const handleUploadComplete = useCallback(
    async (result: BulkUploadResult) => {
      if (result.successful > 0) {
        const message =
          result.failed > 0
            ? `${result.successful} file(s) uploaded successfully, ${result.failed} failed`
            : `${result.successful} file(s) uploaded successfully!`

        setUploadSuccess(message)

        // Show toast notification
        if (result.failed > 0) {
          toast.warning(message)
        } else {
          toast.success(message)
        }

        // Auto-hide success message after 5 seconds
        setTimeout(() => {
          setUploadSuccess(null)
        }, 5000)

        // Refresh documents and shortcuts list
        setIsNavigating(true)
        try {
          const [docs, shortcutItems] = await Promise.all([
            getDocumentsInFolder(folderId),
            getShortcutsInFolder(folderId),
          ])
          setDocuments(docs)
          setShortcuts(shortcutItems)
        } catch (error) {
          console.error('Failed to refresh documents:', error)
        } finally {
          setTimeout(() => {
            setIsNavigating(false)
          }, 300)
        }
      } else if (result.failed > 0) {
        toast.error(`Failed to upload ${result.failed} file(s)`)
      }
    },
    [folderId]
  )

  return (
    <div
      className="h-full flex flex-col bg-gray-50 dark:bg-gray-900 relative"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag & Drop Overlay */}
      {isDraggingFiles && (
        <div
          id="drop-zone-overlay"
          className="absolute inset-0 z-40 flex items-center justify-center bg-primary-500/20 backdrop-blur-sm border-4 border-dashed border-primary-500"
        >
          <div className="text-center">
            <Upload className="w-16 h-16 mx-auto mb-4 text-primary-600 dark:text-primary-400" />
            <p className="text-xl font-semibold text-primary-900 dark:text-primary-100">
              Drop files here to upload
            </p>
            <p className="text-sm text-primary-700 dark:text-primary-300 mt-2">
              Release to select files and add metadata
            </p>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {(isLoading || isNavigating || documentsLoading) && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <Spinner size="lg" />
        </div>
      )}

      {/* Success Message */}
      {uploadSuccess && (
        <div className="absolute top-4 right-4 z-50 max-w-md">
          <div className="flex items-center gap-3 p-4 bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800 rounded-lg shadow-lg">
            <div className="flex-shrink-0">
              <svg
                className="w-5 h-5 text-success-600 dark:text-success-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <p className="text-sm font-medium text-success-900 dark:text-success-100">
              {uploadSuccess}
            </p>
            <button
              onClick={() => setUploadSuccess(null)}
              className="flex-shrink-0 ml-auto text-success-600 dark:text-success-400 hover:text-success-800 dark:hover:text-success-200"
            >
              <span className="sr-only">Close</span>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        </div>
      )}
      {/* Header with breadcrumbs and actions */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <Breadcrumbs items={breadcrumbItems} showHomeIcon={true} maxItems={5} />

          <div className="flex items-center gap-3">
            {/* New Folder button - backend enforces permissions on actual creation */}
            <button
              onClick={() => setShowCreateFolder(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <FolderPlus className="w-4 h-4" />
              New Folder
            </button>

            {/* Upload button - only shown when inside a folder (documents must be in folders) */}
            {folderId && (
              <button
                onClick={() => setShowUploadModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-colors"
              >
                <Upload className="w-4 h-4" />
                Upload
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Sort and Filter Bar */}
      <SortFilterBar
        sortBy={sortBy}
        sortOrder={sortOrder}
        filters={filters}
        viewMode={viewMode}
        itemCount={fileListItems.length}
        selectedCount={selectedIds.size}
        onSortChange={(field, order) => {
          setSortBy(field)
          setSortOrder(order)
        }}
        onFilterChange={setFilters}
        onViewModeChange={setViewMode}
        onClearFilters={() => setFilters({})}
        showViewToggle={true}
      />

      {/* File List */}
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          <FileList
            items={fileListItems}
            viewMode={viewMode}
            sortBy={sortBy}
            sortOrder={sortOrder}
            selectedIds={selectedIds}
            onItemClick={handleItemClick}
            onItemDoubleClick={handleItemDoubleClick}
            onSelectionChange={handleSelectionChange}
            onContextMenu={handleContextMenu}
            onFavoriteToggle={handleFavoriteToggle}
            isLoading={false}
            emptyState={
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                  <FolderPlus className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  {folderId ? 'This folder is empty' : 'No folders yet'}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                  {folderId
                    ? 'Get started by creating a subfolder or uploading documents'
                    : 'Create a folder to start organizing and uploading documents'}
                </p>
                <div className="flex items-center gap-3">
                  <PermissionGate
                    permission="can_edit"
                    folder={
                      currentFolder
                        ? { id: currentFolder.id, owner_id: currentFolder.ownerId }
                        : undefined
                    }
                  >
                    <button
                      onClick={() => setShowCreateFolder(true)}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors border border-gray-300 dark:border-gray-600"
                    >
                      <FolderPlus className="w-4 h-4" />
                      New Folder
                    </button>
                  </PermissionGate>
                  {/* Upload button only shown when inside a folder - documents must be in folders */}
                  {folderId && (
                    <PermissionGate
                      permission="can_upload"
                      folder={
                        currentFolder
                          ? { id: currentFolder.id, owner_id: currentFolder.ownerId }
                          : undefined
                      }
                    >
                      <button
                        onClick={() => setShowUploadModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-colors"
                      >
                        <Upload className="w-4 h-4" />
                        Upload Documents
                      </button>
                    </PermissionGate>
                  )}
                </div>
              </div>
            }
          />
        </div>
      </div>

      {/* Bulk Action Toolbar */}
      <BulkActionToolbar
        selectedCount={selectedIds.size}
        selectedItems={selectedItems}
        onMove={handleBulkMove}
        onCopy={handleBulkCopy}
        onDelete={handleBulkDelete}
        onDownload={handleBulkDownload}
        onShare={handleBulkShare}
        onAddTags={handleBulkAddTags}
        onChangeConfidentiality={handleBulkChangeConfidentiality}
        onClearSelection={handleClearSelection}
      />

      {/* Context Menu - Folders */}
      {contextMenuPosition && contextMenuFolder && (
        <FolderContextMenu
          folder={contextMenuFolder}
          position={contextMenuPosition}
          onAction={handleContextMenuAction}
          onClose={closeContextMenu}
        />
      )}

      {/* Context Menu - Documents/Shortcuts */}
      {contextMenuPosition && contextMenuDocument && (
        <DocumentContextMenu
          item={contextMenuDocument}
          position={contextMenuPosition}
          onAction={handleDocumentContextMenuAction}
          onClose={closeContextMenu}
          hasShortcuts={false} // TODO: Check if document has shortcuts
        />
      )}

      {/* Modals */}
      <CreateFolderModal
        isOpen={showCreateFolder}
        onClose={() => {
          setShowCreateFolder(false)
          setOperationFolder(null)
        }}
        onCreate={handleCreateFolder}
        parentFolder={operationFolder || currentFolder}
      />

      <RenameFolderModal
        isOpen={activeOperation === 'rename'}
        folder={operationFolder}
        onClose={() => {
          setActiveOperation(null)
          setOperationFolder(null)
        }}
        onRename={handleRenameFolder}
      />

      <MoveFolderModal
        isOpen={activeOperation === 'move'}
        folder={operationFolder}
        folders={allFolders}
        onClose={() => {
          setActiveOperation(null)
          setOperationFolder(null)
        }}
        onMove={handleMoveFolder}
      />

      <DeleteFolderModal
        isOpen={activeOperation === 'delete'}
        folder={operationFolder}
        onClose={() => {
          setActiveOperation(null)
          setOperationFolder(null)
        }}
        onDelete={handleDeleteFolder}
      />

      <FolderPropertiesModal
        isOpen={activeOperation === 'properties'}
        folder={operationFolder}
        onClose={() => {
          setActiveOperation(null)
          setOperationFolder(null)
        }}
      />

      {/* Folder Details Drawer */}
      <FolderDetailsDrawer
        open={folderDetailsDrawerOpen}
        onClose={() => {
          setFolderDetailsDrawerOpen(false)
          setFolderDetailsData(null)
        }}
        folder={folderDetailsData}
        onOpen={(openFolderId) => {
          // Navigate to folder with encoded URL
          const folder = allFolders.find((f) => f.id === openFolderId)
          navigateToFolder(openFolderId, folder?.departmentId)
        }}
        onShare={(folderId) => {
          // Close drawer and open share modal
          const folder = allFolders.find((f) => f.id === folderId)
          if (folder) {
            setFolderDetailsDrawerOpen(false)
            setFolderToShare(folder)
          }
        }}
        onRename={(folderId) => {
          // Close drawer and open rename modal
          const folder = allFolders.find((f) => f.id === folderId)
          if (folder) {
            setFolderDetailsDrawerOpen(false)
            setOperationFolder(folder)
            setActiveOperation('rename')
          }
        }}
        onMove={(folderId) => {
          // Close drawer and open move modal
          const folder = allFolders.find((f) => f.id === folderId)
          if (folder) {
            setFolderDetailsDrawerOpen(false)
            setOperationFolder(folder)
            setActiveOperation('move')
          }
        }}
        onDelete={(folderId) => {
          // Close drawer and open delete modal
          const folder = allFolders.find((f) => f.id === folderId)
          if (folder) {
            setFolderDetailsDrawerOpen(false)
            setOperationFolder(folder)
            setActiveOperation('delete')
          }
        }}
        onToggleFavorite={async (folderId) => {
          // Toggle folder favorite status
          try {
            const result = await toggleFolderFavorite(folderId)
            setFavoriteFolderIds((prev) => {
              const newSet = new Set(prev)
              if (result.is_favorite) {
                newSet.add(folderId)
              } else {
                newSet.delete(folderId)
              }
              return newSet
            })
            // Update the drawer data
            if (folderDetailsData) {
              setFolderDetailsData({ ...folderDetailsData, isFavorite: result.is_favorite })
            }
            if (result.is_favorite) {
              toast.success('Added to favorites')
            } else {
              toast.success('Removed from favorites')
            }
          } catch (error) {
            console.error('Failed to toggle favorite:', error)
            toast.error('Failed to update favorites. Please try again.')
          }
        }}
        onToggleLock={async (folderId) => {
          // Toggle folder lock status
          try {
            if (folderDetailsData?.isLocked) {
              await folderService.unlockFolder(folderId)
              if (folderDetailsData) {
                setFolderDetailsData({ ...folderDetailsData, isLocked: false })
              }
              toast.success('Folder unlocked')
            } else {
              await folderService.lockFolder(folderId)
              if (folderDetailsData) {
                setFolderDetailsData({ ...folderDetailsData, isLocked: true })
              }
              toast.success('Folder locked')
            }
            // Refresh folders
            await dispatch(fetchFolders({})).unwrap()
          } catch (error) {
            console.error('Failed to toggle lock:', error)
            toast.error('Failed to update lock status. Please try again.')
          }
        }}
        onCreateSubfolder={(folderId) => {
          // Close drawer and open create folder modal
          const folder = allFolders.find((f) => f.id === folderId)
          if (folder) {
            setFolderDetailsDrawerOpen(false)
            setOperationFolder(folder)
            setShowCreateFolder(true)
          }
        }}
        onUploadDocuments={() => {
          // Close drawer and open upload modal
          setFolderDetailsDrawerOpen(false)
          setShowUploadModal(true)
        }}
        onLoadAccess={async (folderId) => {
          // Load folder access/permissions from API
          // Note: Folders may use the same or similar permissions endpoint
          try {
            // For now, return empty as folder-specific permissions may need backend work
            // The folder permissions are typically inherited or set at creation
            return []
          } catch (error) {
            console.error('Failed to load folder access:', error)
            return []
          }
        }}
        onLoadActivity={async (folderId) => {
          // Load folder activity/audit logs from API
          try {
            const activities = await getFolderActivity(folderId)
            return activities.map((a) => ({
              id: a.id,
              action: a.action,
              performedBy: a.user || 'System',
              performedAt: a.timestamp,
              details: a.details || a.error_message,
            }))
          } catch (error) {
            console.error('Failed to load folder activity:', error)
            toast.error('Failed to load activity history')
            return []
          }
        }}
      />

      {/* Share Folder Modal */}
      <ShareFolderModal
        isOpen={!!folderToShare}
        folder={folderToShare}
        onClose={() => setFolderToShare(null)}
        onShareCreated={handleShareFolder}
      />

      {/* File Preview Modal */}
      {(previewFile || isPreviewLoading) && (
        <FilePreviewModal
          preview={previewFile}
          isOpen={true}
          isLoading={isPreviewLoading}
          onClose={() => setPreviewFile(null)}
          onEdit={(docId) => {
            console.log('Edit document:', docId)
            // TODO: Implement edit
          }}
          onDelete={(docId) => {
            // Close preview and open delete modal
            const item = fileListItems.find((i) => i.id === docId && i.type === 'file')
            if (item) {
              setPreviewFile(null)
              setDocumentToDelete(item)
            }
          }}
          onDownload={async (docId) => {
            try {
              const blob = await downloadDocument(docId)
              const url = window.URL.createObjectURL(blob)
              const link = document.createElement('a')
              link.href = url
              link.download = previewFile?.fileName || 'download'
              document.body.appendChild(link)
              link.click()
              document.body.removeChild(link)
              window.URL.revokeObjectURL(url)
              toast.success(`Downloading "${previewFile?.fileName || 'file'}"`)
            } catch (error) {
              console.error('Download failed:', error)
              toast.error('Failed to download file. Please try again.')
            }
          }}
          onShare={(docId) => {
            console.log('Share document:', docId)
            // TODO: Implement share
          }}
          onVersionChange={(versionId) => {
            console.log('Change to version:', versionId)
            // TODO: Implement version change
          }}
        />
      )}

      {/* Document Upload Modal */}
      <DocumentUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUploadComplete={handleUploadComplete}
        folderId={folderId}
        folderInfo={
          currentFolder
            ? {
                name: currentFolder.name,
                departmentId: currentFolder.departmentId || '',
                departmentName: currentFolder.departmentName || '',
                path: currentFolder.path,
              }
            : undefined
        }
        requireMetadata={true}
      />

      {/* Move Document Modal */}
      <MoveDocumentModal
        isOpen={!!documentToMove}
        item={documentToMove}
        folders={allFolders}
        currentFolderId={folderId}
        onClose={() => setDocumentToMove(null)}
        onMove={handleMoveDocument}
      />

      {/* Create Shortcut Modal */}
      <CreateShortcutModal
        isOpen={!!documentToCreateShortcut}
        item={documentToCreateShortcut}
        folders={allFolders}
        currentFolderId={folderId}
        onClose={() => setDocumentToCreateShortcut(null)}
        onCreateShortcut={handleCreateShortcut}
      />

      {/* Rename Document Modal */}
      <RenameDocumentModal
        isOpen={!!documentToRename}
        item={documentToRename}
        onClose={() => setDocumentToRename(null)}
        onRename={handleRenameDocument}
      />

      {/* Delete Document Modal */}
      <DeleteDocumentModal
        isOpen={!!documentToDelete}
        item={documentToDelete}
        onClose={() => setDocumentToDelete(null)}
        onDelete={handleDeleteDocument}
      />

      {/* Orphaned Document Modal (file missing from storage) */}
      <OrphanedDocumentModal
        isOpen={!!orphanedDocument}
        documentId={orphanedDocument?.id || ''}
        documentName={orphanedDocument?.name}
        onClose={() => setOrphanedDocument(null)}
        onDelete={async (documentId) => {
          await deleteOrphanedDocument(documentId)
          // Refresh the document list after cleanup
          await loadDocuments()
          toast.success('Orphaned document record removed')
        }}
      />

      {/* Share Document Modal */}
      <ShareDocumentModal
        isOpen={!!documentToShare}
        item={documentToShare}
        onClose={() => setDocumentToShare(null)}
      />

      {/* File Details Drawer */}
      <FileDetailsDrawer
        open={fileDetailsDrawerOpen}
        onClose={() => {
          setFileDetailsDrawerOpen(false)
          setFileDetailsData(null)
        }}
        file={fileDetailsData}
        onPreview={(fileId) => {
          // Close drawer and open preview modal
          setFileDetailsDrawerOpen(false)
          const item = fileListItems.find((i) => i.id === fileId && i.type === 'file')
          if (item) {
            openFilePreview(item)
          }
        }}
        onDownload={async (fileId) => {
          try {
            const blob = await downloadDocument(fileId)
            const url = window.URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = fileDetailsData?.fileName || 'download'
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            window.URL.revokeObjectURL(url)
            toast.success(`Downloading "${fileDetailsData?.fileName || 'file'}"`)
          } catch (error) {
            console.error('Download failed:', error)
            // Check if file is missing from storage (orphaned record)
            if (isFileMissingError(error)) {
              setFileDetailsDrawerOpen(false)
              setOrphanedDocument({ id: fileId, name: fileDetailsData?.fileName })
            } else {
              toast.error('Failed to download file. Please try again.')
            }
          }
        }}
        onShare={(fileId) => {
          // Close drawer and open share modal
          const item = fileListItems.find((i) => i.id === fileId && i.type === 'file')
          if (item) {
            setFileDetailsDrawerOpen(false)
            setDocumentToShare(item)
          }
        }}
        onMove={(fileId) => {
          // Close drawer and open move modal
          const item = fileListItems.find((i) => i.id === fileId && i.type === 'file')
          if (item) {
            setFileDetailsDrawerOpen(false)
            setDocumentToMove(item)
          }
        }}
        onDelete={(fileId) => {
          // Close drawer and open delete modal
          const item = fileListItems.find((i) => i.id === fileId && i.type === 'file')
          if (item) {
            setFileDetailsDrawerOpen(false)
            setDocumentToDelete(item)
          }
        }}
        onToggleFavorite={async (fileId) => {
          // Toggle document favorite status
          try {
            const result = await toggleDocumentFavorite(fileId)
            setFavoriteDocumentIds((prev) => {
              const newSet = new Set(prev)
              if (result.is_favorite) {
                newSet.add(fileId)
              } else {
                newSet.delete(fileId)
              }
              return newSet
            })
            // Update the drawer data
            if (fileDetailsData) {
              setFileDetailsData({ ...fileDetailsData, isFavorite: result.is_favorite })
            }
            if (result.is_favorite) {
              toast.success('Added to favorites')
            } else {
              toast.success('Removed from favorites')
            }
          } catch (error) {
            console.error('Failed to toggle favorite:', error)
            toast.error('Failed to update favorites. Please try again.')
          }
        }}
        onLoadVersions={async (documentId) => {
          // Load document versions from API
          try {
            const versions = await getDocumentVersions(documentId)
            return versions.map((v) => ({
              id: v.id,
              versionNumber: v.version_number,
              fileName: v.file_name,
              fileSize: v.file_size,
              createdAt: v.created_at,
              createdBy: v.created_by_name || v.created_by,
              changeDescription: v.change_description,
              isCurrent: v.is_current,
            }))
          } catch (error) {
            console.error('Failed to load versions:', error)
            toast.error('Failed to load version history')
            return []
          }
        }}
        onLoadAccess={async (documentId) => {
          // Load document access/permissions from API
          try {
            const accessList = await getDocumentAccess(documentId)
            return accessList.map((a) => ({
              id: a.id,
              userId: a.user_id,
              userName: a.user_name,
              userEmail: a.user_email,
              permission: a.permission,
              grantedAt: a.granted_at,
              grantedBy: a.granted_by,
            }))
          } catch (error) {
            console.error('Failed to load access list:', error)
            // Don't show error toast for access - may not have permissions endpoint
            return []
          }
        }}
        onLoadActivity={async (documentId) => {
          // Load document activity/audit logs from API
          try {
            const activities = await getDocumentActivity(documentId)
            return activities.map((a) => ({
              id: a.id,
              action: a.action,
              performedBy: a.user || 'System',
              performedAt: a.timestamp,
              details: a.details || a.error_message,
            }))
          } catch (error) {
            console.error('Failed to load activity:', error)
            toast.error('Failed to load activity history')
            return []
          }
        }}
        onVersionDownload={async (documentId, versionId) => {
          // Download a specific version
          try {
            const blob = await downloadDocumentVersion(documentId, versionId)
            const url = window.URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = `version_${versionId}_${fileDetailsData?.fileName || 'download'}`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            window.URL.revokeObjectURL(url)
            toast.success('Downloading version...')
          } catch (error) {
            console.error('Failed to download version:', error)
            toast.error('Failed to download version')
          }
        }}
        onVersionRestore={async (documentId, versionId) => {
          // Restore a specific version
          try {
            await restoreDocumentVersion(documentId, versionId)
            toast.success('Version restored successfully')
            // Refresh the document list
            const docs = await getDocumentsInFolder(folderId)
            setDocuments(docs)
          } catch (error) {
            console.error('Failed to restore version:', error)
            toast.error('Failed to restore version')
          }
        }}
      />
    </div>
  )
}
