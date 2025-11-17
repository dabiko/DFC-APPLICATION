/**
 * Folder Template Types
 * Type definitions for folder template system
 */

import type { ConfidentialityLevel } from './folder'

/**
 * Folder template structure (recursive)
 */
export interface FolderTemplateStructure {
  name: string
  confidentiality?: ConfidentialityLevel
  children?: FolderTemplateStructure[]
}

/**
 * Folder template definition
 */
export interface FolderTemplate {
  id: string
  name: string
  description: string
  icon?: string
  category: 'project' | 'employee' | 'client' | 'department' | 'custom'
  structure: FolderTemplateStructure[]
  defaultConfidentiality: ConfidentialityLevel
  tags?: string[]
}

/**
 * Template application result
 */
export interface TemplateApplicationResult {
  rootFolderId: string
  createdFolderIds: string[]
  totalFoldersCreated: number
  errors: Array<{
    folderName: string
    error: string
  }>
}

/**
 * Template preview node
 */
export interface TemplatePreviewNode {
  name: string
  level: number
  confidentiality?: ConfidentialityLevel
  hasChildren: boolean
}
