/**
 * Version Control Utilities
 * Helper functions for version management
 */

import { formatDistanceToNow, format } from 'date-fns'
import type { DocumentVersion, VersionStatistics } from '@/types/version'

/**
 * Format file size from bytes to human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'

  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

/**
 * Format version number with leading zeros
 */
export function formatVersionNumber(versionNumber: number): string {
  return `v${versionNumber.toString().padStart(2, '0')}`
}

/**
 * Format version date
 */
export function formatVersionDate(dateString: string, includeTime: boolean = false): string {
  try {
    const date = new Date(dateString)
    if (includeTime) {
      return format(date, 'MMM dd, yyyy HH:mm')
    }
    return format(date, 'MMM dd, yyyy')
  } catch {
    return dateString
  }
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString)
    return formatDistanceToNow(date, { addSuffix: true })
  } catch {
    return dateString
  }
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  const parts = filename.split('.')
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : ''
}

/**
 * Get file type category from MIME type
 */
export function getFileTypeCategory(
  mimeType: string
): 'document' | 'image' | 'video' | 'audio' | 'archive' | 'other' {
  if (
    mimeType.startsWith('application/pdf') ||
    mimeType.includes('document') ||
    mimeType.includes('text')
  ) {
    return 'document'
  }
  if (mimeType.startsWith('image/')) {
    return 'image'
  }
  if (mimeType.startsWith('video/')) {
    return 'video'
  }
  if (mimeType.startsWith('audio/')) {
    return 'audio'
  }
  if (mimeType.includes('zip') || mimeType.includes('tar') || mimeType.includes('compressed')) {
    return 'archive'
  }
  return 'other'
}

/**
 * Calculate version statistics
 */
export function calculateVersionStatistics(versions: DocumentVersion[]): VersionStatistics {
  if (versions.length === 0) {
    return {
      totalVersions: 0,
      currentVersion: 0,
      totalStorageSize: 0,
      firstVersionDate: '',
      lastModifiedDate: '',
      contributorCount: 0,
      contributors: [],
    }
  }

  const sortedVersions = [...versions].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  )

  const contributors = Array.from(new Set(versions.map((v) => v.createdBy)))
  const totalStorageSize = versions.reduce((sum, v) => sum + v.fileSize, 0)
  const currentVersion = Math.max(...versions.map((v) => v.versionNumber))

  return {
    totalVersions: versions.length,
    currentVersion,
    totalStorageSize,
    firstVersionDate: sortedVersions[0].createdAt,
    lastModifiedDate: sortedVersions[sortedVersions.length - 1].createdAt,
    contributorCount: contributors.length,
    contributors,
  }
}

/**
 * Sort versions by different criteria
 */
export function sortVersions(
  versions: DocumentVersion[],
  sortBy: 'versionNumber' | 'createdAt' | 'fileSize' = 'versionNumber',
  order: 'asc' | 'desc' = 'desc'
): DocumentVersion[] {
  const sorted = [...versions].sort((a, b) => {
    let comparison = 0

    switch (sortBy) {
      case 'versionNumber':
        comparison = a.versionNumber - b.versionNumber
        break
      case 'createdAt':
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        break
      case 'fileSize':
        comparison = a.fileSize - b.fileSize
        break
    }

    return order === 'asc' ? comparison : -comparison
  })

  return sorted
}

/**
 * Filter versions by criteria
 */
export function filterVersions(
  versions: DocumentVersion[],
  filters: {
    createdBy?: string
    dateFrom?: string
    dateTo?: string
    versionFrom?: number
    versionTo?: number
  }
): DocumentVersion[] {
  return versions.filter((version) => {
    // Filter by creator
    if (filters.createdBy && version.createdBy !== filters.createdBy) {
      return false
    }

    // Filter by date range
    if (filters.dateFrom) {
      const versionDate = new Date(version.createdAt)
      const fromDate = new Date(filters.dateFrom)
      if (versionDate < fromDate) return false
    }

    if (filters.dateTo) {
      const versionDate = new Date(version.createdAt)
      const toDate = new Date(filters.dateTo)
      if (versionDate > toDate) return false
    }

    // Filter by version number range
    if (filters.versionFrom && version.versionNumber < filters.versionFrom) {
      return false
    }

    if (filters.versionTo && version.versionNumber > filters.versionTo) {
      return false
    }

    return true
  })
}

