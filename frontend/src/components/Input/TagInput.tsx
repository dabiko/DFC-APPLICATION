/**
 * TagInput Component
 * Tag input field with autocomplete suggestions
 */

import { FC, useState, useRef, useEffect, KeyboardEvent } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'

export interface TagInputProps {
  /** Current tags */
  value: string[]
  /** Callback when tags change */
  onChange: (tags: string[]) => void
  /** Placeholder text */
  placeholder?: string
  /** Suggested tags for autocomplete */
  suggestions?: string[]
  /** Maximum number of tags */
  maxTags?: number
  /** Allow custom tags (not in suggestions) */
  allowCustom?: boolean
  /** Error message */
  error?: string
  /** Disabled state */
  disabled?: boolean
  /** Class name */
  className?: string
  /** Label */
  label?: string
  /** Required field */
  required?: boolean
  /** Help text */
  helpText?: string
}

export const TagInput: FC<TagInputProps> = ({
  value = [],
  onChange,
  placeholder = 'Type and press Enter to add tags...',
  suggestions = [],
  maxTags = 20,
  allowCustom = true,
  error,
  disabled = false,
  className = '',
  label,
  required = false,
  helpText,
}) => {
  const [inputValue, setInputValue] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Filter suggestions based on input and exclude already selected tags
  const filteredSuggestions = suggestions
    .filter((tag) => !value.includes(tag))
    .filter((tag) => tag.toLowerCase().includes(inputValue.toLowerCase()))
    .slice(0, 10)

  // Handle tag addition
  const addTag = (tag: string) => {
    const normalizedTag = tag.trim().toLowerCase().replace(/\s+/g, '-')

    if (!normalizedTag) return

    // Check if tag already exists
    if (value.includes(normalizedTag)) {
      setInputValue('')
      return
    }

    // Check max tags
    if (value.length >= maxTags) {
      setInputValue('')
      return
    }

    // Validate tag format (alphanumeric, hyphens, underscores only)
    if (!/^[a-zA-Z0-9-_]+$/.test(normalizedTag)) {
      return
    }

    // Check if custom tags are allowed
    if (!allowCustom && !suggestions.includes(normalizedTag)) {
      return
    }

    onChange([...value, normalizedTag])
    setInputValue('')
    setShowSuggestions(false)
    setSelectedSuggestionIndex(-1)
  }

  // Handle tag removal
  const removeTag = (tagToRemove: string) => {
    onChange(value.filter((tag) => tag !== tagToRemove))
  }

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)
    setShowSuggestions(newValue.length > 0)
    setSelectedSuggestionIndex(-1)
  }

  // Handle keyboard navigation
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()

      if (selectedSuggestionIndex >= 0 && filteredSuggestions[selectedSuggestionIndex]) {
        addTag(filteredSuggestions[selectedSuggestionIndex])
      } else if (inputValue.trim()) {
        addTag(inputValue)
      }
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      // Remove last tag on backspace if input is empty
      removeTag(value[value.length - 1])
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedSuggestionIndex((prev) => Math.min(prev + 1, filteredSuggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedSuggestionIndex((prev) => Math.max(prev - 1, -1))
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
      setSelectedSuggestionIndex(-1)
    }
  }

  // Close suggestions on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className={`space-y-1 ${className}`} ref={containerRef}>
      {/* Label */}
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {/* Input Container */}
      <div
        className={`
          relative flex flex-wrap gap-1.5 p-2 rounded-lg border
          ${error ? 'border-red-300 dark:border-red-700' : 'border-gray-300 dark:border-gray-600'}
          ${disabled ? 'bg-gray-50 dark:bg-gray-800 cursor-not-allowed' : 'bg-white dark:bg-gray-900'}
          focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500
        `}
        onClick={() => inputRef.current?.focus()}
      >
        {/* Tags */}
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2 py-1 text-sm bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-md"
          >
            <span>{tag}</span>
            {!disabled && (
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full p-0.5 transition-colors"
                aria-label={`Remove tag ${tag}`}
              >
                <XMarkIcon className="w-3.5 h-3.5" />
              </button>
            )}
          </span>
        ))}

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => inputValue && setShowSuggestions(true)}
          placeholder={value.length === 0 ? placeholder : ''}
          disabled={disabled || value.length >= maxTags}
          className="flex-1 min-w-[120px] outline-none bg-transparent text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 disabled:cursor-not-allowed"
        />

        {/* Suggestions Dropdown */}
        {showSuggestions && filteredSuggestions.length > 0 && !disabled && (
          <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
            {filteredSuggestions.map((suggestion, index) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => addTag(suggestion)}
                className={`
                  w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700
                  ${index === selectedSuggestionIndex ? 'bg-blue-50 dark:bg-blue-900' : ''}
                  ${index === 0 ? 'rounded-t-lg' : ''}
                  ${index === filteredSuggestions.length - 1 ? 'rounded-b-lg' : ''}
                `}
              >
                <span className="text-gray-900 dark:text-gray-100">{suggestion}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Help Text or Error */}
      {(helpText || error) && (
        <p
          className={`text-sm ${error ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}
        >
          {error || helpText}
        </p>
      )}

      {/* Tag Count */}
      {!error && value.length > 0 && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {value.length} / {maxTags} tags
        </p>
      )}
    </div>
  )
}
