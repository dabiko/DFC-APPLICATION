/**
 * AssignmentStatusBadge — Color-coded status badge for assignments.
 */

import { Clock, PlayCircle, CheckCircle, XCircle, AlertCircle, Shield } from 'lucide-react'
import { cn } from '@/utils/cn'

const STATUS_CONFIG: Record<
  string,
  { icon: React.FC<{ className?: string }>; color: string; label: string }
> = {
  assigned: { icon: Clock, label: 'Assigned', color: 'text-gray-500 bg-gray-100 dark:bg-gray-700' },
  in_progress: {
    icon: PlayCircle,
    label: 'In Progress',
    color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30',
  },
  completed: {
    icon: CheckCircle,
    label: 'Completed',
    color: 'text-green-600 bg-green-100 dark:bg-green-900/30',
  },
  failed: { icon: XCircle, label: 'Failed', color: 'text-red-600 bg-red-100 dark:bg-red-900/30' },
  overdue: {
    icon: AlertCircle,
    label: 'Overdue',
    color: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30',
  },
  waived: {
    icon: Shield,
    label: 'Waived',
    color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30',
  },
}

interface AssignmentStatusBadgeProps {
  status: string
}

export function AssignmentStatusBadge({ status }: AssignmentStatusBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.assigned
  const Icon = config.icon

  return (
    <span
      className={cn('flex items-center gap-1 rounded-full px-2 py-0.5 text-xs w-fit', config.color)}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  )
}
