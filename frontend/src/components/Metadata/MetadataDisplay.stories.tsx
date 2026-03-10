/**
 * MetadataDisplay Storybook Stories
 */

import type { Meta, StoryObj } from '@storybook/react-vite'
import { MetadataDisplay } from './MetadataDisplay'
import type { DocumentMetadata } from '@/types/metadata'

const meta: Meta<typeof MetadataDisplay> = {
  title: 'Components/Metadata/MetadataDisplay',
  component: MetadataDisplay,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof MetadataDisplay>

const sampleMetadata: DocumentMetadata = {
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
    'Comprehensive quarterly financial statement for Q4 2024 including balance sheet, income statement, and cash flow analysis.',
  fiscalYear: 'FY2024',
  keywords: ['revenue', 'expenses', 'profit', 'assets', 'liabilities', 'equity'],
  version: 1,
}

export const FullView: Story = {
  args: {
    metadata: sampleMetadata,
    mode: 'view',
    showActions: true,
    onEdit: () => alert('Edit clicked'),
  },
}

export const CompactView: Story = {
  args: {
    metadata: sampleMetadata,
    mode: 'compact',
  },
}

export const WithoutActions: Story = {
  args: {
    metadata: sampleMetadata,
    mode: 'view',
    showActions: false,
  },
}

export const ContractWithValue: Story = {
  args: {
    metadata: {
      title: 'Client Service Agreement 2025',
      documentType: 'contract',
      identifier: 'CNT-2025-001',
      identifierType: 'contract_number',
      date: '2025-01-10',
      creator: 'Legal Department',
      department: 'legal',
      confidentialityLevel: 'highly_confidential',
      retentionPeriod: '10_years',
      tags: ['contract', 'client-agreement', 'service'],
      description: 'Annual service agreement with Acme Corporation for consulting services.',
      contractValue: 150000,
      currency: 'USD',
      customerName: 'Acme Corporation',
      expirationDate: '2026-01-10',
      subject: 'Consulting Services Agreement',
      version: 2,
      pageCount: 25,
      language: 'en',
    },
    mode: 'view',
    showActions: true,
    onEdit: () => alert('Edit clicked'),
  },
}

export const KYCDocument: Story = {
  args: {
    metadata: {
      title: 'Customer Onboarding - John Smith',
      documentType: 'kyc_record',
      identifier: 'CUST-123456',
      identifierType: 'customer_id',
      date: '2025-01-15',
      creator: 'Compliance Team',
      department: 'compliance',
      confidentialityLevel: 'highly_confidential',
      retentionPeriod: '5_years',
      tags: ['kyc', 'customer-onboarding', 'compliance', 'due-diligence'],
      description: 'Know Your Customer documentation for new client onboarding.',
      customerName: 'John Smith',
      subject: 'Customer Due Diligence',
      keywords: ['identity-verification', 'aml', 'compliance-check'],
      comments: 'Verified identity documents and address proof. All compliance checks passed.',
    },
    mode: 'view',
    showActions: true,
    onEdit: () => alert('Edit clicked'),
  },
}

export const OnLegalHold: Story = {
  args: {
    metadata: {
      title: 'Internal Audit Report 2024',
      documentType: 'audit_report',
      identifier: 'AUD-2024-001',
      identifierType: 'reference_number',
      date: '2024-11-30',
      creator: 'Internal Audit Team',
      department: 'audit',
      confidentialityLevel: 'highly_confidential',
      retentionPeriod: '7_years',
      tags: ['audit', 'internal', 'compliance', 'risk-assessment'],
      description: 'Annual internal audit findings and recommendations.',
      isOnLegalHold: true,
      legalHoldReason:
        'Document is under legal hold due to pending litigation (Case #2024-LAW-015). Do not delete or modify.',
      version: 1,
    },
    mode: 'view',
    showActions: true,
    onEdit: () => alert('Edit clicked'),
  },
}

export const MinimalMetadata: Story = {
  args: {
    metadata: {
      title: 'Simple Memo',
      documentType: 'memo',
      identifier: 'MEMO-2025-001',
      identifierType: 'reference_number',
      date: '2025-01-15',
      creator: 'Operations Team',
      department: 'operations',
      confidentialityLevel: 'internal',
      retentionPeriod: '1_year',
      tags: ['memo', 'internal-communication'],
    },
    mode: 'view',
    showActions: true,
    onEdit: () => alert('Edit clicked'),
  },
}

export const AllOptionalFields: Story = {
  args: {
    metadata: {
      title: 'Comprehensive Document Example',
      documentType: 'report',
      identifier: 'RPT-2025-001',
      identifierType: 'reference_number',
      date: '2025-01-15',
      creator: 'Research Team',
      department: 'operations',
      confidentialityLevel: 'internal',
      retentionPeriod: '5_years',
      tags: ['report', 'research', 'analysis', 'quarterly'],
      description:
        'This is a comprehensive example showing all optional metadata fields populated.',
      subject: 'Market Analysis Q1 2025',
      keywords: ['market-research', 'trends', 'analysis', 'forecast'],
      expirationDate: '2030-01-15',
      fiscalYear: 'FY2025',
      customerName: 'Internal Research',
      pageCount: 42,
      language: 'en',
      comments:
        'This document contains detailed market analysis and forecasts for Q1 2025. Please review carefully before distribution.',
      version: 3,
    },
    mode: 'view',
    showActions: true,
    onEdit: () => alert('Edit clicked'),
  },
}

export const CustomRetentionPeriod: Story = {
  args: {
    metadata: {
      title: 'Special Project Documentation',
      documentType: 'policy',
      identifier: 'POL-2025-001',
      identifierType: 'policy_number',
      date: '2025-01-01',
      creator: 'Executive Team',
      department: 'executive',
      confidentialityLevel: 'highly_confidential',
      retentionPeriod: 'custom',
      customRetentionYears: 25,
      tags: ['policy', 'strategic', 'long-term'],
      description: 'Strategic policy document with custom 25-year retention period.',
    },
    mode: 'view',
    showActions: true,
    onEdit: () => alert('Edit clicked'),
  },
}
