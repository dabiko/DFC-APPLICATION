/**
 * WorkflowDesignerPage
 *
 * Full-page workflow template designer.
 * Accessed from the Workflows page when creating/editing templates.
 */

import { useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { WorkflowDesigner } from '../components/WorkflowDesigner'
import type { WorkflowTemplate } from '../services/workflowService'

export function WorkflowDesignerPage() {
  const navigate = useNavigate()
  const { templateId } = useParams<{ templateId: string }>()

  const handleSave = useCallback((template: WorkflowTemplate) => {
    // Template was saved successfully
    // Could show a toast or redirect
    console.log('Template saved:', template)
  }, [])

  const handleClose = useCallback(() => {
    // Navigate back to workflows page
    navigate('/workflows')
  }, [navigate])

  return (
    <div className="h-screen flex flex-col">
      <WorkflowDesigner templateId={templateId} onSave={handleSave} onClose={handleClose} />
    </div>
  )
}

export default WorkflowDesignerPage
