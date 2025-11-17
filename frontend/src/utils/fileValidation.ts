/**
 * File Validation Utilities
 * Helper functions for validating uploaded files
 */

import type {
  UploadConfig,
  FileValidationError,
  FileTypeCategory,
  FileUploadItem,
} from '@/types/upload'
import { DEFAULT_UPLOAD_CONFIG, FILE_TYPE_CATEGORIES } from '@/types/upload'
import { formatFileSize } from '@/utils/versionUtils'

/**
 * Validate a single file
 */
export function validateFile(file: File, config: Partial<UploadConfig> = {}): FileValidationError | null {
  const fullConfig = { ...DEFAULT_UPLOAD_CONFIG, ...config }

  // Check file size
  if (file.size > fullConfig.maxFileSize) {
    return {
      code: 'file-too-large',
      message: `File size (${formatFileSize(file.size)}) exceeds maximum allowed size (${formatFileSize(fullConfig.maxFileSize)})`,
      file,
    }
  }

  // Check file type
  if (fullConfig.acceptedFileTypes.length > 0) {
    const isValidType = fullConfig.acceptedFileTypes.some(
      (type) => file.type === type || file.type.startsWith(type.replace('/*', ''))
    )

    if (!isValidType) {
      return {
        code: 'file-invalid-type',
        message: `File type "${file.type}" is not supported. Accepted types: ${getAcceptedFileTypesLabel(fullConfig.acceptedFileTypes)}`,
        file,
      }
    }
  }

  // Check filename
  if (!isValidFileName(file.name)) {
    return {
      code: 'invalid-name',
      message: 'File name contains invalid characters. Only letters, numbers, hyphens, underscores, and periods are allowed.',
      file,
    }
  }

  return null
}

/**
 * Validate multiple files
 */
export function validateFiles(
  files: File[],
  config: Partial<UploadConfig> = {}
): { valid: File[]; errors: FileValidationError[] } {
  const fullConfig = { ...DEFAULT_UPLOAD_CONFIG, ...config }
  const valid: File[] = []
  const errors: FileValidationError[] = []

  // Check total number of files
  if (files.length > fullConfig.maxFiles) {
    errors.push({
      code: 'too-many-files',
      message: `You can only upload ${fullConfig.maxFiles} files at a time. You selected ${files.length} files.`,
      file: files[0],
    })
    return { valid: [], errors }
  }

  // Validate each file
  for (const file of files) {
    const error = validateFile(file, config)
    if (error) {
      errors.push(error)
    } else {
      valid.push(file)
    }
  }

  return { valid, errors }
}

/**
 * Check if filename is valid
 */
export function isValidFileName(filename: string): boolean {
  // Check for invalid characters
  const invalidChars = /[<>:"/\\|?*\x00-\x1F]/g
  if (invalidChars.test(filename)) {
    return false
  }

  // Check for reserved names (Windows)
  const reservedNames = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i
  if (reservedNames.test(filename)) {
    return false
  }

  // Check length
  if (filename.length === 0 || filename.length > 255) {
    return false
  }

  return true
}

/**
 * Get file type category
 */
export function getFileTypeCategory(file: File): FileTypeCategory {
  const extension = getFileExtension(file.name)

  for (const [category, info] of Object.entries(FILE_TYPE_CATEGORIES)) {
    if (info.mimeTypes.includes(file.type)) {
      return category as FileTypeCategory
    }
    if (info.extensions.includes(extension)) {
      return category as FileTypeCategory
    }
  }

  return 'other'
}

/**
 * Get file extension
 */
export function getFileExtension(filename: string): string {
  const parts = filename.split('.')
  return parts.length > 1 ? `.${parts[parts.length - 1].toLowerCase()}` : ''
}

/**
 * Get file icon based on category
 */
export function getFileIcon(file: File): string {
  const category = getFileTypeCategory(file)
  return FILE_TYPE_CATEGORIES[category].icon
}

/**
 * Get file category label
 */
export function getFileCategoryLabel(file: File): string {
  const category = getFileTypeCategory(file)
  return FILE_TYPE_CATEGORIES[category].label
}

/**
 * Check if file is an image
 */
export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/')
}

/**
 * Check if file can be previewed
 */
export function canPreviewFile(file: File): boolean {
  // Images can be previewed
  if (isImageFile(file)) {
    return true
  }

  // PDFs can be previewed in modern browsers
  if (file.type === 'application/pdf') {
    return true
  }

  return false
}

/**
 * Create preview URL for file
 */
export function createFilePreviewUrl(file: File): string | null {
  if (!canPreviewFile(file)) {
    return null
  }

  return URL.createObjectURL(file)
}

