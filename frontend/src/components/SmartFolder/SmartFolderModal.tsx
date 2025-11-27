/**
 * SmartFolderModal Component
 *
 * Modal dialog for creating and editing smart folders.
 * Provides a form to configure search criteria, appearance, and scope settings.
 */

import React, { useState, useEffect, useCallback, KeyboardEvent } from 'react'
import {
  X,
  Search,
  FolderSearch,
  Loader2,
  Check,
  AlertCircle,
  Plus,
  Star,
  Clock,
  Filter,
  Bookmark,
  Tag,
  Calendar,
  Briefcase,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import {
  createSmartFolder,
  updateSmartFolder,
  getAvailableColors,
  getRelativeDateOptions,
  type SmartFolder,
  type SmartFolderCriteria,
  type SmartFolderColor,
  type SmartFolderIcon,
  type RelativeDate,
  type DocumentState,
  type ConfidentialityLevel,
} from '@/services/smartFolderService'
import { toast } from '@/utils/toast'

interface SmartFolderModalProps {
  isOpen: boolean
  onClose: () => void
  onSave?: (folder: SmartFolder) => void
  onSuccess?: (folder: SmartFolder) => void
  smartFolder?: SmartFolder | null
  editFolder?: SmartFolder | null
}

const DOCUMENT_TYPES = [
  { value: 'CONTRACT', label: 'Contract' },
  { value: 'INVOICE', label: 'Invoice' },
  { value: 'REPORT', label: 'Report' },
  { value: 'KYC_RECORD', label: 'KYC Record' },
  { value: 'STATEMENT', label: 'Statement' },
  { value: 'CORRESPONDENCE', label: 'Correspondence' },
  { value: 'POLICY_DOCUMENT', label: 'Policy' },
  { value: 'PROCEDURE_DOCUMENT', label: 'Procedure' },
  { value: 'AUDIT_REPORT', label: 'Audit Report' },
  { value: 'TAX_DOCUMENT', label: 'Tax Document' },
  { value: 'LEGAL_DOCUMENT', label: 'Legal Document' },
]

const CONFIDENTIALITY_LEVELS: { value: ConfidentialityLevel; label: string }[] = [
  { value: 'PUBLIC', label: 'Public' },
  { value: 'INTERNAL', label: 'Internal' },
  { value: 'CONFIDENTIAL', label: 'Confidential' },
  { value: 'HIGHLY_CONFIDENTIAL', label: 'Highly Confidential' },
]

const DOCUMENT_STATES: { value: DocumentState; label: string }[] = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'IN_REVIEW', label: 'In Review' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'ARCHIVED', label: 'Archived' },
]

const ICON_OPTIONS: { value: SmartFolderIcon; label: string; icon: LucideIcon }[] = [
  { value: 'folder-search', label: 'Folder Search', icon: FolderSearch },
  { value: 'folder-star', label: 'Folder Star', icon: Star },
  { value: 'folder-clock', label: 'Folder Clock', icon: Clock },
  { value: 'filter', label: 'Filter', icon: Filter },
  { value: 'search', label: 'Search', icon: Search },
  { value: 'star', label: 'Star', icon: Star },
  { value: 'bookmark', label: 'Bookmark', icon: Bookmark },
  { value: 'tag', label: 'Tag', icon: Tag },
  { value: 'calendar', label: 'Calendar', icon: Calendar },
  { value: 'briefcase', label: 'Briefcase', icon: Briefcase },
]

// Get icon component by value
const getIconComponent = (value: SmartFolderIcon): LucideIcon => {
  const option = ICON_OPTIONS.find((opt) => opt.value === value)
  return option?.icon || FolderSearch
}

