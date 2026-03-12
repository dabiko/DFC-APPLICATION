/**
 * QuizTakingPage — Quiz-taking interface during training.
 *
 * Route: /training/:attemptId/quiz/:quizId
 * Delegates to QuizPlayer component for all quiz logic.
 */

import { useParams } from 'react-router-dom'
import { useLogout } from '@/hooks/useLogout'
import { ThreePanelLayout } from '@/components/Layout/ThreePanelLayout'
import { DashboardHeader } from '@/components/Dashboard/DashboardHeader'
import { DashboardSidebar } from '@/components/Dashboard/DashboardSidebar'
import { QuizPlayer } from '@/components/training'
import { authService } from '@/services/auth.service'

export function QuizTakingPage() {
  const { attemptId, quizId } = useParams<{ attemptId: string; quizId: string }>()
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
        attemptId && quizId ? <QuizPlayer attemptId={attemptId} quizId={quizId} /> : null
      }
    />
  )
}

export default QuizTakingPage
