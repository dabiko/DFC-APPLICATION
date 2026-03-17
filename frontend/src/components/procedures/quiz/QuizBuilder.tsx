/**
 * QuizBuilder — Full quiz authoring interface.
 * Combines quiz settings, question list, and preview.
 */

import { useState, useRef, useEffect } from 'react'
import {
  Plus,
  Eye,
  Save,
  Loader2,
  Settings,
  HelpCircle,
  ChevronDown,
  Check,
  ListChecks,
  ClipboardCheck,
} from 'lucide-react'
import { QuizSettingsPanel } from './QuizSettingsPanel'
import { QuestionList } from './QuestionList'
import { QuizPreviewModal } from './QuizPreviewModal'
import { QuizType } from '@/types/procedure'
import type { Quiz, Question } from '@/types/procedure'
import { cn } from '@/utils/cn'

interface QuizBuilderProps {
  quiz: Partial<Quiz> | null
  procedureId: string
  stepId?: string | null
  onSave: (data: Partial<Quiz>) => Promise<void>
  onCancel: () => void
}

type TabId = 'settings' | 'questions'

export function QuizBuilder({ quiz, procedureId, stepId, onSave, onCancel }: QuizBuilderProps) {
  const [activeTab, setActiveTab] = useState<TabId>('settings')
  const defaultType = quiz?.quiz_type || (stepId ? QuizType.STEP_LEVEL : QuizType.END_OF_PROCEDURE)
  const [title, setTitle] = useState(
    quiz?.title || (defaultType === QuizType.STEP_LEVEL ? 'Step Quiz' : 'End-of-Procedure Quiz')
  )
  const [description, setDescription] = useState(quiz?.description || '')
  const [quizType, setQuizType] = useState(defaultType)
  const [settings, setSettings] = useState({
    passing_score_percent: quiz?.passing_score_percent ?? 70,
    max_attempts: quiz?.max_attempts ?? 3,
    time_limit_minutes: quiz?.time_limit_minutes ?? null,
    shuffle_questions: quiz?.shuffle_questions ?? false,
    shuffle_answers: quiz?.shuffle_answers ?? false,
    show_correct_answers_after: quiz?.show_correct_answers_after ?? true,
  })
  const [questions, setQuestions] = useState<Question[]>(quiz?.questions || [])
  const [saving, setSaving] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      // Strip temp IDs before sending — backend generates real UUIDs
      const cleanQuestions = questions.map(({ id, ...q }) => ({
        ...q,
        ...(id && !id.startsWith('temp-') ? { id } : {}),
        options: (q.options || []).map(({ id: optId, question, ...opt }) => ({
          ...opt,
          ...(optId && !optId.startsWith('temp-') ? { id: optId } : {}),
        })),
      }))

      await onSave({
        title,
        description,
        quiz_type: quizType,
        step: stepId || null,
        procedure: procedureId,
        questions: cleanQuestions as any,
        ...settings,
      })
    } finally {
      setSaving(false)
    }
  }

  const previewQuiz: Quiz = {
    id: quiz?.id || 'preview',
    procedure: procedureId,
    step: stepId || null,
    quiz_type: quizType,
    title,
    description,
    questions,
    created_at: '',
    updated_at: '',
    ...settings,
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <HelpCircle className="h-5 w-5 text-green-500" />
          <div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Quiz title..."
              className="text-sm font-semibold text-gray-900 dark:text-gray-100 bg-transparent p-1 -ml-1 border border-transparent rounded hover:border-gray-300 dark:hover:border-gray-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description (optional)"
              className="block text-xs text-gray-500 border-0 bg-transparent p-0 focus:outline-none focus:ring-0 mt-0.5"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <QuizTypeDropdown value={quizType} onChange={(val) => setQuizType(val)} />
          <button
            onClick={() => setShowPreview(true)}
            className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
          >
            <Eye className="h-3.5 w-3.5" />
            Preview
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-100 dark:border-gray-700 px-4">
        <nav className="flex gap-1 -mb-px">
          <button
            onClick={() => setActiveTab('settings')}
            className={cn(
              'flex items-center gap-2 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors',
              activeTab === 'settings'
                ? 'text-blue-600 border-blue-600 dark:text-blue-400 dark:border-blue-400'
                : 'text-gray-500 border-transparent hover:text-gray-700'
            )}
          >
            <Settings className="h-3.5 w-3.5" />
            Settings
          </button>
          <button
            onClick={() => setActiveTab('questions')}
            className={cn(
              'flex items-center gap-2 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors',
              activeTab === 'questions'
                ? 'text-blue-600 border-blue-600 dark:text-blue-400 dark:border-blue-400'
                : 'text-gray-500 border-transparent hover:text-gray-700'
            )}
          >
            <HelpCircle className="h-3.5 w-3.5" />
            Questions ({questions.length})
          </button>
        </nav>
      </div>

      {/* Content */}
      <div className="p-4">
        {activeTab === 'settings' ? (
          <QuizSettingsPanel
            quiz={settings}
            onChange={(data) => setSettings({ ...settings, ...data })}
          />
        ) : (
          <QuestionList questions={questions} onChange={setQuestions} />
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-100 dark:border-gray-700">
        <button
          onClick={onCancel}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving || !title.trim()}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          <Save className="h-4 w-4" />
          Save Quiz
        </button>
      </div>

      {showPreview && <QuizPreviewModal quiz={previewQuiz} onClose={() => setShowPreview(false)} />}
    </div>
  )
}

