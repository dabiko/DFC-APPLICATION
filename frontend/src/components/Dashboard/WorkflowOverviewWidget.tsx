/**
 * WorkflowOverviewWidget Component
 *
 * Displays workflow status distribution as a donut chart
 * and a mini task inbox with the user's pending tasks.
 */

import { useNavigate } from 'react-router-dom'
import { Clock, AlertTriangle, ArrowRight, CheckCircle2, XCircle } from 'lucide-react'
import { DonutChart } from './DonutChart'
import { cn } from '@utils/cn'
import type { DashboardData } from '@/services/dashboardService'

interface WorkflowOverviewWidgetProps {
  data: DashboardData
}

export function WorkflowOverviewWidget({ data }: WorkflowOverviewWidgetProps) {
  const navigate = useNavigate()
  const stats = data.workflowStats
  const tasks = data.pendingTasks
  const taskStats = data.taskStats

  // Build donut chart data from workflow stats
  const totalActive = stats?.total_active ?? 0
  const completedWeek = stats?.completed_this_week ?? 0
  const overdue = stats?.overdue ?? 0
  const pendingAction = stats?.pending_my_action ?? 0

  const donutData = [
    { name: 'Active', value: Math.max(totalActive - overdue, 0), color: '#3b82f6' },
    { name: 'Pending My Action', value: pendingAction, color: '#f59e0b' },
    { name: 'Overdue', value: overdue, color: '#ef4444' },
    { name: 'Completed (Week)', value: completedWeek, color: '#22c55e' },
  ].filter((d) => d.value > 0)

  const totalWorkflows = donutData.reduce((s, d) => s + d.value, 0)

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Workflow Overview
        </h3>
        <button
          onClick={() => navigate('/workflows')}
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
        >
          View All <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Donut Chart */}
        <div>
          <DonutChart
            data={donutData}
            centerValue={totalWorkflows}
            centerLabel="Total"
            height={180}
          />
          {/* Legend */}
          <div className="mt-3 grid grid-cols-2 gap-1.5">
            {donutData.map((item) => (
              <div key={item.name} className="flex items-center gap-1.5">
                <div
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-xs text-gray-600 dark:text-gray-400 truncate">
                  {item.name}
                </span>
                <span className="text-xs font-semibold text-gray-900 dark:text-gray-100 ml-auto">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Pending Tasks Mini Inbox */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              My Pending Tasks
            </h4>
            {(taskStats?.unread ?? 0) > 0 && (
              <span className="px-1.5 py-0.5 text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-full">
                {taskStats?.unread}
              </span>
            )}
          </div>

          {tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CheckCircle2 className="w-8 h-8 text-green-400 dark:text-green-500 mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400">All caught up!</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">No pending tasks</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tasks.map((task) => (
                <button
                  key={task.id}
                  onClick={() => navigate(`/workflows?tab=tasks`)}
                  className="w-full text-left p-2.5 rounded-lg border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group"
                >
                  <div className="flex items-start gap-2">
                    {task.is_overdue ? (
                      <AlertTriangle className="w-3.5 h-3.5 text-red-500 mt-0.5 flex-shrink-0" />
                    ) : task.status === 'REJECTED' ? (
                      <XCircle className="w-3.5 h-3.5 text-red-400 mt-0.5 flex-shrink-0" />
                    ) : (
                      <Clock className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">
                        {task.step_name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {task.workflow_name} — {task.target_title}
                      </p>
                    </div>
                    <span
                      className={cn(
                        'text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0',
                        task.priority === 'URGENT'
                          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          : task.priority === 'HIGH'
                            ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                      )}
                    >
                      {task.priority}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
