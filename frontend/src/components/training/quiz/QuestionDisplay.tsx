/**
 * QuestionDisplay — Routes to the correct question type component.
 */

import type { VersionQuestion, QuestionAnswer } from '../types'
import { MultipleChoiceQuestion } from './MultipleChoiceQuestion'
import { MultiSelectQuestion } from './MultiSelectQuestion'
import { TrueFalseQuestion } from './TrueFalseQuestion'
import { ShortAnswerQuestion } from './ShortAnswerQuestion'
import { OrderingQuestion } from './OrderingQuestion'

interface QuestionDisplayProps {
  question: VersionQuestion
  answer: QuestionAnswer | null
  onSelectOption: (questionId: string, optionId: string, multi: boolean) => void
  onTextAnswer: (questionId: string, text: string) => void
  onReorder: (questionId: string, fromIndex: number, toIndex: number) => void
}

export function QuestionDisplay({
  question,
  answer,
  onSelectOption,
  onTextAnswer,
  onReorder,
}: QuestionDisplayProps) {
  const selectedIds = answer?.selected_option_ids || []

  return (
    <div>
      <div className="flex items-start gap-2 mb-1">
        <span className="text-xs text-gray-400">Q</span>
        {question.is_mandatory && <span className="text-xs text-red-500">*Required</span>}
        <span className="text-xs text-gray-400 ml-auto">{question.points} pts</span>
      </div>
      <h3 className="text-base font-medium text-gray-900 dark:text-white mb-4">{question.text}</h3>

      {question.question_type === 'multiple_choice' && (
        <MultipleChoiceQuestion
          options={question.options}
          selectedOptionIds={selectedIds}
          onSelect={(optId) => onSelectOption(question.id, optId, false)}
        />
      )}

      {question.question_type === 'true_false' && (
        <TrueFalseQuestion
          options={question.options}
          selectedOptionIds={selectedIds}
          onSelect={(optId) => onSelectOption(question.id, optId, false)}
        />
      )}

      {question.question_type === 'multi_select' && (
        <MultiSelectQuestion
          options={question.options}
          selectedOptionIds={selectedIds}
          onToggle={(optId) => onSelectOption(question.id, optId, true)}
        />
      )}

      {question.question_type === 'short_answer' && (
        <ShortAnswerQuestion
          value={answer?.text_answer || ''}
          onChange={(text) => onTextAnswer(question.id, text)}
        />
      )}

      {question.question_type === 'ordering' && (
        <OrderingQuestion
          options={question.options}
          ordering={answer?.ordering_answer || []}
          onReorder={(from, to) => onReorder(question.id, from, to)}
        />
      )}
    </div>
  )
}
