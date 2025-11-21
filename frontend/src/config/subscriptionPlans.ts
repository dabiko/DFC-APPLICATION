/**
 * Subscription Plans Configuration for Digital Filing Cabinet
 * Defines pricing tiers, features, and limits for each plan
 */

export const SUBSCRIPTION_PLANS = {
  BASIC: {
    id: 'basic',
    name: 'Basic',
    description: 'Essential document management for small teams',
    price: {
      monthly: 9.99,
      annual: 99.99, // ~17% discount
      currency: 'USD',
    },
    features: [
      'Up to 5 users',
      '100 GB storage',
      '10,000 documents',
      'Basic search functionality',
      'Standard folder organization',
      'Email support (48h response)',
      'Basic audit logs (30 days)',
      'Mobile app access',
      'AES-256 encryption',
    ],
    limits: {
      users: 5,
      storageGB: 100,
      documents: 10000,
      folders: 1000,
      apiCallsPerMonth: 50000,
      retentionPolicyDays: 365,
      auditLogDays: 30,
      versioningPerDocument: 5,
    },
    highlighted: false,
  },
  PROFESSIONAL: {
    id: 'professional',
    name: 'Professional',
    description: 'Advanced features for growing businesses',
    price: {
      monthly: 29.99,
      annual: 299.99, // ~17% discount
      currency: 'USD',
    },
    features: [
      'Up to 25 users',
      '500 GB storage',
      '50,000 documents',
      'Advanced full-text search with OCR',
      'Unlimited folders & nested hierarchy',
      'Priority email & chat support (24h response)',
      'Extended audit logs (90 days)',
      'Mobile app access',
      'Role-based access control (RBAC)',
      'Document versioning',
      'Automated retention policies',
      'Secure document sharing with expiry',
      'AES-256 encryption + field-level encryption',
      'Compliance reports',
      'API access',
    ],
    limits: {
      users: 25,
      storageGB: 500,
      documents: 50000,
      folders: 10000,
      apiCallsPerMonth: 250000,
      retentionPolicyDays: 1825, // 5 years
      auditLogDays: 90,
      versioningPerDocument: 20,
    },
    highlighted: true, // Recommended plan
  },
  ENTERPRISE: {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'Full-scale solution for large organizations',
    price: {
      monthly: 99.99,
      annual: 999.99, // ~17% discount
      currency: 'USD',
      custom: true, // Custom pricing available
    },
    features: [
      'Unlimited users',
      '2 TB storage (expandable)',
      'Unlimited documents',
      'AI-powered search & classification',
      'Unlimited folders & smart folders',
      'Dedicated account manager',
      '24/7 phone, email & chat support',
      'Unlimited audit logs',
      'Mobile app access',
      'Advanced RBAC with custom roles',
      'Unlimited document versioning',
      'Automated retention & legal hold',
      'Secure sharing with advanced controls',
      'AES-256 + custom encryption keys',
      'Full compliance suite (GDPR, HIPAA, SOC 2)',
      'White-label options',
      'SSO & multi-factor authentication',
      'Advanced API with webhooks',
      'Custom integrations',
      'On-premise deployment option',
      'SLA guarantee (99.9% uptime)',
    ],
    limits: {
      users: -1, // Unlimited
      storageGB: 2048, // 2TB base, expandable
      documents: -1, // Unlimited
      folders: -1, // Unlimited
      apiCallsPerMonth: -1, // Unlimited
      retentionPolicyDays: -1, // Unlimited
      auditLogDays: -1, // Unlimited
      versioningPerDocument: -1, // Unlimited
    },
    highlighted: false,
  },
  TRIAL: {
    id: 'trial',
    name: 'Free Trial',
    description: '14-day trial with Professional features',
    price: {
      monthly: 0,
      annual: 0,
      currency: 'USD',
    },
    features: [
      'All Professional features',
      '14-day trial period',
      'No credit card required',
      'Easy upgrade anytime',
    ],
    limits: {
      users: 5,
      storageGB: 50,
      documents: 5000,
      folders: 1000,
      apiCallsPerMonth: 10000,
      retentionPolicyDays: 365,
      auditLogDays: 30,
      versioningPerDocument: 10,
      trialDays: 14,
    },
    highlighted: false,
    trial: true,
  },
} as const

export type PlanId = keyof typeof SUBSCRIPTION_PLANS

/**
 * Plan comparison matrix for features
 */
