/**
 * useFolderTemplate Hook
 * Hook for applying folder templates
 */

import { useState } from 'react'
import type {
  FolderTemplate,
  TemplateApplicationResult,
  FolderTemplateStructure,
} from '@/types/folderTemplate'
import type { Folder, CreateFolderData } from '@/types/folder'
import folderService from '@/services/folderService'

export const useFolderTemplate = () => {
  const [isApplying, setIsApplying] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [error, setError] = useState<string | null>(null)

  const applyTemplate = async (
    template: FolderTemplate,
    parentId: string | null,
    rootFolderName: string
  ): Promise<TemplateApplicationResult> => {
    setIsApplying(true)
    setError(null)

    const createdFolderIds: string[] = []
    const errors: Array<{ folderName: string; error: string }> = []

    // Count total folders to create
    const totalFolders = countFolders(template.structure) + 1 // +1 for root
    setProgress({ current: 0, total: totalFolders })

    try {
      // Create root folder
      const rootFolder = await folderService.createFolder({
        name: rootFolderName,
        parentId,
        confidentiality: template.defaultConfidentiality,
      })
      createdFolderIds.push(rootFolder.id)
      setProgress((prev) => ({ ...prev, current: prev.current + 1 }))

      // Apply structure recursively
      await applyStructure(
        template.structure,
        rootFolder.id,
        template.defaultConfidentiality,
        createdFolderIds,
        errors
      )

      return {
        rootFolderId: rootFolder.id,
        createdFolderIds,
        totalFoldersCreated: createdFolderIds.length,
        errors,
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to apply template'
      setError(errorMessage)
      throw err
    } finally {
      setIsApplying(false)
    }
  }

  const applyStructure = async (
    structure: FolderTemplateStructure[],
    parentId: string,
    defaultConfidentiality: any,
    createdIds: string[],
    errors: Array<{ folderName: string; error: string }>
  ): Promise<void> => {
    for (const folderDef of structure) {
      try {
        const folder = await folderService.createFolder({
          name: folderDef.name,
          parentId,
          confidentiality: folderDef.confidentiality || defaultConfidentiality,
        })
        createdIds.push(folder.id)
        setProgress((prev) => ({ ...prev, current: prev.current + 1 }))

        if (folderDef.children && folderDef.children.length > 0) {
          await applyStructure(
            folderDef.children,
            folder.id,
            defaultConfidentiality,
            createdIds,
            errors
          )
        }
      } catch (err) {
        errors.push({
          folderName: folderDef.name,
          error: err instanceof Error ? err.message : 'Unknown error',
        })
      }
    }
  }

  return {
    applyTemplate,
    isApplying,
    progress,
    error,
  }
}

function countFolders(structure: FolderTemplateStructure[]): number {
  let count = 0
  for (const folder of structure) {
    count++
    if (folder.children) {
      count += countFolders(folder.children)
    }
  }
  return count
}
