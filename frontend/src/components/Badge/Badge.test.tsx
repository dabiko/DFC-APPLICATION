import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Badge, ConfidentialityBadge } from './index'

describe('Badge', () => {
  it('renders with children', () => {
    render(<Badge>New</Badge>)
    expect(screen.getByText('New')).toBeInTheDocument()
  })

  it('applies correct variant classes', () => {
    const { rerender } = render(<Badge variant="success">Badge</Badge>)
    const badge = screen.getByText('Badge')
    expect(badge).toHaveClass('bg-success-100')

    rerender(<Badge variant="error">Badge</Badge>)
    expect(screen.getByText('Badge')).toHaveClass('bg-error-100')
  })

  it('shows dot when dot prop is true', () => {
    const { container } = render(<Badge dot>Active</Badge>)
    // Check for dot by looking for the specific size classes
    const dots = container.querySelectorAll('.rounded-full')
    expect(dots.length).toBeGreaterThan(0)
  })

  it('applies different sizes', () => {
    const { rerender } = render(<Badge size="sm">Badge</Badge>)
    expect(screen.getByText('Badge')).toHaveClass('text-xs')

    rerender(<Badge size="lg">Badge</Badge>)
    expect(screen.getByText('Badge')).toHaveClass('text-base')
  })
})

describe('ConfidentialityBadge', () => {
  it('renders public level correctly', () => {
    render(<ConfidentialityBadge level="public" />)
    expect(screen.getByText('Public')).toBeInTheDocument()
  })

  it('renders all confidentiality levels', () => {
    const { rerender } = render(<ConfidentialityBadge level="internal" />)
    expect(screen.getByText('Internal')).toBeInTheDocument()

    rerender(<ConfidentialityBadge level="confidential" />)
    expect(screen.getByText('Confidential')).toBeInTheDocument()

    rerender(<ConfidentialityBadge level="highly-confidential" />)
    expect(screen.getByText('Highly Confidential')).toBeInTheDocument()
  })

  it('shows dot only when dotOnly prop is true', () => {
    const { container } = render(<ConfidentialityBadge level="public" dotOnly />)
    expect(screen.queryByText('Public')).not.toBeInTheDocument()
    const dot = container.querySelector('.rounded-full')
    expect(dot).toBeInTheDocument()
  })

  it('shows icon when showIcon is true', () => {
    const { container } = render(<ConfidentialityBadge level="confidential" showIcon />)
    expect(screen.getByText('Confidential')).toBeInTheDocument()
    // Icon is rendered
    const icon = container.querySelector('svg')
    expect(icon).toBeInTheDocument()
  })
})
