/**
 * QuizEvidenceRow — Per-quiz evidence detail row.
 */

import { CheckCircle, XCircle } from 'lucide-react'

interface QuizEvidence {
  quiz_title: string
  score: number
  passed: boolean
  started_at: string
  completed_at: string | null
}

interface QuizEvidenceRowProps {
  quiz: QuizEvidence
}

export function QuizEvidenceRow({ quiz }: QuizEvidenceRowProps) {
  return (
    <div className="flex items-center gap-2 text-xs">
      {quiz.passed ? (
        <CheckCircle className="h-3 w-3 text-green-500 flex-shrink-0" />
      ) : (
        <XCircle className="h-3 w-3 text-red-500 flex-shrink-0" />
      )}
      <span className="text-gray-700 dark:text-gray-300 flex-1">{quiz.quiz_title}</span>
      <span className="text-gray-400">
        {quiz.score}% ({quiz.passed ? 'Passed' : 'Failed'})
      </span>
      {quiz.completed_at && (
        <span className="text-gray-400">{new Date(quiz.completed_at).toLocaleString()}</span>
      )}
    </div>
  )
}
