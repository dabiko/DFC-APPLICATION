import React, { useState, useCallback } from 'react'
import {
  exportToCSV,
  exportToExcel,
  exportToPDF,
  type ExportData,
  type ExportOptions,
  type ChartData,
} from '../../utils/reportExport'

// Types
type ScheduleFrequency = 'daily' | 'weekly' | 'bi_weekly' | 'monthly' | 'quarterly' | 'annually'
type ScheduleStatus = 'active' | 'paused' | 'failed' | 'completed'
type ExportFormat = 'pdf' | 'excel' | 'csv'
type DeliveryMethod = 'email' | 'sftp' | 'sharepoint' | 'dashboard'

interface ScheduleRecipient {
  id: string
  name: string
  email: string
  type: 'user' | 'group' | 'external'
}

interface ScheduleExecution {
  id: string
  executed_at: string
  status: 'success' | 'failed' | 'partial'
  duration_seconds: number
  records_processed: number
  file_size_kb: number
  error_message?: string
}

interface ScheduledReport {
  id: string
  name: string
  description: string
  report_template_id?: string
  report_template_name?: string
  frequency: ScheduleFrequency
  status: ScheduleStatus
  next_run: string
  last_run?: string
  last_run_status?: 'success' | 'failed' | 'partial'
  export_format: ExportFormat
  delivery_method: DeliveryMethod
  recipients: ScheduleRecipient[]
  time_of_day: string
  day_of_week?: number
  day_of_month?: number
  timezone: string
  include_empty: boolean
  notify_on_failure: boolean
  retry_on_failure: boolean
  execution_history: ScheduleExecution[]
  created_by: string
  created_at: string
  updated_at: string
}

