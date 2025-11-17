import type { Meta, StoryObj } from '@storybook/react'
import { LegalHoldManager } from './LegalHoldManager'
import type { LegalHold } from '@/types/retention'

const meta: Meta<typeof LegalHoldManager> = {
  title: 'Components/Retention/LegalHoldManager',
  component: LegalHoldManager,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof LegalHoldManager>

const mockHolds: LegalHold[] = [
  {
    id: 'hold-1',
    caseNumber: 'LIT-2025-001',
    caseName: 'Smith vs. Company Litigation',
    description: 'Preserve all documents related to the Smith contract dispute',
    status: 'active',
    reason: 'litigation',
    createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
    createdBy: 'legal@example.com',
    effectiveDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
    departments: ['Sales', 'Legal', 'Accounting'],
    documentTypes: ['Contract', 'Email', 'Invoice'],
    keywords: ['Smith', 'Project Alpha'],
    documentsOnHold: 3420,
    documentsReleased: 0,
    custodians: ['john.doe@example.com', 'jane.smith@example.com'],
    legalCounsel: ['attorney@lawfirm.com'],
    reviewers: ['legal@example.com'],
    court: 'Superior Court of California',
    jurisdiction: 'California',
    notificationsSent: 5,
    acknowledgedBy: ['john.doe@example.com'],
    pendingAcknowledgment: ['jane.smith@example.com'],
  },
  {
    id: 'hold-2',
    caseNumber: 'INV-2025-003',
    caseName: 'Internal Compliance Investigation',
    description: 'Hold on all procurement documents for compliance review',
    status: 'active',
    reason: 'investigation',
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    createdBy: 'compliance@example.com',
    effectiveDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    departments: ['Procurement', 'Finance'],
    documentTypes: ['Invoice', 'Report'],
    keywords: ['Vendor XYZ'],
    documentsOnHold: 890,
    documentsReleased: 0,
    custodians: ['procurement@example.com'],
    legalCounsel: [],
    reviewers: ['compliance@example.com', 'audit@example.com'],
    notificationsSent: 2,
    acknowledgedBy: ['procurement@example.com'],
    pendingAcknowledgment: [],
  },
]

export const Default: Story = {
  args: {
    holds: mockHolds,
  },
}

export const Empty: Story = {
  args: {
    holds: [],
  },
}

export const Loading: Story = {
  args: {
    holds: [],
    loading: true,
  },
}

export const DarkMode: Story = {
  render: () => (
    <div className="dark bg-gray-950 p-8 min-h-screen">
      <LegalHoldManager holds={mockHolds} />
    </div>
  ),
}
