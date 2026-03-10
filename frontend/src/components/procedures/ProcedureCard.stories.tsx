import type { Meta, StoryObj } from '@storybook/react-vite'
import { ProcedureCard } from './ProcedureCard'
import type { Procedure } from '@/types/procedure'

const meta: Meta<typeof ProcedureCard> = {
  title: 'Procedures/ProcedureCard',
  component: ProcedureCard,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof ProcedureCard>

const baseProcedure: Procedure = {
  id: '1',
  title: 'KYC Customer Onboarding',
  description: 'Step-by-step guide for onboarding new customers with KYC requirements.',
  state: 'draft',
  current_version: 1,
  tags: ['compliance', 'kyc'],
  created_by: 'user-1',
  created_by_name: 'John Smith',
  department: 'dept-1',
  department_name: 'Compliance',
  parent_procedure: null,
  step_count: 5,
  created_at: '2025-12-01T10:00:00Z',
  updated_at: '2025-12-15T14:30:00Z',
}

/**
 * Draft procedure
 */
export const Draft: Story = {
  args: {
    procedure: { ...baseProcedure, state: 'draft' },
    onClick: () => console.log('clicked'),
  },
}

/**
 * In Review
 */
export const InReview: Story = {
  args: {
    procedure: { ...baseProcedure, state: 'in_review', title: 'AML Compliance Check' },
    onClick: () => console.log('clicked'),
  },
}

/**
 * Approved
 */
export const Approved: Story = {
  args: {
    procedure: { ...baseProcedure, state: 'approved', title: 'Risk Assessment Protocol' },
    onClick: () => console.log('clicked'),
  },
}

/**
 * Published
 */
export const Published: Story = {
  args: {
    procedure: {
      ...baseProcedure,
      state: 'published',
      current_version: 3,
      title: 'Loan Processing',
    },
    onClick: () => console.log('clicked'),
  },
}

/**
 * Retired
 */
export const Retired: Story = {
  args: {
    procedure: { ...baseProcedure, state: 'retired', title: 'Legacy Filing Process' },
    onClick: () => console.log('clicked'),
  },
}

/**
 * All states side by side
 */
export const AllStates: Story = {
  render: () => (
    <div className="space-y-3 w-96">
      {(['draft', 'in_review', 'approved', 'published', 'retired'] as const).map((state) => (
        <ProcedureCard
          key={state}
          procedure={{ ...baseProcedure, state, title: `${state.replace('_', ' ')} procedure` }}
          onClick={() => console.log(state)}
        />
      ))}
    </div>
  ),
}
