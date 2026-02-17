import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { StartQuizButton } from '../../components/StartQuizButton'

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id' },
    session: null,
    loading: false,
    signOut: vi.fn(),
  }),
}))

describe('StartQuizButton', () => {
  const defaultProps = {
    textId: 'text-1',
    readingComplete: false,
    onDismiss: vi.fn(),
    dismissed: false,
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

  it('hides wrapper when reading is not complete', () => {
    const { container } = render(
      <StartQuizButton {...defaultProps} readingComplete={false} />
    )

    const outerWrapper = container.querySelector('.absolute.inset-0')
    expect(outerWrapper).toHaveClass('opacity-0')

    const innerWrapper = outerWrapper?.firstElementChild
    expect(innerWrapper?.className).toContain('scale-50')
    expect(innerWrapper?.className).toContain('translate-y-12')
  })

  it('shows wrapper when reading is complete', () => {
    const { container } = render(
      <StartQuizButton {...defaultProps} readingComplete={true} />
    )

    const outerWrapper = container.querySelector('.absolute.inset-0')
    expect(outerWrapper).toHaveClass('opacity-100')

    const innerWrapper = outerWrapper?.firstElementChild
    expect(innerWrapper?.className).toContain('scale-100')
    expect(innerWrapper?.className).toContain('translate-y-0')
  })

  // Style checks for the button itself
  it('button has primary background color', () => {
    render(<StartQuizButton {...defaultProps} readingComplete={true} />)
    const btn = screen.getByRole('button', { name: /Start Quiz/ })
    expect(btn.className).toContain('bg-primary')
  })

  it('button has rounded styling', () => {
    render(<StartQuizButton {...defaultProps} readingComplete={true} />)
    const btn = screen.getByRole('button', { name: /Start Quiz/ })
    expect(btn.className).toContain('rounded')
  })

  it('button has shadow styling', () => {
    render(<StartQuizButton {...defaultProps} readingComplete={true} />)
    const btn = screen.getByRole('button', { name: /Start Quiz/ })
    expect(btn.className).toContain('shadow')
  })

  it('accepts different textIds', () => {
    const { rerender } = render(
      <StartQuizButton {...defaultProps} textId="text-1" />
    )
    expect(
      screen.getByRole('button', { name: /Start Quiz/ })
    ).toBeInTheDocument()

    rerender(<StartQuizButton {...defaultProps} textId="text-2" />)
    expect(
      screen.getByRole('button', { name: /Start Quiz/ })
    ).toBeInTheDocument()
  })

  it('updates wrapper classes when readingComplete changes', () => {
    const { container, rerender } = render(
      <StartQuizButton {...defaultProps} readingComplete={false} />
    )

    // Check hidden state
    const outerWrapper = container.querySelector('.absolute.inset-0')
    expect(outerWrapper).toHaveClass('opacity-0')

    // Update props to complete
    rerender(<StartQuizButton {...defaultProps} readingComplete={true} />)

    // Check visible state
    expect(outerWrapper).toHaveClass('opacity-100')
  })
})
