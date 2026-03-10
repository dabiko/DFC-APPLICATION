import { useState, useEffect, useCallback } from 'react'
import { X, Search, FileText, Link2, Folder, Shield } from 'lucide-react'
import { searchDocuments } from '@/services/procedureService'

interface DocumentResult {
  id: string
  title: string
  file_name: string
  file_size: number
  file_type: string
  confidentiality_level: string
  folder_path: string | null
  department_name: string | null
  document_url: string
}

interface Props {
  procedureId: string
  stepId: string
  open: boolean
  onClose: () => void
  onSelect: (doc: DocumentResult) => void
}

const confidentialityColors: Record<string, string> = {
  PUBLIC: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  INTERNAL: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  CONFIDENTIAL: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  HIGHLY_CONFIDENTIAL: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
}

export default function DocumentSearchModal({
  procedureId,
  stepId,
  open,
  onClose,
  onSelect,
}: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<DocumentResult[]>([])
  const [loading, setLoading] = useState(false)

  const doSearch = useCallback(
    async (q: string) => {
      setLoading(true)
      try {
        const data = await searchDocuments(procedureId, stepId, q)
        setResults(data)
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    },
    [procedureId, stepId]
  )

  useEffect(() => {
    if (!open) return
    const timer = setTimeout(() => doSearch(query), 300)
    return () => clearTimeout(timer)
  }, [query, open, doSearch])

  useEffect(() => {
    if (open) {
      setQuery('')
      setResults([])
      doSearch('')
    }
  }, [open, doSearch])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 flex max-h-[80vh] w-full max-w-2xl flex-col rounded-lg bg-white shadow-xl dark:bg-gray-800">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Link Existing Document
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search */}
        <div className="border-b px-4 py-3 dark:border-gray-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search documents by title or filename..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-md border py-2 pl-10 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              autoFocus
            />
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto px-4 py-2">
          {loading ? (
            <div className="py-8 text-center text-sm text-gray-500">Searching...</div>
          ) : results.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-500">
              {query ? 'No documents found' : 'Type to search or browse recent documents'}
            </div>
          ) : (
            <div className="space-y-1">
              {results.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => onSelect(doc)}
                  className="flex w-full items-start gap-3 rounded-md px-3 py-2.5 text-left transition hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <FileText className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-500" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium text-gray-900 dark:text-white">
                        {doc.title}
                      </span>
                      <span
                        className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium ${confidentialityColors[doc.confidentiality_level] || confidentialityColors.INTERNAL}`}
                      >
                        {doc.confidentiality_level}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                      <span className="truncate">{doc.file_name}</span>
                      <span>{formatSize(doc.file_size)}</span>
                    </div>
                    {doc.folder_path && (
                      <div className="mt-0.5 flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                        <Folder className="h-3 w-3" />
                        <span className="truncate">{doc.folder_path}</span>
                      </div>
                    )}
                    {doc.department_name && (
                      <div className="mt-0.5 flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                        <Shield className="h-3 w-3" />
                        <span>{doc.department_name}</span>
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-4 py-3 text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">
          Click a document to link it to this step. The original file will not be duplicated.
        </div>
      </div>
    </div>
  )
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
