/**
 * SearchBar Component
 * Search input with autocomplete suggestions
 */

import { FC, useState, useRef, useEffect, KeyboardEvent } from 'react'
import {
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
  XMarkIcon,
  ClockIcon,
  DocumentIcon,
  TagIcon,
  BuildingOfficeIcon,
} from '@heroicons/react/24/outline'
import { cn } from '@utils/cn'
import type { SearchBarProps, SearchSuggestion } from '@/types/search'

export const SearchBar: FC<SearchBarProps> = ({
  value: externalValue,
  placeholder = 'Search documents...',
  onSearch,
  onAdvancedSearch,
  showAdvancedButton = true,
  showSuggestions = true,
  suggestions = [],
  recentSearches = [],
  isLoading = false,
  autoFocus = false,
  className,
}) => {
  const [value, setValue] = useState(externalValue || '')
  const [isFocused, setIsFocused] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const showDropdown = isFocused && (suggestions.length > 0 || recentSearches.length > 0)
  const allSuggestions = [
    ...suggestions,
    ...recentSearches.map((r) => ({
      text: r.query,
      type: 'query' as const,
      score: 0,
      metadata: { icon: '🕐', description: `${r.resultCount} results` },
    })),
  ]

  // Sync with external value
  useEffect(() => {
    if (externalValue !== undefined) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setValue(externalValue)
    }
  }, [externalValue])

  // Auto focus
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus()
    }
  }, [autoFocus])

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setIsFocused(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSearch = (searchQuery?: string) => {
    const query = searchQuery !== undefined ? searchQuery : value
    if (query.trim()) {
      onSearch(query.trim())
      setIsFocused(false)
      setSelectedIndex(-1)
    }
  }

  const handleClear = () => {
    setValue('')
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown) {
      if (e.key === 'Enter') {
        handleSearch()
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex((prev) => (prev < allSuggestions.length - 1 ? prev + 1 : prev))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1))
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0) {
          handleSearch(allSuggestions[selectedIndex].text)
        } else {
          handleSearch()
        }
        break
      case 'Escape':
        setIsFocused(false)
        setSelectedIndex(-1)
        break
    }
  }

  const getSuggestionIcon = (suggestion: SearchSuggestion) => {
    switch (suggestion.type) {
      case 'document':
        return <DocumentIcon className="w-4 h-4" />
      case 'tag':
        return <TagIcon className="w-4 h-4" />
      case 'department':
        return <BuildingOfficeIcon className="w-4 h-4" />
      case 'query':
      default:
        return suggestion.metadata?.icon || <ClockIcon className="w-4 h-4" />
    }
  }

  return (
    <div className={cn('relative', className)}>
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
          ) : (
            <MagnifyingGlassIcon className="w-5 h-5 text-gray-400" />
          )}
        </div>

        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          placeholder={placeholder}
          className={cn(
            'w-full pl-10 pr-24 py-3 text-sm',
            'bg-white dark:bg-gray-900',
            'border border-gray-300 dark:border-gray-700',
            'rounded-lg',
            'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
            'placeholder-gray-400 dark:placeholder-gray-500',
            'text-gray-900 dark:text-gray-100',
            'transition-all'
          )}
        />

        <div className="absolute inset-y-0 right-0 flex items-center gap-1 pr-2">
          {/* Clear button */}
          {value && (
            <button
              onClick={handleClear}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
              title="Clear search"
            >
              <XMarkIcon className="w-4 h-4 text-gray-400" />
            </button>
          )}

          {/* Keyboard shortcut hint */}
          {!value && (
            <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-500 bg-gray-100 dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-700">
              <span>Ctrl</span>
              <span>K</span>
            </kbd>
          )}

          {/* Advanced search button */}
          {showAdvancedButton && onAdvancedSearch && (
            <button
              onClick={onAdvancedSearch}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
              title="Advanced search"
            >
              <AdjustmentsHorizontalIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {/* Suggestions Dropdown */}
      {showDropdown && showSuggestions && (
        <div
          ref={dropdownRef}
          className={cn(
            'absolute top-full left-0 right-0 mt-2 z-50',
            'bg-white dark:bg-gray-800',
            'border border-gray-200 dark:border-gray-700',
            'rounded-lg shadow-lg',
            'max-h-96 overflow-y-auto'
          )}
        >
          {/* Recent Searches Header */}
          {recentSearches.length > 0 && suggestions.length === 0 && (
            <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase border-b border-gray-200 dark:border-gray-700">
              Recent Searches
            </div>
          )}

          {/* Suggestions Header */}
          {suggestions.length > 0 && (
            <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase border-b border-gray-200 dark:border-gray-700">
              Suggestions
            </div>
          )}

          {/* Suggestion Items */}
          <div className="py-1">
            {allSuggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSearch(suggestion.text)}
                onMouseEnter={() => setSelectedIndex(index)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                  selectedIndex === index
                    ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                )}
              >
                <div className="flex-shrink-0 text-gray-400 dark:text-gray-500">
                  {getSuggestionIcon(suggestion)}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{suggestion.text}</p>
                  {suggestion.metadata?.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {suggestion.metadata.description}
                    </p>
                  )}
                </div>

                {selectedIndex === index && (
                  <kbd className="px-2 py-1 text-xs font-medium text-gray-500 bg-white dark:bg-gray-900 rounded border border-gray-300 dark:border-gray-600">
                    Enter
                  </kbd>
                )}
              </button>
            ))}
          </div>

          {/* No suggestions */}
          {allSuggestions.length === 0 && value.trim() && (
            <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
              No suggestions found
            </div>
          )}
        </div>
      )}
    </div>
  )
}
