/**
 * FeaturesTab Component
 *
 * Displays available features based on subscription plan.
 * Features are read-only and determined by the organization's subscription.
 */

import {
  Search,
  FileText,
  GitBranch,
  Folder,
  Share2,
  Users,
  MessageSquare,
  Shield,
  Clock,
  Lock,
  BarChart3,
  Code,
  Zap,
  TrendingUp,
  FileOutput,
  Palette,
  Headphones,
  Key,
  Check,
  X,
  Crown,
  Sparkles,
  ArrowUpRight,
} from 'lucide-react'
import type { FeatureFlags } from '@/services/organizationSettingsService'
import { cn } from '@/utils/cn'

interface FeaturesTabProps {
  featureFlags: FeatureFlags
  subscriptionPlan: 'free' | 'starter' | 'professional' | 'enterprise'
}

// Feature definitions with icons and categories
const FEATURE_CATEGORIES = [
  {
    name: 'Core Features',
    features: [
      {
        key: 'advanced_search',
        label: 'Advanced Search',
        description: 'Full-text search with filters and facets',
        icon: Search,
      },
      {
        key: 'ocr_processing',
        label: 'OCR Processing',
        description: 'Extract text from scanned documents',
        icon: FileText,
      },
      {
        key: 'version_control',
        label: 'Version Control',
        description: 'Document version history and rollback',
        icon: GitBranch,
      },
      {
        key: 'folder_templates',
        label: 'Folder Templates',
        description: 'Pre-defined folder structures',
        icon: Folder,
      },
    ],
  },
  {
    name: 'Collaboration',
    features: [
      {
        key: 'external_sharing',
        label: 'External Sharing',
        description: 'Share documents with external users',
        icon: Share2,
      },
      {
        key: 'real_time_collaboration',
        label: 'Real-time Collaboration',
        description: 'Simultaneous document editing',
        icon: Users,
      },
      {
        key: 'comments_annotations',
        label: 'Comments & Annotations',
        description: 'Add comments and annotations to documents',
        icon: MessageSquare,
      },
    ],
  },
  {
    name: 'Compliance & Security',
    features: [
      {
        key: 'advanced_audit',
        label: 'Advanced Audit',
        description: 'Detailed audit logs and reports',
        icon: Shield,
      },
      {
        key: 'retention_policies',
        label: 'Retention Policies',
        description: 'Automated document retention rules',
        icon: Clock,
      },
      {
        key: 'legal_hold',
        label: 'Legal Hold',
        description: 'Preserve documents for legal proceedings',
        icon: Lock,
      },
      {
        key: 'compliance_reports',
        label: 'Compliance Reports',
        description: 'Generate compliance documentation',
        icon: BarChart3,
      },
      {
        key: 'data_classification',
        label: 'Data Classification',
        description: 'Automatic document classification',
        icon: FileText,
      },
    ],
  },
  {
    name: 'Workflow & Automation',
    features: [
      {
        key: 'basic_workflows',
        label: 'Basic Workflows',
        description: 'Simple approval workflows',
        icon: GitBranch,
      },
      {
        key: 'advanced_workflows',
        label: 'Advanced Workflows',
        description: 'Complex workflow designer',
        icon: Zap,
      },
      {
        key: 'scheduled_tasks',
        label: 'Scheduled Tasks',
        description: 'Automated scheduled operations',
        icon: Clock,
      },
      {
        key: 'api_access',
        label: 'API Access',
        description: 'REST API for integrations',
        icon: Code,
      },
      {
        key: 'webhooks',
        label: 'Webhooks',
        description: 'Event-based notifications',
        icon: Zap,
      },
    ],
  },
  {
    name: 'Analytics & Reporting',
    features: [
      {
        key: 'basic_analytics',
        label: 'Basic Analytics',
        description: 'Usage statistics and metrics',
        icon: BarChart3,
      },
      {
        key: 'advanced_analytics',
        label: 'Advanced Analytics',
        description: 'Deep insights and trends',
        icon: TrendingUp,
      },
      {
        key: 'custom_reports',
        label: 'Custom Reports',
        description: 'Build custom report templates',
        icon: FileOutput,
      },
      {
        key: 'export_reports',
        label: 'Export Reports',
        description: 'Export to PDF/Excel',
        icon: FileOutput,
      },
    ],
  },
  {
    name: 'Administration',
    features: [
      {
        key: 'custom_roles',
        label: 'Custom Roles',
        description: 'Create custom permission roles',
        icon: Key,
      },
      {
        key: 'sso_integration',
        label: 'SSO Integration',
        description: 'Single sign-on with SAML/OAuth',
        icon: Lock,
      },
      {
        key: 'custom_branding',
        label: 'Custom Branding',
        description: 'White-label and custom themes',
        icon: Palette,
      },
      {
        key: 'priority_support',
        label: 'Priority Support',
        description: '24/7 priority customer support',
        icon: Headphones,
      },
    ],
  },
]