export default function SmartFolderModal({
  isOpen,
  onClose,
  onSave,
  onSuccess,
  smartFolder,
  editFolder,
}: SmartFolderModalProps) {
  // Support both prop names for backwards compatibility
  const folderToEdit = editFolder || smartFolder
  const handleSuccess = onSuccess || onSave
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [icon, setIcon] = useState<SmartFolderIcon>('folder-search')
  const [color, setColor] = useState<SmartFolderColor>('blue')
  const [includeOwned, setIncludeOwned] = useState(true)
  const [includeShared, setIncludeShared] = useState(false)

  // Criteria state
  const [nameContains, setNameContains] = useState('')
  const [documentTypes, setDocumentTypes] = useState<string[]>([])
  const [confidentialityLevels, setConfidentialityLevels] = useState<ConfidentialityLevel[]>([])
  const [states, setStates] = useState<DocumentState[]>([])
  const [relativeDate, setRelativeDate] = useState<RelativeDate | ''>('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')

  // Initialize form when folderToEdit changes
  useEffect(() => {
    if (folderToEdit) {
      setName(folderToEdit.name)
      setDescription(folderToEdit.description || '')
      setIcon(folderToEdit.icon as SmartFolderIcon)
      setColor(folderToEdit.color as SmartFolderColor)
      setIncludeOwned(folderToEdit.include_owned)
      setIncludeShared(folderToEdit.include_shared)

      // Criteria
      const criteria = folderToEdit.criteria || {}
      setNameContains(criteria.name_contains || '')
      setDocumentTypes(
        Array.isArray(criteria.document_type)
          ? criteria.document_type
          : criteria.document_type
            ? [criteria.document_type]
            : []
      )
      setConfidentialityLevels(
        Array.isArray(criteria.confidentiality_level)
          ? criteria.confidentiality_level
          : criteria.confidentiality_level
            ? [criteria.confidentiality_level]
            : []
      )
      setStates(
        Array.isArray(criteria.state) ? criteria.state : criteria.state ? [criteria.state] : []
      )
      setRelativeDate((criteria.relative_date as RelativeDate) || '')
      setTags(Array.isArray(criteria.tags) ? criteria.tags : criteria.tags ? [criteria.tags] : [])
      setTagInput('')
    } else {
      // Reset form
      setName('')
      setDescription('')
      setIcon('folder-search')
      setColor('blue')
      setIncludeOwned(true)
      setIncludeShared(false)
      setNameContains('')
      setDocumentTypes([])
      setConfidentialityLevels([])
      setStates([])
      setRelativeDate('')
      setTags([])
      setTagInput('')
    }
    setError(null)
  }, [folderToEdit, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('Name is required')
      return
    }

    // Build criteria
    const criteria: SmartFolderCriteria = {}

    if (nameContains.trim()) {
      criteria.name_contains = nameContains.trim()
    }
    if (documentTypes.length > 0) {
      criteria.document_type = documentTypes.length === 1 ? documentTypes[0] : documentTypes
    }
    if (confidentialityLevels.length > 0) {
      criteria.confidentiality_level =
        confidentialityLevels.length === 1 ? confidentialityLevels[0] : confidentialityLevels
    }
    if (states.length > 0) {
      criteria.state = states.length === 1 ? states[0] : states
    }
    if (relativeDate) {
      criteria.relative_date = relativeDate
    }
    if (tags.length > 0) {
      criteria.tags = tags.length === 1 ? tags[0] : tags
    }

    setIsSubmitting(true)

    try {
      let folder: SmartFolder

      if (folderToEdit) {
        folder = await updateSmartFolder(folderToEdit.id, {
          name: name.trim(),
          description: description.trim(),
          criteria,
          icon,
          color,
          include_owned: includeOwned,
          include_shared: includeShared,
        })
        toast.success('Smart folder updated')
      } else {
        folder = await createSmartFolder({
          name: name.trim(),
          description: description.trim(),
          criteria,
          icon,
          color,
          include_owned: includeOwned,
          include_shared: includeShared,
          is_personal: true,
        })
        toast.success('Smart folder created')
      }

      // Call success callback if provided
      if (handleSuccess) {
        handleSuccess(folder)
      }
      // Close modal
      onClose()
    } catch (err: unknown) {
      console.error('Failed to save smart folder:', err)
      // Handle axios error response
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { data?: Record<string, string[]> } }
        const errorData = axiosError.response?.data
        if (errorData) {
          // Check for name error specifically
          if (errorData.name && errorData.name.length > 0) {
            setError(errorData.name[0])
          } else {
            // Get first error message from response
            const firstKey = Object.keys(errorData)[0]
            if (firstKey && Array.isArray(errorData[firstKey])) {
              setError(errorData[firstKey][0])
            } else {
              setError('Failed to save smart folder. Please try again.')
            }
          }
        } else {
          setError('Failed to save smart folder. Please try again.')
        }
      } else {
        setError('Failed to save smart folder. Please try again.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const toggleDocumentType = (type: string) => {
    setDocumentTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    )
  }

  const toggleConfidentiality = (level: ConfidentialityLevel) => {
    setConfidentialityLevels((prev) =>
      prev.includes(level) ? prev.filter((l) => l !== level) : [...prev, level]
    )
  }

  const toggleState = (state: DocumentState) => {
    setStates((prev) => (prev.includes(state) ? prev.filter((s) => s !== state) : [...prev, state]))
  }

  // Tag handling functions
  const addTag = useCallback(
    (tag: string) => {
      const trimmedTag = tag.trim().toLowerCase()
      if (trimmedTag && !tags.includes(trimmedTag)) {
        setTags((prev) => [...prev, trimmedTag])
      }
      setTagInput('')
    },
    [tags]
  )

  const removeTag = useCallback((tagToRemove: string) => {
    setTags((prev) => prev.filter((t) => t !== tagToRemove))
  }, [])

  const handleTagKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        if (tagInput.trim()) {
          addTag(tagInput)
        }
      } else if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
        // Remove last tag if backspace pressed with empty input
        setTags((prev) => prev.slice(0, -1))
      }
    },
    [tagInput, tags.length, addTag]
  )

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900 rounded-lg shadow-xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
              <FolderSearch className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {folderToEdit ? 'Edit Smart Folder' : 'Create Smart Folder'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Error message */}
          {error && (
            <div className="flex items-center gap-2 p-3 text-sm text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Basic Info</h3>

            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Name *
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Q4 Budget Documents"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Description
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description of what this smart folder contains"
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Icon Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Icon
              </label>
              <div className="flex flex-wrap gap-2">
                {ICON_OPTIONS.map((opt) => {
                  const IconComponent = opt.icon
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setIcon(opt.value)}
                      title={opt.label}
                      className={cn(
                        'p-2.5 rounded-lg border-2 transition-all',
                        icon === opt.value
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                      )}
                    >
                      <IconComponent className="w-5 h-5" />
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Color Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Color
              </label>
              <div className="flex flex-wrap gap-2">
                {getAvailableColors().map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    title={c.charAt(0).toUpperCase() + c.slice(1)}
                    className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center transition-all border-2',
                      color === c
                        ? 'ring-2 ring-offset-2 ring-gray-400 dark:ring-offset-gray-900 scale-110 border-transparent'
                        : 'border-transparent hover:scale-105',
                      c === 'blue' && 'bg-blue-500',
                      c === 'green' && 'bg-green-500',
                      c === 'yellow' && 'bg-yellow-500',
                      c === 'orange' && 'bg-orange-500',
                      c === 'red' && 'bg-red-500',
                      c === 'purple' && 'bg-purple-500',
                      c === 'pink' && 'bg-pink-500',
                      c === 'teal' && 'bg-teal-500',
                      c === 'indigo' && 'bg-indigo-500',
                      c === 'gray' && 'bg-gray-500'
                    )}
                  >
                    {color === c && <Check className="w-4 h-4 text-white" />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Search Criteria */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Search className="w-4 h-4" />
              Search Criteria
            </h3>

            {/* Name Contains */}
            <div>
              <label
                htmlFor="nameContains"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Name contains
              </label>
              <input
                type="text"
                id="nameContains"
                value={nameContains}
                onChange={(e) => setNameContains(e.target.value)}
                placeholder="e.g., Q4 2025 Budget"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Document Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Document Type
              </label>
              <div className="flex flex-wrap gap-2">
                {DOCUMENT_TYPES.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => toggleDocumentType(type.value)}
                    className={cn(
                      'px-3 py-1 text-sm rounded-full border transition-colors',
                      documentTypes.includes(type.value)
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-600'
                        : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
                    )}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Confidentiality Level */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Confidentiality
              </label>
              <div className="flex flex-wrap gap-2">
                {CONFIDENTIALITY_LEVELS.map((level) => (
                  <button
                    key={level.value}
                    type="button"
                    onClick={() => toggleConfidentiality(level.value)}
                    className={cn(
                      'px-3 py-1 text-sm rounded-full border transition-colors',
                      confidentialityLevels.includes(level.value)
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-600'
                        : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
                    )}
                  >
                    {level.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Document State */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Document State
              </label>
              <div className="flex flex-wrap gap-2">
                {DOCUMENT_STATES.map((state) => (
                  <button
                    key={state.value}
                    type="button"
                    onClick={() => toggleState(state.value)}
                    className={cn(
                      'px-3 py-1 text-sm rounded-full border transition-colors',
                      states.includes(state.value)
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-600'
                        : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
                    )}
                  >
                    {state.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Relative Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Modified
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setRelativeDate('')}
                  className={cn(
                    'px-3 py-1 text-sm rounded-full border transition-colors',
                    relativeDate === ''
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-600'
                      : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
                  )}
                >
                  Any time
                </button>
                {getRelativeDateOptions().map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setRelativeDate(opt.value)}
                    className={cn(
                      'px-3 py-1 text-sm rounded-full border transition-colors',
                      relativeDate === opt.value
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-600'
                        : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tags */}
            <div>
              <label
                htmlFor="tags"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Tags
              </label>
              <div className="flex flex-wrap items-center gap-2 p-2 min-h-[44px] border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 hover:border-gray-400 dark:hover:border-gray-500 transition-colors">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="p-0.5 hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  id="tags"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  placeholder={tags.length === 0 ? 'Type and press Enter or Space to add' : ''}
                  className="flex-1 min-w-[120px] px-1 py-0.5 bg-transparent text-gray-900 dark:text-gray-100 focus:outline-none text-sm"
                />
                {tagInput.trim() && (
                  <button
                    type="button"
                    onClick={() => addTag(tagInput)}
                    className="p-1 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded transition-colors"
                    title="Add tag"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                )}
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Press Enter or Space to add a tag
              </p>
            </div>
          </div>

          {/* Scope */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Scope</h3>

            <div className="space-y-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeOwned}
                  onChange={(e) => setIncludeOwned(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Include my documents
                </span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeShared}
                  onChange={(e) => setIncludeShared(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Include documents shared with me
                </span>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {folderToEdit ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
