import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { StartQuizButton } from '../../components/StartQuizButton'

describe('StartQuizButton', () => {
  const defaultProps = {
    textId: 'text-1',
    readingComplete: false,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing', () => {
    const { container } = render(<StartQuizButton {...defaultProps} />)
    expect(container).toBeInTheDocument()
  })

  it('renders button with "Start Quiz" label', () => {
    render(<StartQuizButton {...defaultProps} readingComplete={true} />)
    const btn = screen.getByRole('button', { name: /Start Quiz/ })
    expect(btn).toBeInTheDocument()
  })

  it('hides button when reading is not complete', () => {
    render(<StartQuizButton {...defaultProps} readingComplete={false} />)
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('opacity-0')
  })

  it('shows button when reading is complete', () => {
    render(<StartQuizButton {...defaultProps} readingComplete={true} />)
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('opacity-100')
  })

  it('has proper styling for hidden state', () => {
    render(<StartQuizButton {...defaultProps} readingComplete={false} />)
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('translate-y-12')
  })

  it('has proper styling for visible state', () => {
    render(<StartQuizButton {...defaultProps} readingComplete={true} />)
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('translate-y-0')
  })

  it('button has primary background color', () => {
    render(<StartQuizButton {...defaultProps} readingComplete={true} />)
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('bg-primary')
  })

  it('button has hover effects', () => {
    render(<StartQuizButton {...defaultProps} readingComplete={true} />)
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('hover:')
  })

  it('button has rounded styling', () => {
    render(<StartQuizButton {...defaultProps} readingComplete={true} />)
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('rounded')
  })

  it('button has shadow styling', () => {
    render(<StartQuizButton {...defaultProps} readingComplete={true} />)
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('shadow')
  })

  it('button has transition effects', () => {
    render(<StartQuizButton {...defaultProps} readingComplete={true} />)
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('transition')
  })

  it('accepts different textIds', () => {
    const { rerender } = render(
      <StartQuizButton textId="text-1" readingComplete={true} />
    )
    expect(screen.getByRole('button')).toBeInTheDocument()

    rerender(<StartQuizButton textId="text-2" readingComplete={true} />)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('updates when readingComplete changes', () => {
    const { rerender } = render(
      <StartQuizButton {...defaultProps} readingComplete={false} />
    )
    let btn = screen.getByRole('button')
    expect(btn.className).toContain('opacity-0')

    rerender(<StartQuizButton {...defaultProps} readingComplete={true} />)
    btn = screen.getByRole('button')
    expect(btn.className).toContain('opacity-100')
  })

  it('memoizes component', () => {
    const { rerender } = render(
      <StartQuizButton {...defaultProps} readingComplete={true} />
    )
    expect(screen.getByRole('button')).toBeInTheDocument()

    rerender(<StartQuizButton {...defaultProps} readingComplete={true} />)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })
})
