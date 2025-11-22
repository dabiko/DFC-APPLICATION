/**
 * Protected 404 Page
 * Shown to authenticated users when they access a non-existent route
 * Includes dashboard navigation and user-specific options
 */

import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@components/Button/Button'
import {
  HomeIcon,
  ArrowLeftIcon,
  FolderIcon,
  DocumentIcon,
  Cog6ToothIcon,
  QuestionMarkCircleIcon,
} from '@heroicons/react/24/outline'

export function DashboardNotFound() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header with DFC Branding */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg">
                <span className="text-lg font-bold text-white">DFC</span>
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Digital Filing Cabinet
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Enterprise Document Management
                </p>
              </div>
            </div>
            <Link to="/dashboard">
              <Button variant="outline" size="sm" className="inline-flex items-center gap-2">
                <HomeIcon className="w-4 h-4" />
                Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          {/* 404 Illustration */}
          <div className="mb-8 flex justify-center">
            <div className="relative">
              <svg
                viewBox="0 0 300 200"
                className="w-full max-w-md h-auto"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Background circles */}
                <circle cx="150" cy="100" r="80" className="fill-blue-50 dark:fill-blue-900/20" />
                <circle
                  cx="50"
                  cy="50"
                  r="20"
                  className="fill-purple-100 dark:fill-purple-900/20"
                />
                <circle
                  cx="250"
                  cy="150"
                  r="25"
                  className="fill-indigo-100 dark:fill-indigo-900/20"
                />

                {/* File cabinet */}
                <rect
                  x="100"
                  y="60"
                  width="100"
                  height="120"
                  rx="8"
                  className="fill-gray-300 dark:fill-gray-700"
                />
                <rect
                  x="100"
                  y="60"
                  width="100"
                  height="40"
                  rx="8"
                  className="fill-blue-600 dark:fill-blue-500"
                />
                <rect
                  x="100"
                  y="100"
                  width="100"
                  height="40"
                  className="fill-gray-400 dark:fill-gray-600"
                />
                <rect
                  x="100"
                  y="140"
                  width="100"
                  height="40"
                  className="fill-gray-400 dark:fill-gray-600"
                />

                {/* Drawer handles */}
                <rect
                  x="140"
                  y="75"
                  width="20"
                  height="4"
                  rx="2"
                  className="fill-white dark:fill-gray-900"
                />
                <rect
                  x="140"
                  y="115"
                  width="20"
                  height="4"
                  rx="2"
                  className="fill-gray-600 dark:fill-gray-400"
                />
                <rect
                  x="140"
                  y="155"
                  width="20"
                  height="4"
                  rx="2"
                  className="fill-gray-600 dark:fill-gray-400"
                />

                {/* Question mark badge */}
                <circle cx="180" cy="70" r="20" className="fill-red-500" />
                <text
                  x="180"
                  y="80"
                  fontSize="28"
                  fontWeight="bold"
                  className="fill-white"
                  textAnchor="middle"
                >
                  ?
                </text>
              </svg>
            </div>
          </div>

          {/* Error Message */}
          <div className="mb-12 bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 border border-gray-200 dark:border-gray-700">
            <div className="mb-6">
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400 rounded-full text-sm font-medium mb-4">
                Error 404
              </span>
              <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                Page Not Found
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-400 mb-2">
                The page you're looking for doesn't exist or has been moved.
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                You might not have permission to access this resource, or it may have been deleted.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Button
                onClick={() => navigate(-1)}
                variant="outline"
                size="lg"
                className="inline-flex items-center gap-2"
              >
                <ArrowLeftIcon className="w-5 h-5" />
                Go Back
              </Button>
              <Link to="/dashboard">
                <Button
                  variant="primary"
                  size="lg"
                  className="inline-flex items-center gap-2 w-full sm:w-auto"
                >
                  <HomeIcon className="w-5 h-5" />
                  Go to Dashboard
                </Button>
              </Link>
            </div>

            {/* Quick Access Links */}
            <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
                Quick Access
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Dashboard */}
                <Link
                  to="/dashboard"
                  className="flex flex-col items-center gap-2 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-600"
                >
                  <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                    <HomeIcon className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    Dashboard
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Overview & stats</span>
                </Link>

                {/* Documents */}
                <Link
                  to="/dashboard/documents"
                  className="flex flex-col items-center gap-2 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-600"
                >
                  <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center">
                    <DocumentIcon className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    Documents
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Your files</span>
                </Link>

                {/* Folders */}
                <Link
                  to="/dashboard/folders"
                  className="flex flex-col items-center gap-2 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-600"
                >
                  <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center">
                    <FolderIcon className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">Folders</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Organization</span>
                </Link>

                {/* Settings */}
                <Link
                  to="/dashboard/settings"
                  className="flex flex-col items-center gap-2 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-600"
                >
                  <div className="w-12 h-12 bg-gray-600 rounded-lg flex items-center justify-center">
                    <Cog6ToothIcon className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    Settings
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Preferences</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Help Section */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <QuestionMarkCircleIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Need Help?
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  If you believe this is an error or you need access to this page, please contact
                  your system administrator or our support team.
                </p>
                <div className="flex flex-wrap gap-4">
                  <a
                    href="mailto:support@digitalfilingcabinet.com"
                    className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    support@digitalfilingcabinet.com
                  </a>
                  <Link
                    to="/dashboard/help"
                    className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    View Help Center
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-700 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            © {new Date().getFullYear()} Digital Filing Cabinet. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
