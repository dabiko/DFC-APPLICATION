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
} from 'lucide-react'
import type { ProcedureStep, StepAttachment, BranchCondition } from '@/types/procedure'
import { uploadAttachment, deleteAttachment } from '@/services/procedureService'
import { BranchConditionEditor } from '../branching/BranchConditionEditor'

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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length) return

    setUploading(true)
    try {
      for (const file of Array.from(files)) {
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
            {step.attachments.length > 0 && (
              <div className="space-y-1">
                {step.attachments.map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center gap-2 rounded-md bg-gray-50 px-2.5 py-1.5 text-xs dark:bg-gray-700"
                  >
                    <AttachmentIcon type={att.attachment_type} />
                    <span className="flex-1 truncate text-gray-700 dark:text-gray-300">
                      {att.title || att.file_name}
                    </span>
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
  if (file.type === 'application/pdf' || file.type.includes('document')) return 'document'
  return 'other'
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
