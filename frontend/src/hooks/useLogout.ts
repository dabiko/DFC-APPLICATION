import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService } from '@/services/auth.service'

/**
 * Provides a handleLogout callback that clears tokens and navigates to /login.
 */
export function useLogout() {
  const navigate = useNavigate()

  const handleLogout = useCallback(async () => {
    try {
      const refreshToken = authService.getRefreshToken()
      if (refreshToken) {
        await authService.logout(refreshToken)
      }
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      authService.clearTokens()
      navigate('/login')
    }
  }, [navigate])

  return handleLogout
}
