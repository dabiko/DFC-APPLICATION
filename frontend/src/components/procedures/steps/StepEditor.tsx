/**
 * StepEditor — Inline editor for a single procedure step.
 * Handles step metadata, gates (manual open, media completion, quiz pass),
 * and attachment uploads.
 */

import { useState } from 'react'
import {
  GripVertical,
  Trash2,
  ChevronDown,
  ChevronUp,
  Paperclip,
  Upload,
  X,
  FileText,
  BookOpen,
  Video,
  HelpCircle,
  Link2,
  AlertTriangle,
} from 'lucide-react'
import type { ProcedureStep, StepAttachment, BranchCondition } from '@/types/procedure'
import {
  uploadAttachment,
  deleteAttachment,
  checkDuplicate,
  linkDocument,
} from '@/services/procedureService'
import { BranchConditionEditor } from '../branching/BranchConditionEditor'
import DocumentSearchModal from './DocumentSearchModal'

interface StepEditorProps {
  step: ProcedureStep
  procedureId: string
  index: number
  onUpdate: (stepId: string, data: Partial<ProcedureStep>) => void
  onDelete: (stepId: string) => void
}

export function StepEditor({ step, procedureId, index, onUpdate, onDelete }: StepEditorProps) {
  const [expanded, setExpanded] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [linkModalOpen, setLinkModalOpen] = useState(false)
  const [duplicateWarning, setDuplicateWarning] = useState<{
    file: File
    matches: Array<{
      source: 'document' | 'step_attachment'
      id: string
      title: string
      file_name?: string
      folder_path?: string | null
      confidentiality_level?: string
      document_url?: string
      procedure_title?: string
      step_title?: string
    }>
  } | null>(null)
  const [refForm, setRefForm] = useState<{
    documentId: string
    title: string
    documentUrl: string
  } | null>(null)

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length) return

    setUploading(true)
    try {
      for (const file of Array.from(files)) {
        // Check for duplicates first
        try {
          const dupResult = await checkDuplicate(procedureId, step.id, file)
          if (dupResult.has_duplicates) {
            setDuplicateWarning({ file, matches: dupResult.matches })
            setUploading(false)
            e.target.value = ''
            return
          }
        } catch {
          // If duplicate check fails, proceed with upload
        }

        const formData = new FormData()
        formData.append('file', file)
        formData.append('title', file.name)
        formData.append('attachment_type', detectType(file))

        const newAttachment = await uploadAttachment(procedureId, step.id, formData)
        onUpdate(step.id, {
          attachments: [...step.attachments, newAttachment],
        })
      }
    } catch (err) {
      console.error('Upload failed:', err)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleUseAsRef = (match: { id: string; title: string; document_url?: string }) => {
    setDuplicateWarning(null)
    setRefForm({
      documentId: match.id,
      title: match.title,
      documentUrl: match.document_url || `/documents/${match.id}`,
    })
  }

  const handleConfirmRef = async () => {
    if (!refForm) return
    try {
      const newAttachment = await linkDocument(procedureId, step.id, {
        document_id: refForm.documentId,
        title: refForm.title,
        attachment_type: 'reference',
      })
      onUpdate(step.id, {
        attachments: [...step.attachments, newAttachment],
      })
    } catch (err) {
      console.error('Link document failed:', err)
    } finally {
      setRefForm(null)
    }
  }

  const handleLinkDocument = async (doc: { id: string; title: string }) => {
    setLinkModalOpen(false)
    try {
      const newAttachment = await linkDocument(procedureId, step.id, {
        document_id: doc.id,
        title: doc.title,
        attachment_type: 'reference',
      })
      onUpdate(step.id, {
        attachments: [...step.attachments, newAttachment],
      })
    } catch (err) {
      console.error('Link document failed:', err)
    }
  }

  const handleDeleteAttachment = async (attachmentId: string) => {
    try {
      await deleteAttachment(procedureId, step.id, attachmentId)
      onUpdate(step.id, {
        attachments: step.attachments.filter((a) => a.id !== attachmentId),
      })
    } catch (err) {
      console.error('Delete attachment failed:', err)
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      {/* Header */}
      <div className="flex items-center gap-2 p-3 border-b border-gray-100 dark:border-gray-700">
        <GripVertical className="h-4 w-4 text-gray-400 cursor-grab" />
        <span className="text-xs font-bold text-gray-400 w-6">#{index + 1}</span>
        <input
          type="text"
          value={step.title}
          onChange={(e) => onUpdate(step.id, { title: e.target.value })}
          placeholder="Step title..."
          className="flex-1 border-0 bg-transparent text-sm font-medium text-gray-900 focus:outline-none focus:ring-0 dark:text-gray-100"
        />
        <button
          onClick={() => setExpanded(!expanded)}
          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        <button
          onClick={() => onDelete(step.id)}
          className="p-1 rounded text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {expanded && (
        <div className="p-4 space-y-4">
          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Instructions
            </label>
            <textarea
              value={step.description || ''}
              onChange={(e) => onUpdate(step.id, { description: e.target.value })}
              rows={3}
              placeholder="Describe what the trainee should do in this step..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            />
          </div>

          {/* Duration */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Estimated Duration (minutes)
            </label>
            <input
              type="number"
              min={0}
              value={step.estimated_duration_minutes ?? ''}
              onChange={(e) =>
                onUpdate(step.id, {
                  estimated_duration_minutes: e.target.value ? Number(e.target.value) : null,
                })
              }
              className="w-32 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            />
          </div>

          {/* Completion Gates */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
              Completion Requirements
            </label>
            <div className="flex flex-wrap gap-3">
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={step.require_manual_open}
                  onChange={(e) => onUpdate(step.id, { require_manual_open: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <BookOpen className="h-3.5 w-3.5 text-blue-500" />
                Must open manual
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={step.require_media_completion}
                  onChange={(e) =>
                    onUpdate(step.id, { require_media_completion: e.target.checked })
                  }
                  className="rounded border-gray-300"
                />
                <Video className="h-3.5 w-3.5 text-purple-500" />
                Must complete media
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={step.require_quiz_pass}
                  onChange={(e) => onUpdate(step.id, { require_quiz_pass: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <HelpCircle className="h-3.5 w-3.5 text-green-500" />
                Must pass quiz
              </label>
            </div>
          </div>

          {/* Branch Condition */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
              Branch Condition
            </label>
            <BranchConditionEditor
              value={step.branch_condition}
              onChange={(value) => onUpdate(step.id, { branch_condition: value })}
            />
          </div>

          {/* Attachments */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                Attachments ({step.attachments.length})
              </label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setLinkModalOpen(true)}
                  className="flex items-center gap-1 text-xs text-green-600 hover:text-green-700 dark:text-green-400"
                >
                  <Link2 className="h-3 w-3" />
                  Link Existing
                </button>
                <label className="flex items-center gap-1 cursor-pointer text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400">
                  <Upload className="h-3 w-3" />
                  {uploading ? 'Uploading...' : 'Upload'}
                  <input
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                </label>
              </div>
            </div>
            {step.attachments.length > 0 && (
              <div className="space-y-1">
                {step.attachments.map((att) => (
                  <div
                    key={att.id}
                    className={`flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs ${
                      att.is_linked
                        ? 'bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-800'
                        : 'bg-gray-50 dark:bg-gray-700'
                    }`}
                  >
                    {att.is_linked ? (
                      <Link2 className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                    ) : (
                      <AttachmentIcon type={att.attachment_type} />
                    )}
                    <span className="flex-1 truncate text-gray-700 dark:text-gray-300">
                      {att.title || att.file_name}
                    </span>
                    {att.is_linked && (
                      <span className="rounded px-1 py-0.5 text-[10px] font-medium bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                        Linked
                      </span>
                    )}
                    <span className="text-gray-400">{formatFileSize(att.file_size)}</span>
                    <button
                      onClick={() => handleDeleteAttachment(att.id)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Duplicate Warning Modal */}
          {duplicateWarning && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
              <div className="mx-4 w-full max-w-lg rounded-lg bg-white p-5 shadow-xl dark:bg-gray-800">
                <div className="flex items-center gap-2 text-amber-600 mb-3">
                  <AlertTriangle className="h-5 w-5" />
                  <h3 className="text-sm font-semibold">Duplicate Document Detected</h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                  <strong>{duplicateWarning.file.name}</strong> already exists in the system:
                </p>
                <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
                  {duplicateWarning.matches.map((match) => (
                    <div
                      key={match.id}
                      className="rounded-md border border-amber-200 bg-amber-50 p-2.5 text-xs dark:border-amber-800 dark:bg-amber-900/20"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-gray-900 dark:text-white">
                            {match.title}
                          </div>
                          {match.file_name && (
                            <div className="text-gray-500 mt-0.5">{match.file_name}</div>
                          )}
                          {match.folder_path && (
                            <div className="text-gray-400 mt-0.5">Path: {match.folder_path}</div>
                          )}
                          {match.procedure_title && (
                            <div className="text-gray-400 mt-0.5">
                              Procedure: {match.procedure_title} &rarr; {match.step_title}
                            </div>
                          )}
                          <div className="mt-1 text-[10px] font-medium text-amber-700 dark:text-amber-400">
                            Source:{' '}
                            {match.source === 'document' ? 'Document Library' : 'Step Attachment'}
                          </div>
                        </div>
                        {match.source === 'document' && (
                          <button
                            onClick={() => handleUseAsRef(match)}
                            className="flex-shrink-0 flex items-center gap-1 rounded-md bg-green-600 px-2.5 py-1.5 text-[11px] font-medium text-white hover:bg-green-700"
                          >
                            <Link2 className="h-3 w-3" />
                            Use as Ref
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={() => setDuplicateWarning(null)}
                    className="rounded-md px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Reference Confirmation Form */}
          {refForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
              <div className="mx-4 w-full max-w-lg rounded-lg bg-white p-5 shadow-xl dark:bg-gray-800">
                <div className="flex items-center gap-2 text-green-600 mb-4">
                  <Link2 className="h-5 w-5" />
                  <h3 className="text-sm font-semibold">Link Document as Reference</h3>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Reference Title
                    </label>
                    <input
                      type="text"
                      value={refForm.title}
                      onChange={(e) => setRefForm({ ...refForm, title: e.target.value })}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Document Link
                    </label>
                    <input
                      type="text"
                      value={refForm.documentUrl}
                      readOnly
                      className="w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-600 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-400"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <button
                    onClick={() => setRefForm(null)}
                    className="rounded-md px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmRef}
                    className="flex items-center gap-1 rounded-md bg-green-600 px-3 py-1.5 text-sm text-white hover:bg-green-700"
                  >
                    <Link2 className="h-3.5 w-3.5" />
                    Confirm Link
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Link Document Modal */}
          <DocumentSearchModal
            procedureId={procedureId}
            stepId={step.id}
            open={linkModalOpen}
            onClose={() => setLinkModalOpen(false)}
            onSelect={handleLinkDocument}
          />
        </div>
      )}
    </div>
  )
}

function AttachmentIcon({ type }: { type: string }) {
  switch (type) {
    case 'manual':
    case 'document':
      return <FileText className="h-3.5 w-3.5 text-blue-500" />
    case 'video':
      return <Video className="h-3.5 w-3.5 text-purple-500" />
    default:
      return <Paperclip className="h-3.5 w-3.5 text-gray-500" />
  }
}

function detectType(file: File): string {
  if (file.type.startsWith('video/')) return 'video'
  if (file.type.startsWith('image/')) return 'image'
  if (file.type === 'application/pdf' || file.type.includes('document')) return 'manual'
  if (file.type.includes('spreadsheet') || file.type.includes('presentation')) return 'template'
  return 'reference'
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
