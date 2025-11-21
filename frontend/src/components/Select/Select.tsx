import { Fragment, useState } from 'react'
import { Listbox, Transition } from '@headlessui/react'
import { CheckIcon, ChevronUpDownIcon } from '@heroicons/react/24/outline'
import { cn } from '@utils/cn'

export interface SelectOption {
  value: string | number
  label: string
  disabled?: boolean
  icon?: React.ReactNode
}

export type SelectSize = 'sm' | 'md' | 'lg'

export interface SelectProps {
  /** Options to display */
  options: SelectOption[]
  /** Selected value */
  value?: string | number
  /** Callback when value changes */
  onChange?: (value: string | number) => void
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
  /** Custom render for option */
  renderOption?: (option: SelectOption) => React.ReactNode
}

const sizeStyles: Record<SelectSize, string> = {
  sm: 'text-sm px-3 py-1.5',
  md: 'text-base px-4 py-2',
  lg: 'text-lg px-4 py-3',
}

/**
 * Select component (Single Select)
 *
 * An accessible dropdown select component built with Headless UI.
 * Supports searchable options, custom rendering, and icons.
 *
 * @example
 * ```tsx
 * <Select
 *   label="Country"
 *   options={countries}
 *   value={selectedCountry}
 *   onChange={setSelectedCountry}
 * />
 * ```
 */
export function Select({
  options,
  value,
  onChange,
  placeholder = 'Select an option',
  label,
  helperText,
  error,
  size = 'md',
  disabled = false,
  fullWidth = false,
  searchable = false,
  renderOption,
}: SelectProps) {
  const [query, setQuery] = useState('')

  const selectedOption = options.find((option) => option.value === value)

  const filteredOptions =
    query === ''
      ? options
      : options.filter((option) => option.label.toLowerCase().includes(query.toLowerCase()))

  return (
    <div className={cn('flex flex-col gap-1.5', fullWidth && 'w-full')}>
      {label && (
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
      )}

      <Listbox value={value} onChange={(val) => onChange?.(val)} disabled={disabled}>
        {({ open: _open }) => (
          <div className="relative">
            <Listbox.Button
              className={cn(
                'relative w-full cursor-default rounded-lg border bg-white dark:bg-gray-900',
                'text-left transition-colors',
                'text-gray-900 dark:text-gray-100',
                'focus:outline-none focus:ring-2 focus:ring-offset-0',
                error
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-gray-300 dark:border-gray-700 focus:ring-blue-500',
                disabled && 'opacity-50 cursor-not-allowed bg-gray-50 dark:bg-gray-800',
                sizeStyles[size]
              )}
            >
              <span className={cn('block truncate', !selectedOption && 'text-gray-400')}>
                {selectedOption ? (
                  <span className="flex items-center gap-2">
                    {selectedOption.icon}
                    {selectedOption.label}
                  </span>
                ) : (
                  placeholder
                )}
              </span>
              <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                <ChevronUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
              </span>
            </Listbox.Button>

            <Transition
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

                {filteredOptions.length === 0 ? (
                  <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                    No options found
                  </div>
                ) : (
                  filteredOptions.map((option) => (
                    <Listbox.Option
                      key={option.value}
                      value={option.value}
                      disabled={option.disabled}
                      className={({ active }) =>
                        cn(
                          'relative cursor-default select-none py-2 pl-10 pr-4',
                          active
                            ? 'bg-primary-100 dark:bg-primary-900 text-primary-900 dark:text-primary-100'
                            : 'text-gray-900 dark:text-gray-100',
                          option.disabled && 'opacity-50 cursor-not-allowed'
                        )
                      }
                    >
                      {({ selected }) => (
                        <>
                          <span
                            className={cn(
                              'block truncate',
                              selected ? 'font-medium' : 'font-normal'
                            )}
                          >
                            {renderOption ? (
                              renderOption(option)
                            ) : (
                              <span className="flex items-center gap-2">
                                {option.icon}
                                {option.label}
                              </span>
                            )}
                          </span>
                          {selected && (
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-primary-600 dark:text-primary-400">
                              <CheckIcon className="h-5 w-5" aria-hidden="true" />
                            </span>
                          )}
                        </>
                      )}
                    </Listbox.Option>
                  ))
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
            error ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'
          )}
        >
          {error || helperText}
        </p>
      )}
    </div>
  )
}
