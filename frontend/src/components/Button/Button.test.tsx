import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from './Button'

describe('Button', () => {
  it('renders with children', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button')).toHaveTextContent('Click me')
  })

  it('applies primary variant by default', () => {
    render(<Button>Button</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('bg-primary-600')
  })

  it('applies correct variant classes', () => {
    const { rerender } = render(<Button variant="secondary">Button</Button>)
    expect(screen.getByRole('button')).toHaveClass('bg-secondary-600')

    rerender(<Button variant="danger">Button</Button>)
    expect(screen.getByRole('button')).toHaveClass('bg-error-600')
  })

  it('handles click events', async () => {
    const handleClick = vi.fn()
    const user = userEvent.setup()

    render(<Button onClick={handleClick}>Click me</Button>)
    await user.click(screen.getByRole('button'))

    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Button</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('shows loading state', () => {
    render(<Button loading>Button</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('applies different sizes', () => {
    const { rerender } = render(<Button size="sm">Button</Button>)
    expect(screen.getByRole('button')).toHaveClass('px-3', 'py-1.5')

    rerender(<Button size="lg">Button</Button>)
    expect(screen.getByRole('button')).toHaveClass('px-6', 'py-3')
  })

  it('renders as full width when fullWidth is true', () => {
    render(<Button fullWidth>Button</Button>)
    expect(screen.getByRole('button')).toHaveClass('w-full')
  })
})
