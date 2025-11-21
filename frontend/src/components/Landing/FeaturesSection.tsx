import React from 'react'
import {
  Search,
  Lock,
  Zap,
  Users,
  FolderTree,
  FileSearch,
  Shield,
  Clock,
  BarChart3,
  Cloud,
  Workflow,
  FileCheck,
} from 'lucide-react'

interface Feature {
  icon: React.ReactNode
  title: string
  description: string
  color: string
}

/**
 * Features Section - Showcase core product capabilities
 * Displays key features in an engaging grid layout
 */
const FeaturesSection: React.FC = () => {
  const features: Feature[] = [
    {
      icon: <Search className="w-6 h-6" />,
      title: 'AI-Powered Search',
      description:
        'Find any document instantly with intelligent full-text search, OCR for scanned files, and advanced filters.',
      color: 'from-blue-500 to-blue-600',
    },
    {
      icon: <Lock className="w-6 h-6" />,
      title: 'Military-Grade Encryption',
      description:
        'AES-256 encryption at rest, TLS 1.3 in transit, and end-to-end encryption for sensitive documents.',
      color: 'from-green-500 to-green-600',
    },
    {
      icon: <FolderTree className="w-6 h-6" />,
      title: 'Unlimited Hierarchy',
      description:
        'Organize with unlimited nested folders, smart folders, and customizable folder templates.',
      color: 'from-purple-500 to-purple-600',
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: 'Advanced RBAC',
      description:
        'Granular role-based access control with permission inheritance and department-based access.',
      color: 'from-orange-500 to-orange-600',
    },
    {
      icon: <FileCheck className="w-6 h-6" />,
      title: 'Automated Classification',
      description:
        'AI automatically categorizes and tags documents based on content, type, and metadata.',
      color: 'from-pink-500 to-pink-600',
    },
    {
      icon: <Clock className="w-6 h-6" />,
      title: 'Retention Policies',
      description:
        'Automatic archival and deletion based on compliance requirements with legal hold support.',
      color: 'from-indigo-500 to-indigo-600',
    },
    {
      icon: <FileSearch className="w-6 h-6" />,
      title: 'OCR & Text Extraction',
      description:
        'Extract text from scanned documents, PDFs, images, and make them fully searchable.',
      color: 'from-cyan-500 to-cyan-600',
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: 'Compliance Ready',
      description:
        'Built-in compliance for GDPR, KYC, AML, SOC 2, and industry-specific regulations.',
      color: 'from-red-500 to-red-600',
    },
    {
      icon: <Workflow className="w-6 h-6" />,
      title: 'Workflow Automation',
      description: 'Automate document routing, approvals, notifications, and retention policies.',
      color: 'from-yellow-500 to-yellow-600',
    },
    {
      icon: <BarChart3 className="w-6 h-6" />,
      title: 'Audit Trail',
      description: 'Immutable audit logs track every action with detailed reports for compliance.',
      color: 'from-teal-500 to-teal-600',
    },
    {
      icon: <Cloud className="w-6 h-6" />,
      title: 'Scalable Storage',
      description: 'Elastic S3-compatible storage that scales from gigabytes to petabytes.',
      color: 'from-blue-500 to-cyan-500',
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: 'Lightning Fast',
      description: 'Sub-second search, instant previews, and optimized for 1000+ concurrent users.',
      color: 'from-purple-500 to-pink-500',
    },
  ]

  return (
    <section
      id="features"
      className="py-16 sm:py-24 bg-white dark:bg-gray-900 transition-colors duration-300"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-6">
            Everything You Need to
            <br />
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
              Manage Documents
            </span>
          </h2>
          <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-400">
            Enterprise-grade features designed for financial institutions, legal firms, and large
            organizations
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group relative bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 p-6 sm:p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-gray-200 dark:border-gray-600"
              style={{
                animation: 'fadeInUp 0.6s ease-out forwards',
                animationDelay: `${index * 0.05}s`,
                opacity: 0,
              }}
            >
              {/* Icon */}
              <div
                className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center text-white mb-4 sm:mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300`}
              >
                {feature.icon}
              </div>

              {/* Title */}
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-2 sm:mb-3">
                {feature.title}
              </h3>

              {/* Description */}
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 leading-relaxed">
                {feature.description}
              </p>

              {/* Hover Effect Border */}
              <div className="absolute inset-0 rounded-2xl border-2 border-transparent group-hover:border-blue-500 dark:group-hover:border-blue-400 transition-colors duration-300 pointer-events-none" />
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-12 sm:mt-16 text-center">
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            And many more features to streamline your document management
          </p>
          <button className="px-8 py-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-300">
            Explore All Features
          </button>
        </div>
      </div>
    </section>
  )
}

export default FeaturesSection
