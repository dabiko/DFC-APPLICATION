/**
 * DocumentMetadataForm Storybook Stories
 */

import type { Meta, StoryObj } from '@storybook/react-vite'
import { DocumentMetadataForm } from './DocumentMetadataForm'
import type { CreateDocumentMetadata } from '@/types/metadata'

const meta: Meta<typeof DocumentMetadataForm> = {
  title: 'Components/Metadata/DocumentMetadataForm',
  component: DocumentMetadataForm,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof DocumentMetadataForm>

const handleSubmit = (metadata: CreateDocumentMetadata) => {
  console.log('Submitted metadata:', metadata)
  alert('Metadata submitted! Check console for details.')
}

const handleCancel = () => {
  console.log('Form cancelled')
  alert('Form cancelled')
}

export const CreateMode: Story = {
  args: {
    mode: 'create',
    onSubmit: handleSubmit,
    onCancel: handleCancel,
  },
}

export const EditMode: Story = {
  args: {
    mode: 'edit',
    initialValues: {
      title: 'Q4 2024 Financial Report',
      documentType: 'financial_statement',
      identifier: 'FIN-2024-Q4-001',
      identifierType: 'reference_number',
      date: '2024-12-31',
      creator: 'Finance Department',
      department: 'accounting',
      confidentialityLevel: 'confidential',
      retentionPeriod: '7_years',
      tags: ['financial', 'quarterly', 'report', 'fy2024'],
      description:
        'Quarterly financial statement for Q4 2024 including balance sheet, income statement, and cash flow analysis.',
      fiscalYear: 'FY2024',
      keywords: ['revenue', 'expenses', 'profit', 'assets', 'liabilities'],
    },
    onSubmit: handleSubmit,
    onCancel: handleCancel,
  },
}

export const InvoiceDocument: Story = {
  args: {
    mode: 'create',
    documentType: 'invoice',
    department: 'accounting',
    initialValues: {
      documentType: 'invoice',
      identifier: 'INV-2025-0001',
      identifierType: 'invoice_number',
      date: '2025-01-15',
      creator: 'Accounts Receivable',
      department: 'accounting',
      confidentialityLevel: 'internal',
      retentionPeriod: '7_years',
      tags: ['invoice', 'payment'],
    },
    onSubmit: handleSubmit,
    onCancel: handleCancel,
  },
}

export const ContractDocument: Story = {
  args: {
    mode: 'create',
    documentType: 'contract',
    department: 'legal',
    initialValues: {
      documentType: 'contract',
      identifier: 'CNT-2025-001',
      identifierType: 'contract_number',
      date: '2025-01-10',
      creator: 'Legal Department',
      department: 'legal',
      confidentialityLevel: 'highly_confidential',
      retentionPeriod: '10_years',
      tags: ['contract', 'client-agreement'],
      contractValue: 150000,
      currency: 'USD',
      customerName: 'Acme Corporation',
      expirationDate: '2026-01-10',
    },
    onSubmit: handleSubmit,
    onCancel: handleCancel,
  },
}

export const KYCDocument: Story = {
  args: {
    mode: 'create',
    documentType: 'kyc_record',
    department: 'compliance',
    initialValues: {
      documentType: 'kyc_record',
      identifier: 'CUST-123456',
      identifierType: 'customer_id',
      date: '2025-01-15',
      creator: 'Compliance Team',
      department: 'compliance',
      confidentialityLevel: 'highly_confidential',
      retentionPeriod: '5_years',
      tags: ['kyc', 'customer-onboarding', 'compliance'],
      customerName: 'John Smith',
    },
    onSubmit: handleSubmit,
    onCancel: handleCancel,
  },
}

export const CustomRetentionPeriod: Story = {
  args: {
    mode: 'create',
    initialValues: {
      documentType: 'policy',
      retentionPeriod: 'custom',
      customRetentionYears: 25,
    },
    onSubmit: handleSubmit,
    onCancel: handleCancel,
  },
}

export const Loading: Story = {
  args: {
    mode: 'create',
    isLoading: true,
    onSubmit: handleSubmit,
    onCancel: handleCancel,
  },
}

export const WithValidationErrors: Story = {
  args: {
    mode: 'create',
    initialValues: {
      // Intentionally leaving required fields empty to trigger validation
      title: '',
      tags: [],
    },
    onSubmit: handleSubmit,
    onCancel: handleCancel,
  },
  play: async ({ canvasElement }) => {
    // Simulate form submission to show validation errors
    const submitButton = canvasElement.querySelector('button[type="submit"]')
    if (submitButton instanceof HTMLElement) {
      submitButton.click()
    }
  },
}
