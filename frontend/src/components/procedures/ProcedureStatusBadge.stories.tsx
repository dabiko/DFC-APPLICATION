import type { Meta, StoryObj } from '@storybook/react-vite'
import { ProcedureStatusBadge } from './ProcedureStatusBadge'
import type { ProcedureState } from '@/types/procedure'

const meta: Meta<typeof ProcedureStatusBadge> = {
  title: 'Procedures/ProcedureStatusBadge',
  component: ProcedureStatusBadge,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof ProcedureStatusBadge>

export const Draft: Story = { args: { state: 'draft' } }
export const InReview: Story = { args: { state: 'in_review' } }
export const Approved: Story = { args: { state: 'approved' } }
export const Published: Story = { args: { state: 'published' } }
export const Retired: Story = { args: { state: 'retired' } }

/**
 * All states
 */
export const AllStates: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      {(['draft', 'in_review', 'approved', 'published', 'retired'] as ProcedureState[]).map(
        (state) => (
          <ProcedureStatusBadge key={state} state={state} />
        )
      )}
    </div>
  ),
}
