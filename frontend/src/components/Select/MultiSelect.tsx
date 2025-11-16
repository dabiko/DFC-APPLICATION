import { Fragment, useState } from 'react'
import { Listbox, Transition } from '@headlessui/react'
import { CheckIcon, ChevronUpDownIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { cn } from '@utils/cn'
import type { SelectOption, SelectSize } from './Select'

export interface MultiSelectProps {
  /** Options to display */
  options: SelectOption[]
  /** Selected values */
  value?: (string | number)[]
  /** Callback when values change */
  onChange?: (values: (string | number)[]) => void
  /** Placeholder text */
  placeholder?: string
  /** Label text */
  label?: string
  /** Helper text below select */
  helperText?: string
  /** Error message */
  error?: string
  /** Size variant */
  size?: SelectSize
  /** Disabled state */
  disabled?: boolean
  /** Full width */
  fullWidth?: boolean
  /** Show search input */
  searchable?: boolean
  /** Maximum selections allowed */
  maxSelections?: number
}

const sizeStyles: Record<SelectSize, string> = {
  sm: 'text-sm px-3 py-1.5 min-h-[32px]',
  md: 'text-base px-4 py-2 min-h-[40px]',
  lg: 'text-lg px-4 py-3 min-h-[48px]',
}

/**
 * MultiSelect component
 *
 * An accessible multi-select dropdown component built with Headless UI.
 * Supports searchable options, chip display, and maximum selection limits.
 *
 * @example
 * ```tsx
 * <MultiSelect
 *   label="Tags"
 *   options={tags}
 *   value={selectedTags}
 *   onChange={setSelectedTags}
 *   maxSelections={5}
 * />
 * ```
 */
export function MultiSelect({
  options,
  value = [],
  onChange,
  placeholder = 'Select options',
  label,
  helperText,
  error,
  size = 'md',
  disabled = false,
  fullWidth = false,
  searchable = false,
  maxSelections,
}: MultiSelectProps) {
  const [query, setQuery] = useState('')

  const selectedOptions = options.filter((option) => value.includes(option.value))

  const filteredOptions =
    query === ''
      ? options
      : options.filter((option) => option.label.toLowerCase().includes(query.toLowerCase()))

  const handleRemove = (optionValue: string | number) => {
    onChange?.(value.filter((v) => v !== optionValue))
  }

  return (
    <div className={cn('flex flex-col gap-1.5', fullWidth && 'w-full')}>
      {label && (
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
      )}

      <Listbox value={value} onChange={onChange} disabled={disabled} multiple>
        {({ open }) => (
          <div className="relative">
            <Listbox.Button
              className={cn(
                'relative w-full cursor-default rounded-lg border bg-white dark:bg-gray-900',
                'text-left transition-colors',
                'text-gray-900 dark:text-gray-100',
                'focus:outline-none focus:ring-2 focus:ring-offset-0',
                error
                  ? 'border-error-500 focus:ring-error-500'
                  : 'border-gray-300 dark:border-gray-700 focus:ring-primary-500',
                disabled && 'opacity-50 cursor-not-allowed bg-gray-50 dark:bg-gray-800',
                sizeStyles[size]
              )}
            >
              <div className="flex flex-wrap gap-1.5 pr-10">
                {selectedOptions.length === 0 ? (
                  <span className="text-gray-400">{placeholder}</span>
                ) : (
                  selectedOptions.map((option) => (
                    <span
                      key={option.value}
                      className={cn(
                        'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium',
                        'bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-100'
                      )}
                    >
                      {option.label}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRemove(option.value)
                        }}
                        className="hover:text-primary-600 dark:hover:text-primary-300"
                        disabled={disabled}
                      >
                        <XMarkIcon className="h-3 w-3" />
                      </button>
                    </span>
                  ))
                )}
              </div>
              <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                <ChevronUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
              </span>
            </Listbox.Button>

            <Transition
              show={open}
              as={Fragment}
              leave="transition ease-in duration-100"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <Listbox.Options
                className={cn(
                  'absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg',
                  'bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700',
                  'shadow-lg ring-1 ring-black ring-opacity-5',
                  'focus:outline-none'
                )}
              >
                {searchable && (
                  <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 p-2 border-b border-gray-200 dark:border-gray-800">
                    <input
                      type="text"
                      className={cn(
                        'w-full rounded-md border border-gray-300 dark:border-gray-700',
                        'bg-white dark:bg-gray-800 px-3 py-1.5 text-sm',
                        'text-gray-900 dark:text-gray-100',
                        'placeholder:text-gray-400 dark:placeholder:text-gray-500',
                        'focus:outline-none focus:ring-2 focus:ring-primary-500'
                      )}
                      placeholder="Search..."
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                  </div>
                )}

                {maxSelections && (
                  <div className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800">
                    {value.length}/{maxSelections} selected
                  </div>
                )}

                {filteredOptions.length === 0 ? (
                  <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                    No options found
                  </div>
                ) : (
                  filteredOptions.map((option) => {
                    const isSelected = value.includes(option.value)
                    const isDisabled =
                      option.disabled ||
                      (!isSelected && maxSelections !== undefined && value.length >= maxSelections)

                    return (
                      <Listbox.Option
                        key={option.value}
                        value={option.value}
                        disabled={isDisabled}
                        className={({ active }) =>
                          cn(
                            'relative cursor-default select-none py-2 pl-10 pr-4',
                            active
                              ? 'bg-primary-100 dark:bg-primary-900 text-primary-900 dark:text-primary-100'
                              : 'text-gray-900 dark:text-gray-100',
                            isDisabled && 'opacity-50 cursor-not-allowed'
                          )
                        }
                      >
                        <>
                          <span
                            className={cn(
                              'block truncate',
                              isSelected ? 'font-medium' : 'font-normal'
                            )}
                          >
                            <span className="flex items-center gap-2">
                              {option.icon}
                              {option.label}
                            </span>
                          </span>
                          {isSelected && (
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-primary-600 dark:text-primary-400">
                              <CheckIcon className="h-5 w-5" aria-hidden="true" />
                            </span>
                          )}
                        </>
                      </Listbox.Option>
                    )
                  })
                )}
              </Listbox.Options>
            </Transition>
          </div>
        )}
      </Listbox>

      {(helperText || error) && (
        <p
          className={cn(
            'text-sm',
            error ? 'text-error-600 dark:text-error-400' : 'text-gray-500 dark:text-gray-400'
          )}
        >
          {error || helperText}
        </p>
      )}
    </div>
  )
}
