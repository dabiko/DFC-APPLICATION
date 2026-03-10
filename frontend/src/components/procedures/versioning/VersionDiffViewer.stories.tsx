import type { Meta, StoryObj } from '@storybook/react-vite'
import { VersionDiffViewer } from './VersionDiffViewer'
import type { ProcedureVersionListItem } from '@/types/procedure'

const meta: Meta<typeof VersionDiffViewer> = {
  title: 'Procedures/VersionDiffViewer',
  component: VersionDiffViewer,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof VersionDiffViewer>

const sampleVersions: ProcedureVersionListItem[] = [
  {
    id: 'v1',
    version_number: 1,
    title: 'KYC Onboarding v1',
    published_by_name: 'John Smith',
    published_at: '2025-10-01T10:00:00Z',
    effective_from: '2025-10-01T00:00:00Z',
    expires_on: '2026-10-01T00:00:00Z',
    is_active: false,
    step_count: 4,
    changelog: 'Initial version',
  },
  {
    id: 'v2',
    version_number: 2,
    title: 'KYC Onboarding v2',
    published_by_name: 'Jane Doe',
    published_at: '2025-12-01T10:00:00Z',
    effective_from: '2025-12-01T00:00:00Z',
    expires_on: '2026-12-01T00:00:00Z',
    is_active: true,
    step_count: 6,
    changelog: 'Added risk assessment and enhanced verification steps.',
  },
]

/**
 * Two versions to compare
 */
export const TwoVersions: Story = {
  args: {
    procedureId: 'proc-1',
    versions: sampleVersions,
  },
}

/**
 * Multiple versions
 */
export const MultipleVersions: Story = {
  args: {
    procedureId: 'proc-1',
    versions: [
      ...sampleVersions,
      {
        id: 'v3',
        version_number: 3,
        title: 'KYC Onboarding v3',
        published_by_name: 'Bob Wilson',
        published_at: '2026-02-01T10:00:00Z',
        effective_from: '2026-02-01T00:00:00Z',
        expires_on: '2027-02-01T00:00:00Z',
        is_active: true,
        step_count: 7,
        changelog: 'Added automated screening step.',
      },
    ],
  },
}

/**
 * Single version (no diff possible)
 */
export const SingleVersion: Story = {
  args: {
    procedureId: 'proc-1',
    versions: [sampleVersions[0]],
  },
}
