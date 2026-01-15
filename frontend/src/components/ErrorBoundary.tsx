import { Component } from 'react'
import type { ReactNode, ErrorInfo } from 'react'

type Props = {
  children: ReactNode
}

type State = {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <h1 className="text-2xl font-bold text-[var(--color-error)] mb-4">
              Something went wrong
            </h1>
            <p className="text-[var(--color-text-secondary)] mb-6">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-[var(--color-primary)] text-[var(--color-bg)] rounded-lg hover:opacity-90 transition-opacity"
            >
              Reload page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
