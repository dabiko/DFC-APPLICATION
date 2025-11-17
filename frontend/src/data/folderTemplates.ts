/**
 * Folder Template Definitions
 * Predefined folder templates for common use cases
 */

import type { FolderTemplate } from '@/types/folderTemplate'

export const FOLDER_TEMPLATES: FolderTemplate[] = [
  {
    id: 'project-standard',
    name: 'Project Folder',
    description: 'Standard project structure with planning, documents, reports, and archive',
    icon: '📊',
    category: 'project',
    defaultConfidentiality: 'internal',
    tags: ['project', 'standard'],
    structure: [
      {
        name: 'Planning',
        confidentiality: 'internal',
        children: [
          { name: 'Requirements' },
          { name: 'Proposals' },
          { name: 'Budget' },
        ],
      },
      {
        name: 'Documents',
        confidentiality: 'internal',
        children: [
          { name: 'Drafts' },
          { name: 'Final' },
          { name: 'References' },
        ],
      },
      {
        name: 'Reports',
        confidentiality: 'confidential',
        children: [
          { name: 'Progress Reports' },
          { name: 'Financial Reports' },
          { name: 'Final Report' },
        ],
      },
      {
        name: 'Meetings',
        confidentiality: 'internal',
        children: [
          { name: 'Agendas' },
          { name: 'Minutes' },
          { name: 'Presentations' },
        ],
      },
      {
        name: 'Archive',
        confidentiality: 'internal',
      },
    ],
  },
  {
    id: 'employee-file',
    name: 'Employee File',
    description: 'Employee record structure with personal info, contracts, performance, and training',
    icon: '👤',
    category: 'employee',
    defaultConfidentiality: 'highly_confidential',
    tags: ['employee', 'hr'],
    structure: [
      {
        name: 'Personal Information',
        confidentiality: 'highly_confidential',
        children: [
          { name: 'Identification' },
          { name: 'Contact Details' },
          { name: 'Emergency Contacts' },
        ],
      },
      {
        name: 'Contracts & Agreements',
        confidentiality: 'highly_confidential',
        children: [
          { name: 'Employment Contract' },
          { name: 'NDAs' },
          { name: 'Amendments' },
        ],
      },
      {
        name: 'Performance',
        confidentiality: 'confidential',
        children: [
          { name: 'Reviews' },
          { name: 'Goals' },
          { name: 'Feedback' },
        ],
      },
      {
        name: 'Training & Development',
        confidentiality: 'internal',
        children: [
          { name: 'Certifications' },
          { name: 'Training Records' },
          { name: 'Development Plans' },
        ],
      },
      {
        name: 'Compensation',
        confidentiality: 'highly_confidential',
        children: [
          { name: 'Salary History' },
          { name: 'Bonuses' },
          { name: 'Benefits' },
        ],
      },
      {
        name: 'Time & Attendance',
        confidentiality: 'confidential',
      },
    ],
  },
  {
    id: 'client-engagement',
    name: 'Client Engagement',
    description: 'Client folder with KYC, contracts, invoices, and communications',
    icon: '🤝',
    category: 'client',
    defaultConfidentiality: 'confidential',
    tags: ['client', 'engagement'],
    structure: [
      {
        name: 'KYC Documents',
        confidentiality: 'highly_confidential',
        children: [
          { name: 'Identification' },
          { name: 'Address Proof' },
          { name: 'Business Documents' },
          { name: 'Risk Assessment' },
        ],
      },
      {
        name: 'Contracts',
        confidentiality: 'confidential',
        children: [
          { name: 'Service Agreements' },
          { name: 'SOWs' },
          { name: 'Amendments' },
        ],
      },
      {
        name: 'Invoices',
        confidentiality: 'confidential',
        children: [
          { name: 'Pending' },
          { name: 'Paid' },
          { name: 'Overdue' },
        ],
      },
      {
        name: 'Communications',
        confidentiality: 'internal',
        children: [
          { name: 'Emails' },
          { name: 'Meeting Notes' },
          { name: 'Proposals' },
        ],
      },
      {
        name: 'Deliverables',
        confidentiality: 'confidential',
        children: [
          { name: 'Work in Progress' },
          { name: 'Completed' },
          { name: 'Approved' },
        ],
      },
    ],
  },
  {
    id: 'financial-audit',
    name: 'Financial Audit',
    description: 'Audit engagement structure with planning, evidence, working papers, and reports',
    icon: '💰',
    category: 'project',
    defaultConfidentiality: 'highly_confidential',
    tags: ['audit', 'financial'],
    structure: [
      {
        name: 'Planning',
        confidentiality: 'confidential',
        children: [
          { name: 'Audit Plan' },
          { name: 'Risk Assessment' },
          { name: 'Materiality' },
        ],
      },
      {
        name: 'Evidence',
        confidentiality: 'highly_confidential',
        children: [
          { name: 'Bank Statements' },
          { name: 'Invoices' },
          { name: 'Receipts' },
          { name: 'Confirmations' },
        ],
      },
      {
        name: 'Working Papers',
        confidentiality: 'highly_confidential',
        children: [
          { name: 'Cash & Bank' },
          { name: 'Receivables' },
          { name: 'Payables' },
          { name: 'Inventory' },
          { name: 'Fixed Assets' },
        ],
      },
      {
        name: 'Reports',
        confidentiality: 'highly_confidential',
        children: [
          { name: 'Draft Report' },
          { name: 'Management Letter' },
          { name: 'Final Report' },
        ],
      },
      {
        name: 'Administrative',
        confidentiality: 'internal',
        children: [
          { name: 'Engagement Letter' },
          { name: 'Time Sheets' },
          { name: 'Correspondence' },
        ],
      },
    ],
  },
  {
    id: 'department-standard',
    name: 'Department Folder',
    description: 'Standard department structure with policies, procedures, and team documents',
    icon: '🏢',
    category: 'department',
    defaultConfidentiality: 'internal',
    tags: ['department', 'team'],
    structure: [
      {
        name: 'Policies',
        confidentiality: 'internal',
        children: [
          { name: 'Department Policies' },
          { name: 'SOPs' },
          { name: 'Guidelines' },
        ],
      },
      {
        name: 'Team Documents',
        confidentiality: 'internal',
        children: [
          { name: 'Meeting Minutes' },
          { name: 'Presentations' },
          { name: 'Reports' },
        ],
      },
      {
        name: 'Projects',
        confidentiality: 'internal',
      },
      {
        name: 'Resources',
        confidentiality: 'internal',
        children: [
          { name: 'Templates' },
          { name: 'Training Materials' },
          { name: 'Reference Documents' },
        ],
      },
      {
        name: 'Archive',
        confidentiality: 'internal',
      },
    ],
  },
  {
    id: 'compliance-case',
    name: 'Compliance Case',
    description: 'Compliance investigation structure with evidence, analysis, and reports',
    icon: '⚖️',
    category: 'project',
    defaultConfidentiality: 'highly_confidential',
    tags: ['compliance', 'investigation'],
    structure: [
      {
        name: 'Case Information',
        confidentiality: 'highly_confidential',
        children: [
          { name: 'Case Summary' },
          { name: 'Timeline' },
          { name: 'Key Parties' },
        ],
      },
      {
        name: 'Evidence',
        confidentiality: 'highly_confidential',
        children: [
          { name: 'Documents' },
          { name: 'Communications' },
          { name: 'Witness Statements' },
        ],
      },
      {
        name: 'Analysis',
        confidentiality: 'highly_confidential',
        children: [
          { name: 'Initial Assessment' },
          { name: 'Detailed Analysis' },
          { name: 'Findings' },
        ],
      },
      {
        name: 'Reports',
        confidentiality: 'highly_confidential',
        children: [
          { name: 'Draft Reports' },
          { name: 'Final Report' },
          { name: 'Management Response' },
        ],
      },
      {
        name: 'Remediation',
        confidentiality: 'confidential',
        children: [
          { name: 'Action Plan' },
          { name: 'Follow-up' },
          { name: 'Closure' },
        ],
      },
    ],
  },
]

/**
 * Get template by ID
 */
export const getTemplateById = (id: string): FolderTemplate | undefined => {
  return FOLDER_TEMPLATES.find((template) => template.id === id)
}

/**
 * Get templates by category
 */
export const getTemplatesByCategory = (category: FolderTemplate['category']): FolderTemplate[] => {
  return FOLDER_TEMPLATES.filter((template) => template.category === category)
}

/**
 * Search templates
 */
export const searchTemplates = (query: string): FolderTemplate[] => {
  const lowerQuery = query.toLowerCase()
  return FOLDER_TEMPLATES.filter(
    (template) =>
      template.name.toLowerCase().includes(lowerQuery) ||
      template.description.toLowerCase().includes(lowerQuery) ||
      template.tags?.some((tag) => tag.toLowerCase().includes(lowerQuery))
  )
}
