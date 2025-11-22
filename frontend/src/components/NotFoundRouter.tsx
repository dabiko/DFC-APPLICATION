/**
 * Smart 404 Router
 * Determines which 404 page to show based on authentication status
 */

import { NotFound } from '@pages/NotFound'
import { DashboardNotFound } from '@pages/DashboardNotFound'
import { authService } from '@/services/auth.service'

export function NotFoundRouter() {
  // Check if user is authenticated
  const isAuthenticated = authService.isAuthenticated()

  // Show appropriate 404 page based on auth status
  return isAuthenticated ? <DashboardNotFound /> : <NotFound />
}
