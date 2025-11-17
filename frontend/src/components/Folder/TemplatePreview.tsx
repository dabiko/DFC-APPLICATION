/**
 * TemplatePreview Component
 * Visual preview of folder template structure
 */

import { FC } from 'react'
import { FolderIcon } from '@heroicons/react/24/outline'
import type { FolderTemplateStructure } from '@/types/folderTemplate'
import { ConfidentialityBadge } from '@components/Badge/ConfidentialityBadge'

export interface TemplatePreviewProps {
  structure: FolderTemplateStructure[]
  depth?: number
}

export const TemplatePreview: FC<TemplatePreviewProps> = ({ structure, depth = 0 }) => {
  return (
    <div className="space-y-1">
      {structure.map((folder, index) => (
        <div key={index}>
          {/* Folder Item */}
          <div
            className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            style={{ paddingLeft: `${depth * 20 + 8}px` }}
          >
            <FolderIcon className="w-4 h-4 text-primary-500 dark:text-primary-400 flex-shrink-0" />
            <span className="text-sm text-gray-900 dark:text-gray-100 flex-1">{folder.name}</span>
            {folder.confidentiality && (
              <ConfidentialityBadge level={folder.confidentiality} size="sm" />
            )}
          </div>

          {/* Children */}
          {folder.children && folder.children.length > 0 && (
            <TemplatePreview structure={folder.children} depth={depth + 1} />
          )}
        </div>
      ))}
    </div>
  )
}
