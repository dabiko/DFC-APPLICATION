import { Link, useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeftIcon, HomeIcon } from '@heroicons/react/24/outline'
import { cn } from '@utils/cn'

export interface AuthHeaderProps {
  /** Current page title */
  title?: string
  /** Show back button */
  showBack?: boolean
  /** Custom back navigation path (defaults to intelligent detection) */
  backPath?: string
  /** Show home/logo link */
  showLogo?: boolean
  /** Custom className for styling */
  className?: string
}

/**
 * AuthHeader Component
 *
 * Professional header for authentication pages (login, signup, forgot password, etc.)
 * Provides multiple navigation options:
 * - Logo/brand link to home
 * - Back button with smart navigation
 * - Home icon for quick access
 *
 * @example
 * ```tsx
 * <AuthHeader title="Sign In" showBack showLogo />
 * <AuthHeader title="Create Account" showBack showLogo />
 * ```
 */
export function AuthHeader({
  title,
  showBack = true,
  backPath,
  showLogo = true,
  className,
}: AuthHeaderProps) {
  const navigate = useNavigate()
  const _location = useLocation()

  const handleBack = () => {
    if (backPath) {
      navigate(backPath)
      return
    }

    // Smart navigation: check if user came from within the app
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1) // Go back to previous page
    } else {
      navigate('/') // Go to landing page if no history
    }
  }

  return (
    <div className={cn('w-full flex items-center justify-between mb-8 relative z-20', className)}>
      {/* Left: Back Button */}
      <div className="flex items-center gap-3">
        {showBack && (
          <button
            onClick={handleBack}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg',
              'text-gray-600 dark:text-gray-400',
              'hover:bg-gray-100 dark:hover:bg-gray-700',
              'transition-colors duration-200',
              'cursor-pointer group'
            )}
            aria-label="Go back"
          >
            <ArrowLeftIcon className="h-5 w-5 group-hover:-translate-x-1 transition-transform duration-200" />
            <span className="text-sm font-medium hidden sm:inline">Back</span>
          </button>
        )}

        {/* Optional Title */}
        {title && (
          <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 hidden md:block">
            {title}
          </h2>
        )}
      </div>

      {/* Center: Logo/Brand */}
      {showLogo && (
        <Link
          to="/"
          className={cn(
            'absolute left-1/2 -translate-x-1/2',
            'flex items-center gap-2',
            'text-2xl font-bold',
            'bg-gradient-to-r from-blue-600 to-purple-600',
            'bg-clip-text text-transparent',
            'hover:from-blue-700 hover:to-purple-700',
            'transition-all duration-200',
            'cursor-pointer'
          )}
          aria-label="Go to home page"
        >
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 blur-lg opacity-30" />
            <span className="relative">DFC</span>
          </div>
        </Link>
      )}

      {/* Right: Home Icon */}
      <Link
        to="/"
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg',
          'text-gray-600 dark:text-gray-400',
          'hover:bg-gray-100 dark:hover:bg-gray-700',
          'transition-colors duration-200',
          'cursor-pointer group'
        )}
        aria-label="Go to home page"
      >
        <HomeIcon className="h-5 w-5 group-hover:scale-110 transition-transform duration-200" />
        <span className="text-sm font-medium hidden sm:inline">Home</span>
      </Link>
    </div>
  )
}
