/**
 * TemplateGallery Component
 *
 * A gallery of pre-built workflow templates that users can select
 * as a starting point for creating new workflows.
 */

import React, { useState } from 'react'
import {
  X,
  Search,
  FileCheck,
  FileText,
  Users,
  DollarSign,
  Shield,
  Building2,
  Briefcase,
  Scale,
  Clock,
  CheckCircle,
  ArrowRight,
  Sparkles,
} from 'lucide-react'
import type { DesignerTemplate, DesignerStep } from './types'

interface TemplateGalleryProps {
  isOpen: boolean
  onClose: () => void
  onSelectTemplate: (template: DesignerTemplate) => void
}

interface GalleryTemplate {
  id: string
  name: string
  description: string
  category: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  stepCount: number
  estimatedTime: string
  template: DesignerTemplate
}

// =============================================================================
// Pre-built Templates
// =============================================================================

const createStep = (
  id: string,
  name: string,
  order: number,
  stepType: DesignerStep['step_type'],
  position: { x: number; y: number },
  options: Partial<DesignerStep> = {}
): DesignerStep => ({
  id,
  name,
  description: '',
  order,
  step_type: stepType,
  approval_type: 'ANY',
  assigned_users: [],
  assigned_role: '',
  conditions: [],
  auto_approve_if_same_user: false,
  require_comment: false,
  position,
  isValid: true,
  validationErrors: [],
  ...options,
})