/**
 * Revoke preview URL
 */
export function revokeFilePreviewUrl(url: string): void {
  URL.revokeObjectURL(url)
}

/**
 * Get accepted file types label
 */
export function getAcceptedFileTypesLabel(acceptedTypes: string[]): string {
  const extensions = new Set<string>()

  for (const type of acceptedTypes) {
    for (const category of Object.values(FILE_TYPE_CATEGORIES)) {
      if (category.mimeTypes.includes(type)) {
        category.extensions.forEach((ext) => extensions.add(ext))
      }
    }
  }

  const extensionArray = Array.from(extensions)
  if (extensionArray.length === 0) {
    return 'All file types'
  }

  if (extensionArray.length <= 5) {
    return extensionArray.join(', ')
  }

  return `${extensionArray.slice(0, 5).join(', ')}, and ${extensionArray.length - 5} more`
}

/**
 * Calculate total size of files
 */
export function calculateTotalSize(files: File[]): number {
  return files.reduce((total, file) => total + file.size, 0)
}

/**
 * Calculate upload statistics
 */
export function calculateUploadStatistics(uploads: FileUploadItem[]) {
  const total = uploads.length
  const completed = uploads.filter((u) => u.status === 'completed').length
  const uploading = uploads.filter((u) => u.status === 'uploading').length
  const failed = uploads.filter((u) => u.status === 'error').length
  const pending = uploads.filter((u) => u.status === 'pending').length

  const totalSize = uploads.reduce((sum, u) => sum + u.file.size, 0)
  const uploadedSize = uploads
    .filter((u) => u.status === 'completed')
    .reduce((sum, u) => sum + u.file.size, 0)

  const uploadingSize = uploads
    .filter((u) => u.status === 'uploading')
    .reduce((sum, u) => sum + (u.file.size * u.progress) / 100, 0)

  const totalUploaded = uploadedSize + uploadingSize

  const averageSpeed =
    uploads
      .filter((u) => u.uploadSpeed)
      .reduce((sum, u) => sum + (u.uploadSpeed || 0), 0) /
    Math.max(1, uploading)

  const remainingSize = totalSize - totalUploaded
  const estimatedTimeRemaining = averageSpeed > 0 ? remainingSize / averageSpeed : 0

  return {
    total,
    completed,
    uploading,
    failed,
    pending,
    totalSize,
    uploadedSize: totalUploaded,
    averageSpeed,
    estimatedTimeRemaining,
    percentComplete: totalSize > 0 ? (totalUploaded / totalSize) * 100 : 0,
  }
}

/**
 * Format upload speed
 */
export function formatUploadSpeed(bytesPerSecond: number): string {
  if (bytesPerSecond === 0) return '0 B/s'

  const k = 1024
  const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s']
  const i = Math.floor(Math.log(bytesPerSecond) / Math.log(k))

  return `${parseFloat((bytesPerSecond / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

/**
 * Format time remaining
 */
export function formatTimeRemaining(seconds: number): string {
  if (seconds === 0 || !isFinite(seconds)) return 'Calculating...'

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  if (hours > 0) {
    return `${hours}h ${minutes}m remaining`
  }

  if (minutes > 0) {
    return `${minutes}m ${secs}s remaining`
  }

  return `${secs}s remaining`
}

/**
 * Generate unique upload ID
 */
export function generateUploadId(): string {
  return `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Check for duplicate files
 */
export function checkDuplicateFiles(
  newFiles: File[],
  existingUploads: FileUploadItem[]
): File[] {
  const existingFileNames = new Set(existingUploads.map((u) => u.file.name))

  return newFiles.filter((file) => !existingFileNames.has(file.name))
}

/**
 * Group files by category
 */
export function groupFilesByCategory(files: File[]): Record<FileTypeCategory, File[]> {
  const groups: Record<FileTypeCategory, File[]> = {
    document: [],
    spreadsheet: [],
    presentation: [],
    image: [],
    archive: [],
    other: [],
  }

  for (const file of files) {
    const category = getFileTypeCategory(file)
    groups[category].push(file)
  }

  return groups
}

/**
 * Sort files by various criteria
 */
export function sortFiles(
  files: File[],
  sortBy: 'name' | 'size' | 'type' = 'name',
  order: 'asc' | 'desc' = 'asc'
): File[] {
  const sorted = [...files].sort((a, b) => {
    let comparison = 0

    switch (sortBy) {
      case 'name':
        comparison = a.name.localeCompare(b.name)
        break
      case 'size':
        comparison = a.size - b.size
        break
      case 'type':
        comparison = a.type.localeCompare(b.type)
        break
    }

    return order === 'asc' ? comparison : -comparison
  })

  return sorted
}