const PLAN_INFO = {
  free: {
    label: 'Free Trial',
    color: 'gray',
    description: 'Basic features for evaluation',
  },
  starter: {
    label: 'Starter',
    color: 'blue',
    description: 'Essential features for small teams',
  },
  professional: {
    label: 'Professional',
    color: 'purple',
    description: 'Advanced features for growing organizations',
  },
  enterprise: {
    label: 'Enterprise',
    color: 'yellow',
    description: 'Full feature set with priority support',
  },
}

export function FeaturesTab({ featureFlags, subscriptionPlan }: FeaturesTabProps) {
  const planInfo = PLAN_INFO[subscriptionPlan]

  // Count enabled features
  const totalFeatures = FEATURE_CATEGORIES.flatMap((c) => c.features).length
  const enabledFeatures = FEATURE_CATEGORIES.flatMap((c) => c.features).filter(
    (f) => featureFlags[f.key as keyof FeatureFlags]
  ).length

  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div
              className={cn(
                'p-3 rounded-xl',
                planInfo.color === 'gray' && 'bg-gray-100 dark:bg-gray-700',
                planInfo.color === 'blue' && 'bg-blue-100 dark:bg-blue-900/30',
                planInfo.color === 'purple' && 'bg-purple-100 dark:bg-purple-900/30',
                planInfo.color === 'yellow' && 'bg-yellow-100 dark:bg-yellow-900/30'
              )}
            >
              <Crown
                className={cn(
                  'w-6 h-6',
                  planInfo.color === 'gray' && 'text-gray-600 dark:text-gray-400',
                  planInfo.color === 'blue' && 'text-blue-600 dark:text-blue-400',
                  planInfo.color === 'purple' && 'text-purple-600 dark:text-purple-400',
                  planInfo.color === 'yellow' && 'text-yellow-600 dark:text-yellow-400'
                )}
              />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {planInfo.label} Plan
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{planInfo.description}</p>
            </div>
          </div>

          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {enabledFeatures}/{totalFeatures}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Features enabled</p>
          </div>
        </div>

        {subscriptionPlan !== 'enterprise' && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors">
              <Sparkles className="w-4 h-4" />
              Upgrade to unlock more features
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Feature Categories */}
      {FEATURE_CATEGORIES.map((category) => (
        <div
          key={category.name}
          className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{category.name}</h3>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {category.features.map((feature) => {
              const isEnabled = featureFlags[feature.key as keyof FeatureFlags]
              const Icon = feature.icon

              return (
                <div
                  key={feature.key}
                  className={cn(
                    'flex items-center justify-between px-6 py-4 transition-colors',
                    isEnabled ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-800/50'
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={cn(
                        'p-2 rounded-lg',
                        isEnabled
                          ? 'bg-green-100 dark:bg-green-900/30'
                          : 'bg-gray-100 dark:bg-gray-700'
                      )}
                    >
                      <Icon
                        className={cn(
                          'w-5 h-5',
                          isEnabled ? 'text-green-600 dark:text-green-400' : 'text-gray-400'
                        )}
                      />
                    </div>
                    <div>
                      <p
                        className={cn(
                          'text-sm font-medium',
                          isEnabled
                            ? 'text-gray-900 dark:text-white'
                            : 'text-gray-500 dark:text-gray-400'
                        )}
                      >
                        {feature.label}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {feature.description}
                      </p>
                    </div>
                  </div>

                  <div
                    className={cn(
                      'flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium',
                      isEnabled
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                    )}
                  >
                    {isEnabled ? (
                      <>
                        <Check className="w-3 h-3" />
                        Enabled
                      </>
                    ) : (
                      <>
                        <X className="w-3 h-3" />
                        Not Available
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {/* Upgrade CTA */}
      {subscriptionPlan !== 'enterprise' && (
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold mb-1">Unlock All Features</h3>
              <p className="text-sm text-indigo-100">
                Upgrade to Enterprise for full access to all features, priority support, and
                unlimited usage.
              </p>
            </div>
            <button className="flex items-center gap-2 px-5 py-2.5 bg-white text-indigo-600 font-medium rounded-lg hover:bg-indigo-50 transition-colors">
              <Sparkles className="w-4 h-4" />
              Upgrade Now
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default FeaturesTab