// Mock scheduled reports
const mockScheduledReports: ScheduledReport[] = [
  {
    id: '1',
    name: 'Weekly Compliance Summary',
    description: 'Automated weekly compliance status report for leadership',
    report_template_id: 'tmpl-1',
    report_template_name: 'Compliance Health Dashboard',
    frequency: 'weekly',
    status: 'active',
    next_run: '2024-11-04T08:00:00Z',
    last_run: '2024-10-28T08:00:00Z',
    last_run_status: 'success',
    export_format: 'pdf',
    delivery_method: 'email',
    recipients: [
      { id: 'r1', name: 'John Smith', email: 'john.smith@company.com', type: 'user' },
      { id: 'r2', name: 'Leadership Team', email: 'leadership@company.com', type: 'group' },
    ],
    time_of_day: '08:00',
    day_of_week: 1,
    timezone: 'America/New_York',
    include_empty: false,
    notify_on_failure: true,
    retry_on_failure: true,
    execution_history: [
      {
        id: 'e1',
        executed_at: '2024-10-28T08:00:00Z',
        status: 'success',
        duration_seconds: 45,
        records_processed: 1250,
        file_size_kb: 2048,
      },
      {
        id: 'e2',
        executed_at: '2024-10-21T08:00:00Z',
        status: 'success',
        duration_seconds: 42,
        records_processed: 1180,
        file_size_kb: 1920,
      },
      {
        id: 'e3',
        executed_at: '2024-10-14T08:00:00Z',
        status: 'success',
        duration_seconds: 48,
        records_processed: 1310,
        file_size_kb: 2150,
      },
    ],
    created_by: 'Admin User',
    created_at: '2024-09-01T10:00:00Z',
    updated_at: '2024-10-28T08:00:00Z',
  },
  {
    id: '2',
    name: 'Daily Findings Alert',
    description: 'Daily report of new and overdue findings',
    report_template_id: 'tmpl-3',
    report_template_name: 'Finding Remediation Tracker',
    frequency: 'daily',
    status: 'active',
    next_run: '2024-10-29T06:00:00Z',
    last_run: '2024-10-28T06:00:00Z',
    last_run_status: 'success',
    export_format: 'excel',
    delivery_method: 'email',
    recipients: [
      { id: 'r3', name: 'Compliance Team', email: 'compliance@company.com', type: 'group' },
    ],
    time_of_day: '06:00',
    timezone: 'America/New_York',
    include_empty: false,
    notify_on_failure: true,
    retry_on_failure: true,
    execution_history: [
      {
        id: 'e4',
        executed_at: '2024-10-28T06:00:00Z',
        status: 'success',
        duration_seconds: 15,
        records_processed: 45,
        file_size_kb: 128,
      },
      {
        id: 'e5',
        executed_at: '2024-10-27T06:00:00Z',
        status: 'success',
        duration_seconds: 12,
        records_processed: 38,
        file_size_kb: 115,
      },
    ],
    created_by: 'Compliance Officer',
    created_at: '2024-08-15T09:00:00Z',
    updated_at: '2024-10-28T06:00:00Z',
  },
  {
    id: '3',
    name: 'Monthly Board Report',
    description: 'Executive compliance summary for board presentation',
    report_template_id: 'tmpl-8',
    report_template_name: 'Executive Compliance Summary',
    frequency: 'monthly',
    status: 'active',
    next_run: '2024-11-01T07:00:00Z',
    last_run: '2024-10-01T07:00:00Z',
    last_run_status: 'success',
    export_format: 'pdf',
    delivery_method: 'email',
    recipients: [
      { id: 'r4', name: 'Board Members', email: 'board@company.com', type: 'group' },
      { id: 'r5', name: 'CEO', email: 'ceo@company.com', type: 'user' },
    ],
    time_of_day: '07:00',
    day_of_month: 1,
    timezone: 'America/New_York',
    include_empty: false,
    notify_on_failure: true,
    retry_on_failure: true,
    execution_history: [
      {
        id: 'e6',
        executed_at: '2024-10-01T07:00:00Z',
        status: 'success',
        duration_seconds: 120,
        records_processed: 5400,
        file_size_kb: 4096,
      },
    ],
    created_by: 'CFO Office',
    created_at: '2024-06-01T11:00:00Z',
    updated_at: '2024-10-01T07:00:00Z',
  },
  {
    id: '4',
    name: 'Quarterly Risk Assessment',
    description: 'Comprehensive quarterly risk assessment report',
    report_template_id: 'tmpl-4',
    report_template_name: 'Risk Assessment Summary',
    frequency: 'quarterly',
    status: 'active',
    next_run: '2025-01-01T09:00:00Z',
    last_run: '2024-10-01T09:00:00Z',
    last_run_status: 'success',
    export_format: 'pdf',
    delivery_method: 'sharepoint',
    recipients: [
      { id: 'r6', name: 'Risk Committee', email: 'risk.committee@company.com', type: 'group' },
    ],
    time_of_day: '09:00',
    day_of_month: 1,
    timezone: 'America/New_York',
    include_empty: true,
    notify_on_failure: true,
    retry_on_failure: true,
    execution_history: [
      {
        id: 'e7',
        executed_at: '2024-10-01T09:00:00Z',
        status: 'success',
        duration_seconds: 180,
        records_processed: 8500,
        file_size_kb: 8192,
      },
    ],
    created_by: 'Risk Manager',
    created_at: '2024-01-15T14:00:00Z',
    updated_at: '2024-10-01T09:00:00Z',
  },
  {
    id: '5',
    name: 'DSAR Status Report',
    description: 'Weekly DSAR request status and SLA compliance',
    report_template_id: 'tmpl-5',
    report_template_name: 'GDPR Compliance Report',
    frequency: 'weekly',
    status: 'paused',
    next_run: '2024-11-04T10:00:00Z',
    last_run: '2024-10-14T10:00:00Z',
    last_run_status: 'failed',
    export_format: 'excel',
    delivery_method: 'email',
    recipients: [{ id: 'r7', name: 'Privacy Team', email: 'privacy@company.com', type: 'group' }],
    time_of_day: '10:00',
    day_of_week: 1,
    timezone: 'Europe/London',
    include_empty: false,
    notify_on_failure: true,
    retry_on_failure: true,
    execution_history: [
      {
        id: 'e8',
        executed_at: '2024-10-14T10:00:00Z',
        status: 'failed',
        duration_seconds: 5,
        records_processed: 0,
        file_size_kb: 0,
        error_message: 'Data source connection timeout',
      },
    ],
    created_by: 'DPO',
    created_at: '2024-05-01T08:00:00Z',
    updated_at: '2024-10-14T10:00:00Z',
  },
]

// Helper functions
const getStatusColor = (status: ScheduleStatus): string => {
  const colors: Record<ScheduleStatus, string> = {
    active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    paused: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    completed: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  }
  return colors[status]
}

const getFrequencyLabel = (frequency: ScheduleFrequency): string => {
  const labels: Record<ScheduleFrequency, string> = {
    daily: 'Daily',
    weekly: 'Weekly',
    bi_weekly: 'Bi-Weekly',
    monthly: 'Monthly',
    quarterly: 'Quarterly',
    annually: 'Annually',
  }
  return labels[frequency]
}

