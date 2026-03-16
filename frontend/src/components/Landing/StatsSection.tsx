import React from 'react'
import { TrendingUp, Users, FileText, Globe, ClipboardList, GraduationCap } from 'lucide-react'

/**
 * Stats Section - Social proof and key metrics
 * Display impressive statistics to build credibility
 */
const StatsSection: React.FC = () => {
  const stats = [
    {
      icon: <Users className="w-8 h-8" />,
      value: '10,000+',
      label: 'Active Users',
      description: 'Across 40+ countries worldwide',
      color: 'from-blue-500 to-cyan-500',
    },
    {
      icon: <FileText className="w-8 h-8" />,
      value: '50M+',
      label: 'Documents Managed',
      description: 'Securely stored and organized',
      color: 'from-purple-500 to-pink-500',
    },
    {
      icon: <ClipboardList className="w-8 h-8" />,
      value: '25,000+',
      label: 'Procedures Published',
      description: 'Versioned, reviewed, and approved',
      color: 'from-indigo-500 to-violet-500',
    },
    {
      icon: <GraduationCap className="w-8 h-8" />,
      value: '98%',
      label: 'Training Pass Rate',
      description: 'With built-in quizzes and tracking',
      color: 'from-emerald-500 to-teal-500',
    },
    {
      icon: <Globe className="w-8 h-8" />,
      value: '500+',
      label: 'Organizations',
      description: 'Financial institutions, legal firms, healthcare',
      color: 'from-green-500 to-teal-500',
    },
    {
      icon: <TrendingUp className="w-8 h-8" />,
      value: '99.9%',
      label: 'Uptime',
      description: 'Guaranteed SLA with 24/7 monitoring',
      color: 'from-orange-500 to-red-500',
    },
  ]

  const testimonials = [
    {
      quote:
        "DabiTech's DFC transformed our document management. We reduced retrieval time by 80% and ensured full compliance with financial regulations.",
      author: 'Sarah Chen',
      role: 'Chief Compliance Officer',
      company: 'Global Finance Corp',
    },
    {
      quote:
        'The AI-powered classification and search capabilities are game-changing. Our legal team can now find any document in seconds, not hours.',
      author: 'Michael Roberts',
      role: 'IT Director',
      company: 'Roberts & Associates Law Firm',
    },
    {
      quote:
        'Security was our top priority. DFC exceeded our expectations with bank-level encryption and comprehensive audit trails for GDPR compliance.',
      author: 'Dr. Emily Johnson',
      role: 'Information Security Manager',
      company: 'HealthCare Systems Inc',
    },
  ]

  return (
    <section className="py-16 sm:py-24 bg-white dark:bg-gray-900 transition-colors duration-300">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 mb-16 sm:mb-24">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="relative bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 p-6 sm:p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border border-gray-200 dark:border-gray-600 text-center"
              style={{
                animation: 'fadeInUp 0.6s ease-out forwards',
                animationDelay: `${index * 0.1}s`,
                opacity: 0,
              }}
            >
              {/* Icon */}
              <div
                className={`w-16 h-16 mx-auto mb-4 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center text-white shadow-lg`}
              >
                {stat.icon}
              </div>

              {/* Value */}
              <div className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-2">
                {stat.value}
              </div>

              {/* Label */}
              <div className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
                {stat.label}
              </div>

              {/* Description */}
              <p className="text-sm text-gray-600 dark:text-gray-300">{stat.description}</p>
            </div>
          ))}
        </div>

        {/* Testimonials Section */}
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white text-center mb-12 sm:mb-16">
            Trusted by Industry Leaders
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-900 p-6 sm:p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-gray-600"
                style={{
                  animation: 'fadeInUp 0.6s ease-out forwards',
                  animationDelay: `${index * 0.15 + 0.3}s`,
                  opacity: 0,
                }}
              >
                {/* Quote */}
                <div className="mb-6">
                  <svg
                    className="w-10 h-10 text-blue-600 dark:text-blue-400 mb-4"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                  </svg>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
                    "{testimonial.quote}"
                  </p>
                </div>

                {/* Author */}
                <div>
                  <div className="font-bold text-gray-900 dark:text-white">
                    {testimonial.author}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">{testimonial.role}</div>
                  <div className="text-sm font-medium text-blue-600 dark:text-blue-400 mt-1">
                    {testimonial.company}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

export default StatsSection
