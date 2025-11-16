import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Alert } from './Alert'

describe('Alert', () => {
  it('renders with children', () => {
    render(<Alert>Alert message</Alert>)
    expect(screen.getByText('Alert message')).toBeInTheDocument()
  })

  it('renders title when provided', () => {
    render(<Alert title="Warning">Message</Alert>)
    expect(screen.getByText('Warning')).toBeInTheDocument()
    expect(screen.getByText('Message')).toBeInTheDocument()
  })

  it('applies correct variant classes', () => {
    const { rerender } = render(<Alert variant="success">Success</Alert>)
    const alert = screen.getByRole('alert')
    expect(alert).toHaveClass('bg-success-50')

    rerender(<Alert variant="error">Error</Alert>)
    expect(screen.getByRole('alert')).toHaveClass('bg-error-50')
  })

  it('shows dismiss button when dismissible is true', () => {
    render(<Alert dismissible>Message</Alert>)
    expect(screen.getByLabelText('Dismiss')).toBeInTheDocument()
  })

  it('calls onDismiss when dismiss button is clicked', async () => {
    const handleDismiss = vi.fn()
    const user = userEvent.setup()

    render(
      <Alert dismissible onDismiss={handleDismiss}>
        Message
      </Alert>
    )
    await user.click(screen.getByLabelText('Dismiss'))

    expect(handleDismiss).toHaveBeenCalledTimes(1)
  })

  it('hides after dismissing', async () => {
    const user = userEvent.setup()

    render(<Alert dismissible>Message</Alert>)
    await user.click(screen.getByLabelText('Dismiss'))

    expect(screen.queryByText('Message')).not.toBeInTheDocument()
  })

  it('hides icon when hideIcon is true', () => {
    const { container } = render(<Alert hideIcon>Message</Alert>)
    const icon = container.querySelector('svg')
    expect(icon).not.toBeInTheDocument()
  })

  it('renders actions when provided', () => {
    render(<Alert actions={<button>Action</button>}>Message</Alert>)
    expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument()
  })
})
