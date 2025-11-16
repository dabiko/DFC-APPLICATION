import { HTMLAttributes } from 'react'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
} from '@heroicons/react/24/outline'
import { cn } from '@utils/cn'

export interface PaginationProps extends Omit<HTMLAttributes<HTMLElement>, 'onChange'> {
  /** Current page (1-indexed) */
  currentPage: number
  /** Total number of pages */
  totalPages: number
  /** Callback when page changes */
  onPageChange: (page: number) => void
  /** Number of page buttons to show */
  siblingCount?: number
  /** Show first/last page buttons */
  showFirstLast?: boolean
  /** Show previous/next buttons */
  showPrevNext?: boolean
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
  /** Disabled state */
  disabled?: boolean
}

/**
 * Pagination component
 *
 * Navigate through paginated content.
 * Essential for document lists and search results.
 *
 * @example
 * ```tsx
 * <Pagination
 *   currentPage={currentPage}
 *   totalPages={totalPages}
 *   onPageChange={setCurrentPage}
 * />
 * ```
 */
export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  siblingCount = 1,
  showFirstLast = true,
  showPrevNext = true,
  size = 'md',
  disabled = false,
  className,
  ...props
}: PaginationProps) {
  const pages = usePaginationRange(currentPage, totalPages, siblingCount)

  const canGoPrevious = currentPage > 1
  const canGoNext = currentPage < totalPages

  const handlePageChange = (page: number) => {
    if (disabled) return
    if (page < 1 || page > totalPages) return
    onPageChange(page)
  }

  const sizeStyles = {
    sm: 'h-8 min-w-[2rem] text-sm',
    md: 'h-10 min-w-[2.5rem] text-base',
    lg: 'h-12 min-w-[3rem] text-lg',
  }

  const iconSizes = {
    sm: 'h-3.5 w-3.5',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  }

  return (
    <nav
      role="navigation"
      aria-label="Pagination"
      className={cn('flex items-center justify-center gap-1', className)}
      {...props}
    >
      {showFirstLast && (
        <PaginationButton
          onClick={() => handlePageChange(1)}
          disabled={!canGoPrevious || disabled}
          size={size}
          aria-label="Go to first page"
        >
          <ChevronDoubleLeftIcon className={iconSizes[size]} />
        </PaginationButton>
      )}

      {showPrevNext && (
        <PaginationButton
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={!canGoPrevious || disabled}
          size={size}
          aria-label="Go to previous page"
        >
          <ChevronLeftIcon className={iconSizes[size]} />
        </PaginationButton>
      )}

      {pages.map((page, index) => {
        if (page === '...') {
          return (
            <span
              key={`ellipsis-${index}`}
              className={cn(
                'flex items-center justify-center px-2 text-gray-500 dark:text-gray-400',
                sizeStyles[size]
              )}
            >
              ...
            </span>
          )
        }

        const pageNum = page as number
        const isActive = pageNum === currentPage

        return (
          <PaginationButton
            key={pageNum}
            onClick={() => handlePageChange(pageNum)}
            disabled={disabled}
            active={isActive}
            size={size}
            aria-label={`Go to page ${pageNum}`}
            aria-current={isActive ? 'page' : undefined}
          >
            {pageNum}
          </PaginationButton>
        )
      })}

      {showPrevNext && (
        <PaginationButton
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={!canGoNext || disabled}
          size={size}
          aria-label="Go to next page"
        >
          <ChevronRightIcon className={iconSizes[size]} />
        </PaginationButton>
      )}

      {showFirstLast && (
        <PaginationButton
          onClick={() => handlePageChange(totalPages)}
          disabled={!canGoNext || disabled}
          size={size}
          aria-label="Go to last page"
        >
          <ChevronDoubleRightIcon className={iconSizes[size]} />
        </PaginationButton>
      )}
    </nav>
  )
}

interface PaginationButtonProps {
  onClick?: () => void
  disabled?: boolean
  active?: boolean
  size: 'sm' | 'md' | 'lg'
  children: React.ReactNode
  'aria-label'?: string
  'aria-current'?: 'page' | undefined
}