// ============================================================================
// QUIZ TYPE DROPDOWN
// ============================================================================

const QUIZ_TYPE_OPTIONS = [
  {
    value: QuizType.STEP_LEVEL,
    label: 'Step-Level Quiz',
    description: 'Assess understanding after a specific step',
    icon: ListChecks,
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
  },
  {
    value: QuizType.END_OF_PROCEDURE,
    label: 'End-of-Procedure Quiz',
    description: 'Final assessment covering the entire procedure',
    icon: ClipboardCheck,
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-50 dark:bg-purple-900/20',
  },
]

function QuizTypeDropdown({
  value,
  onChange,
}: {
  value: string
  onChange: (val: Quiz['quiz_type']) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selected = QUIZ_TYPE_OPTIONS.find((o) => o.value === value) || QUIZ_TYPE_OPTIONS[0]
  const SelectedIcon = selected.icon

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
          open
            ? 'border-blue-400 ring-2 ring-blue-500/20 bg-white dark:bg-gray-800'
            : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-gray-400 dark:hover:border-gray-500'
        )}
      >
        <SelectedIcon className={cn('h-3.5 w-3.5', selected.color)} />
        <span className="text-gray-800 dark:text-gray-200">{selected.label}</span>
        <ChevronDown
          className={cn('h-3.5 w-3.5 text-gray-400 transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-1.5 w-72 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg overflow-hidden">
          <div className="p-1.5">
            {QUIZ_TYPE_OPTIONS.map((option) => {
              const Icon = option.icon
              const isSelected = option.value === value
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value as Quiz['quiz_type'])
                    setOpen(false)
                  }}
                  className={cn(
                    'w-full flex items-start gap-3 rounded-lg p-3 text-left transition-colors',
                    isSelected
                      ? 'bg-blue-50 dark:bg-blue-900/20'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  )}
                >
                  <div className={cn('mt-0.5 rounded-lg p-1.5', option.bg)}>
                    <Icon className={cn('h-4 w-4', option.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span
                        className={cn(
                          'text-sm font-medium',
                          isSelected
                            ? 'text-blue-700 dark:text-blue-300'
                            : 'text-gray-900 dark:text-gray-100'
                        )}
                      >
                        {option.label}
                      </span>
                      {isSelected && (
                        <Check className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {option.description}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