const getDeliveryIcon = (method: DeliveryMethod): React.ReactNode => {
  switch (method) {
    case 'email':
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
      )
    case 'sftp':
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
          />
        </svg>
      )
    case 'sharepoint':
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          />
        </svg>
      )
    case 'dashboard':
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      )
  }
}

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const formatDateTime = (dateString: string): string => {
  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const getRelativeTime = (dateString: string): string => {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = date.getTime() - now.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Tomorrow'
  if (diffDays > 1 && diffDays <= 7) return `In ${diffDays} days`
  if (diffDays > 7) return formatDate(dateString)
  if (diffDays === -1) return 'Yesterday'
  return `${Math.abs(diffDays)} days ago`
}

// Schedule Card Component
const ScheduleCard: React.FC<{
  schedule: ScheduledReport
  onEdit: () => void
  onToggle: () => void
  onRunNow: () => void
  onViewHistory: () => void
  onDelete: () => void
}> = ({ schedule, onEdit, onToggle, onRunNow, onViewHistory, onDelete }) => {
  const successRate =
    schedule.execution_history.length > 0
      ? Math.round(
          (schedule.execution_history.filter((e) => e.status === 'success').length /
            schedule.execution_history.length) *
            100
        )
      : 0

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(schedule.status)}`}
            >
              {schedule.status.charAt(0).toUpperCase() + schedule.status.slice(1)}
            </span>
            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
              {getFrequencyLabel(schedule.frequency)}
            </span>
          </div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">{schedule.name}</h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onToggle}
            className={`p-2 rounded-lg transition-colors ${
              schedule.status === 'active'
                ? 'text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20'
                : 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
            }`}
            title={schedule.status === 'active' ? 'Pause Schedule' : 'Resume Schedule'}
          >
            {schedule.status === 'active' ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            )}
          </button>
          <button
            onClick={onEdit}
            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
            title="Edit Schedule"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
          </button>
        </div>
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-1">
        {schedule.description}
      </p>

      {schedule.report_template_name && (
        <div className="mb-3 text-sm">
          <span className="text-gray-500 dark:text-gray-400">Template: </span>
          <span className="text-gray-900 dark:text-white">{schedule.report_template_name}</span>
        </div>
      )}

      {/* Schedule Info */}
      <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
        <div>
          <p className="text-gray-500 dark:text-gray-400 text-xs">Next Run</p>
          <p className="font-medium text-gray-900 dark:text-white">
            {getRelativeTime(schedule.next_run)}
          </p>
        </div>
        <div>
          <p className="text-gray-500 dark:text-gray-400 text-xs">Last Run</p>
          <p className="font-medium text-gray-900 dark:text-white">
            {schedule.last_run ? getRelativeTime(schedule.last_run) : 'Never'}
          </p>
        </div>
      </div>

      {/* Delivery Info */}
      <div className="flex items-center gap-4 mb-4 text-sm">
        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
          {getDeliveryIcon(schedule.delivery_method)}
          <span className="capitalize">{schedule.delivery_method}</span>
        </div>
        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          <span>{schedule.recipients.length} recipients</span>
        </div>
      </div>

      {/* Success Rate */}
      {schedule.execution_history.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-gray-500 dark:text-gray-400">Success Rate</span>
            <span
              className={`font-medium ${successRate >= 90 ? 'text-green-600' : successRate >= 70 ? 'text-yellow-600' : 'text-red-600'}`}
            >
              {successRate}%
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full ${successRate >= 90 ? 'bg-green-500' : successRate >= 70 ? 'bg-yellow-500' : 'bg-red-500'}`}
              style={{ width: `${successRate}%` }}
            />
          </div>
        </div>
      )}

      {/* Last Run Status Alert */}
      {schedule.last_run_status === 'failed' && (
        <div className="mb-4 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg text-sm text-red-700 dark:text-red-400 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          Last execution failed
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={onRunNow}
          className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          Run Now
        </button>
        <button
          onClick={onViewHistory}
          className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          History
        </button>
        <button
          onClick={onDelete}
          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      </div>
    </div>
  )
}