const GALLERY_TEMPLATES: GalleryTemplate[] = [
  {
    id: 'expense-approval',
    name: 'Expense Approval',
    description:
      'Two-tier approval based on expense amount. Under $1,000 requires manager approval, over $1,000 requires additional finance approval.',
    category: 'Finance',
    icon: DollarSign,
    color: 'bg-green-500',
    stepCount: 3,
    estimatedTime: '2-5 days',
    template: {
      name: 'Expense Approval Workflow',
      description: 'Automated expense approval based on amount thresholds',
      category: 'finance',
      default_priority: 'MEDIUM',
      default_due_days: 5,
      applicable_document_types: ['expense_report', 'receipt', 'invoice'],
      is_active: false,
      steps: [
        createStep(
          'step-1',
          'Manager Approval',
          1,
          'APPROVAL',
          { x: 100, y: 100 },
          {
            description: 'Initial approval by direct manager',
            assigned_role: 'manager',
            sla_hours: 48,
            require_comment: false,
          }
        ),
        createStep(
          'step-2',
          'Finance Review',
          2,
          'APPROVAL',
          { x: 100, y: 250 },
          {
            description: 'Finance department review for expenses over $1,000',
            assigned_role: 'finance',
            sla_hours: 72,
            require_comment: true,
            conditions: [{ id: 'cond-1', field: 'amount', operator: 'greater_than', value: 1000 }],
          }
        ),
        createStep(
          'step-3',
          'Notification',
          3,
          'NOTIFICATION',
          { x: 100, y: 400 },
          {
            description: 'Notify submitter of approval decision',
          }
        ),
      ],
      connections: [
        {
          id: 'conn-1',
          sourceStepId: 'step-1',
          targetStepId: 'step-2',
          isConditional: true,
          label: 'Amount > $1000',
        },
        { id: 'conn-2', sourceStepId: 'step-2', targetStepId: 'step-3', isConditional: false },
      ],
      viewport: { zoom: 1, pan: { x: 50, y: 0 } },
    },
  },
  {
    id: 'contract-review',
    name: 'Contract Review',
    description:
      'Multi-department contract review workflow: Legal review, Finance review, then Executive sign-off.',
    category: 'Legal',
    icon: Scale,
    color: 'bg-purple-500',
    stepCount: 4,
    estimatedTime: '5-10 days',
    template: {
      name: 'Contract Review Workflow',
      description: 'Comprehensive contract review with legal, finance, and executive approval',
      category: 'legal',
      default_priority: 'HIGH',
      default_due_days: 10,
      applicable_document_types: ['contract', 'agreement', 'nda'],
      is_active: false,
      steps: [
        createStep(
          'step-1',
          'Legal Review',
          1,
          'REVIEW',
          { x: 100, y: 100 },
          {
            description: 'Legal department reviews contract terms',
            assigned_role: 'legal',
            sla_hours: 72,
            require_comment: true,
          }
        ),
        createStep(
          'step-2',
          'Finance Review',
          2,
          'REVIEW',
          { x: 100, y: 250 },
          {
            description: 'Finance reviews financial terms and obligations',
            assigned_role: 'finance',
            sla_hours: 48,
            require_comment: true,
          }
        ),
        createStep(
          'step-3',
          'Executive Approval',
          3,
          'SIGN_OFF',
          { x: 100, y: 400 },
          {
            description: 'Executive sign-off on the contract',
            assigned_role: 'executive',
            sla_hours: 96,
            require_comment: false,
          }
        ),
        createStep(
          'step-4',
          'Completion Notice',
          4,
          'NOTIFICATION',
          { x: 100, y: 550 },
          {
            description: 'Notify all stakeholders of completion',
          }
        ),
      ],
      connections: [
        { id: 'conn-1', sourceStepId: 'step-1', targetStepId: 'step-2', isConditional: false },
        { id: 'conn-2', sourceStepId: 'step-2', targetStepId: 'step-3', isConditional: false },
        { id: 'conn-3', sourceStepId: 'step-3', targetStepId: 'step-4', isConditional: false },
      ],
      viewport: { zoom: 1, pan: { x: 50, y: 0 } },
    },
  },
  {
    id: 'vendor-onboarding',
    name: 'Vendor Onboarding',
    description:
      'New vendor onboarding process: Compliance check, Procurement approval, and Finance setup.',
    category: 'Procurement',
    icon: Building2,
    color: 'bg-blue-500',
    stepCount: 4,
    estimatedTime: '7-14 days',
    template: {
      name: 'Vendor Onboarding Workflow',
      description: 'Complete vendor onboarding with compliance and financial verification',
      category: 'procurement',
      default_priority: 'MEDIUM',
      default_due_days: 14,
      applicable_document_types: ['vendor_application', 'w9', 'insurance_certificate'],
      is_active: false,
      steps: [
        createStep(
          'step-1',
          'Compliance Review',
          1,
          'REVIEW',
          { x: 100, y: 100 },
          {
            description: 'Verify vendor compliance documents',
            assigned_role: 'compliance',
            sla_hours: 72,
            require_comment: true,
          }
        ),
        createStep(
          'step-2',
          'Procurement Approval',
          2,
          'APPROVAL',
          { x: 100, y: 250 },
          {
            description: 'Procurement team approval',
            assigned_role: 'procurement',
            sla_hours: 48,
          }
        ),
        createStep(
          'step-3',
          'Finance Setup',
          3,
          'APPROVAL',
          { x: 100, y: 400 },
          {
            description: 'Finance sets up vendor in payment system',
            assigned_role: 'finance',
            sla_hours: 48,
          }
        ),
        createStep(
          'step-4',
          'Welcome Notification',
          4,
          'NOTIFICATION',
          { x: 100, y: 550 },
          {
            description: 'Send welcome package to new vendor',
          }
        ),
      ],
      connections: [
        { id: 'conn-1', sourceStepId: 'step-1', targetStepId: 'step-2', isConditional: false },
        { id: 'conn-2', sourceStepId: 'step-2', targetStepId: 'step-3', isConditional: false },
        { id: 'conn-3', sourceStepId: 'step-3', targetStepId: 'step-4', isConditional: false },
      ],
      viewport: { zoom: 1, pan: { x: 50, y: 0 } },
    },
  },
  {
    id: 'document-review',
    name: 'Simple Document Review',
    description:
      'Basic single-reviewer document review workflow. Ideal for internal document reviews.',
    category: 'General',
    icon: FileText,
    color: 'bg-gray-500',
    stepCount: 2,
    estimatedTime: '1-3 days',
    template: {
      name: 'Document Review Workflow',
      description: 'Simple single-reviewer document approval',
      category: 'general',
      default_priority: 'LOW',
      default_due_days: 3,
      applicable_document_types: [],
      is_active: false,
      steps: [
        createStep(
          'step-1',
          'Document Review',
          1,
          'REVIEW',
          { x: 100, y: 100 },
          {
            description: 'Review the document and provide feedback',
            sla_hours: 48,
            require_comment: true,
          }
        ),
        createStep(
          'step-2',
          'Completion',
          2,
          'NOTIFICATION',
          { x: 100, y: 250 },
          {
            description: 'Notify document owner of review completion',
          }
        ),
      ],
      connections: [
        { id: 'conn-1', sourceStepId: 'step-1', targetStepId: 'step-2', isConditional: false },
      ],
      viewport: { zoom: 1, pan: { x: 50, y: 0 } },
    },
  },
  {
    id: 'parallel-approval',
    name: 'Parallel Department Approval',
    description:
      'Simultaneous approval from multiple departments. All departments must approve before proceeding.',
    category: 'General',
    icon: Users,
    color: 'bg-orange-500',
    stepCount: 4,
    estimatedTime: '3-7 days',
    template: {
      name: 'Parallel Department Approval',
      description: 'Get approval from multiple departments simultaneously',
      category: 'general',
      default_priority: 'HIGH',
      default_due_days: 7,
      applicable_document_types: [],
      is_active: false,
      steps: [
        createStep(
          'step-1',
          'Department Approvals',
          1,
          'PARALLEL',
          { x: 100, y: 100 },
          {
            description: 'Parallel approval from all required departments',
            approval_type: 'ALL',
            sla_hours: 72,
          }
        ),
        createStep(
          'step-2',
          'HR Approval',
          2,
          'APPROVAL',
          { x: 350, y: 100 },
          {
            description: 'HR department approval',
            assigned_role: 'hr',
            sla_hours: 48,
          }
        ),
        createStep(
          'step-3',
          'IT Approval',
          3,
          'APPROVAL',
          { x: 350, y: 250 },
          {
            description: 'IT department approval',
            assigned_role: 'it',
            sla_hours: 48,
          }
        ),
        createStep(
          'step-4',
          'Final Sign-Off',
          4,
          'SIGN_OFF',
          { x: 100, y: 350 },
          {
            description: 'Final executive sign-off',
            assigned_role: 'executive',
            sla_hours: 48,
          }
        ),
      ],
      connections: [
        { id: 'conn-1', sourceStepId: 'step-1', targetStepId: 'step-2', isConditional: false },
        { id: 'conn-2', sourceStepId: 'step-1', targetStepId: 'step-3', isConditional: false },
        { id: 'conn-3', sourceStepId: 'step-2', targetStepId: 'step-4', isConditional: false },
        { id: 'conn-4', sourceStepId: 'step-3', targetStepId: 'step-4', isConditional: false },
      ],
      viewport: { zoom: 1, pan: { x: 0, y: 0 } },
    },
  },
  {
    id: 'kyc-verification',
    name: 'KYC Document Verification',
    description:
      'Know Your Customer verification workflow for financial compliance. Includes ID verification and compliance check.',
    category: 'Compliance',
    icon: Shield,
    color: 'bg-red-500',
    stepCount: 4,
    estimatedTime: '3-5 days',
    template: {
      name: 'KYC Verification Workflow',
      description: 'Customer identity verification for regulatory compliance',
      category: 'compliance',
      default_priority: 'HIGH',
      default_due_days: 5,
      applicable_document_types: ['id_document', 'passport', 'utility_bill', 'bank_statement'],
      is_active: false,
      steps: [
        createStep(
          'step-1',
          'Document Verification',
          1,
          'REVIEW',
          { x: 100, y: 100 },
          {
            description: 'Verify authenticity of submitted documents',
            assigned_role: 'kyc_analyst',
            sla_hours: 24,
            require_comment: true,
          }
        ),
        createStep(
          'step-2',
          'Identity Check',
          2,
          'APPROVAL',
          { x: 100, y: 250 },
          {
            description: 'Cross-reference identity information',
            assigned_role: 'kyc_analyst',
            sla_hours: 24,
          }
        ),
        createStep(
          'step-3',
          'Compliance Sign-Off',
          3,
          'SIGN_OFF',
          { x: 100, y: 400 },
          {
            description: 'Final compliance officer approval',
            assigned_role: 'compliance_officer',
            sla_hours: 48,
            require_comment: true,
          }
        ),
        createStep(
          'step-4',
          'Customer Notification',
          4,
          'NOTIFICATION',
          { x: 100, y: 550 },
          {
            description: 'Notify customer of verification status',
          }
        ),
      ],
      connections: [
        { id: 'conn-1', sourceStepId: 'step-1', targetStepId: 'step-2', isConditional: false },
        { id: 'conn-2', sourceStepId: 'step-2', targetStepId: 'step-3', isConditional: false },
        { id: 'conn-3', sourceStepId: 'step-3', targetStepId: 'step-4', isConditional: false },
      ],
      viewport: { zoom: 1, pan: { x: 50, y: 0 } },
    },
  },
  {
    id: 'employee-onboarding',
    name: 'Employee Onboarding',
    description:
      'New employee document collection and approval workflow. HR, IT, and department manager approvals.',
    category: 'HR',
    icon: Briefcase,
    color: 'bg-teal-500',
    stepCount: 5,
    estimatedTime: '5-7 days',
    template: {
      name: 'Employee Onboarding Workflow',
      description: 'Complete new hire documentation and approval process',
      category: 'hr',
      default_priority: 'MEDIUM',
      default_due_days: 7,
      applicable_document_types: ['employment_contract', 'tax_forms', 'id_document'],
      is_active: false,
      steps: [
        createStep(
          'step-1',
          'HR Document Review',
          1,
          'REVIEW',
          { x: 100, y: 100 },
          {
            description: 'HR reviews all submitted documents',
            assigned_role: 'hr',
            sla_hours: 48,
            require_comment: true,
          }
        ),
        createStep(
          'step-2',
          'Department Manager Approval',
          2,
          'APPROVAL',
          { x: 100, y: 250 },
          {
            description: 'Hiring manager confirms onboarding',
            assigned_role: 'manager',
            sla_hours: 48,
          }
        ),
        createStep(
          'step-3',
          'IT Setup Request',
          3,
          'NOTIFICATION',
          { x: 100, y: 400 },
          {
            description: 'Request IT to set up accounts and equipment',
            assigned_role: 'it',
          }
        ),
        createStep(
          'step-4',
          'HR Final Sign-Off',
          4,
          'SIGN_OFF',
          { x: 100, y: 550 },
          {
            description: 'HR final approval to complete onboarding',
            assigned_role: 'hr',
            sla_hours: 24,
          }
        ),
        createStep(
          'step-5',
          'Welcome Email',
          5,
          'NOTIFICATION',
          { x: 100, y: 700 },
          {
            description: 'Send welcome email to new employee',
          }
        ),
      ],
      connections: [
        { id: 'conn-1', sourceStepId: 'step-1', targetStepId: 'step-2', isConditional: false },
        { id: 'conn-2', sourceStepId: 'step-2', targetStepId: 'step-3', isConditional: false },
        { id: 'conn-3', sourceStepId: 'step-3', targetStepId: 'step-4', isConditional: false },
        { id: 'conn-4', sourceStepId: 'step-4', targetStepId: 'step-5', isConditional: false },
      ],
      viewport: { zoom: 0.9, pan: { x: 50, y: 0 } },
    },
  },
  {
    id: 'blank',
    name: 'Start from Scratch',
    description: 'Create a completely custom workflow from a blank canvas.',
    category: 'Custom',
    icon: Sparkles,
    color: 'bg-indigo-500',
    stepCount: 0,
    estimatedTime: 'Varies',
    template: {
      name: 'New Workflow Template',
      description: '',
      category: 'general',
      default_priority: 'MEDIUM',
      default_due_days: 7,
      applicable_document_types: [],
      is_active: false,
      steps: [],
      connections: [],
      viewport: { zoom: 1, pan: { x: 0, y: 0 } },
    },
  },
]

