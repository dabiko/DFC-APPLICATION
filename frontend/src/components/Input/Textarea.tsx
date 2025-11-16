import { TextareaHTMLAttributes, forwardRef } from 'react'
import { cn } from '@utils/cn'

export type TextareaSize = 'sm' | 'md' | 'lg'

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Textarea size */
  size?: TextareaSize
  /** Label text */
  label?: string
  /** Helper text below textarea */
  helperText?: string
  /** Error message */
  error?: string
  /** Show character count */
  showCount?: boolean
  /** Maximum characters allowed */
  maxLength?: number
  /** Full width textarea */
  fullWidth?: boolean
  /** Auto-resize based on content */
  autoResize?: boolean
}

const sizeStyles: Record<TextareaSize, string> = {
  sm: 'text-sm px-3 py-1.5 min-h-[80px]',
  md: 'text-base px-4 py-2 min-h-[100px]',
  lg: 'text-lg px-4 py-3 min-h-[120px]',
}

/**
 * Textarea component
 *
 * A multi-line text input with support for labels, helper text, error states,
 * character counting, and auto-resize functionality.
 *
 * @example
 * ```tsx
 * <Textarea label="Description" placeholder="Enter description..." />
 * <Textarea label="Comment" maxLength={500} showCount />
 * <Textarea autoResize rows={3} />
 * ```
 */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      size = 'md',
      label,
      helperText,
      error,
      showCount = false,
      maxLength,
      fullWidth = false,
      autoResize = false,
      className,
      id,
      disabled,
      value,
      rows = 4,
      ...props
    },
    ref
  ) => {
    const textareaId = id || label?.toLowerCase().replace(/\s+/g, '-')
    const currentLength = value?.toString().length || 0

    return (
      <div className={cn('flex flex-col gap-1.5', fullWidth && 'w-full', className)}>
        {label && (
          <div className="flex items-center justify-between">
            <label
              htmlFor={textareaId}
              className="text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              {label}
            </label>
            {showCount && maxLength && (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {currentLength}/{maxLength}
              </span>
            )}
          </div>
        )}

        <textarea
          ref={ref}
          id={textareaId}
          disabled={disabled}
          value={value}
          maxLength={maxLength}
          rows={rows}
          className={cn(
            'w-full rounded-lg border bg-white dark:bg-gray-900 transition-colors',
            'text-gray-900 dark:text-gray-100',
            'placeholder:text-gray-400 dark:placeholder:text-gray-500',
            'focus:outline-none focus:ring-2 focus:ring-offset-0',
            error
              ? 'border-error-500 focus:ring-error-500 focus:border-error-500'
              : 'border-gray-300 dark:border-gray-700 focus:ring-primary-500 focus:border-primary-500',
            disabled && 'opacity-50 cursor-not-allowed bg-gray-50 dark:bg-gray-800',
            autoResize && 'resize-none',
            sizeStyles[size]
          )}
          {...props}
        />

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
)

Textarea.displayName = 'Textarea'
