/**
 * DocumentViewer
 *
 * In-browser, read-only viewer for procedure attachments and DFC documents.
 *
 *   PDF        → react-pdf (pdfjs under the hood). Page nav, zoom, fit-to-width, fullscreen.
 *   .docx      → mammoth.js converts to clean HTML in the browser.
 *   image      → native <img>.
 *   everything else (.doc, .xlsx, .pptx, ...) → graceful fallback with download.
 *
 * The viewer never modifies the source. To change content, the author publishes
 * a new version of the underlying document — see CLAUDE.md and the procedure
 * versioning model.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FC,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react'
import axios from 'axios'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import './docxStyles.css'
import {
  X,
  Download,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Loader2,
  FileWarning,
  ExternalLink,
  FileText,
  AlignLeft,
  Copy,
  Check,
} from 'lucide-react'

// Vite-friendly worker setup — bundles the worker as a static asset.
import pdfWorkerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerSrc

export type ViewerTab = 'document' | 'text'

export interface DocumentViewerProps {
  isOpen: boolean
  onClose: () => void
  /** Direct URL to the file (MinIO presigned, /media/, or absolute). */
  fileUrl: string
  /** Filename used to detect kind and shown in the header. */
  fileName: string
  /** Optional human-friendly title shown in the header next to the filename. */
  title?: string
  /** Optional file size for the header (bytes). */
  fileSize?: number
  /** Optional override of the detected kind (rarely needed). */
  kindOverride?: ViewerKind
  /** Pre-extracted plain text for the Text tab (set by the backend extraction task). */
  extractedText?: string
  /** Status of the backend extraction; controls Text-tab messaging. */
  extractionStatus?: 'pending' | 'completed' | 'failed' | 'unsupported' | 'no_text' | ''
  /** Which tab to show first. Defaults to 'document'. */
  initialTab?: ViewerTab
}

type ViewerKind = 'pdf' | 'docx' | 'image' | 'unsupported'

const PDF_EXT = ['pdf']
const DOCX_EXT = ['docx']
const IMAGE_EXT = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp']

function detectKind(fileName: string): ViewerKind {
  const ext = (fileName.split('.').pop() || '').toLowerCase()
  if (PDF_EXT.includes(ext)) return 'pdf'
  if (DOCX_EXT.includes(ext)) return 'docx'
  if (IMAGE_EXT.includes(ext)) return 'image'
  return 'unsupported'
}

