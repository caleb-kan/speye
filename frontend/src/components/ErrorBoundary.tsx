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
        <div
          role="alert"
          className="min-h-screen bg-bg flex items-center justify-center p-8"
          data-testid="error-boundary-alert"
        >
          <div className="text-center max-w-md">
            <h1
              className="text-2xl font-bold text-error mb-4"
              data-testid="error-boundary-heading"
            >
              Something went wrong
            </h1>
            <p
              className="text-text-secondary mb-6"
              data-testid="error-boundary-message"
            >
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-primary text-bg rounded-lg hover:opacity-90 transition-opacity"
              data-testid="error-boundary-reload-button"
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
