/**
 * DiffAttachmentIndicator — File change indicators for attachments.
 */

import { Plus, Minus, RefreshCw, Paperclip } from 'lucide-react'

interface DiffAttachmentIndicatorProps {
  changes: {
    type: 'added' | 'removed' | 'modified'
    file_name?: string
    title?: string
  }[]
}

export function DiffAttachmentIndicator({ changes }: DiffAttachmentIndicatorProps) {
  if (changes.length === 0) return null

  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Attachment Changes</p>
      {changes.map((change, idx) => (
        <div
          key={idx}
          className={`flex items-center gap-2 rounded-md px-2 py-1 text-xs ${
            change.type === 'added'
              ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
              : change.type === 'removed'
                ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                : 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400'
          }`}
        >
          {change.type === 'added' && <Plus className="h-3 w-3" />}
          {change.type === 'removed' && <Minus className="h-3 w-3" />}
          {change.type === 'modified' && <RefreshCw className="h-3 w-3" />}
          <Paperclip className="h-3 w-3" />
          <span>{change.title || change.file_name || 'Attachment'}</span>
        </div>
      ))}
    </div>
  )
}
