/**
 * DocumentUploadModal Component
 * Modal for uploading documents with full metadata support
 */

import { FC, useState, useCallback, useEffect } from 'react'
import { Modal } from '@components/Modal'
import { FileUploadProgress } from '@components/Upload/FileUploadProgress'
import { Select } from '@components/Select/Select'
import { DatePicker } from '@components/DatePicker/DatePicker'
import { Button } from '@components/Button'
import {
  CloudArrowUpIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import { cn } from '@utils/cn'
import { format } from 'date-fns'
import documentService, { isDuplicateFileError } from '@/services/documentService'
import type { FileUploadItem, DocumentUploadModalProps, DuplicateFileInfo } from '@/types/upload'
import type { CreateDocumentMetadata } from '@/types/metadata'
import {
  DOCUMENT_TYPES,
  DEPARTMENTS,
  RETENTION_PERIODS,
  CONFIDENTIALITY_LEVELS,
  IDENTIFIER_TYPES,
  getDefaultRetentionForDocumentType,
  getDefaultConfidentialityForDepartment,
} from '@/constants/metadata'

/**
 * DocumentUploadModal - Upload documents with metadata
 */
export const DocumentUploadModal: FC<DocumentUploadModalProps> = ({
  isOpen,
  onClose,
  onUploadComplete,
  folderId,
  config,
  requireMetadata = true,
  className,
}) => {
  const [isDragging, setIsDragging] = useState(false)
  const [uploads, setUploads] = useState<FileUploadItem[]>([])
  const [metadata, setMetadata] = useState<Partial<CreateDocumentMetadata>>({
    confidentialityLevel: 'INTERNAL', // Backend expects UPPERCASE
    retentionPeriod: '5_years',
    tags: [],
    date: format(new Date(), 'yyyy-MM-dd'),
  })
  const [metadataErrors, setMetadataErrors] = useState<Record<string, string>>({})
  const [currentStep, setCurrentStep] = useState<'select-files' | 'metadata' | 'uploading'>(
    'select-files'
  )
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setUploads([])
      setMetadata({
        confidentialityLevel: 'INTERNAL', // Backend expects UPPERCASE
        retentionPeriod: '5_years',
        tags: [],
        date: format(new Date(), 'yyyy-MM-dd'),
      })
      setMetadataErrors({})
      setCurrentStep('select-files')
      setShowAdvanced(false)
    }
  }, [isOpen])

  // Handle file selection
  const handleFilesSelected = useCallback((files: File[]) => {
    const newUploads: FileUploadItem[] = files.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      status: 'pending',
      progress: 0,
      previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
    }))
    setUploads((prev) => [...prev, ...newUploads])
  }, [])

  // Handle drag and drop
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      const files = Array.from(e.dataTransfer.files)
      if (files.length > 0) {
        handleFilesSelected(files)
      }
    },
    [handleFilesSelected]
  )

  // Handle file input change
  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (files && files.length > 0) {
        handleFilesSelected(Array.from(files))
      }
      e.target.value = '' // Reset input
    },
    [handleFilesSelected]
  )

  // Remove upload
  const handleRemoveUpload = useCallback((id: string) => {
    setUploads((prev) => prev.filter((upload) => upload.id !== id))
  }, [])

  // Cancel upload
  const handleCancelUpload = useCallback((id: string) => {
    setUploads((prev) =>
      prev.map((upload) =>
        upload.id === id ? { ...upload, status: 'cancelled' as const } : upload
      )
    )
  }, [])

  // Retry upload
  const handleRetryUpload = useCallback(
    async (id: string) => {
      const upload = uploads.find((u) => u.id === id)
      if (!upload) return

      // Reset status to pending
      setUploads((prev) =>
        prev.map((u) =>
          u.id === id ? { ...u, status: 'pending' as const, progress: 0, error: undefined } : u
        )
      )

      // Start upload immediately
      try {
        setUploads((prev) =>
          prev.map((u) =>
            u.id === id
              ? { ...u, status: 'uploading' as const, startedAt: new Date().toISOString() }
              : u
          )
        )

        const response = await documentService.uploadDocument({
          file: upload.file,
          folderId: folderId || null,
          metadata: metadata as CreateDocumentMetadata,
          onProgress: (progress, uploadSpeed, timeRemaining) => {
            setUploads((prev) =>
              prev.map((u) => (u.id === id ? { ...u, progress, uploadSpeed, timeRemaining } : u))
            )
          },
        })

        setUploads((prev) =>
          prev.map((u) =>
            u.id === id
              ? {
                  ...u,
                  status: 'completed' as const,
                  progress: 100,
                  documentId: response.id,
                  completedAt: new Date().toISOString(),
                }
              : u
          )
        )
      } catch (error) {
        const errorMessage = documentService.handleDocumentError(error)
        setUploads((prev) =>
          prev.map((u) =>
            u.id === id ? { ...u, status: 'error' as const, error: errorMessage } : u
          )
        )
      }
    },
    [uploads, metadata, folderId]
  )

  // Validate metadata
  const validateMetadata = (): boolean => {
    const errors: Record<string, string> = {}

    if (!metadata.title?.trim()) errors.title = 'Title is required'
    if (!metadata.documentType) errors.documentType = 'Document type is required'
    if (!metadata.identifier?.trim()) errors.identifier = 'Identifier is required'
    if (!metadata.identifierType) errors.identifierType = 'Identifier type is required'
    if (!metadata.date) errors.date = 'Date is required'
    if (!metadata.creator?.trim()) errors.creator = 'Creator is required'
    if (!metadata.department) errors.department = 'Department is required'
    if (!metadata.confidentialityLevel)
      errors.confidentialityLevel = 'Confidentiality level is required'
    if (!metadata.retentionPeriod) errors.retentionPeriod = 'Retention period is required'

    if (metadata.retentionPeriod === 'custom' && !metadata.customRetentionYears) {
      errors.customRetentionYears = 'Custom retention years required'
    }

    setMetadataErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Continue to metadata step
  const handleContinueToMetadata = useCallback(() => {
    if (uploads.length === 0) {
      return
    }
    setCurrentStep('metadata')
  }, [uploads.length])

  // Start upload
  const handleStartUpload = useCallback(async () => {
    if (!validateMetadata()) {
      return
    }

    setCurrentStep('uploading')

    const results = []
    let successful = 0
    let failed = 0

    for (const upload of uploads) {
      if (upload.status === 'cancelled' || upload.status === 'completed') {
        continue
      }

      try {
        // Update status to uploading
        setUploads((prev) =>
          prev.map((u) =>
            u.id === upload.id
              ? { ...u, status: 'uploading' as const, startedAt: new Date().toISOString() }
              : u
          )
        )

        const response = await documentService.uploadDocument({
          file: upload.file,
          folderId: folderId || null,
          metadata: metadata as CreateDocumentMetadata,
          onProgress: (progress, uploadSpeed, timeRemaining) => {
            setUploads((prev) =>
              prev.map((u) =>
                u.id === upload.id ? { ...u, progress, uploadSpeed, timeRemaining } : u
              )
            )
          },
        })

        // Update status to completed
        setUploads((prev) =>
          prev.map((u) =>
            u.id === upload.id
              ? {
                  ...u,
                  status: 'completed' as const,
                  progress: 100,
                  documentId: response.id,
                  completedAt: new Date().toISOString(),
                }
              : u
          )
        )

        results.push({
          success: true,
          documentId: response.id,
          file: upload.file,
        })
        successful++
      } catch (error) {
        // Check if it's a duplicate file error
        const duplicateError = isDuplicateFileError(error)

        if (duplicateError) {
          // Set status to duplicate with info about existing file
          const duplicateInfo: DuplicateFileInfo = {
            documentId: duplicateError.existingDocument.id,
            title: duplicateError.existingDocument.title,
            fileName: duplicateError.existingDocument.fileName,
            folderId: duplicateError.existingDocument.folderId,
            folderName: duplicateError.existingDocument.folderName,
            folderPath: duplicateError.existingDocument.folderPath,
            confidentialityLevel: duplicateError.existingDocument.confidentialityLevel,
            documentType: duplicateError.existingDocument.documentType,
          }

          setUploads((prev) =>
            prev.map((u) =>
              u.id === upload.id
                ? {
                    ...u,
                    status: 'duplicate' as const,
                    error: duplicateError.message,
                    duplicateInfo,
                  }
                : u
            )
          )

          results.push({
            success: false,
            error: duplicateError.message,
            file: upload.file,
          })
          failed++
        } else {
          const errorMessage = documentService.handleDocumentError(error)

          // Update status to error
          setUploads((prev) =>
            prev.map((u) =>
              u.id === upload.id ? { ...u, status: 'error' as const, error: errorMessage } : u
            )
          )

          results.push({
            success: false,
            error: errorMessage,
            file: upload.file,
          })
          failed++
        }
      }
    }

    // Call completion callback
    if (onUploadComplete) {
      onUploadComplete({
        total: uploads.length,
        successful,
        failed,
        results,
      })
    }
  }, [uploads, metadata, folderId, onUploadComplete])

  // Update metadata field
  const handleMetadataChange = useCallback((field: keyof CreateDocumentMetadata, value: any) => {
    setMetadata((prev) => {
      const updated = { ...prev, [field]: value }

      // Auto-update retention period based on document type
      if (field === 'documentType') {
        updated.retentionPeriod = getDefaultRetentionForDocumentType(value)
      }

      // Auto-update confidentiality based on department
      if (field === 'department') {
        updated.confidentialityLevel = getDefaultConfidentialityForDepartment(value)
      }

      return updated
    })

    // Clear error for this field
    setMetadataErrors((prev) => {
      const newErrors = { ...prev }
      delete newErrors[field]
      return newErrors
    })
  }, [])

  // Add tag
  const handleAddTag = useCallback(
    (tag: string) => {
      if (tag.trim() && !metadata.tags?.includes(tag.trim())) {
        setMetadata((prev) => ({
          ...prev,
          tags: [...(prev.tags || []), tag.trim()],
        }))
      }
    },
    [metadata.tags]
  )

  // Remove tag
  const handleRemoveTag = useCallback((tag: string) => {
    setMetadata((prev) => ({
      ...prev,
      tags: (prev.tags || []).filter((t) => t !== tag),
    }))
  }, [])

  // Create shortcut handler for duplicate files
  const handleCreateShortcut = useCallback(
    async (uploadId: string, documentId: string) => {
      if (!folderId) {
        // Cannot create shortcut at root level
        setUploads((prev) =>
          prev.map((u) =>
            u.id === uploadId
              ? { ...u, status: 'error' as const, error: 'Cannot create shortcut at root level' }
              : u
          )
        )
        return
      }

      try {
        // Update status to show we're creating shortcut
        setUploads((prev) =>
          prev.map((u) =>
            u.id === uploadId ? { ...u, status: 'processing' as const, error: undefined } : u
          )
        )

        // Create the shortcut
        await documentService.createShortcut(documentId, folderId)

        // Mark as completed
        setUploads((prev) =>
          prev.map((u) =>
            u.id === uploadId
              ? {
                  ...u,
                  status: 'completed' as const,
                  documentId: documentId, // Reference to original document
                  completedAt: new Date().toISOString(),
                }
              : u
          )
        )

        // Trigger refresh callback so parent component refreshes the folder
        if (onUploadComplete) {
          onUploadComplete({
            total: 1,
            successful: 1,
            failed: 0,
            results: [
              {
                success: true,
                documentId: documentId,
                file: uploads.find((u) => u.id === uploadId)?.file as File,
              },
            ],
          })
        }
      } catch (error) {
        const errorMessage = documentService.handleDocumentError(error)
        setUploads((prev) =>
          prev.map((u) =>
            u.id === uploadId
              ? {
                  ...u,
                  status: 'error' as const,
                  error: `Failed to create shortcut: ${errorMessage}`,
                }
              : u
          )
        )
      }
    },
    [folderId, onUploadComplete, uploads]
  )

  // Check if all uploads are complete
  const allUploadsComplete =
    uploads.length > 0 &&
    uploads.every(
      (u) =>
        u.status === 'completed' ||
        u.status === 'error' ||
        u.status === 'cancelled' ||
        u.status === 'duplicate'
    )
  const hasSuccessfulUploads = uploads.some((u) => u.status === 'completed')
  const hasErrors = uploads.some((u) => u.status === 'error')
  const hasDuplicates = uploads.some((u) => u.status === 'duplicate')
  const failedUploadsCount = uploads.filter((u) => u.status === 'error').length
  const duplicateUploadsCount = uploads.filter((u) => u.status === 'duplicate').length

  // Dismiss all failed uploads
  const handleDismissAllFailed = useCallback(() => {
    setUploads((prev) => prev.filter((u) => u.status !== 'error'))
  }, [])

  // Retry all failed uploads
  const handleRetryAllFailed = useCallback(async () => {
    const failedUploads = uploads.filter((u) => u.status === 'error')
    for (const upload of failedUploads) {
      await handleRetryUpload(upload.id)
    }
  }, [uploads, handleRetryUpload])

  // Prepare Select options for lists with 5+ options
  const documentTypeOptions = DOCUMENT_TYPES.map((type) => ({
    value: type.value,
    label: `${type.icon} ${type.label}`,
  }))

  const departmentOptions = DEPARTMENTS.map((dept) => ({
    value: dept.value,
    label: dept.label,
  }))

  const identifierTypeOptions = IDENTIFIER_TYPES.map((type) => ({
    value: type.value,
    label: type.label,
  }))

  const confidentialityOptions = CONFIDENTIALITY_LEVELS.map((level) => ({
    value: level.value,
    label: level.label,
  }))

  const retentionOptions = RETENTION_PERIODS.map((period) => ({
    value: period.value,
    label: period.label,
  }))

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      size="xl"
      showCloseButton={currentStep !== 'uploading' || uploads.length === 0 || allUploadsComplete}
      closeOnOverlayClick={false}
      className={className}
      title={
        currentStep === 'select-files'
          ? 'Upload Documents'
          : currentStep === 'metadata'
            ? 'Document Metadata'
            : uploads.length === 0
              ? 'Upload Documents'
              : allUploadsComplete
                ? 'Upload Complete'
                : 'Uploading...'
      }
      description={
        currentStep === 'select-files'
          ? 'Select files to upload'
          : currentStep === 'metadata'
            ? 'Provide metadata for your documents (required for compliance)'
            : undefined
      }
      footer={
        currentStep === 'select-files' ? (
          <>
            <div className="flex-1" />
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleContinueToMetadata}
              disabled={uploads.length === 0}
            >
              Continue to Metadata
            </Button>
          </>
        ) : currentStep === 'metadata' ? (
          <>
            <Button variant="ghost" onClick={() => setCurrentStep('select-files')}>
              Back
            </Button>
            <div className="flex-1" />
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleStartUpload}>
              Upload {uploads.length} {uploads.length === 1 ? 'File' : 'Files'}
            </Button>
          </>
        ) : uploads.length === 0 ? null : allUploadsComplete ? ( // Empty state - no footer buttons needed, they're in the content area
          <>
            <div className="flex-1" />
            <Button variant="primary" onClick={onClose}>
              {hasSuccessfulUploads ? 'Done' : 'Close'}
            </Button>
          </>
        ) : null
      }
    >
      {/* Step 1: File Selection */}
      {currentStep === 'select-files' && (
        <div className="space-y-4">
          {/* Drop zone */}
          <div
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              'relative rounded-lg border-2 border-dashed p-8 transition-colors',
              isDragging
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600'
            )}
          >
            <input
              type="file"
              multiple={config?.multiple !== false}
              accept={config?.acceptedFileTypes?.join(',')}
              onChange={handleFileInputChange}
              className="sr-only"
              id="file-upload"
            />

            <div className="flex flex-col items-center text-center">
              <CloudArrowUpIcon className="h-12 w-12 mb-4 text-gray-400 dark:text-gray-600" />

              <p className="text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
                {isDragging ? 'Drop files here' : 'Drag and drop files here'}
              </p>

              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">or</p>

              {/* Fixed: Use div instead of button to avoid nested button error */}
              <label
                htmlFor="file-upload"
                className="inline-flex items-center justify-center px-4 py-2 bg-primary-600 text-white hover:bg-primary-700 rounded-lg font-medium text-base transition-colors cursor-pointer focus-within:ring-2 focus-within:ring-primary-500 focus-within:ring-offset-2"
              >
                Browse Files
              </label>

              <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
                Supported: PDF, Word, Excel, PowerPoint, Images, and more
                {config?.maxFileSize &&
                  ` • Max size: ${documentService.formatFileSize(config.maxFileSize)}`}
              </p>
            </div>
          </div>

          {/* Selected files list */}
          {uploads.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Selected Files ({uploads.length})
              </h4>
              {uploads.map((upload) => (
                <FileUploadProgress
                  key={upload.id}
                  upload={upload}
                  onRemove={handleRemoveUpload}
                  showDetails={false}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 2: Metadata - Fixed: Increased padding and themed scrollbar */}
      {currentStep === 'metadata' && (
        <div
          className={cn(
            'space-y-6 max-h-[600px] overflow-y-auto px-6 py-1',
            // Custom scrollbar styling for dark/light theme
            '[&::-webkit-scrollbar]:w-2',
            '[&::-webkit-scrollbar-track]:bg-gray-100 dark:[&::-webkit-scrollbar-track]:bg-gray-800',
            '[&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-gray-600',
            '[&::-webkit-scrollbar-thumb]:rounded-full',
            '[&::-webkit-scrollbar-thumb]:hover:bg-gray-400 dark:[&::-webkit-scrollbar-thumb]:hover:bg-gray-500'
          )}
        >
          {/* Required Fields */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700 pb-2">
              Required Information
            </h3>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Title <span className="text-error-600">*</span>
              </label>
              <input
                type="text"
                value={metadata.title || ''}
                onChange={(e) => handleMetadataChange('title', e.target.value)}
                className={cn(
                  'w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100',
                  'placeholder:text-gray-400 dark:placeholder:text-gray-500',
                  'focus:outline-none focus:ring-2',
                  metadataErrors.title
                    ? 'border-error-500 focus:ring-error-500'
                    : 'border-gray-300 dark:border-gray-700 focus:ring-primary-500'
                )}
                placeholder="Enter document title"
              />
              {metadataErrors.title && (
                <p className="text-xs text-error-600 dark:text-error-400 mt-1">
                  {metadataErrors.title}
                </p>
              )}
            </div>

            {/* Document Type & Confidentiality (side by side) */}
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Document Type"
                options={documentTypeOptions}
                value={metadata.documentType || ''}
                onChange={(value) => handleMetadataChange('documentType', value)}
                placeholder="Select type..."
                searchable={true}
                error={metadataErrors.documentType}
                fullWidth
              />

              <Select
                label="Confidentiality Level"
                options={confidentialityOptions}
                value={metadata.confidentialityLevel || ''}
                onChange={(value) => handleMetadataChange('confidentialityLevel', value)}
                error={metadataErrors.confidentialityLevel}
                fullWidth
              />
            </div>
            {metadata.confidentialityLevel && (
              <p className="text-xs text-gray-500 dark:text-gray-400 -mt-2">
                {
                  CONFIDENTIALITY_LEVELS.find((l) => l.value === metadata.confidentialityLevel)
                    ?.description
                }
              </p>
            )}

            {/* Identifier Type & Identifier (side by side) */}
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Identifier Type"
                options={identifierTypeOptions}
                value={metadata.identifierType || ''}
                onChange={(value) => handleMetadataChange('identifierType', value)}
                placeholder="Select type..."
                searchable={identifierTypeOptions.length > 5}
                error={metadataErrors.identifierType}
                fullWidth
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Identifier <span className="text-error-600">*</span>
                </label>
                <input
                  type="text"
                  value={metadata.identifier || ''}
                  onChange={(e) => handleMetadataChange('identifier', e.target.value)}
                  className={cn(
                    'w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100',
                    'placeholder:text-gray-400 dark:placeholder:text-gray-500',
                    'focus:outline-none focus:ring-2',
                    metadataErrors.identifier
                      ? 'border-error-500 focus:ring-error-500'
                      : 'border-gray-300 dark:border-gray-700 focus:ring-primary-500'
                  )}
                  placeholder="e.g., INV-2024-001"
                />
                {metadataErrors.identifier && (
                  <p className="text-xs text-error-600 dark:text-error-400 mt-1">
                    {metadataErrors.identifier}
                  </p>
                )}
              </div>
            </div>

            {/* Date, Creator, Department */}
            <div className="grid grid-cols-3 gap-4">
              <DatePicker
                label="Date"
                required
                value={metadata.date ? new Date(metadata.date) : undefined}
                onChange={(date) =>
                  handleMetadataChange('date', date ? format(date, 'yyyy-MM-dd') : '')
                }
                error={metadataErrors.date}
                dateFormat="yyyy-MM-dd"
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Creator <span className="text-error-600">*</span>
                </label>
                <input
                  type="text"
                  value={metadata.creator || ''}
                  onChange={(e) => handleMetadataChange('creator', e.target.value)}
                  className={cn(
                    'w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100',
                    'placeholder:text-gray-400 dark:placeholder:text-gray-500',
                    'focus:outline-none focus:ring-2',
                    metadataErrors.creator
                      ? 'border-error-500 focus:ring-error-500'
                      : 'border-gray-300 dark:border-gray-700 focus:ring-primary-500'
                  )}
                  placeholder="Creator name"
                />
                {metadataErrors.creator && (
                  <p className="text-xs text-error-600 dark:text-error-400 mt-1">
                    {metadataErrors.creator}
                  </p>
                )}
              </div>

              <Select
                label="Department"
                options={departmentOptions}
                value={metadata.department || ''}
                onChange={(value) => handleMetadataChange('department', value)}
                placeholder="Select..."
                searchable={departmentOptions.length > 5}
                error={metadataErrors.department}
                fullWidth
              />
            </div>

            {/* Retention Period */}
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Retention Period"
                options={retentionOptions}
                value={metadata.retentionPeriod || ''}
                onChange={(value) => handleMetadataChange('retentionPeriod', value)}
                error={metadataErrors.retentionPeriod}
                fullWidth
              />

              {metadata.retentionPeriod === 'custom' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Custom Years <span className="text-error-600">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={metadata.customRetentionYears || ''}
                    onChange={(e) =>
                      handleMetadataChange('customRetentionYears', parseInt(e.target.value))
                    }
                    className={cn(
                      'w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100',
                      'placeholder:text-gray-400 dark:placeholder:text-gray-500',
                      'focus:outline-none focus:ring-2',
                      metadataErrors.customRetentionYears
                        ? 'border-error-500 focus:ring-error-500'
                        : 'border-gray-300 dark:border-gray-700 focus:ring-primary-500'
                    )}
                    placeholder="Years"
                  />
                  {metadataErrors.customRetentionYears && (
                    <p className="text-xs text-error-600 dark:text-error-400 mt-1">
                      {metadataErrors.customRetentionYears}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Tags (Optional)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddTag(e.currentTarget.value)
                      e.currentTarget.value = ''
                    }
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Type and press Enter to add tags"
                />
              </div>
              {metadata.tags && metadata.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {metadata.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded text-xs"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="hover:text-primary-900 dark:hover:text-primary-100"
                      >
                        <XMarkIcon className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Optional/Advanced Fields */}
          <div>
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline"
            >
              {showAdvanced ? 'Hide' : 'Show'} Advanced Options
            </button>

            {showAdvanced && (
              <div className="mt-4 space-y-4 pl-4 border-l-2 border-gray-200 dark:border-gray-700">
                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description
                  </label>
                  <textarea
                    value={metadata.description || ''}
                    onChange={(e) => handleMetadataChange('description', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Optional description"
                  />
                </div>

                {/* Customer Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Customer Name
                  </label>
                  <input
                    type="text"
                    value={metadata.customerName || ''}
                    onChange={(e) => handleMetadataChange('customerName', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Customer or client name"
                  />
                </div>

                {/* Comments */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Comments
                  </label>
                  <textarea
                    value={metadata.comments || ''}
                    onChange={(e) => handleMetadataChange('comments', e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Additional comments"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 3: Uploading */}
      {currentStep === 'uploading' && (
        <div className="space-y-4">
          {/* Empty state - all uploads dismissed */}
          {uploads.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CloudArrowUpIcon className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
              <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No files to upload
              </h4>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-sm">
                All files have been dismissed. You can upload new files or close this dialog.
              </p>
              <div className="flex items-center gap-3">
                <Button variant="primary" onClick={() => setCurrentStep('select-files')}>
                  Upload New Files
                </Button>
                <Button variant="ghost" onClick={onClose}>
                  Close
                </Button>
              </div>
            </div>
          )}

          {/* Upload status and list */}
          {uploads.length > 0 && (
            <>
              {allUploadsComplete && (
                <div
                  className={cn(
                    'flex items-start gap-3 p-4 rounded-lg',
                    hasErrors || hasDuplicates
                      ? 'bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800'
                      : 'bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800'
                  )}
                >
                  {hasErrors || hasDuplicates ? (
                    <>
                      <ExclamationTriangleIcon className="w-6 h-6 text-warning-600 dark:text-warning-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-medium text-warning-900 dark:text-warning-100">
                          {hasDuplicates && !hasErrors
                            ? 'Duplicate files detected'
                            : 'Upload completed with issues'}
                        </h4>
                        <p className="text-sm text-warning-700 dark:text-warning-300 mb-3">
                          {uploads.filter((u) => u.status === 'completed').length} succeeded
                          {failedUploadsCount > 0 && `, ${failedUploadsCount} failed`}
                          {duplicateUploadsCount > 0 &&
                            `, ${duplicateUploadsCount} duplicate${duplicateUploadsCount > 1 ? 's' : ''}`}
                        </p>
                        {hasDuplicates && (
                          <p className="text-xs text-warning-600 dark:text-warning-400 mb-3">
                            You can create shortcuts to reference the existing files in this folder.
                          </p>
                        )}
                        {/* Bulk actions for failed uploads */}
                        {failedUploadsCount > 1 && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={handleRetryAllFailed}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary-700 dark:text-primary-300 bg-primary-100 dark:bg-primary-900/30 hover:bg-primary-200 dark:hover:bg-primary-900/50 rounded-md transition-colors"
                            >
                              Retry All Failed ({failedUploadsCount})
                            </button>
                            <button
                              onClick={handleDismissAllFailed}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md transition-colors"
                            >
                              Dismiss All Failed
                            </button>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <CheckCircleIcon className="w-6 h-6 text-success-600 dark:text-success-400 flex-shrink-0" />
                      <div>
                        <h4 className="font-medium text-success-900 dark:text-success-100">
                          All files uploaded successfully!
                        </h4>
                        <p className="text-sm text-success-700 dark:text-success-300">
                          {uploads.length} {uploads.length === 1 ? 'file' : 'files'} uploaded
                        </p>
                      </div>
                    </>
                  )}
                </div>
              )}

              {uploads.map((upload) => (
                <FileUploadProgress
                  key={upload.id}
                  upload={upload}
                  onCancel={handleCancelUpload}
                  onRetry={handleRetryUpload}
                  onRemove={handleRemoveUpload}
                  onCreateShortcut={handleCreateShortcut}
                  showDetails={true}
                />
              ))}
            </>
          )}
        </div>
      )}
    </Modal>
  )
}
