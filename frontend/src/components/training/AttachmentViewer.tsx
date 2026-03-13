/**
 * AttachmentViewer — Renders step attachments inline: videos play in-app,
 * PDFs/images preview in-app, other files show download links.
 */

import { useState } from 'react'
import {
  Video,
  FileText,
  Paperclip,
  Image,
  Download,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  X,
  Maximize2,
} from 'lucide-react'
import type { StepAttachmentItem } from './types'
import { MediaPlayer } from './MediaPlayer'

interface AttachmentViewerProps {
  attachments: StepAttachmentItem[]
  videoUrl?: string
  onMediaCompleted?: () => void
  mediaCompleted?: boolean
}

export function AttachmentViewer({
  attachments,
  videoUrl,
  onMediaCompleted,
  mediaCompleted,
}: AttachmentViewerProps) {
  const hasContent = attachments.length > 0 || !!videoUrl
  if (!hasContent) return null

  const videoAttachments = attachments.filter((a) => a.attachment_type === 'video')
  const documentAttachments = attachments.filter(
    (a) => a.attachment_type === 'document' || a.attachment_type === 'manual'
  )
  const otherAttachments = attachments.filter(
    (a) =>
      a.attachment_type !== 'video' &&
      a.attachment_type !== 'document' &&
      a.attachment_type !== 'manual'
  )

  return (
    <div className="mb-6 space-y-4">
      {/* Step video_url (if set on step itself) */}
      {videoUrl && (
        <div>
          <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1.5">
            <Video className="h-3.5 w-3.5" />
            Video
          </h3>
          <MediaPlayer
            src={videoUrl}
            title="Step Video"
            onComplete={onMediaCompleted}
            isCompleted={mediaCompleted}
          />
        </div>
      )}

      {/* Video attachments */}
      {videoAttachments.length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1.5">
            <Video className="h-3.5 w-3.5" />
            Videos
          </h3>
          <div className="space-y-3">
            {videoAttachments.map((att) => (
              <VideoAttachment
                key={att.id}
                attachment={att}
                onComplete={onMediaCompleted}
                isCompleted={mediaCompleted}
              />
            ))}
          </div>
        </div>
      )}

      {/* Document / Manual attachments */}
      {documentAttachments.length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            Documents
          </h3>
          <div className="space-y-3">
            {documentAttachments.map((att) => (
              <DocumentAttachment key={att.id} attachment={att} />
            ))}
          </div>
        </div>
      )}

      {/* Other attachments */}
      {otherAttachments.length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1.5">
            <Paperclip className="h-3.5 w-3.5" />
            Attachments
          </h3>
          <div className="space-y-2">
            {otherAttachments.map((att) => (
              <a
                key={att.id}
                href={att.file}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-lg border border-gray-200 p-3 text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700/50"
              >
                <Paperclip className="h-4 w-4 text-gray-500" />
                <span className="flex-1 text-gray-700 dark:text-gray-300">
                  {att.title || att.file_name}
                </span>
                <span className="text-xs text-gray-400">{formatFileSize(att.file_size)}</span>
                <Download className="h-3.5 w-3.5 text-gray-400" />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function VideoAttachment({
  attachment,
  onComplete,
  isCompleted,
}: {
  attachment: StepAttachmentItem
  onComplete?: () => void
  isCompleted?: boolean
}) {
  const isEmbedUrl = isYouTubeOrVimeo(attachment.file)

  if (isEmbedUrl) {
    const embedUrl = getEmbedUrl(attachment.file)
    return (
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="bg-gray-100 dark:bg-gray-900 px-3 py-2">
          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
            {attachment.title || attachment.file_name}
          </span>
        </div>
        <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
          <iframe
            src={embedUrl}
            className="absolute inset-0 w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={attachment.title || attachment.file_name}
          />
        </div>
      </div>
    )
  }

  return (
    <MediaPlayer
      src={attachment.file}
      title={attachment.title || attachment.file_name}
      onComplete={onComplete}
      isCompleted={isCompleted}
    />
  )
}

function DocumentAttachment({ attachment }: { attachment: StepAttachmentItem }) {
  const [expanded, setExpanded] = useState(false)
  const isPdf =
    attachment.file_name?.toLowerCase().endsWith('.pdf') || attachment.file?.includes('.pdf')
  const isImage = /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(attachment.file_name || '')

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header — always visible */}
      <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 dark:bg-gray-900">
        <FileText className="h-4 w-4 text-blue-500 shrink-0" />
        <span className="flex-1 text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
          {attachment.title || attachment.file_name}
        </span>
        <span className="text-xs text-gray-400 shrink-0">
          {formatFileSize(attachment.file_size)}
        </span>

        {(isPdf || isImage) && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 shrink-0"
          >
            {expanded ? (
              <>
                <ChevronUp className="h-3.5 w-3.5" /> Collapse
              </>
            ) : (
              <>
                <ChevronDown className="h-3.5 w-3.5" /> Preview
              </>
            )}
          </button>
        )}

        <a
          href={attachment.file}
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 shrink-0"
          title="Open in new tab"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>

      {/* Inline preview */}
      {expanded && isPdf && (
        <div className="border-t border-gray-200 dark:border-gray-700">
          <iframe
            src={attachment.file}
            className="w-full"
            style={{ height: '600px' }}
            title={attachment.title || attachment.file_name}
          />
        </div>
      )}

      {expanded && isImage && (
        <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800 flex justify-center">
          <img
            src={attachment.file}
            alt={attachment.title || attachment.file_name}
            className="max-w-full max-h-[600px] object-contain rounded"
          />
        </div>
      )}
    </div>
  )
}

function isYouTubeOrVimeo(url: string): boolean {
  return /youtube\.com|youtu\.be|vimeo\.com/i.test(url)
}

function getEmbedUrl(url: string): string {
  // YouTube
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/)
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`

  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/)
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`

  return url
}

function formatFileSize(bytes: number): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