function PaginationButton({
  onClick,
  disabled = false,
  active = false,
  size,
  children,
  'aria-label': ariaLabel,
  'aria-current': ariaCurrent,
}: PaginationButtonProps) {
  const sizeStyles = {
    sm: 'h-8 min-w-[2rem] text-sm',
    md: 'h-10 min-w-[2.5rem] text-base',
    lg: 'h-12 min-w-[3rem] text-lg',
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-current={ariaCurrent}
      className={cn(
        'inline-flex items-center justify-center px-3 rounded-md font-medium transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
        sizeStyles[size],
        active
          ? 'bg-primary-600 text-white hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600'
          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-700',
        disabled && 'opacity-50 cursor-not-allowed hover:bg-white dark:hover:bg-gray-800'
      )}
    >
      {children}
    </button>
  )
}

/**
 * Hook to generate pagination range with ellipsis
 */
function usePaginationRange(
  currentPage: number,
  totalPages: number,
  siblingCount: number
): (number | string)[] {
  // Always show: first page, last page, current page, and siblings
  const totalNumbers = siblingCount * 2 + 3 // current + siblings on each side + first + last
  const totalBlocks = totalNumbers + 2 // + 2 ellipsis

  if (totalPages <= totalBlocks) {
    // Show all pages if total is small enough
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }

  const leftSiblingIndex = Math.max(currentPage - siblingCount, 1)
  const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages)

  const shouldShowLeftEllipsis = leftSiblingIndex > 2
  const shouldShowRightEllipsis = rightSiblingIndex < totalPages - 1

  if (!shouldShowLeftEllipsis && shouldShowRightEllipsis) {
    const leftRange = Array.from({ length: 3 + 2 * siblingCount }, (_, i) => i + 1)
    return [...leftRange, '...', totalPages]
  }

  if (shouldShowLeftEllipsis && !shouldShowRightEllipsis) {
    const rightRange = Array.from(
      { length: 3 + 2 * siblingCount },
      (_, i) => totalPages - (3 + 2 * siblingCount) + i + 1
    )
    return [1, '...', ...rightRange]
  }

  const middleRange = Array.from(
    { length: rightSiblingIndex - leftSiblingIndex + 1 },
    (_, i) => leftSiblingIndex + i
  )

  return [1, '...', ...middleRange, '...', totalPages]
}

/**
 * SimplePagination component
 *
 * A simpler pagination with just Previous/Next buttons and page info.
 *
 * @example
 * ```tsx
 * <SimplePagination
 *   currentPage={1}
 *   totalPages={10}
 *   onPageChange={setPage}
 * />
 * ```
 */
export interface SimplePaginationProps {
  /** Current page */
  currentPage: number
  /** Total pages */
  totalPages: number
  /** Callback when page changes */
  onPageChange: (page: number) => void
  /** Show page info text */
  showPageInfo?: boolean
  /** Disabled state */
  disabled?: boolean
  /** Custom class name */
  className?: string
}

export function SimplePagination({
  currentPage,
  totalPages,
  onPageChange,
  showPageInfo = true,
  disabled = false,
  className,
}: SimplePaginationProps) {
  const canGoPrevious = currentPage > 1
  const canGoNext = currentPage < totalPages

  return (
    <nav className={cn('flex items-center justify-between', className)} aria-label="Pagination">
      <button
        type="button"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={!canGoPrevious || disabled}
        className={cn(
          'inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors',
          'border border-gray-300 dark:border-gray-700',
          'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300',
          'hover:bg-gray-50 dark:hover:bg-gray-700',
          'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed'
        )}
      >
        <ChevronLeftIcon className="h-4 w-4" />
        Previous
      </button>

      {showPageInfo && (
        <span className="text-sm text-gray-700 dark:text-gray-300">
          Page <span className="font-medium">{currentPage}</span> of{' '}
          <span className="font-medium">{totalPages}</span>
        </span>
      )}

      <button
        type="button"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={!canGoNext || disabled}
        className={cn(
          'inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors',
          'border border-gray-300 dark:border-gray-700',
          'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300',
          'hover:bg-gray-50 dark:hover:bg-gray-700',
          'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed'
        )}
      >
        Next
        <ChevronRightIcon className="h-4 w-4" />
      </button>
    </nav>
  )
}
