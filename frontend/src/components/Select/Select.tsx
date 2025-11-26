import { Fragment, useState, useRef, useEffect } from 'react'
import { Listbox, Transition } from '@headlessui/react'
import { CheckIcon, ChevronUpDownIcon } from '@heroicons/react/24/outline'
import { cn } from '@utils/cn'

// Dropdown height estimate for auto-flip calculation
const DROPDOWN_MAX_HEIGHT = 240 // max-h-60 = 15rem = 240px

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
  const [dropdownPosition, setDropdownPosition] = useState<'below' | 'above'>('below')
  const buttonRef = useRef<HTMLButtonElement>(null)

  const selectedOption = options.find((option) => option.value === value)

  const filteredOptions =
    query === ''
      ? options
      : options.filter((option) => option.label.toLowerCase().includes(query.toLowerCase()))

  // Calculate dropdown position when button is clicked
  const calculatePosition = () => {
    if (!buttonRef.current) return

    const buttonRect = buttonRef.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - buttonRect.bottom
    const spaceAbove = buttonRect.top

    // If not enough space below but more space above, position above
    if (spaceBelow < DROPDOWN_MAX_HEIGHT && spaceAbove > spaceBelow) {
      setDropdownPosition('above')
    } else {
      setDropdownPosition('below')
    }
  }

  return (
    <div className={cn('flex flex-col gap-1.5', fullWidth && 'w-full')}>
      {label && (
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
      )}

      <Listbox value={value} onChange={(val) => onChange?.(val)} disabled={disabled}>
        {({ open }) => {
          // Effect to handle scroll/resize while dropdown is open
          // eslint-disable-next-line react-hooks/rules-of-hooks
          useEffect(() => {
            if (!open) return

            const handleScrollOrResize = () => {
              calculatePosition()
            }

            window.addEventListener('scroll', handleScrollOrResize, true)
            window.addEventListener('resize', handleScrollOrResize)

            return () => {
              window.removeEventListener('scroll', handleScrollOrResize, true)
              window.removeEventListener('resize', handleScrollOrResize)
            }
          }, [open])

          return (
            <div className="relative">
              <Listbox.Button
                ref={buttonRef}
                onClick={calculatePosition}
                className={cn(
                  'relative w-full cursor-pointer rounded-lg border bg-white dark:bg-gray-900',
                  'text-left transition-all duration-200',
                  'text-gray-900 dark:text-gray-100',
                  'focus:outline-none focus:ring-2 focus:ring-offset-0',
                  // Enhanced border styling with hover effects
                  error
                    ? 'border-red-400 dark:border-red-500 focus:ring-red-500/40 focus:border-red-500'
                    : [
                        'border-gray-200 dark:border-gray-600',
                        'hover:border-gray-300 dark:hover:border-gray-500',
                        'focus:ring-blue-500/30 focus:border-blue-500 dark:focus:border-blue-400',
                        // Subtle shadow on hover for depth
                        'hover:shadow-sm dark:hover:shadow-gray-900/20',
                      ],
                  // Open state styling
                  open && !error && 'border-blue-500 dark:border-blue-400 ring-2 ring-blue-500/30',
                  disabled &&
                    'opacity-50 cursor-not-allowed bg-gray-50 dark:bg-gray-800 hover:border-gray-200 dark:hover:border-gray-600 hover:shadow-none',
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
                <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                  <ChevronUpDownIcon
                    className={cn(
                      'h-5 w-5 transition-transform duration-200',
                      open ? 'text-blue-500 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'
                    )}
                    aria-hidden="true"
                  />
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
                    'absolute z-50 max-h-60 w-full overflow-auto rounded-xl',
                    'bg-white dark:bg-gray-800',
                    'border border-gray-200 dark:border-gray-700',
                    'shadow-xl shadow-gray-200/50 dark:shadow-gray-900/50',
                    'focus:outline-none',
                    // Position above or below based on available space
                    dropdownPosition === 'below' ? 'top-full mt-1.5' : 'bottom-full mb-1.5',
                    // Custom scrollbar styling for dark/light theme
                    '[&::-webkit-scrollbar]:w-2',
                    '[&::-webkit-scrollbar-track]:bg-transparent',
                    '[&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-gray-600',
                    '[&::-webkit-scrollbar-thumb]:rounded-full',
                    '[&::-webkit-scrollbar-thumb:hover]:bg-gray-400 dark:[&::-webkit-scrollbar-thumb:hover]:bg-gray-500'
                  )}
                >
                  {searchable && (
                    <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 p-2.5 border-b border-gray-100 dark:border-gray-700">
                      <input
                        type="text"
                        className={cn(
                          'w-full rounded-lg border border-gray-200 dark:border-gray-600',
                          'bg-gray-50 dark:bg-gray-700/50 px-3 py-2 text-sm',
                          'text-gray-900 dark:text-gray-100',
                          'placeholder:text-gray-400 dark:placeholder:text-gray-500',
                          'focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500',
                          'transition-all duration-200'
                        )}
                        placeholder="Search..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                    </div>
                  )}

                  {filteredOptions.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-center">
                      No options found
                    </div>
                  ) : (
                    <div className="py-1">
                      {filteredOptions.map((option) => (
                        <Listbox.Option
                          key={option.value}
                          value={option.value}
                          disabled={option.disabled}
                          className={({ active, selected }) =>
                            cn(
                              'relative cursor-pointer select-none py-2.5 pl-10 pr-4 mx-1 rounded-lg',
                              'transition-colors duration-150',
                              active && !selected && 'bg-gray-100 dark:bg-gray-700/50',
                              selected &&
                                'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
                              !active && !selected && 'text-gray-900 dark:text-gray-100',
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
                                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-blue-600 dark:text-blue-400">
                                  <CheckIcon className="h-5 w-5" aria-hidden="true" />
                                </span>
                              )}
                            </>
                          )}
                        </Listbox.Option>
                      ))}
                    </div>
                  )}
                </Listbox.Options>
              </Transition>
            </div>
          )
        }}
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
