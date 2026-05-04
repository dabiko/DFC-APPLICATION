/**
 * AttachmentViewer — Renders step attachments inline: videos play in-app,
 * documents open in a polished in-browser viewer (PDF + Word .docx),
 * images preview in-app, anything else falls back to download.
 */

import { useState } from 'react'
import { Video, FileText, Paperclip, Eye, Download, AlignLeft } from 'lucide-react'
import type { StepAttachmentItem } from './types'
import { MediaPlayer } from './MediaPlayer'
import { DocumentViewer } from '@/components/DocumentViewer'

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

  // Videos still play in the inline MediaPlayer / iframe.
  // Everything else (manual, reference, template, image, document) renders
  // through the DocumentViewer modal — same UX regardless of attachment_type.
  const videoAttachments = attachments.filter((a) => a.attachment_type === 'video')
  const documentAttachments = attachments.filter((a) => a.attachment_type !== 'video')

  return (
    <div className="mb-6 space-y-4">
      {/* Step video_url (if set on step itself) */}
      {videoUrl && (
        <div>
          <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1.5">
            <Video className="h-3.5 w-3.5" />
            Video
          </h3>
          {isYouTubeOrVimeo(videoUrl) ? (
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                <iframe
                  src={getEmbedUrl(videoUrl)}
                  className="absolute inset-0 w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title="Step Video"
                />
              </div>
            </div>
          ) : (
            <MediaPlayer
              src={videoUrl}
              title="Step Video"
              onComplete={onMediaCompleted}
              isCompleted={mediaCompleted}
            />
          )}
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

      {/* Document attachments (manual, reference, template, image, etc.) */}
      {documentAttachments.length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1.5">
            <Paperclip className="h-3.5 w-3.5" />
            Documents
          </h3>
          <div className="space-y-2">
            {documentAttachments.map((att) => (
              <DocumentAttachment key={att.id} attachment={att} />
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
  const [viewerOpen, setViewerOpen] = useState<null | 'document' | 'text'>(null)

  // Text button is meaningful only for file types we can extract text from
  // (PDF/DOCX). The backend marks others as 'unsupported' — hide the button.
  const supportsText =
    attachment.extraction_status &&
    attachment.extraction_status !== 'unsupported' &&
    attachment.extraction_status !== ''

  return (
    <>
      <div className="group flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2.5 transition hover:border-blue-300 hover:shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-700">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-blue-50 dark:bg-blue-900/30">
          <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
            {attachment.title || attachment.file_name}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {attachment.file_name}
            {attachment.file_size ? ` · ${formatFileSize(attachment.file_size)}` : ''}
          </p>
        </div>

        {supportsText && (
          <button
            onClick={() => setViewerOpen('text')}
            className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700 shrink-0"
            title="Read extracted text"
          >
            <AlignLeft className="h-3.5 w-3.5" />
            Text
          </button>
        )}

        <button
          onClick={() => setViewerOpen('document')}
          className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-blue-700 shrink-0"
          title="Open in viewer"
        >
          <Eye className="h-3.5 w-3.5" />
          Open
        </button>

        <a
          href={attachment.file}
          download={attachment.file_name}
          className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300 shrink-0"
          title="Download"
        >
          <Download className="h-4 w-4" />
        </a>
      </div>

      {viewerOpen && (
        <DocumentViewer
          isOpen={true}
          onClose={() => setViewerOpen(null)}
          fileUrl={attachment.file}
          fileName={attachment.file_name}
          title={attachment.title}
          fileSize={attachment.file_size}
          extractedText={attachment.extracted_text}
          extractionStatus={attachment.extraction_status}
          initialTab={viewerOpen}
        />
      )}
    </>
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
