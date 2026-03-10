/**
 * ComplianceReportCard — Summary compliance metrics card.
 */

import { ShieldCheck, Users, TrendingUp, AlertTriangle } from 'lucide-react'
import type { EvidenceRecord } from '@/services/evidenceService'
import { cn } from '@/utils/cn'

interface ComplianceReportCardProps {
  evidence: EvidenceRecord[]
}

export function ComplianceReportCard({ evidence }: ComplianceReportCardProps) {
  const total = evidence.length
  const completed = evidence.filter((e) => e.assignment.status === 'completed').length
  const failed = evidence.filter((e) => e.assignment.status === 'failed').length
  const complianceRate = total > 0 ? (completed / total) * 100 : 0

  const totalAttempts = evidence.reduce((sum, e) => sum + e.attempts.length, 0)
  const avgAttempts = total > 0 ? totalAttempts / total : 0

  const metrics = [
    {
      icon: ShieldCheck,
      label: 'Compliance Rate',
      value: `${complianceRate.toFixed(1)}%`,
      color:
        complianceRate >= 80
          ? 'text-green-600'
          : complianceRate >= 50
            ? 'text-yellow-600'
            : 'text-red-600',
    },
    {
      icon: Users,
      label: 'Total Records',
      value: total.toString(),
      color: 'text-blue-600',
    },
    {
      icon: TrendingUp,
      label: 'Avg. Attempts',
      value: avgAttempts.toFixed(1),
      color: 'text-indigo-600',
    },
    {
      icon: AlertTriangle,
      label: 'Failed',
      value: failed.toString(),
      color: failed > 0 ? 'text-red-600' : 'text-gray-500',
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {metrics.map((m) => (
        <div
          key={m.label}
          className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800"
        >
          <div className="flex items-center gap-2 mb-1">
            <m.icon className={cn('h-4 w-4', m.color)} />
            <span className="text-xs text-gray-500 dark:text-gray-400">{m.label}</span>
          </div>
          <p className={cn('text-xl font-bold', m.color)}>{m.value}</p>
        </div>
      ))}
    </div>
  )
}
