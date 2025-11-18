import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { RetentionPolicyList } from './RetentionPolicyList'
import type { RetentionPolicy } from '@/types/retention'

const meta: Meta<typeof RetentionPolicyList> = {
  title: 'Components/Retention/RetentionPolicyList',
  component: RetentionPolicyList,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof RetentionPolicyList>

const mockPolicies: RetentionPolicy[] = [
  {
    id: 'policy-1',
    name: 'Financial Records Retention',
    description:
      'Retention policy for all financial documents including invoices, statements, and tax records',
    status: 'active',
    version: 1,
    createdAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
    createdBy: 'admin@example.com',
    modifiedAt: new Date().toISOString(),
    modifiedBy: 'admin@example.com',
    effectiveDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
    documentTypes: ['Invoice', 'Financial Statement', 'Tax Document'],
    departments: ['Accounting', 'Finance'],
    securityLevels: ['Confidential', 'Highly Confidential'],
    retentionPeriod: { value: 7, unit: 'years' },
    trigger: 'creation',
    primaryAction: 'archive',
    secondaryActions: ['notify'],
    notifyBeforeDays: 30,
    requireApproval: true,
    complianceStandards: ['SOX', 'GDPR'],
    documentsAffected: 12500,
    documentsCompliant: 11875,
    documentsAtRisk: 250,
  },
  {
    id: 'policy-2',
    name: 'Email Retention Policy',
    description: 'Standard email retention for business communications',
    status: 'active',
    version: 2,
    createdAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
    createdBy: 'it@example.com',
    modifiedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    modifiedBy: 'it@example.com',
    effectiveDate: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
    documentTypes: ['Email'],
    departments: ['All Departments'],
    securityLevels: ['Internal', 'Confidential'],
    retentionPeriod: { value: 3, unit: 'years' },
    trigger: 'creation',
    primaryAction: 'delete',
    secondaryActions: [],
    notifyBeforeDays: 60,
    requireApproval: false,
    complianceStandards: ['GDPR'],
    documentsAffected: 58200,
    documentsCompliant: 57180,
    documentsAtRisk: 1020,
  },
  {
    id: 'policy-3',
    name: 'HR Records - Employee Files',
    description: 'Retention policy for employee personnel files and HR documents',
    status: 'active',
    version: 1,
    createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
    createdBy: 'hr@example.com',
    modifiedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    modifiedBy: 'hr@example.com',
    effectiveDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
    documentTypes: ['HR Document', 'Contract'],
    departments: ['HR'],
    securityLevels: ['Highly Confidential'],
    retentionPeriod: { value: 5, unit: 'years' },
    trigger: 'closure',
    primaryAction: 'archive',
    secondaryActions: ['review'],
    notifyBeforeDays: 90,
    requireApproval: true,
    complianceStandards: ['GDPR', 'ISO-27001'],
    regulatoryReference: 'GDPR Article 5',
    documentsAffected: 3420,
    documentsCompliant: 3350,
    documentsAtRisk: 70,
  },
  {
    id: 'policy-4',
    name: 'Marketing Materials - Draft',
    description: 'Short-term retention for marketing drafts and working files',
    status: 'draft',
    version: 1,
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    createdBy: 'marketing@example.com',
    modifiedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    modifiedBy: 'marketing@example.com',
    effectiveDate: new Date().toISOString(),
    documentTypes: ['Presentation', 'Spreadsheet'],
    departments: ['Marketing'],
    securityLevels: ['Public', 'Internal'],
    retentionPeriod: { value: 6, unit: 'months' },
    trigger: 'modification',
    primaryAction: 'review',
    secondaryActions: [],
    notifyBeforeDays: 14,
    requireApproval: false,
    complianceStandards: [],
    documentsAffected: 0,
    documentsCompliant: 0,
    documentsAtRisk: 0,
  },
]

export const GridView: Story = {
  args: {
    policies: mockPolicies,
    view: 'grid',
  },
}

export const ListView: Story = {
  args: {
    policies: mockPolicies,
    view: 'list',
  },
}

export const CompactView: Story = {
  args: {
    policies: mockPolicies,
    view: 'compact',
  },
}

export const Empty: Story = {
  args: {
    policies: [],
  },
}

export const Loading: Story = {
  args: {
    policies: [],
    loading: true,
  },
}

export const Interactive: Story = {
  render: () => {
    const [policies, setPolicies] = useState(mockPolicies)
    const [selectedId, setSelectedId] = useState<string>()

    return (
      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
          <strong>Interactive Demo:</strong> Select policies, toggle status, and interact with the
          list
        </div>
        <RetentionPolicyList
          policies={policies}
          selectedPolicyId={selectedId}
          onPolicySelect={setSelectedId}
          onCreatePolicy={() => alert('Create policy clicked')}
          onEditPolicy={(id) => alert(`Edit policy: ${id}`)}
          onDeletePolicy={(id) => {
            setPolicies(policies.filter((p) => p.id !== id))
            alert(`Deleted policy: ${id}`)
          }}
          onToggleStatus={(id) => {
            setPolicies(
              policies.map((p) =>
                p.id === id ? { ...p, status: p.status === 'active' ? 'inactive' : 'active' } : p
              )
            )
          }}
        />
      </div>
    )
  },
}

export const DarkMode: Story = {
  render: () => (
    <div className="dark bg-gray-950 p-8 min-h-screen">
      <RetentionPolicyList policies={mockPolicies} view="grid" />
    </div>
  ),
}
