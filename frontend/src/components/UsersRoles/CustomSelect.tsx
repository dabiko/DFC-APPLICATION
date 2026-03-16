/**
 * CustomSelect — Rich dropdown component with search, grouping, icons, and auto-positioning.
 *
 * Uses a portal + fixed positioning so the dropdown is never clipped by
 * parent overflow:hidden / overflow:auto containers (e.g. modals).
 *
 * Automatically opens upward when there isn't enough room below the trigger.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Search, Check } from 'lucide-react'
import { cn } from '@/utils/cn'

// ============================================================================
// TYPES
// ============================================================================

export interface SelectOption {
  value: string
  label: string
  description?: string
  icon?: React.ReactNode
  badge?: string
  badgeColor?: string
  group?: string
}

export interface CustomSelectProps {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  icon?: React.ReactNode
  label: string
  required?: boolean
  disabled?: boolean
  searchable?: boolean
}

// ============================================================================
// COMPONENT
// ============================================================================

export function CustomSelect({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  icon,
  label,
  required,
  disabled,
  searchable = false,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [position, setPosition] = useState<{
    top?: number
    bottom?: number
    left: number
    width: number
  } | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const selectedOption = options.find((o) => o.value === value)

  // Calculate position when opening and on scroll/resize
  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return

    const rect = triggerRef.current.getBoundingClientRect()
    const dropdownMaxHeight = 320 // max-h-80 equivalent
    const gap = 6
    const spaceBelow = window.innerHeight - rect.bottom - gap
    const spaceAbove = rect.top - gap
    const openUp = spaceBelow < dropdownMaxHeight && spaceAbove > spaceBelow

    if (openUp) {
      setPosition({
        bottom: window.innerHeight - rect.top + gap,
        left: rect.left,
        width: rect.width,
      })
    } else {
      setPosition({
        top: rect.bottom + gap,
        left: rect.left,
        width: rect.width,
      })
    }
  }, [])

  // Open/close and position
  useEffect(() => {
    if (isOpen) {
      updatePosition()

      // Reposition on scroll (any ancestor) and resize
      const handleReposition = () => updatePosition()
      window.addEventListener('scroll', handleReposition, true)
      window.addEventListener('resize', handleReposition)
      return () => {
        window.removeEventListener('scroll', handleReposition, true)
        window.removeEventListener('resize', handleReposition)
      }
    } else {
      setPosition(null)
    }
  }, [isOpen, updatePosition])

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen])

  // Focus search when opened
  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      // Small delay so the portal renders first
      requestAnimationFrame(() => searchInputRef.current?.focus())
    }
  }, [isOpen, searchable])

  const filteredOptions = search
    ? options.filter(
        (o) =>
          o.label.toLowerCase().includes(search.toLowerCase()) ||
          o.description?.toLowerCase().includes(search.toLowerCase())
      )
    : options

  // Group options
  const groups = new Map<string, SelectOption[]>()
  filteredOptions.forEach((opt) => {
    const group = opt.group || ''
    if (!groups.has(group)) groups.set(group, [])
    groups.get(group)!.push(opt)
  })

  const handleSelect = useCallback(
    (optValue: string) => {
      onChange(optValue)
      setIsOpen(false)
      setSearch('')
    },
    [onChange]
  )

  const handleTriggerKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isOpen) {
      e.preventDefault()
      setIsOpen(true)
    }
  }

  // The dropdown rendered via portal
  const dropdownContent =
    isOpen && position
      ? createPortal(
          <div
            ref={dropdownRef}
            className="fixed z-[9999] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl overflow-hidden"
            style={{
              top: position.top != null ? position.top : undefined,
              bottom: position.bottom != null ? position.bottom : undefined,
              left: position.left,
              width: position.width,
            }}
          >
            {/* Search */}
            {searchable && (
              <div className="p-2 border-b border-gray-100 dark:border-gray-700">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search..."
                    className="w-full pl-8 pr-3 py-1.5 text-sm bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-gray-100 placeholder-gray-400"
                  />
                </div>
              </div>
            )}

            {/* Options */}
            <div className="max-h-72 overflow-y-auto py-1">
              {filteredOptions.length === 0 ? (
                <div className="px-3 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                  No options found
                </div>
              ) : (
                Array.from(groups.entries()).map(([group, groupOptions]) => (
                  <div key={group}>
                    {group && (
                      <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                        {group}
                      </div>
                    )}
                    {groupOptions.map((option) => {
                      const isSelected = option.value === value
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => handleSelect(option.value)}
                          className={cn(
                            'w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors',
                            isSelected
                              ? 'bg-blue-50 dark:bg-blue-900/20'
                              : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                          )}
                        >
                          {option.icon && (
                            <span
                              className={cn(
                                'flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center',
                                option.badgeColor ||
                                  'bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
                              )}
                            >
                              {option.icon}
                            </span>
                          )}

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span
                                className={cn(
                                  'text-sm font-medium truncate',
                                  isSelected
                                    ? 'text-blue-700 dark:text-blue-300'
                                    : 'text-gray-900 dark:text-gray-100'
                                )}
                              >
                                {option.label}
                              </span>
                              {option.badge && (
                                <span className="flex-shrink-0 px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                                  {option.badge}
                                </span>
                              )}
                            </div>
                            {option.description && (
                              <span className="block text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                                {option.description}
                              </span>
                            )}
                          </div>

                          {isSelected && (
                            <Check className="w-4 h-4 flex-shrink-0 text-blue-600 dark:text-blue-400" />
                          )}
                        </button>
                      )
                    })}
                  </div>
                ))
              )}
            </div>
          </div>,
          document.body
        )
      : null

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        {icon && <span className="inline-block mr-1 align-middle">{icon}</span>}
        {label}
        {required && ' *'}
      </label>
      <div>
        {/* Trigger */}
        <button
          ref={triggerRef}
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          onKeyDown={handleTriggerKeyDown}
          disabled={disabled}
          className={cn(
            'w-full flex items-center justify-between gap-2 px-3 py-2.5 text-sm border rounded-lg transition-all text-left',
            isOpen
              ? 'border-blue-500 ring-2 ring-blue-500/20 dark:ring-blue-400/20'
              : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500',
            disabled
              ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed opacity-60'
              : 'bg-white dark:bg-gray-700 cursor-pointer'
          )}
        >
          {selectedOption ? (
            <div className="flex items-center gap-2.5 min-w-0">
              {selectedOption.icon && (
                <span
                  className={cn(
                    'flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center',
                    selectedOption.badgeColor ||
                      'bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
                  )}
                >
                  {selectedOption.icon}
                </span>
              )}
              <div className="min-w-0">
                <span className="block font-medium text-gray-900 dark:text-gray-100 truncate">
                  {selectedOption.label}
                </span>
                {selectedOption.description && (
                  <span className="block text-xs text-gray-500 dark:text-gray-400 truncate">
                    {selectedOption.description}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <span className="text-gray-400 dark:text-gray-500">{placeholder}</span>
          )}
          <ChevronDown
            className={cn(
              'w-4 h-4 flex-shrink-0 text-gray-400 transition-transform duration-200',
              isOpen && 'rotate-180'
            )}
          />
        </button>

        {/* Dropdown rendered via portal at document.body */}
        {dropdownContent}
      </div>
    </div>
  )
}

export default CustomSelect
