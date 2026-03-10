import type { Meta, StoryObj } from '@storybook/react-vite'
import { StepEditor } from './StepEditor'
import type { ProcedureStep } from '@/types/procedure'

const meta: Meta<typeof StepEditor> = {
  title: 'Procedures/StepEditor',
  component: StepEditor,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof StepEditor>

const baseStep: ProcedureStep = {
  id: 'step-1',
  procedure: 'proc-1',
  title: 'Verify Customer Identity',
  description: 'Check government-issued ID and compare with provided information.',
  order: 1,
  estimated_duration_minutes: 15,
  branch_condition: null,
  require_manual_open: false,
  require_media_completion: false,
  require_quiz_pass: false,
  attachments: [],
  created_at: '2025-12-01T10:00:00Z',
  updated_at: '2025-12-01T10:00:00Z',
}

/**
 * Basic step without gates or attachments
 */
export const Basic: Story = {
  args: {
    step: baseStep,
    procedureId: 'proc-1',
    index: 0,
    onUpdate: (stepId, data) => console.log('update', stepId, data),
    onDelete: (stepId) => console.log('delete', stepId),
  },
}

/**
 * Step with all gates enabled
 */
export const WithAllGates: Story = {
  args: {
    step: {
      ...baseStep,
      require_manual_open: true,
      require_media_completion: true,
      require_quiz_pass: true,
    },
    procedureId: 'proc-1',
    index: 1,
    onUpdate: (stepId, data) => console.log('update', stepId, data),
    onDelete: (stepId) => console.log('delete', stepId),
  },
}

/**
 * Step with attachments
 */
export const WithAttachments: Story = {
  args: {
    step: {
      ...baseStep,
      attachments: [
        {
          id: 'att-1',
          step: 'step-1',
          attachment_type: 'document',
          title: 'ID Verification Guide.pdf',
          file: '/files/guide.pdf',
          file_name: 'ID Verification Guide.pdf',
          file_size: 245000,
          file_extension: 'pdf',
          mime_type: 'application/pdf',
          checksum_sha256: 'abc123',
          order: 1,
          uploaded_by: 'user-1',
          uploaded_at: '2025-12-01T10:00:00Z',
        },
        {
          id: 'att-2',
          step: 'step-1',
          attachment_type: 'video',
          title: 'Training Video.mp4',
          file: '/files/video.mp4',
          file_name: 'Training Video.mp4',
          file_size: 15000000,
          file_extension: 'mp4',
          mime_type: 'video/mp4',
          checksum_sha256: 'def456',
          order: 2,
          uploaded_by: 'user-1',
          uploaded_at: '2025-12-01T10:00:00Z',
        },
      ],
    },
    procedureId: 'proc-1',
    index: 2,
    onUpdate: (stepId, data) => console.log('update', stepId, data),
    onDelete: (stepId) => console.log('delete', stepId),
  },
}

/**
 * Step without duration
 */
export const NoDuration: Story = {
  args: {
    step: { ...baseStep, estimated_duration_minutes: null },
    procedureId: 'proc-1',
    index: 0,
    onUpdate: (stepId, data) => console.log('update', stepId, data),
    onDelete: (stepId) => console.log('delete', stepId),
  },
}
