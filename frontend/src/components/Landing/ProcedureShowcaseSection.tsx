import React from 'react'
import { ClipboardList, GitBranch, GraduationCap, ArrowRight, CheckCircle } from 'lucide-react'

/**
 * Procedure Showcase Section
 *
 * Highlights the end-to-end procedure lifecycle:
 * Author → Review & Approve → Publish → Train & Certify
 */
const ProcedureShowcaseSection: React.FC = () => {
  const steps = [
    {
      icon: <ClipboardList className="w-8 h-8" />,
      number: '01',
      title: 'Author Procedures',
      description:
        'Build step-by-step procedures with rich text, video, attachments, branching logic, and inline quizzes. Collaborate with step owners across departments.',
      highlights: [
        'Step-by-step builder with drag & drop',
        'Video, documents & attachment support',
        'Conditional branching per role or department',
        'Multiple-choice, ordering & short-answer quizzes',
      ],
      color: 'blue',
      gradient: 'from-blue-500 to-indigo-600',
    },
    {
      icon: <GitBranch className="w-8 h-8" />,
      number: '02',
      title: 'Review & Approve',
      description:
        'Submit for multi-step review with parallel reviewers. Track approval progress per step, add comments, and manage workflow tasks from a unified inbox.',
      highlights: [
        'Parallel & sequential review workflows',
        'Per-step and procedure-level approval',
        'SLA tracking with escalation rules',
        'Comment threads and change requests',
      ],
      color: 'purple',
      gradient: 'from-purple-500 to-violet-600',
    },
    {
      icon: <GraduationCap className="w-8 h-8" />,
      number: '03',
      title: 'Train & Certify',
      description:
        'Assign published procedures as training. Trainees progress step-by-step, complete quizzes, and earn completion scores. Export evidence for auditors.',
      highlights: [
        'Assign by user, department, or role',
        'Step gates: read, watch, open, quiz',
        'Auto-graded quizzes with retry limits',
        'Compliance evidence export (CSV / PDF)',
      ],
      color: 'green',
      gradient: 'from-emerald-500 to-green-600',
    },
  ]

  const colorMap: Record<string, { bg: string; text: string; border: string; badge: string }> = {
    blue: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      text: 'text-blue-600 dark:text-blue-400',
      border: 'border-blue-200 dark:border-blue-800',
      badge: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
    },
    purple: {
      bg: 'bg-purple-50 dark:bg-purple-900/20',
      text: 'text-purple-600 dark:text-purple-400',
      border: 'border-purple-200 dark:border-purple-800',
      badge: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300',
    },
    green: {
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
      text: 'text-emerald-600 dark:text-emerald-400',
      border: 'border-emerald-200 dark:border-emerald-800',
      badge: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300',
    },
  }

  return (
    <section
      id="procedures"
      className="py-16 sm:py-24 bg-gray-50 dark:bg-gray-800/50 transition-colors duration-300"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <div className="inline-flex items-center space-x-2 bg-indigo-100 dark:bg-indigo-900/30 px-4 py-2 rounded-full mb-4">
            <ClipboardList className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
              End-to-End Procedure Lifecycle
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-6">
            From Authoring to
            <br />
            <span className="bg-gradient-to-r from-indigo-600 to-emerald-600 dark:from-indigo-400 dark:to-emerald-400 bg-clip-text text-transparent">
              Compliance Certification
            </span>
          </h2>
          <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-400">
            Author operational procedures, route them through approval workflows, and deliver
            trackable training — all within DFC
          </p>
        </div>

        {/* Steps */}
        <div className="max-w-6xl mx-auto space-y-8 sm:space-y-12">
          {steps.map((step, index) => {
            const colors = colorMap[step.color]
            const isEven = index % 2 === 1
            return (
              <div
                key={step.number}
                className={`flex flex-col ${isEven ? 'lg:flex-row-reverse' : 'lg:flex-row'} items-center gap-8 lg:gap-12`}
                style={{
                  animation: 'fadeInUp 0.6s ease-out forwards',
                  animationDelay: `${index * 0.15}s`,
                  opacity: 0,
                }}
              >
                {/* Visual */}
                <div className="flex-1 w-full">
                  <div
                    className={`relative ${colors.bg} ${colors.border} border rounded-2xl p-8 sm:p-10`}
                  >
                    {/* Step number badge */}
                    <div
                      className={`absolute -top-4 ${isEven ? 'right-6' : 'left-6'} w-10 h-10 rounded-full bg-gradient-to-br ${step.gradient} flex items-center justify-center text-white text-sm font-bold shadow-lg`}
                    >
                      {step.number}
                    </div>

                    {/* Icon */}
                    <div
                      className={`w-16 h-16 rounded-xl bg-gradient-to-br ${step.gradient} flex items-center justify-center text-white mb-6 shadow-lg`}
                    >
                      {step.icon}
                    </div>

                    <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-3">
                      {step.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-6">
                      {step.description}
                    </p>

                    {/* Highlights */}
                    <ul className="space-y-2.5">
                      {step.highlights.map((highlight, i) => (
                        <li key={i} className="flex items-start gap-2.5">
                          <CheckCircle className={`w-5 h-5 ${colors.text} flex-shrink-0 mt-0.5`} />
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {highlight}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Arrow connector (desktop only) */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:flex flex-col items-center justify-center">
                    <ArrowRight
                      className={`w-8 h-8 ${colors.text} ${isEven ? 'rotate-180' : ''}`}
                    />
                  </div>
                )}

                {/* Spacer for layout balance */}
                {index === steps.length - 1 && <div className="hidden lg:block flex-1" />}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export default ProcedureShowcaseSection
