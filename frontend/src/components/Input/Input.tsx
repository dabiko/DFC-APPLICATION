import { InputHTMLAttributes, forwardRef, ReactNode, useState } from 'react'
import { cn } from '@utils/cn'
import { EyeIcon, EyeSlashIcon, XMarkIcon } from '@heroicons/react/24/outline'

export type InputSize = 'sm' | 'md' | 'lg'

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Input size */
  size?: InputSize
  /** Label text */
  label?: string
  /** Helper text below input */
  helperText?: string
  /** Error message */
  error?: string
  /** Icon to display on the left */
  leftIcon?: ReactNode
  /** Icon to display on the right */
  rightIcon?: ReactNode
  /** Show clear button */
  clearable?: boolean
  /** Callback when clear button is clicked */
  onClear?: () => void
  /** Full width input */
  fullWidth?: boolean
}

const sizeStyles: Record<InputSize, string> = {
  sm: 'text-sm px-3 py-1.5',
  md: 'text-base px-4 py-2',
  lg: 'text-lg px-4 py-3',
}

/**
 * Input component
 *
 * A versatile input field with support for labels, helper text, error states,
 * icons, and special variants like password and search inputs.
 *
 * @example
 * ```tsx
 * <Input label="Email" type="email" placeholder="Enter your email" />
 * <Input label="Password" type="password" error="Password is required" />
 * <Input type="search" placeholder="Search..." clearable />
 * ```
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      size = 'md',
      label,
      helperText,
      error,
      leftIcon,
      rightIcon,
      clearable = false,
      onClear,
      fullWidth = false,
      className,
      type = 'text',
      id,
      disabled,
      value,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false)
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')
    const isPassword = type === 'password'
    const inputType = isPassword && showPassword ? 'text' : type

    const showClearButton = clearable && value && !disabled
    const showPasswordToggle = isPassword && !disabled

    const handleClear = () => {
      if (onClear) {
        onClear()
      }
    }

    return (
      <div className={cn('flex flex-col gap-1.5', fullWidth && 'w-full', className)}>
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {label}
          </label>
        )}

        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            type={inputType}
            disabled={disabled}
            value={value}
            className={cn(
              'w-full rounded-lg border bg-white dark:bg-gray-900 transition-colors',
              'text-gray-900 dark:text-gray-100',
              'placeholder:text-gray-400 dark:placeholder:text-gray-500',
              'focus:outline-none focus:ring-2 focus:ring-offset-0',
              error
                ? 'border-error-500 focus:ring-error-500 focus:border-error-500'
                : 'border-gray-300 dark:border-gray-700 focus:ring-primary-500 focus:border-primary-500',
              disabled && 'opacity-50 cursor-not-allowed bg-gray-50 dark:bg-gray-800',
              sizeStyles[size],
              leftIcon && 'pl-10',
              (showClearButton || showPasswordToggle || rightIcon) && 'pr-10'
            )}
            {...props}
          />

          {/* Right side icons */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {showClearButton && (
              <button
                type="button"
                onClick={handleClear}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                aria-label="Clear input"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            )}

            {showPasswordToggle && (
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeSlashIcon className="h-4 w-4" />
                ) : (
                  <EyeIcon className="h-4 w-4" />
                )}
              </button>
            )}

            {rightIcon && !showClearButton && !showPasswordToggle && (
              <div className="text-gray-400 pointer-events-none">{rightIcon}</div>
            )}
          </div>
        </div>

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

Input.displayName = 'Input'
