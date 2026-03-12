/**
 * TrainingPlayerPage — Step-by-step training delivery player.
 *
 * Route: /training/:attemptId
 * Delegates to TrainingPlayer component for all training logic.
 */

import { useParams, useSearchParams } from 'react-router-dom'
import { useLogout } from '@/hooks/useLogout'
import { ThreePanelLayout } from '@/components/Layout/ThreePanelLayout'
import { DashboardHeader } from '@/components/Dashboard/DashboardHeader'
import { DashboardSidebar } from '@/components/Dashboard/DashboardSidebar'
import { TrainingPlayer } from '@/components/training'
import { authService } from '@/services/auth.service'

export function TrainingPlayerPage() {
  const { attemptId } = useParams<{ attemptId: string }>()
  const [searchParams] = useSearchParams()
  const reviewMode = searchParams.get('review') === 'true'
  const handleLogout = useLogout()

  const userData = authService.getUser()
  const user = {
    firstName: userData?.first_name || 'User',
    lastName: userData?.last_name || '',
    email: userData?.email || '',
    is_staff: userData?.is_staff || false,
    is_superuser: userData?.is_superuser || false,
  }

  return (
    <ThreePanelLayout
      header={<DashboardHeader user={user} notifications={[]} onLogout={handleLogout} />}
      leftPanel={<DashboardSidebar />}
      leftPanelWidth="auto"
      collapsibleLeft={false}
      centerPanel={
        attemptId ? <TrainingPlayer attemptId={attemptId} reviewMode={reviewMode} /> : null
      }
    />
  )
}

export default TrainingPlayerPage
