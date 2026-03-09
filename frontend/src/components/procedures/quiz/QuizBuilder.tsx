/**
 * QuizBuilder — Full quiz authoring interface.
 * Combines quiz settings, question list, and preview.
 */

import { useState } from 'react'
import { Plus, Eye, Save, Loader2, Settings, HelpCircle } from 'lucide-react'
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
  const [title, setTitle] = useState(quiz?.title || '')
  const [description, setDescription] = useState(quiz?.description || '')
  const [quizType, setQuizType] = useState(
    quiz?.quiz_type || (stepId ? QuizType.STEP_LEVEL : QuizType.END_OF_PROCEDURE)
  )
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
      await onSave({
        title,
        description,
        quiz_type: quizType,
        step: stepId || null,
        procedure: procedureId,
        questions,
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
              className="text-sm font-semibold text-gray-900 dark:text-gray-100 border-0 bg-transparent p-0 focus:outline-none focus:ring-0"
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
          <select
            value={quizType}
            onChange={(e) => setQuizType(e.target.value as Quiz['quiz_type'])}
            className="rounded-md border border-gray-300 px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
          >
            <option value={QuizType.STEP_LEVEL}>Step-Level Quiz</option>
            <option value={QuizType.END_OF_PROCEDURE}>End-of-Procedure Quiz</option>
          </select>
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