/**
 * Find version by version number
 */
export function findVersionByNumber(
  versions: DocumentVersion[],
  versionNumber: number
): DocumentVersion | undefined {
  return versions.find((v) => v.versionNumber === versionNumber)
}

/**
 * Get current version
 */
export function getCurrentVersion(versions: DocumentVersion[]): DocumentVersion | undefined {
  return versions.find((v) => v.isCurrent)
}

/**
 * Get previous version
 */
export function getPreviousVersion(
  versions: DocumentVersion[],
  currentVersionNumber: number
): DocumentVersion | undefined {
  const sorted = sortVersions(versions, 'versionNumber', 'desc')
  const currentIndex = sorted.findIndex((v) => v.versionNumber === currentVersionNumber)

  if (currentIndex === -1 || currentIndex === sorted.length - 1) {
    return undefined
  }

  return sorted[currentIndex + 1]
}

/**
 * Get next version
 */
export function getNextVersion(
  versions: DocumentVersion[],
  currentVersionNumber: number
): DocumentVersion | undefined {
  const sorted = sortVersions(versions, 'versionNumber', 'desc')
  const currentIndex = sorted.findIndex((v) => v.versionNumber === currentVersionNumber)

  if (currentIndex === -1 || currentIndex === 0) {
    return undefined
  }

  return sorted[currentIndex - 1]
}

/**
 * Calculate size difference between versions
 */
export function calculateSizeDifference(
  version1: DocumentVersion,
  version2: DocumentVersion
): { difference: number; percentChange: number; increased: boolean } {
  const difference = version2.fileSize - version1.fileSize
  const percentChange =
    version1.fileSize === 0 ? 100 : Math.abs((difference / version1.fileSize) * 100)

  return {
    difference: Math.abs(difference),
    percentChange,
    increased: difference > 0,
  }
}

/**
 * Check if version can be restored
 */
export function canRestoreVersion(
  version: DocumentVersion,
  currentVersion: DocumentVersion | undefined
): boolean {
  if (!currentVersion) return false
  if (version.id === currentVersion.id) return false
  if (version.isCurrent) return false

  return true
}

/**
 * Generate version label
 */
export function generateVersionLabel(version: DocumentVersion): string {
  const versionNum = formatVersionNumber(version.versionNumber)
  const relativeTime = formatRelativeTime(version.createdAt)

  if (version.isCurrent) {
    return `${versionNum} (Current) • ${relativeTime}`
  }

  return `${versionNum} • ${relativeTime}`
}

/**
 * Get file icon based on MIME type
 */
export function getFileIcon(mimeType: string): string {
  const category = getFileTypeCategory(mimeType)

  const icons: Record<typeof category, string> = {
    document: '📄',
    image: '🖼️',
    video: '🎥',
    audio: '🎵',
    archive: '📦',
    other: '📎',
  }

  return icons[category]
}

/**
 * Validate version number sequence
 */
export function validateVersionSequence(versions: DocumentVersion[]): boolean {
  if (versions.length === 0) return true

  const versionNumbers = versions.map((v) => v.versionNumber).sort((a, b) => a - b)

  for (let i = 0; i < versionNumbers.length; i++) {
    if (versionNumbers[i] !== i + 1) {
      return false
    }
  }

  return true
}

/**
 * Get version changes summary
 */
export function getVersionChangesSummary(
  oldVersion: DocumentVersion,
  newVersion: DocumentVersion
): string[] {
  const changes: string[] = []

  if (oldVersion.fileName !== newVersion.fileName) {
    changes.push(`File renamed from "${oldVersion.fileName}" to "${newVersion.fileName}"`)
  }

  if (oldVersion.fileSize !== newVersion.fileSize) {
    const sizeDiff = calculateSizeDifference(oldVersion, newVersion)
    const action = sizeDiff.increased ? 'increased' : 'decreased'
    changes.push(
      `File size ${action} by ${formatFileSize(sizeDiff.difference)} (${sizeDiff.percentChange.toFixed(1)}%)`
    )
  }

  if (oldVersion.mimeType !== newVersion.mimeType) {
    changes.push(`File type changed from ${oldVersion.mimeType} to ${newVersion.mimeType}`)
  }

  if (newVersion.changeDescription) {
    changes.push(newVersion.changeDescription)
  }

  return changes
}
