import React from 'react'
import { Shield, Lock, Eye, FileCheck, AlertTriangle, Server } from 'lucide-react'

/**
 * Security & Compliance Section
 * Build trust with security certifications and compliance badges
 */
const SecuritySection: React.FC = () => {
  const securityFeatures = [
    {
      icon: <Shield className="w-8 h-8" />,
      title: 'End-to-End Encryption',
      description:
        'AES-256 encryption at rest and TLS 1.3 in transit. Your data is always protected.',
    },
    {
      icon: <Lock className="w-8 h-8" />,
      title: 'Zero-Knowledge Architecture',
      description: 'We cannot access your data. Only you and authorized users have the keys.',
    },
    {
      icon: <Eye className="w-8 h-8" />,
      title: 'Immutable Audit Trail',
      description: 'Every action is logged permanently. Full compliance visibility for regulators.',
    },
    {
      icon: <FileCheck className="w-8 h-8" />,
      title: 'Compliance Ready',
      description:
        'Built-in compliance for GDPR, SOC 2, ISO 27001, HIPAA, and financial regulations.',
    },
    {
      icon: <AlertTriangle className="w-8 h-8" />,
      title: 'Advanced Threat Detection',
      description: 'AI-powered anomaly detection prevents unauthorized access and data breaches.',
    },
    {
      icon: <Server className="w-8 h-8" />,
      title: '99.9% Uptime SLA',
      description: 'Enterprise-grade infrastructure with automated failover and disaster recovery.',
    },
  ]

  const compliance = [
    { name: 'GDPR', description: 'EU Data Protection' },
    { name: 'SOC 2 Type II', description: 'Security & Availability' },
    { name: 'ISO 27001', description: 'Information Security' },
    { name: 'HIPAA', description: 'Healthcare Compliance' },
    { name: 'PCI DSS', description: 'Payment Security' },
    { name: 'SOX', description: 'Financial Compliance' },
  ]

  return (
    <section
      id="security"
      className="py-16 sm:py-24 bg-gradient-to-b from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 transition-colors duration-300"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <div className="inline-flex items-center space-x-2 bg-green-100 dark:bg-green-900/30 px-4 py-2 rounded-full mb-6">
            <Shield className="w-5 h-5 text-green-600 dark:text-green-400" />
            <span className="text-sm font-medium text-green-700 dark:text-green-300">
              Bank-Level Security
            </span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-6">
            Security & Compliance
            <br />
            <span className="bg-gradient-to-r from-green-600 to-blue-600 dark:from-green-400 dark:to-blue-400 bg-clip-text text-transparent">
              Built-In
            </span>
          </h2>
          <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-400">
            Trusted by financial institutions, legal firms, and healthcare organizations worldwide
          </p>
        </div>

        {/* Security Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 mb-16 sm:mb-20">
          {securityFeatures.map((feature, index) => (
            <div
              key={index}
              className="bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-gray-600"
              style={{
                animation: 'fadeInUp 0.6s ease-out forwards',
                animationDelay: `${index * 0.1}s`,
                opacity: 0,
              }}
            >
              {/* Icon */}
              <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-blue-500 rounded-xl flex items-center justify-center text-white mb-4 shadow-lg">
                {feature.icon}
              </div>

              {/* Title */}
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                {feature.title}
              </h3>

              {/* Description */}
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        {/* Compliance Badges */}
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-900 p-8 sm:p-12 rounded-3xl shadow-xl border border-gray-200 dark:border-gray-700">
          <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white text-center mb-8 sm:mb-12">
            Compliance Certifications
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 sm:gap-8">
            {compliance.map((cert, index) => (
              <div
                key={index}
                className="bg-white dark:bg-gray-700 p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 text-center border-2 border-gray-200 dark:border-gray-600"
                style={{
                  animation: 'fadeInUp 0.6s ease-out forwards',
                  animationDelay: `${index * 0.1 + 0.3}s`,
                  opacity: 0,
                }}
              >
                <div className="font-bold text-lg text-gray-900 dark:text-white mb-2">
                  {cert.name}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-300">{cert.description}</div>
              </div>
            ))}
          </div>

          <p className="text-center text-gray-600 dark:text-gray-300 mt-8 sm:mt-12">
            Independently audited and certified by leading security organizations
          </p>
        </div>

        {/* Trust Indicators */}
        <div className="mt-12 sm:mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div className="p-6">
            <div className="text-4xl sm:text-5xl font-bold text-blue-600 dark:text-blue-400 mb-2">
              500+
            </div>
            <p className="text-gray-600 dark:text-gray-300 font-medium">
              Financial Institutions Trust Us
            </p>
          </div>
          <div className="p-6">
            <div className="text-4xl sm:text-5xl font-bold text-green-600 dark:text-green-400 mb-2">
              99.9%
            </div>
            <p className="text-gray-600 dark:text-gray-300 font-medium">Uptime SLA Guaranteed</p>
          </div>
          <div className="p-6">
            <div className="text-4xl sm:text-5xl font-bold text-purple-600 dark:text-purple-400 mb-2">
              Zero
            </div>
            <p className="text-gray-600 dark:text-gray-300 font-medium">Security Breaches Ever</p>
          </div>
        </div>
      </div>
    </section>
  )
}

export default SecuritySection
