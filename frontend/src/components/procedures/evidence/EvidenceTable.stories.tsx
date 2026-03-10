import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { EvidenceTable } from './EvidenceTable'
import type { EvidenceRecord } from '@/services/evidenceService'

const meta: Meta<typeof EvidenceTable> = {
  title: 'Evidence/EvidenceTable',
  component: EvidenceTable,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof EvidenceTable>

const sampleEvidence: EvidenceRecord[] = [
  {
    id: 'ev-1',
    assignment: {
      id: 'a1',
      procedure_title: 'KYC Customer Onboarding',
      version_number: 2,
      assigned_to_name: 'Alice Johnson',
      assigned_by_name: 'Bob Smith',
      status: 'completed',
      due_date: '2026-04-01T00:00:00Z',
      created_at: '2026-03-01T10:00:00Z',
      completed_at: '2026-03-15T14:30:00Z',
    },
    attempts: [
      {
        id: 'att-1',
        status: 'passed',
        score: 90,
        started_at: '2026-03-10T09:00:00Z',
        completed_at: '2026-03-10T10:30:00Z',
        step_completions: [
          {
            step_title: 'Verify Identity',
            status: 'completed',
            started_at: '2026-03-10T09:00:00Z',
            completed_at: '2026-03-10T09:15:00Z',
          },
          {
            step_title: 'Document Review',
            status: 'completed',
            started_at: '2026-03-10T09:15:00Z',
            completed_at: '2026-03-10T09:45:00Z',
          },
        ],
        quiz_attempts: [
          {
            quiz_title: 'KYC Knowledge Check',
            score: 90,
            passed: true,
            started_at: '2026-03-10T09:45:00Z',
            completed_at: '2026-03-10T10:00:00Z',
          },
        ],
      },
    ],
  },
  {
    id: 'ev-2',
    assignment: {
      id: 'a2',
      procedure_title: 'AML Compliance Training',
      version_number: 1,
      assigned_to_name: 'Carol White',
      assigned_by_name: 'Bob Smith',
      status: 'failed',
      due_date: '2026-03-20T00:00:00Z',
      created_at: '2026-02-15T10:00:00Z',
      completed_at: null,
    },
    attempts: [
      {
        id: 'att-2',
        status: 'failed',
        score: 45,
        started_at: '2026-03-05T09:00:00Z',
        completed_at: '2026-03-05T10:00:00Z',
        step_completions: [
          {
            step_title: 'AML Overview',
            status: 'completed',
            started_at: '2026-03-05T09:00:00Z',
            completed_at: '2026-03-05T09:20:00Z',
          },
        ],
        quiz_attempts: [
          {
            quiz_title: 'AML Assessment',
            score: 45,
            passed: false,
            started_at: '2026-03-05T09:30:00Z',
            completed_at: '2026-03-05T09:50:00Z',
          },
        ],
      },
    ],
  },
]

/**
 * With sample data
 */
export const WithData: Story = {
  render: () => {
    const [expandedId, setExpandedId] = useState<string | null>(null)
    return (
      <EvidenceTable
        evidence={sampleEvidence}
        loading={false}
        error={null}
        expandedId={expandedId}
        onToggleExpand={setExpandedId}
        onViewDetail={(r) => console.log('view detail', r.id)}
      />
    )
  },
}

/**
 * Loading state
 */
export const Loading: Story = {
  args: {
    evidence: [],
    loading: true,
    error: null,
    expandedId: null,
    onToggleExpand: () => {},
  },
}

/**
 * Error state
 */
export const Error: Story = {
  args: {
    evidence: [],
    loading: false,
    error: 'Failed to load evidence records. Please try again.',
    expandedId: null,
    onToggleExpand: () => {},
  },
}

/**
 * Empty state
 */
export const Empty: Story = {
  args: {
    evidence: [],
    loading: false,
    error: null,
    expandedId: null,
    onToggleExpand: () => {},
  },
}
