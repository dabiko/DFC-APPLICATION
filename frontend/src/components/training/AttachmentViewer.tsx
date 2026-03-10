/**
 * AttachmentViewer — Renders attachment links with type-appropriate icons.
 */

import { Video, FileText, Paperclip } from 'lucide-react'
import type { StepAttachmentItem } from './types'

interface AttachmentViewerProps {
  attachments: StepAttachmentItem[]
}

export function AttachmentViewer({ attachments }: AttachmentViewerProps) {
  if (attachments.length === 0) return null

  return (
    <div className="mb-6">
      <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Attachments</h3>
      <div className="space-y-2">
        {attachments.map((att) => (
          <a
            key={att.id}
            href={att.file}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-lg border border-gray-200 p-3 text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700/50"
          >
            {att.attachment_type === 'video' ? (
              <Video className="h-4 w-4 text-purple-500" />
            ) : att.attachment_type === 'document' || att.attachment_type === 'manual' ? (
              <FileText className="h-4 w-4 text-blue-500" />
            ) : (
              <Paperclip className="h-4 w-4 text-gray-500" />
            )}
            <span className="flex-1 text-gray-700 dark:text-gray-300">
              {att.title || att.file_name}
            </span>
          </a>
        ))}
      </div>
    </div>
  )
}
