import React from 'react'
import { ArrowRight, Check } from 'lucide-react'

interface CTASectionProps {
  onNavigate: (path: string) => void
}

/**
 * CTA Section - Final conversion push
 * Compelling call-to-action to convert visitors
 */
const CTASection: React.FC<CTASectionProps> = ({ onNavigate }) => {
  const benefits = [
    '14-day free trial',
    'No credit card required',
    'Full access to all features',
    'Cancel anytime',
    'Setup in 5 minutes',
    '24/7 support included',
  ]

  return (
    <section className="py-16 sm:py-24 bg-gradient-to-br from-blue-600 to-purple-600 dark:from-blue-700 dark:to-purple-700 relative overflow-hidden">
      {/* Decorative Elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-64 h-64 bg-white rounded-full blur-3xl transform -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl transform translate-x-1/3 translate-y-1/3" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Headline */}
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 sm:mb-8">
            Ready to Transform Your
            <br />
            Document Management?
          </h2>

          {/* Subheadline */}
          <p className="text-lg sm:text-xl md:text-2xl text-blue-100 mb-10 sm:mb-12 max-w-2xl mx-auto">
            Join 500+ organizations that trust DabiTech DFC for secure, compliant, and efficient
            document management
          </p>

          {/* Benefits Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-10 sm:mb-12 max-w-3xl mx-auto">
            {benefits.map((benefit, index) => (
              <div
                key={index}
                className="flex items-center justify-center space-x-2 bg-white/10 backdrop-blur-sm px-4 py-3 rounded-lg text-white"
              >
                <Check className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm font-medium">{benefit}</span>
              </div>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6 mb-8">
            <button
              onClick={() => onNavigate('/register')}
              className="group w-full sm:w-auto px-10 py-4 bg-white hover:bg-gray-100 text-blue-600 font-bold rounded-lg shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:-translate-y-1 flex items-center justify-center space-x-2 text-lg"
            >
              <span>Start Free Trial</span>
              <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform duration-300" />
            </button>
            <button
              onClick={() => onNavigate('/contact')}
              className="w-full sm:w-auto px-10 py-4 bg-transparent hover:bg-white/10 text-white font-bold rounded-lg border-2 border-white transition-all duration-300 text-lg"
            >
              Talk to Sales
            </button>
          </div>

          {/* Trust Badge */}
          <p className="text-blue-100 text-sm">
            Used by teams at Fortune 500 companies and leading financial institutions
          </p>
        </div>
      </div>
    </section>
  )
}

export default CTASection
