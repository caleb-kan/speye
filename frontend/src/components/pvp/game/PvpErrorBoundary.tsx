import { Component } from 'react'
import type { ReactNode, ErrorInfo } from 'react'
import { forfeitPvpGame, forfeitOnUnload } from '../../../services/pvpService'

type Props = {
  children: ReactNode
  onNavigateToLobby: () => void
  gameId?: string | null
  userId?: string | null
  accessToken?: string | null
}

type State = {
  hasError: boolean
  error: Error | null
  forfeitFailed: boolean
  forfeitSucceeded: boolean
}

export class PvpErrorBoundary extends Component<Props, State> {
  private _mounted = false
  private _forfeiting = false

  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      forfeitFailed: false,
      forfeitSucceeded: false,
    }
  }

  componentDidMount() {
    this._mounted = true
  }

  componentWillUnmount() {
    this._mounted = false
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      forfeitFailed: false,
      forfeitSucceeded: false,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('PvP error caught by boundary:', error, errorInfo)
    this.attemptForfeit()
  }

  attemptForfeit() {
    const { gameId, userId, accessToken } = this.props
    if (gameId && userId && !this._forfeiting) {
      this._forfeiting = true
      forfeitPvpGame(gameId, userId)
        .then(() => {
          this._forfeiting = false
          if (this._mounted) {
            this.setState({ forfeitSucceeded: true, forfeitFailed: false })
          }
        })
        .catch((err) => {
          this._forfeiting = false
          console.error('Async forfeit failed, falling back to keepalive:', err)
          if (accessToken) {
            forfeitOnUnload(gameId, userId, accessToken)
            // Keepalive is fire-and-forget; we cannot confirm success, but
            // a best-effort attempt was made so don't show a retry button.
          } else if (this._mounted) {
            this.setState({ forfeitFailed: true })
          }
        })
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-8"
        >
          <h1 className="text-xl font-bold text-error">
            Something went wrong in the game
          </h1>
          <p className="text-sm text-text-secondary text-center max-w-md">
            {this.state.error?.message || 'An unexpected error occurred.'}
            {this.state.forfeitSucceeded &&
              ' The game was forfeited successfully.'}
            {!this.state.forfeitSucceeded &&
              this.props.gameId &&
              this.props.userId &&
              ' A forfeit was attempted to avoid making your opponent wait.'}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              onClick={this.props.onNavigateToLobby}
              className="px-6 py-2 rounded-lg border border-text-secondary/20 text-text hover:bg-text-secondary/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              Return to Lobby
            </button>
            {this.state.forfeitFailed &&
              this.props.gameId &&
              this.props.userId && (
                <button
                  onClick={() => this.attemptForfeit()}
                  className="px-6 py-2 rounded-lg border border-error/30 text-error hover:bg-error/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  Retry Forfeit
                </button>
              )}
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-primary text-bg rounded-lg hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              Reload
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