const CATEGORIES = [
  'All',
  'Finance',
  'Legal',
  'Compliance',
  'HR',
  'Procurement',
  'General',
  'Custom',
]

// =============================================================================
// Component
// =============================================================================

export default function TemplateGallery({
  isOpen,
  onClose,
  onSelectTemplate,
}: TemplateGalleryProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [hoveredTemplate, setHoveredTemplate] = useState<string | null>(null)

  if (!isOpen) return null

  const filteredTemplates = GALLERY_TEMPLATES.filter((template) => {
    const matchesSearch =
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'All' || template.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const handleSelectTemplate = (template: GalleryTemplate) => {
    // Clone the template to avoid mutation
    const clonedTemplate: DesignerTemplate = {
      ...template.template,
      steps: template.template.steps.map((step) => ({
        ...step,
        id: `step-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      })),
      connections: [],
    }

    // Update connection references with new step IDs
    const stepIdMap = new Map<string, string>()
    template.template.steps.forEach((originalStep, index) => {
      stepIdMap.set(originalStep.id, clonedTemplate.steps[index].id)
    })

    clonedTemplate.connections = template.template.connections.map((conn) => ({
      ...conn,
      id: `conn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      sourceStepId: stepIdMap.get(conn.sourceStepId) || conn.sourceStepId,
      targetStepId: stepIdMap.get(conn.targetStepId) || conn.targetStepId,
    }))

    onSelectTemplate(clonedTemplate)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Choose a Template
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Start with a pre-built workflow or create from scratch
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Search and Filters */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Category Filters */}
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  selectedCategory === category
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Template Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map((template) => {
              const Icon = template.icon
              const isHovered = hoveredTemplate === template.id

              return (
                <button
                  key={template.id}
                  onClick={() => handleSelectTemplate(template)}
                  onMouseEnter={() => setHoveredTemplate(template.id)}
                  onMouseLeave={() => setHoveredTemplate(null)}
                  className={`text-left p-4 rounded-xl border-2 transition-all ${
                    isHovered
                      ? 'border-blue-500 shadow-lg scale-[1.02]'
                      : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-12 h-12 ${template.color} rounded-lg flex items-center justify-center flex-shrink-0`}
                    >
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {template.name}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {template.category}
                      </p>
                    </div>
                  </div>

                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-3 line-clamp-2">
                    {template.description}
                  </p>

                  <div className="flex items-center gap-4 mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                      <CheckCircle className="h-3.5 w-3.5" />
                      <span>{template.stepCount} steps</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{template.estimatedTime}</span>
                    </div>
                  </div>

                  {isHovered && (
                    <div className="flex items-center justify-end gap-1 mt-3 text-sm font-medium text-blue-600 dark:text-blue-400">
                      <span>Use Template</span>
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          {filteredTemplates.length === 0 && (
            <div className="text-center py-12">
              <FileCheck className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                No templates found
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Try adjusting your search or filter criteria
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
