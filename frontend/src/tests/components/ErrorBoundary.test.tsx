import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { ErrorBoundary } from '../../components/ErrorBoundary'

describe('ErrorBoundary', () => {
  const originalError = console.error
  beforeEach(() => {
    console.error = () => {}
  })
  afterEach(() => {
    console.error = originalError
  })

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Safe content</div>
      </ErrorBoundary>
    )
    expect(screen.getByText('Safe content')).toBeInTheDocument()
  })

  it('renders error UI when error is caught', () => {
    const ThrowError = () => {
      throw new Error('Test error')
    }

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    )

    expect(screen.getByTestId('error-boundary-heading')).toBeInTheDocument()
  })

  it('displays error message from caught error', () => {
    const ThrowError = () => {
      throw new Error('Custom error message')
    }

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    )

    expect(screen.getByTestId('error-boundary-message')).toHaveTextContent(
      'Custom error message'
    )
  })

  it('displays default message when error has no message', () => {
    const ThrowError = () => {
      throw new Error('')
    }

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    )

    expect(screen.getByTestId('error-boundary-message')).toHaveTextContent(
      'An unexpected error occurred'
    )
  })

  it('renders reload button', () => {
    const ThrowError = () => {
      throw new Error('Test error')
    }

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    )

    const reloadBtn = screen.getByTestId('error-boundary-reload-button')
    expect(reloadBtn).toBeInTheDocument()
  })

  it('has alert role for accessibility', () => {
    const ThrowError = () => {
      throw new Error('Test error')
    }

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    )

    expect(screen.getByTestId('error-boundary-alert')).toHaveAttribute(
      'role',
      'alert'
    )
  })

  it('displays error heading', () => {
    const ThrowError = () => {
      throw new Error('Test error')
    }

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    )

    expect(screen.getByTestId('error-boundary-heading')).toHaveTextContent(
      'Something went wrong'
    )
  })

  it('has full screen coverage', () => {
    const ThrowError = () => {
      throw new Error('Test error')
    }

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    )

    const alert = screen.getByTestId('error-boundary-alert')
    expect(alert.className).toContain('min-h-screen')
  })

  it('continues to render error UI on subsequent errors', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <div>Safe content</div>
      </ErrorBoundary>
    )

    const ThrowError = () => {
      throw new Error('Error 1')
    }

    rerender(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    )

    expect(screen.getByTestId('error-boundary-heading')).toHaveTextContent(
      'Something went wrong'
    )
    expect(screen.getByTestId('error-boundary-message')).toHaveTextContent(
      'Error 1'
    )
  })

  it('has reload button with correct functionality setup', () => {
    const ThrowError = () => {
      throw new Error('Test error')
    }

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    )

    const reloadBtn = screen.getByTestId('error-boundary-reload-button')
    expect(reloadBtn).toHaveClass('bg-primary')
  })
})