export const FEATURE_COMPARISON = [
  {
    category: 'Users & Access',
    features: [
      {
        name: 'Number of users',
        basic: '5 users',
        professional: '25 users',
        enterprise: 'Unlimited',
      },
      {
        name: 'Role-based access control',
        basic: false,
        professional: true,
        enterprise: true,
      },
      {
        name: 'Custom roles',
        basic: false,
        professional: false,
        enterprise: true,
      },
      {
        name: 'Single Sign-On (SSO)',
        basic: false,
        professional: false,
        enterprise: true,
      },
      {
        name: 'Multi-Factor Authentication',
        basic: false,
        professional: true,
        enterprise: true,
      },
    ],
  },
  {
    category: 'Storage & Documents',
    features: [
      {
        name: 'Storage space',
        basic: '100 GB',
        professional: '500 GB',
        enterprise: '2 TB+',
      },
      {
        name: 'Document limit',
        basic: '10,000',
        professional: '50,000',
        enterprise: 'Unlimited',
      },
      {
        name: 'File versioning',
        basic: '5 versions',
        professional: '20 versions',
        enterprise: 'Unlimited',
      },
      {
        name: 'Folder limit',
        basic: '1,000',
        professional: '10,000',
        enterprise: 'Unlimited',
      },
    ],
  },
  {
    category: 'Search & Classification',
    features: [
      {
        name: 'Full-text search',
        basic: 'Basic',
        professional: 'Advanced',
        enterprise: 'AI-powered',
      },
      {
        name: 'OCR for scanned documents',
        basic: false,
        professional: true,
        enterprise: true,
      },
      {
        name: 'Automated classification',
        basic: false,
        professional: true,
        enterprise: true,
      },
      {
        name: 'Smart folders',
        basic: false,
        professional: true,
        enterprise: true,
      },
    ],
  },
  {
    category: 'Security & Compliance',
    features: [
      {
        name: 'Encryption at rest',
        basic: 'AES-256',
        professional: 'AES-256',
        enterprise: 'AES-256 + Custom Keys',
      },
      {
        name: 'Audit logs retention',
        basic: '30 days',
        professional: '90 days',
        enterprise: 'Unlimited',
      },
      {
        name: 'Retention policies',
        basic: 'Basic',
        professional: 'Advanced',
        enterprise: 'Custom',
      },
      {
        name: 'Legal hold',
        basic: false,
        professional: true,
        enterprise: true,
      },
      {
        name: 'Compliance reports',
        basic: false,
        professional: true,
        enterprise: 'Full suite',
      },
    ],
  },
  {
    category: 'Support',
    features: [
      {
        name: 'Support channel',
        basic: 'Email',
        professional: 'Email + Chat',
        enterprise: '24/7 Phone, Email, Chat',
      },
      {
        name: 'Response time',
        basic: '48 hours',
        professional: '24 hours',
        enterprise: '<4 hours',
      },
      {
        name: 'Dedicated account manager',
        basic: false,
        professional: false,
        enterprise: true,
      },
      {
        name: 'Onboarding assistance',
        basic: 'Self-service',
        professional: 'Guided',
        enterprise: 'White-glove',
      },
    ],
  },
  {
    category: 'Integration & API',
    features: [
      {
        name: 'API access',
        basic: false,
        professional: true,
        enterprise: true,
      },
      {
        name: 'API calls per month',
        basic: 'N/A',
        professional: '250,000',
        enterprise: 'Unlimited',
      },
      {
        name: 'Webhooks',
        basic: false,
        professional: false,
        enterprise: true,
      },
      {
        name: 'Custom integrations',
        basic: false,
        professional: false,
        enterprise: true,
      },
    ],
  },
]

/**
 * Billing cycle options
 */
export const BILLING_CYCLES = {
  MONTHLY: 'monthly',
  ANNUAL: 'annual',
} as const

/**
 * Calculate discount percentage for annual billing
 */
export function getAnnualDiscount(planId: PlanId): number {
  const plan = SUBSCRIPTION_PLANS[planId]
  if (!plan || plan.id === 'trial') return 0

  const monthlyTotal = plan.price.monthly * 12
  const annualPrice = plan.price.annual
  const discount = ((monthlyTotal - annualPrice) / monthlyTotal) * 100

  return Math.round(discount)
}

/**
 * Format price for display
 */
export function formatPrice(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

/**
 * Get plan by ID
 */
export function getPlanById(planId: string): (typeof SUBSCRIPTION_PLANS)[PlanId] | undefined {
  return SUBSCRIPTION_PLANS[planId.toUpperCase() as PlanId]
}

/**
 * Check if a feature is unlimited
 */
export function isUnlimited(value: number): boolean {
  return value === -1
}

/**
 * Format limit value for display
 */
export function formatLimit(value: number, unit: string = ''): string {
  if (isUnlimited(value)) return 'Unlimited'
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M ${unit}`.trim()
  if (value >= 1000) return `${(value / 1000).toFixed(0)}K ${unit}`.trim()
  return `${value} ${unit}`.trim()
}
