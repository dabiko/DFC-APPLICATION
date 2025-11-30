/**
 * Protected 404 Page
 * Shown to authenticated users when they access a non-existent route
 * Compact single-view design with quick access matching sidebar navigation
 */

import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@components/Button/Button'
import {
  HomeIcon,
  ArrowLeftIcon,
  MagnifyingGlassIcon,
  FolderIcon,
  ClockIcon,
  StarIcon,
  TrashIcon,
  ShareIcon,
} from '@heroicons/react/24/outline'

export function DashboardNotFound() {
  const navigate = useNavigate()

  // Quick access items matching sidebar navigation
  const quickAccessItems = [
    { path: '/dashboard', icon: HomeIcon, label: 'Dashboard', color: 'blue' },
    { path: '/search', icon: MagnifyingGlassIcon, label: 'Global Search', color: 'purple' },
    { path: '/my-documents', icon: FolderIcon, label: 'My Documents', color: 'amber' },
    { path: '/shared-with-me', icon: ShareIcon, label: 'Shared with Me', color: 'green' },
    { path: '/recent', icon: ClockIcon, label: 'Recent', color: 'sky' },
    { path: '/favorites', icon: StarIcon, label: 'Favorites', color: 'yellow' },
    { path: '/trash', icon: TrashIcon, label: 'Trash', color: 'red' },
  ]

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; text: string; hover: string }> = {
      blue: {
        bg: 'bg-blue-50 dark:bg-blue-900/30',
        text: 'text-blue-600 dark:text-blue-400',
        hover: 'hover:bg-blue-100 dark:hover:bg-blue-900/50',
      },
      purple: {
        bg: 'bg-purple-50 dark:bg-purple-900/30',
        text: 'text-purple-600 dark:text-purple-400',
        hover: 'hover:bg-purple-100 dark:hover:bg-purple-900/50',
      },
      amber: {
        bg: 'bg-amber-50 dark:bg-amber-900/30',
        text: 'text-amber-600 dark:text-amber-400',
        hover: 'hover:bg-amber-100 dark:hover:bg-amber-900/50',
      },
      green: {
        bg: 'bg-green-50 dark:bg-green-900/30',
        text: 'text-green-600 dark:text-green-400',
        hover: 'hover:bg-green-100 dark:hover:bg-green-900/50',
      },
      sky: {
        bg: 'bg-sky-50 dark:bg-sky-900/30',
        text: 'text-sky-600 dark:text-sky-400',
        hover: 'hover:bg-sky-100 dark:hover:bg-sky-900/50',
      },
      yellow: {
        bg: 'bg-yellow-50 dark:bg-yellow-900/30',
        text: 'text-yellow-600 dark:text-yellow-400',
        hover: 'hover:bg-yellow-100 dark:hover:bg-yellow-900/50',
      },
      red: {
        bg: 'bg-red-50 dark:bg-red-900/30',
        text: 'text-red-600 dark:text-red-400',
        hover: 'hover:bg-red-100 dark:hover:bg-red-900/50',
      },
    }
    return colors[color] || colors.blue
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* Compact Header */}
      <header className="flex-shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
                <span className="text-sm font-bold text-white">DFC</span>
              </div>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                Digital Filing Cabinet
              </span>
            </div>
            <Link to="/dashboard">
              <Button
                variant="outline"
                size="sm"
                className="inline-flex items-center gap-1.5 text-xs"
              >
                <HomeIcon className="w-3.5 h-3.5" />
                Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content - Centered */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          {/* Error Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            {/* Error Header */}
            <div className="flex items-center gap-4 mb-5">
              {/* Small Illustration */}
              <div className="flex-shrink-0 w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-xl flex items-center justify-center">
                <svg viewBox="0 0 48 48" className="w-10 h-10" fill="none">
                  <rect
                    x="12"
                    y="8"
                    width="24"
                    height="32"
                    rx="3"
                    className="fill-gray-300 dark:fill-gray-600"
                  />
                  <rect
                    x="12"
                    y="8"
                    width="24"
                    height="10"
                    rx="3"
                    className="fill-blue-500 dark:fill-blue-400"
                  />
                  <circle cx="32" cy="14" r="6" className="fill-red-500" />
                  <text
                    x="32"
                    y="17"
                    fontSize="8"
                    fontWeight="bold"
                    className="fill-white"
                    textAnchor="middle"
                  >
                    ?
                  </text>
                </svg>
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded text-xs font-medium">
                    404
                  </span>
                  <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Page Not Found
                  </h1>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  This page doesn't exist or you don't have permission to access it.
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 mb-5">
              <Button
                onClick={() => navigate(-1)}
                variant="outline"
                size="sm"
                className="inline-flex items-center gap-1.5"
              >
                <ArrowLeftIcon className="w-4 h-4" />
                Go Back
              </Button>
              <Link to="/dashboard">
                <Button variant="primary" size="sm" className="inline-flex items-center gap-1.5">
                  <HomeIcon className="w-4 h-4" />
                  Dashboard
                </Button>
              </Link>
            </div>

            {/* Quick Access */}
            <div className="pt-5 border-t border-gray-200 dark:border-gray-700">
              <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                Quick Access
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {quickAccessItems.slice(0, 4).map((item) => {
                  const colors = getColorClasses(item.color)
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg ${colors.bg} ${colors.hover} transition-colors`}
                    >
                      <item.icon className={`w-4 h-4 ${colors.text}`} />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">
                        {item.label}
                      </span>
                    </Link>
                  )
                })}
              </div>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {quickAccessItems.slice(4).map((item) => {
                  const colors = getColorClasses(item.color)
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg ${colors.bg} ${colors.hover} transition-colors`}
                    >
                      <item.icon className={`w-4 h-4 ${colors.text}`} />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">
                        {item.label}
                      </span>
                    </Link>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Help Text */}
          <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-4">
            Need help?{' '}
            <a
              href="mailto:support@digitalfilingcabinet.com"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Contact support
            </a>
          </p>
        </div>
      </main>
    </div>
  )
}
