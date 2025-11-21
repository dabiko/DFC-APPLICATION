import React, { useState } from 'react'
import { Check, Zap } from 'lucide-react'

interface PricingSectionProps {
  onNavigate: (path: string) => void
}

/**
 * Pricing Section - Display subscription tiers
 * Shows Trial, Basic, Professional, and Enterprise plans
 */
const PricingSection: React.FC<PricingSectionProps> = ({ onNavigate }) => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly')

  const plans = [
    {
      name: 'Trial',
      tier: 'trial',
      tagline: 'Perfect for testing',
      monthlyPrice: 0,
      annualPrice: 0,
      popular: false,
      features: [
        '2 users',
        '5GB storage',
        '100 documents',
        '20 folders',
        'Basic search',
        '14-day trial',
      ],
    },
    {
      name: 'Basic',
      tier: 'basic',
      tagline: 'For small teams',
      monthlyPrice: 9.99,
      annualPrice: 99.99,
      popular: false,
      features: [
        '5 users',
        '50GB storage',
        '1,000 documents',
        '100 folders',
        'Advanced search',
        'Basic classification',
        'Email support',
      ],
    },
    {
      name: 'Professional',
      tier: 'professional',
      tagline: 'For growing businesses',
      monthlyPrice: 29.99,
      annualPrice: 299.99,
      popular: true,
      features: [
        '20 users',
        '500GB storage',
        '10,000 documents',
        '1,000 folders',
        'Advanced search with filters',
        'AI-powered classification',
        'OCR for scanned documents',
        'Advanced permissions (RBAC)',
        'Retention policies',
        'Priority email & chat support',
      ],
    },
    {
      name: 'Enterprise',
      tier: 'enterprise',
      tagline: 'For large organizations',
      monthlyPrice: 99.99,
      annualPrice: 999.99,
      popular: false,
      features: [
        'Unlimited users',
        '5TB storage',
        '100,000 documents',
        '10,000 folders',
        'All Professional features',
        'Legal hold',
        'Advanced audit trails',
        'Custom integrations',
        'Dedicated account manager',
        '24/7 phone & email support',
        'SLA guarantee (99.9% uptime)',
      ],
    },
  ]

  const getPrice = (plan: (typeof plans)[0]) => {
    if (plan.monthlyPrice === 0) return 'Free'
    const price = billingCycle === 'monthly' ? plan.monthlyPrice : plan.annualPrice
    return `$${price}`
  }

  const getPricePeriod = (plan: (typeof plans)[0]) => {
    if (plan.monthlyPrice === 0) return '14 days'
    return billingCycle === 'monthly' ? '/month' : '/year'
  }

  const getSavings = (plan: (typeof plans)[0]) => {
    if (plan.monthlyPrice === 0 || billingCycle === 'monthly') return null
    const monthlyCost = plan.monthlyPrice * 12
    const annualCost = plan.annualPrice
    const savings = monthlyCost - annualCost
    const percentage = Math.round((savings / monthlyCost) * 100)
    return `Save ${percentage}%`
  }

  return (
    <section
      id="pricing"
      className="py-16 sm:py-24 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 transition-colors duration-300"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-6">
            Simple, Transparent
            <br />
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
              Pricing
            </span>
          </h2>
          <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-400 mb-8">
            Choose the plan that fits your organization's needs
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex items-center bg-white dark:bg-gray-800 p-1 rounded-lg shadow-lg">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-6 py-2 rounded-md font-medium transition-all duration-200 ${
                billingCycle === 'monthly'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              className={`px-6 py-2 rounded-md font-medium transition-all duration-200 relative ${
                billingCycle === 'annual'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Annual
              <span className="absolute -top-3 -right-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
                Save 17%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 max-w-7xl mx-auto">
          {plans.map((plan, index) => (
            <div
              key={plan.tier}
              className={`relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border-2 ${
                plan.popular
                  ? 'border-blue-500 dark:border-blue-400'
                  : 'border-gray-200 dark:border-gray-600'
              }`}
              style={{
                animation: 'fadeInUp 0.6s ease-out forwards',
                animationDelay: `${index * 0.1}s`,
                opacity: 0,
              }}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-1 rounded-full text-sm font-semibold shadow-lg flex items-center space-x-1">
                    <Zap className="w-4 h-4" />
                    <span>Most Popular</span>
                  </div>
                </div>
              )}

              <div className="p-6 sm:p-8">
                {/* Plan Name */}
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {plan.name}
                </h3>

                {/* Tagline */}
                <p className="text-gray-600 dark:text-gray-300 mb-6">{plan.tagline}</p>

                {/* Price */}
                <div className="mb-6">
                  <div className="flex items-baseline">
                    <span className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white">
                      {getPrice(plan)}
                    </span>
                    <span className="ml-2 text-gray-600 dark:text-gray-300">
                      {getPricePeriod(plan)}
                    </span>
                  </div>
                  {getSavings(plan) && (
                    <p className="mt-2 text-sm font-medium text-green-600 dark:text-green-400">
                      {getSavings(plan)}
                    </p>
                  )}
                </div>

                {/* CTA Button */}
                <button
                  onClick={() => onNavigate('/register')}
                  className={`w-full py-3 px-6 rounded-lg font-semibold transition-all duration-200 mb-8 ${
                    plan.popular
                      ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl'
                      : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white'
                  }`}
                >
                  {plan.monthlyPrice === 0 ? 'Start Free Trial' : 'Get Started'}
                </button>

                {/* Features List */}
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
                    What's included:
                  </p>
                  {plan.features.map((feature, idx) => (
                    <div key={idx} className="flex items-start space-x-3">
                      <Check className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-600 dark:text-gray-300">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Note */}
        <div className="mt-12 sm:mt-16 text-center">
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            All plans include 14-day free trial • No credit card required • Cancel anytime
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Need a custom plan?{' '}
            <button className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
              Contact Sales
            </button>
          </p>
        </div>
      </div>
    </section>
  )
}

export default PricingSection