function formatSize(bytes?: number): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export const DocumentViewer: FC<DocumentViewerProps> = ({
  isOpen,
  onClose,
  fileUrl,
  fileName,
  title,
  fileSize,
  kindOverride,
  extractedText,
  extractionStatus,
  initialTab = 'document',
}) => {
  const kind = useMemo(() => kindOverride ?? detectKind(fileName), [fileName, kindOverride])
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [activeTab, setActiveTab] = useState<ViewerTab>(initialTab)
  const containerRef = useRef<HTMLDivElement>(null)

  // Reset to the requested initial tab whenever the viewer reopens with
  // (potentially) different intent — e.g. clicking "Text" vs "Open" on the row.
  // This is a legitimate prop-to-state sync and the lint rule's general
  // guidance doesn't apply here.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isOpen) setActiveTab(initialTab)
  }, [isOpen, initialTab])

  // The Text tab only makes sense for file types that can be text-extracted
  // (PDF and DOCX). For images / unsupported types we hide it entirely.
  const showTextTab = kind === 'pdf' || kind === 'docx'

  // Lock body scroll while open
  useEffect(() => {
    if (!isOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [isOpen])

  // Esc to close, regardless of content kind
  const handleKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        if (isFullscreen) setIsFullscreen(false)
        else onClose()
      }
    },
    [isFullscreen, onClose]
  )

  // Focus the modal when it opens so the keydown handler picks up keys without
  // requiring the user to click first.
  useEffect(() => {
    if (isOpen) containerRef.current?.focus()
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div
      ref={containerRef}
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm outline-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="document-viewer-title"
    >
      <div
        className={`bg-white dark:bg-gray-900 shadow-2xl flex flex-col overflow-hidden transition-all ${
          isFullscreen
            ? 'w-screen h-screen rounded-none'
            : 'w-[min(1100px,95vw)] h-[90vh] rounded-lg'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <ViewerHeader
          fileName={fileName}
          title={title}
          fileSize={fileSize}
          fileUrl={fileUrl}
          isFullscreen={isFullscreen}
          onToggleFullscreen={() => setIsFullscreen((v) => !v)}
          onClose={onClose}
        />

        {/* Tab bar — only when there's a Text tab to switch to. */}
        {showTextTab && (
          <ViewerTabs
            active={activeTab}
            onChange={setActiveTab}
            extractionStatus={extractionStatus}
            hasText={!!extractedText && extractedText.trim().length > 0}
          />
        )}

        <div className="flex-1 min-h-0 overflow-hidden bg-gray-100 dark:bg-gray-950">
          {(!showTextTab || activeTab === 'document') && (
            <>
              {/* `key={fileUrl}` forces a fresh mount when the URL changes so
                  child renderers can initialize state from the new URL without
                  needing setState-in-effect resets. */}
              {kind === 'pdf' && <PdfRenderer key={fileUrl} fileUrl={fileUrl} />}
              {kind === 'docx' && <DocxRenderer key={fileUrl} fileUrl={fileUrl} />}
              {kind === 'image' && <ImageRenderer fileUrl={fileUrl} alt={title || fileName} />}
              {kind === 'unsupported' && (
                <UnsupportedRenderer fileUrl={fileUrl} fileName={fileName} />
              )}
            </>
          )}
          {showTextTab && activeTab === 'text' && (
            <TextPanel
              text={extractedText || ''}
              status={extractionStatus || 'pending'}
              fileUrl={fileUrl}
              fileName={fileName}
            />
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Tabs ────────────────────────────────────────────────────────────────────

interface ViewerTabsProps {
  active: ViewerTab
  onChange: (tab: ViewerTab) => void
  extractionStatus?: DocumentViewerProps['extractionStatus']
  hasText: boolean
}

const ViewerTabs: FC<ViewerTabsProps> = ({ active, onChange, extractionStatus, hasText }) => {
  // Show a subtle status dot on the Text tab so authors know if extraction
  // is still running, failed, or returned no text.
  let statusDot: { color: string; title: string } | null = null
  if (extractionStatus === 'pending') {
    statusDot = { color: 'bg-amber-400', title: 'Text extraction in progress' }
  } else if (extractionStatus === 'completed' && hasText) {
    statusDot = { color: 'bg-green-500', title: 'Text ready' }
  } else if (extractionStatus === 'no_text') {
    statusDot = { color: 'bg-gray-400', title: 'No extractable text' }
  } else if (extractionStatus === 'failed') {
    statusDot = { color: 'bg-red-500', title: 'Text extraction failed' }
  }

  return (
    <div className="flex items-center gap-1 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-2">
      <TabButton
        active={active === 'document'}
        onClick={() => onChange('document')}
        icon={<FileText className="h-3.5 w-3.5" />}
        label="Document"
      />
      <TabButton
        active={active === 'text'}
        onClick={() => onChange('text')}
        icon={<AlignLeft className="h-3.5 w-3.5" />}
        label="Text"
        trailing={
          statusDot && (
            <span
              className={`inline-block h-1.5 w-1.5 rounded-full ${statusDot.color}`}
              title={statusDot.title}
            />
          )
        }
      />
    </div>
  )
}

const TabButton: FC<{
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
  trailing?: React.ReactNode
}> = ({ active, onClick, icon, label, trailing }) => (
  <button
    type="button"
    onClick={onClick}
    className={`relative flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors -mb-px border-b-2 ${
      active
        ? 'border-blue-600 text-blue-700 dark:text-blue-400 dark:border-blue-400'
        : 'border-transparent text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
    }`}
  >
    {icon}
    {label}
    {trailing}
  </button>
)

// ─── Text panel ──────────────────────────────────────────────────────────────

interface TextPanelProps {
  text: string
  status: NonNullable<DocumentViewerProps['extractionStatus']>
  fileUrl: string
  fileName: string
}

const TextPanel: FC<TextPanelProps> = ({ text, status, fileUrl, fileName }) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard may be blocked in some contexts; fail silently.
    }
  }, [text])

  // Status-based empty states — no text yet for various reasons.
  if (status === 'pending') {
    return (
      <FallbackMessage
        icon={<Loader2 className="h-10 w-10 text-blue-500 animate-spin" />}
        title="Extracting text…"
        body="The server is still processing this document. The text will appear here in a few seconds — refresh the procedure to see it."
      />
    )
  }

  if (status === 'unsupported') {
    return (
      <FallbackMessage
        icon={<FileWarning className="h-10 w-10 text-gray-400" />}
        title="Text extraction not supported for this file type"
        body="Plain-text view is currently available for PDF and Word (.docx) documents only."
      />
    )
  }

  if (status === 'no_text') {
    return (
      <FallbackMessage
        icon={<FileWarning className="h-10 w-10 text-amber-500" />}
        title="No extractable text"
        body="This document doesn't contain selectable text — it's likely a scanned image. Use the Document tab to view the original, or download it."
        actions={
          <>
            <a
              href={fileUrl}
              download={fileName}
              className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <Download className="h-4 w-4" />
              Download
            </a>
          </>
        }
      />
    )
  }

  if (status === 'failed') {
    return (
      <FallbackMessage
        icon={<FileWarning className="h-10 w-10 text-red-500" />}
        title="Text extraction failed"
        body="The server couldn't extract text from this document. Use the Document tab or download the file."
      />
    )
  }

  // status === 'completed' (and possibly empty if extractor returned '')
  if (!text.trim()) {
    return (
      <FallbackMessage
        icon={<FileWarning className="h-10 w-10 text-gray-400" />}
        title="No text content"
        body="The extractor ran successfully but produced no text."
      />
    )
  }

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {/* Sub-toolbar: copy + char count */}
      <div className="flex items-center gap-3 border-b border-gray-200 dark:border-gray-700 px-4 py-2">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {text.length.toLocaleString()} characters
        </span>
        <div className="ml-auto">
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 dark:border-gray-700 px-2.5 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            title="Copy all text"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-green-600" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                Copy
              </>
            )}
          </button>
        </div>
      </div>

      {/* Text body — preserves whitespace and line breaks from extraction */}
      <div className="flex-1 overflow-auto px-6 py-6 sm:px-12 sm:py-8">
        <pre className="mx-auto max-w-3xl whitespace-pre-wrap break-words font-sans text-[15px] leading-7 text-gray-900 dark:text-gray-100">
          {text}
        </pre>
      </div>
    </div>
  )
}

// ─── Header ──────────────────────────────────────────────────────────────────

interface ViewerHeaderProps {
  fileName: string
  title?: string
  fileSize?: number
  fileUrl: string
  isFullscreen: boolean
  onToggleFullscreen: () => void
  onClose: () => void
}

const ViewerHeader: FC<ViewerHeaderProps> = ({
  fileName,
  title,
  fileSize,
  fileUrl,
  isFullscreen,
  onToggleFullscreen,
  onClose,
}) => (
  <div className="flex items-center gap-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3">
    <div className="flex-1 min-w-0">
      <h2
        id="document-viewer-title"
        className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate"
      >
        {title || fileName}
      </h2>
      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
        {fileName}
        {fileSize ? ` · ${formatSize(fileSize)}` : ''}
      </p>
    </div>

    <a
      href={fileUrl}
      download={fileName}
      className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 dark:border-gray-700 px-2.5 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
      title="Download original file"
    >
      <Download className="h-3.5 w-3.5" />
      Download
    </a>

    <button
      onClick={onToggleFullscreen}
      className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
      title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
    >
      {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
    </button>

    <button
      onClick={onClose}
      className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
      title="Close (Esc)"
    >
      <X className="h-4 w-4" />
    </button>
  </div>
)

// ─── PDF ─────────────────────────────────────────────────────────────────────

const PdfRenderer: FC<{ fileUrl: string }> = ({ fileUrl }) => {
  const [numPages, setNumPages] = useState<number | null>(null)
  const [page, setPage] = useState(1)
  const [scale, setScale] = useState(1.0)
  const [error, setError] = useState<string | null>(null)
  const [pageWidth, setPageWidth] = useState<number | undefined>(undefined)
  const [pdfData, setPdfData] = useState<Uint8Array | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Pre-fetch the PDF as raw bytes via axios (XHR) and hand the buffer to
  // react-pdf via the `data` prop. This bypasses react-pdf's internal `fetch()`,
  // which some browser extensions (e.g. IDM Advanced Integration) intercept on
  // PDF URLs — manifesting as a "blocked by CORS policy" error even though the
  // backend has correct CORS headers.
  //
  // We rely on the parent passing `key={fileUrl}` to remount this component on
  // URL change, so we don't need to clear state in the effect body.
  useEffect(() => {
    let cancelled = false
    axios
      .get<ArrayBuffer>(fileUrl, {
        responseType: 'arraybuffer',
        withCredentials: true,
      })
      .then((res) => {
        if (!cancelled) setPdfData(new Uint8Array(res.data))
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err?.message?.includes('Network')
              ? 'Could not download the PDF. If you have a browser download manager (IDM, FDM, etc.) installed, disable its integration for localhost.'
              : err?.message || 'Failed to load PDF'
          )
        }
      })
    return () => {
      cancelled = true
    }
  }, [fileUrl])

  // Track wrapper width for fit-to-width rendering. We render the page at
  // `pageWidth * scale` so the user's zoom multiplies a sensible base width
  // instead of the raw PDF point size.
  useEffect(() => {
    const el = wrapperRef.current
    if (!el) return
    const update = () => setPageWidth(Math.max(320, el.clientWidth - 32))
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Keyboard nav for PDFs
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        setPage((p) => (numPages ? Math.min(numPages, p + 1) : p))
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        setPage((p) => Math.max(1, p - 1))
      } else if (e.key === '+' || (e.key === '=' && (e.ctrlKey || e.metaKey))) {
        e.preventDefault()
        setScale((s) => Math.min(3, +(s + 0.25).toFixed(2)))
      } else if (e.key === '-' || (e.key === '_' && (e.ctrlKey || e.metaKey))) {
        e.preventDefault()
        setScale((s) => Math.max(0.5, +(s - 0.25).toFixed(2)))
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [numPages])

  // Stable file prop — react-pdf reloads on identity changes, so memo the
  // {data: bytes} once. Re-renders without new bytes won't retrigger parsing.
  const file = useMemo(() => (pdfData ? { data: pdfData } : null), [pdfData])

  if (error) {
    return (
      <FallbackMessage
        icon={<FileWarning className="h-10 w-10 text-amber-500" />}
        title="Could not display this PDF"
        body={error}
      />
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* PDF toolbar */}
      <div className="flex items-center gap-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1}
          className="rounded p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
          title="Previous page (←)"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="text-xs text-gray-600 dark:text-gray-400">
          Page{' '}
          <input
            type="number"
            min={1}
            max={numPages ?? 1}
            value={page}
            onChange={(e) => {
              const n = parseInt(e.target.value, 10)
              if (!Number.isFinite(n)) return
              if (numPages) setPage(Math.max(1, Math.min(numPages, n)))
            }}
            className="w-12 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-1.5 py-0.5 text-center text-xs"
          />{' '}
          of {numPages ?? '–'}
        </div>
        <button
          onClick={() => setPage((p) => (numPages ? Math.min(numPages, p + 1) : p))}
          disabled={!!numPages && page >= numPages}
          className="rounded p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
          title="Next page (→)"
        >
          <ChevronRight className="h-4 w-4" />
        </button>

        <div className="ml-auto flex items-center gap-1.5">
          <button
            onClick={() => setScale((s) => Math.max(0.5, +(s - 0.25).toFixed(2)))}
            className="rounded p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
            title="Zoom out (-)"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="text-xs tabular-nums text-gray-600 dark:text-gray-400 w-12 text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={() => setScale((s) => Math.min(3, +(s + 0.25).toFixed(2)))}
            className="rounded p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
            title="Zoom in (+)"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Page area */}
      <div
        ref={wrapperRef}
        className="flex-1 overflow-auto flex justify-center bg-gray-200 dark:bg-gray-950 px-4 py-4"
      >
        {!file ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="ml-2 text-sm">Downloading PDF…</span>
          </div>
        ) : (
          <Document
            file={file}
            onLoadSuccess={({ numPages: n }) => {
              setNumPages(n)
              setPage(1)
              setError(null)
            }}
            onLoadError={(err) => setError(err?.message || 'Failed to load PDF')}
            loading={
              <div className="flex items-center justify-center h-full text-gray-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="ml-2 text-sm">Rendering PDF…</span>
              </div>
            }
          >
            {pageWidth && (
              <Page
                pageNumber={page}
                width={pageWidth * scale}
                renderTextLayer
                renderAnnotationLayer={false}
                className="shadow-lg"
              />
            )}
          </Document>
        )}
      </div>
    </div>
  )
}

// ─── DOCX (mammoth.js) ───────────────────────────────────────────────────────

const DocxRenderer: FC<{ fileUrl: string }> = ({ fileUrl }) => {
  const [html, setHtml] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        // Use axios (XHR) instead of fetch — see PdfRenderer comment for why.
        const res = await axios.get<ArrayBuffer>(fileUrl, {
          responseType: 'arraybuffer',
          withCredentials: true,
        })
        // Dynamic import — mammoth is large and only needed for .docx files.
        const mammoth = await import('mammoth')
        const result = await mammoth.convertToHtml({ arrayBuffer: res.data })
        if (!cancelled) setHtml(result.value)
      } catch (e) {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : ''
          setError(
            msg.includes('Network')
              ? 'Could not download the document. If you have a browser download manager (IDM, FDM, etc.) installed, disable its integration for localhost.'
              : msg || 'Could not convert this Word document for preview.'
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [fileUrl])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="ml-2 text-sm">Rendering Word document…</span>
      </div>
    )
  }

  if (error) {
    return (
      <FallbackMessage
        icon={<FileWarning className="h-10 w-10 text-amber-500" />}
        title="Could not display this Word document"
        body={error}
      />
    )
  }

  return (
    <div className="h-full overflow-auto bg-white dark:bg-gray-900 px-6 py-8 sm:px-12 sm:py-12">
      <article
        className="docx-rendered mx-auto max-w-3xl text-gray-900 dark:text-gray-100"
        // mammoth output is sanitized to a known-safe subset of HTML by the
        // library itself (no <script>, no inline event handlers).
        dangerouslySetInnerHTML={{ __html: html || '' }}
      />
    </div>
  )
}

// ─── Image ───────────────────────────────────────────────────────────────────

const ImageRenderer: FC<{ fileUrl: string; alt: string }> = ({ fileUrl, alt }) => (
  <div className="h-full overflow-auto bg-gray-200 dark:bg-gray-950 flex items-center justify-center p-6">
    <img
      src={fileUrl}
      alt={alt}
      className="max-w-full max-h-full object-contain rounded shadow-lg bg-white"
    />
  </div>
)

// ─── Unsupported types ───────────────────────────────────────────────────────

const UnsupportedRenderer: FC<{ fileUrl: string; fileName: string }> = ({ fileUrl, fileName }) => (
  <FallbackMessage
    icon={<FileWarning className="h-10 w-10 text-gray-400" />}
    title="Preview not available for this file type"
    body={
      <>
        In-browser preview is currently supported for <strong>PDF</strong>,{' '}
        <strong>Word (.docx)</strong>, and images. Open or download the original to view it.
      </>
    }
    actions={
      <>
        <a
          href={fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          <ExternalLink className="h-4 w-4" />
          Open in new tab
        </a>
        <a
          href={fileUrl}
          download={fileName}
          className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Download className="h-4 w-4" />
          Download
        </a>
      </>
    }
  />
)

// ─── Shared fallback panel ───────────────────────────────────────────────────

const FallbackMessage: FC<{
  icon: React.ReactNode
  title: string
  body?: React.ReactNode
  actions?: React.ReactNode
}> = ({ icon, title, body, actions }) => (
  <div className="h-full flex flex-col items-center justify-center text-center px-6">
    <div className="mb-4">{icon}</div>
    <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">{title}</h3>
    {body && <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md">{body}</p>}
    {actions && <div className="mt-5 flex items-center gap-2">{actions}</div>}
  </div>
)