// History Modal
const HistoryModal: React.FC<{
  schedule: ScheduledReport
  onClose: () => void
}> = ({ schedule, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
        <div
          className="fixed inset-0 bg-gray-500 dark:bg-gray-900 bg-opacity-75 dark:bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        <div className="relative inline-block w-full max-w-2xl bg-white dark:bg-gray-800 rounded-xl text-left overflow-hidden shadow-xl transform transition-all my-8">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Execution History
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">{schedule.name}</p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>

          <div className="px-6 py-5 max-h-[60vh] overflow-y-auto">
            {schedule.execution_history.length > 0 ? (
              <div className="space-y-3">
                {schedule.execution_history.map((execution) => (
                  <div
                    key={execution.id}
                    className={`p-4 rounded-lg border ${
                      execution.status === 'success'
                        ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800'
                        : execution.status === 'failed'
                          ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800'
                          : 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                          execution.status === 'success'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : execution.status === 'failed'
                              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                              : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                        }`}
                      >
                        {execution.status.charAt(0).toUpperCase() + execution.status.slice(1)}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {formatDateTime(execution.executed_at)}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500 dark:text-gray-400 text-xs">Duration</p>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {execution.duration_seconds}s
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 dark:text-gray-400 text-xs">Records</p>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {execution.records_processed.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 dark:text-gray-400 text-xs">File Size</p>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {(execution.file_size_kb / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    {execution.error_message && (
                      <div className="mt-2 p-2 bg-red-100 dark:bg-red-900/20 rounded text-sm text-red-700 dark:text-red-400">
                        {execution.error_message}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <svg
                  className="w-12 h-12 mx-auto text-gray-400 mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-gray-500 dark:text-gray-400">No execution history available</p>
              </div>
            )}
          </div>

          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Schedule Form Modal
const ScheduleFormModal: React.FC<{
  schedule?: ScheduledReport
  onClose: () => void
  onSave: (data: Partial<ScheduledReport>) => void
}> = ({ schedule, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: schedule?.name || '',
    description: schedule?.description || '',
    frequency: schedule?.frequency || ('weekly' as ScheduleFrequency),
    time_of_day: schedule?.time_of_day || '08:00',
    day_of_week: schedule?.day_of_week || 1,
    day_of_month: schedule?.day_of_month || 1,
    export_format: schedule?.export_format || ('pdf' as ExportFormat),
    delivery_method: schedule?.delivery_method || ('email' as DeliveryMethod),
    recipient_emails: schedule?.recipients.map((r) => r.email).join(', ') || '',
    notify_on_failure: schedule?.notify_on_failure ?? true,
    retry_on_failure: schedule?.retry_on_failure ?? true,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData as unknown as Partial<ScheduledReport>)
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
        <div
          className="fixed inset-0 bg-gray-500 dark:bg-gray-900 bg-opacity-75 dark:bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        <div className="relative inline-block w-full max-w-xl bg-white dark:bg-gray-800 rounded-xl text-left overflow-hidden shadow-xl transform transition-all my-8">
          <form onSubmit={handleSubmit}>
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {schedule ? 'Edit Schedule' : 'Create New Schedule'}
              </h2>
            </div>

            <div className="px-6 py-5 max-h-[60vh] overflow-y-auto space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Schedule Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Frequency *
                  </label>
                  <select
                    value={formData.frequency}
                    onChange={(e) =>
                      setFormData({ ...formData, frequency: e.target.value as ScheduleFrequency })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="bi_weekly">Bi-Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="annually">Annually</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Time of Day *
                  </label>
                  <input
                    type="time"
                    value={formData.time_of_day}
                    onChange={(e) => setFormData({ ...formData, time_of_day: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {formData.frequency === 'weekly' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Day of Week
                  </label>
                  <select
                    value={formData.day_of_week}
                    onChange={(e) =>
                      setFormData({ ...formData, day_of_week: parseInt(e.target.value) })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value={0}>Sunday</option>
                    <option value={1}>Monday</option>
                    <option value={2}>Tuesday</option>
                    <option value={3}>Wednesday</option>
                    <option value={4}>Thursday</option>
                    <option value={5}>Friday</option>
                    <option value={6}>Saturday</option>
                  </select>
                </div>
              )}

              {(formData.frequency === 'monthly' || formData.frequency === 'quarterly') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Day of Month
                  </label>
                  <input
                    type="number"
                    value={formData.day_of_month}
                    onChange={(e) =>
                      setFormData({ ...formData, day_of_month: parseInt(e.target.value) })
                    }
                    min={1}
                    max={28}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Export Format
                  </label>
                  <select
                    value={formData.export_format}
                    onChange={(e) =>
                      setFormData({ ...formData, export_format: e.target.value as ExportFormat })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="pdf">PDF</option>
                    <option value="excel">Excel</option>
                    <option value="csv">CSV</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Delivery Method
                  </label>
                  <select
                    value={formData.delivery_method}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        delivery_method: e.target.value as DeliveryMethod,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="email">Email</option>
                    <option value="sftp">SFTP</option>
                    <option value="sharepoint">SharePoint</option>
                    <option value="dashboard">Dashboard Only</option>
                  </select>
                </div>
              </div>

              {formData.delivery_method === 'email' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Recipients (comma-separated emails)
                  </label>
                  <input
                    type="text"
                    value={formData.recipient_emails}
                    onChange={(e) => setFormData({ ...formData, recipient_emails: e.target.value })}
                    placeholder="email1@example.com, email2@example.com"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              )}

              <div className="space-y-3 pt-2">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={formData.notify_on_failure}
                    onChange={(e) =>
                      setFormData({ ...formData, notify_on_failure: e.target.checked })
                    }
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Notify on failure
                  </span>
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={formData.retry_on_failure}
                    onChange={(e) =>
                      setFormData({ ...formData, retry_on_failure: e.target.checked })
                    }
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Retry on failure</span>
                </label>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {schedule ? 'Save Changes' : 'Create Schedule'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// Main Component
const ScheduledReportsTab: React.FC = () => {
  const [schedules, setSchedules] = useState<ScheduledReport[]>(mockScheduledReports)
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduledReport | null>(null)
  const [showFormModal, setShowFormModal] = useState(false)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<ScheduledReport | undefined>(undefined)
  const [statusFilter, setStatusFilter] = useState<ScheduleStatus | 'all'>('all')

  const filteredSchedules = schedules.filter(
    (schedule) => statusFilter === 'all' || schedule.status === statusFilter
  )

  // Stats
  const stats = {
    total: schedules.length,
    active: schedules.filter((s) => s.status === 'active').length,
    paused: schedules.filter((s) => s.status === 'paused').length,
    failed: schedules.filter((s) => s.last_run_status === 'failed').length,
  }

  const handleCreateSchedule = () => {
    setEditingSchedule(undefined)
    setShowFormModal(true)
  }

  const handleEditSchedule = (schedule: ScheduledReport) => {
    setEditingSchedule(schedule)
    setShowFormModal(true)
  }

  const handleToggleSchedule = (schedule: ScheduledReport) => {
    setSchedules(
      schedules.map((s) =>
        s.id === schedule.id
          ? {
              ...s,
              status:
                s.status === 'active' ? ('paused' as ScheduleStatus) : ('active' as ScheduleStatus),
            }
          : s
      )
    )
  }

  const handleRunNow = useCallback((schedule: ScheduledReport) => {
    // Generate mock data for the report
    const generateMockData = () => {
      const mockRows: Array<Record<string, unknown>> = []
      for (let i = 1; i <= 50; i++) {
        mockRows.push({
          id: `REC-${i.toString().padStart(4, '0')}`,
          name: `Record ${i}`,
          status: ['Compliant', 'Non-Compliant', 'In Progress', 'Pending'][
            Math.floor(Math.random() * 4)
          ],
          score: Math.floor(Math.random() * 100),
          date: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0],
          department: ['IT', 'Finance', 'HR', 'Operations', 'Legal'][Math.floor(Math.random() * 5)],
        })
      }
      return mockRows
    }

    const exportData: ExportData = {
      columns: [
        { field: 'id', label: 'ID' },
        { field: 'name', label: 'Name' },
        { field: 'status', label: 'Status' },
        { field: 'score', label: 'Score', align: 'right' as const },
        { field: 'date', label: 'Date' },
        { field: 'department', label: 'Department' },
      ],
      rows: generateMockData(),
      title: schedule.name,
      subtitle: schedule.description,
      generatedAt: new Date().toISOString(),
      summary: {
        'Total Records': 50,
        'Schedule Frequency': getFrequencyLabel(schedule.frequency),
        'Export Format': schedule.export_format.toUpperCase(),
        'Delivery Method': getDeliveryMethodLabel(schedule.delivery_method),
      },
    }

    const exportOptions: ExportOptions = {
      filename: `${schedule.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}`,
      title: schedule.name,
      subtitle: schedule.description,
      author: 'DFC Compliance Center',
      includeTimestamp: true,
      includeSummary: true,
      orientation: 'landscape',
      pageSize: 'A4',
    }

    // Generate chart data for PDF
    const chartData: ChartData[] = [
      {
        type: 'bar' as const,
        title: 'Compliance Status Distribution',
        data: [
          { label: 'Compliant', value: Math.floor(Math.random() * 30) + 20, color: '#22c55e' },
          { label: 'Non-Compliant', value: Math.floor(Math.random() * 10) + 5, color: '#ef4444' },
          { label: 'In Progress', value: Math.floor(Math.random() * 10) + 5, color: '#f59e0b' },
          { label: 'Pending', value: Math.floor(Math.random() * 5) + 2, color: '#6b7280' },
        ],
      },
    ]

    switch (schedule.export_format) {
      case 'csv':
        exportToCSV(exportData, exportOptions)
        break
      case 'excel':
        exportToExcel(exportData, exportOptions)
        break
      case 'pdf':
        exportToPDF(exportData, exportOptions, chartData)
        break
    }

    // Update UI to show report is running
    setScheduledReports((prev) =>
      prev.map((s) =>
        s.id === schedule.id
          ? {
              ...s,
              last_run: new Date().toISOString(),
              last_run_status: 'success' as const,
              execution_history: [
                {
                  id: `e-${Date.now()}`,
                  executed_at: new Date().toISOString(),
                  status: 'success' as const,
                  duration_seconds: Math.floor(Math.random() * 30) + 10,
                  records_processed: 50,
                  file_size_kb: Math.floor(Math.random() * 500) + 100,
                },
                ...s.execution_history.slice(0, 9),
              ],
            }
          : s
      )
    )
  }, [])

  const handleViewHistory = (schedule: ScheduledReport) => {
    setSelectedSchedule(schedule)
    setShowHistoryModal(true)
  }

  const handleDeleteSchedule = (schedule: ScheduledReport) => {
    if (confirm('Are you sure you want to delete this schedule?')) {
      setSchedules(schedules.filter((s) => s.id !== schedule.id))
    }
  }

  const handleSaveSchedule = (data: Partial<ScheduledReport>) => {
    if (editingSchedule) {
      setSchedules(
        schedules.map((s) =>
          s.id === editingSchedule.id ? { ...s, ...data, updated_at: new Date().toISOString() } : s
        )
      )
    } else {
      const newSchedule: ScheduledReport = {
        id: `schedule-${Date.now()}`,
        name: data.name || 'New Schedule',
        description: data.description || '',
        frequency: data.frequency || 'weekly',
        status: 'active',
        next_run: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        export_format: data.export_format || 'pdf',
        delivery_method: data.delivery_method || 'email',
        recipients: [],
        time_of_day: data.time_of_day || '08:00',
        timezone: 'America/New_York',
        include_empty: false,
        notify_on_failure: data.notify_on_failure ?? true,
        retry_on_failure: data.retry_on_failure ?? true,
        execution_history: [],
        created_by: 'Current User',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      setSchedules([newSchedule, ...schedules])
    }
    setShowFormModal(false)
    setEditingSchedule(undefined)
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Schedules</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.active}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Active</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.paused}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Paused</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.failed}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Failed (Last Run)</p>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {(['all', 'active', 'paused', 'failed'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status === 'failed' ? 'all' : status)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                statusFilter === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'
              }`}
            >
              {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
        <button
          onClick={handleCreateSchedule}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Schedule
        </button>
      </div>

      {/* Schedules Grid */}
      {filteredSchedules.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSchedules.map((schedule) => (
            <ScheduleCard
              key={schedule.id}
              schedule={schedule}
              onEdit={() => handleEditSchedule(schedule)}
              onToggle={() => handleToggleSchedule(schedule)}
              onRunNow={() => handleRunNow(schedule)}
              onViewHistory={() => handleViewHistory(schedule)}
              onDelete={() => handleDeleteSchedule(schedule)}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <svg
            className="w-16 h-16 mx-auto text-gray-400 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No scheduled reports
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Create your first scheduled report to automate reporting
          </p>
          <button
            onClick={handleCreateSchedule}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create Schedule
          </button>
        </div>
      )}

      {/* Form Modal */}
      {showFormModal && (
        <ScheduleFormModal
          schedule={editingSchedule}
          onClose={() => {
            setShowFormModal(false)
            setEditingSchedule(undefined)
          }}
          onSave={handleSaveSchedule}
        />
      )}

      {/* History Modal */}
      {showHistoryModal && selectedSchedule && (
        <HistoryModal
          schedule={selectedSchedule}
          onClose={() => {
            setShowHistoryModal(false)
            setSelectedSchedule(null)
          }}
        />
      )}
    </div>
  )
}

export default ScheduledReportsTab
