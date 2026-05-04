/**
 * ProcedureMetadataForm — Form for creating/editing procedure metadata.
 * Handles title, description, department, parent procedure, and tags.
 */

import { useState, useEffect, useCallback } from 'react'
import { X, Plus, Loader2 } from 'lucide-react'
import { useAppSelector, useAppDispatch } from '@store'
import { fetchDepartments } from '@/store/slices/departmentSlice'
import type { ProcedureDetail, Procedure } from '@/types/procedure'
import { listProcedures } from '@/services/procedureService'
import { RichTextEditor } from '@/components/RichText'
import { Select } from '@/components/Select'

interface ProcedureMetadataFormProps {
  initialData?: Partial<ProcedureDetail>
  onSubmit: (data: {
    title: string
    description: string
    department: string
    parent_procedure?: string | null
    tags?: string[]
  }) => Promise<void>
  onCancel: () => void
  isSubmitting?: boolean
}

export function ProcedureMetadataForm({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: ProcedureMetadataFormProps) {
  const dispatch = useAppDispatch()
  const departments = useAppSelector((state) => state.department.departments)

  // Ensure departments are loaded
  useEffect(() => {
    if (departments.length === 0) {
      dispatch(fetchDepartments())
    }
  }, [dispatch, departments.length])

  const [title, setTitle] = useState(initialData?.title || '')
  const [description, setDescription] = useState(initialData?.description || '')
  const [department, setDepartment] = useState(initialData?.department || '')
  const [parentProcedure, setParentProcedure] = useState<string | null>(
    initialData?.parent_procedure || null
  )
  const [tags, setTags] = useState<string[]>(initialData?.tags || [])
  const [tagInput, setTagInput] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [parentOptions, setParentOptions] = useState<Procedure[]>([])

  // Load parent procedure options
  useEffect(() => {
    listProcedures()
      .then((data) => {
        const items = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : []
        setParentOptions(items)
      })
      .catch(() => {})
  }, [])

  const validate = useCallback(() => {
    const newErrors: Record<string, string> = {}
    if (!title.trim()) newErrors.title = 'Title is required'
    if (title.length > 200) newErrors.title = 'Title must be under 200 characters'
    if (!department) newErrors.department = 'Department is required'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [title, department])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    await onSubmit({
      title: title.trim(),
      description: description.trim(),
      department,
      parent_procedure: parentProcedure || null,
      tags,
    })
  }

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase()
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag])
    }
    setTagInput('')
  }

  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag))
  }

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Title <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., Employee Onboarding Procedure"
          className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 dark:bg-gray-800 dark:text-gray-100 ${
            errors.title
              ? 'border-red-400 focus:border-red-500 focus:ring-red-500'
              : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600'
          }`}
        />
        {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title}</p>}
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Description
        </label>
        <RichTextEditor
          value={description}
          onChange={setDescription}
          placeholder="Describe the purpose and scope of this procedure..."
          editorClassName="min-h-[6em]"
        />
      </div>

      {/* Department */}
      <Select
        label="Department *"
        placeholder="Select department..."
        value={department}
        onChange={(val) => setDepartment(String(val))}
        error={errors.department}
        searchable={departments.length > 6}
        fullWidth
        options={departments.map((dept: { id: number | string; name: string }) => ({
          value: String(dept.id),
          label: dept.name,
        }))}
      />

      {/* Parent Procedure */}
      <Select
        label="Parent Procedure"
        placeholder="None (top-level procedure)"
        value={parentProcedure || ''}
        onChange={(val) => setParentProcedure(val ? String(val) : null)}
        helperText="Optional. Use this to create sub-procedures."
        searchable={parentOptions.length > 6}
        fullWidth
        options={[
          { value: '', label: 'None (top-level procedure)' },
          ...parentOptions
            .filter((p) => p.id !== initialData?.id)
            .map((proc) => ({ value: String(proc.id), label: proc.title })),
        ]}
      />

      {/* Tags */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Tags
        </label>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
            >
              {tag}
              <button type="button" onClick={() => removeTag(tag)} className="hover:text-red-500">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleTagKeyDown}
            placeholder="Add a tag..."
            className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
          />
          <button
            type="button"
            onClick={addTag}
            className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
          >
            <Plus className="h-3 w-3" />
            Add
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {initialData?.id ? 'Save Changes' : 'Create Procedure'}
        </button>
      </div>
    </form>
  )
}
