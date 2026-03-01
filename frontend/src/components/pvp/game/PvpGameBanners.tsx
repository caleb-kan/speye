type PvpGameBannersProps = {
  afkWarning: boolean
  opponentDisconnected: boolean
  submitError: string | null
  forfeitError?: string | null
  connectionLost: boolean
  playerInfoError?: string | null
  saveWarning?: string | null
  clockSyncWarning?: boolean
  onRetrySubmit?: () => void
}

export const WARNING_BANNER =
  'bg-warning/90 text-bg px-4 py-2 rounded-xl text-sm font-medium'
export const ERROR_BANNER =
  'bg-error/90 text-bg px-4 py-2 rounded-xl text-sm font-medium'

export function PvpGameBanners({
  afkWarning,
  opponentDisconnected,
  submitError,
  forfeitError,
  connectionLost,
  playerInfoError,
  saveWarning,
  clockSyncWarning,
  onRetrySubmit,
}: PvpGameBannersProps) {
  const hasAny =
    afkWarning ||
    opponentDisconnected ||
    submitError ||
    forfeitError ||
    connectionLost ||
    playerInfoError ||
    saveWarning ||
    clockSyncWarning
  if (!hasAny) return null

  const warnings = [
    connectionLost && 'Connection unstable. Game may be delayed.',
    clockSyncWarning &&
      'Clock sync failed. Refresh the page for accurate timing.',
    playerInfoError,
    saveWarning,
  ].filter(Boolean) as string[]

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 w-[calc(100vw-2rem)] max-w-lg">
      {afkWarning && (
        <div
          className={`${WARNING_BANNER} animate-in fade-in slide-in-from-top duration-300`}
          role="alert"
        >
          Are you still there? Move to avoid forfeit.
        </div>
      )}

      {opponentDisconnected && (
        <div className={ERROR_BANNER} role="alert">
          Opponent may be disconnected...
        </div>
      )}

      {forfeitError && (
        <div className={ERROR_BANNER} role="alert">
          {forfeitError}
        </div>
      )}

      {submitError && (
        <div className={`${ERROR_BANNER} flex items-center gap-3`} role="alert">
          <span>{submitError}</span>
          {onRetrySubmit && (
            <button
              onClick={onRetrySubmit}
              aria-label="Retry submitting result"
              className="bg-bg/20 hover:bg-bg/30 px-3 py-1 rounded-lg text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              Retry
            </button>
          )}
        </div>
      )}

      {warnings.map((msg, i) => (
        <div key={i} className={WARNING_BANNER} role="status">
          {msg}
        </div>
      ))}
    </div>
  )
}
