import { CloudOff, RefreshCw, Check } from 'lucide-react'
import {
  useOfflineIndicator,
  TYPE_LABELS,
} from '../../hooks/useOfflineIndicator'

export function OfflineIndicator() {
  const {
    indicatorState,
    hovered,
    setHovered,
    queueItems,
    pendingOperations,
    handleClick,
  } = useOfflineIndicator()

  const isVisible = indicatorState !== 'online'

  if (!isVisible) return null

  const showExpanded = hovered && indicatorState !== 'synced'

  return (
    <div
      role="status"
      data-testid="offline-indicator"
      className="fixed top-2 left-4 md:left-2 z-50 md:top-5 md:left-32"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        type="button"
        onClick={handleClick}
        data-testid="offline-indicator-btn"
        className="relative flex h-12 w-12 items-center justify-center rounded-full shadow-md backdrop-blur-sm transition-colors duration-300 bg-bg-secondary/90 text-text-primary cursor-pointer hover:bg-bg-secondary md:h-8 md:w-auto md:gap-1.5 md:px-2.5 md:py-1 md:text-xs md:font-medium"
        aria-live="polite"
        aria-label="View offline cache settings"
      >
        {indicatorState === 'syncing' || indicatorState === 'syncing-online' ? (
          <>
            <RefreshCw className="h-5 w-5 md:h-3 md:w-3 animate-spin" />
            <span
              data-testid="offline-indicator-status"
              className="hidden md:inline"
            >
              Syncing...
            </span>
          </>
        ) : indicatorState === 'synced' ? (
          <>
            <Check className="h-5 w-5 md:h-3 md:w-3 text-green-500" />
            <span
              data-testid="offline-indicator-status"
              className="hidden md:inline"
            >
              All synced
            </span>
          </>
        ) : (
          <>
            <CloudOff className="h-5 w-5 md:h-3 md:w-3" />
            <span
              data-testid="offline-indicator-status"
              className="hidden md:inline"
            >
              Offline
            </span>
            {pendingOperations > 0 && (
              <span className="hidden md:inline ml-0.5 px-1.5 py-0.5 rounded-full bg-text-secondary/20 text-[10px]">
                {pendingOperations}
              </span>
            )}
          </>
        )}
        {pendingOperations > 0 && (
          <span
            data-testid="offline-indicator-badge"
            className="absolute -top-1 -right-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-bg md:hidden"
          >
            {pendingOperations}
          </span>
        )}
      </button>

      <div
        className="absolute left-0 top-full mt-1 w-48 overflow-hidden rounded-lg shadow-md backdrop-blur-sm bg-bg-secondary/90 text-text-secondary transition-[max-height,opacity] duration-300 ease-in-out pointer-events-none"
        style={{
          maxHeight: showExpanded ? 200 : 0,
          opacity: showExpanded ? 1 : 0,
        }}
      >
        <div className="px-2.5 py-1.5 text-[10px] text-text-secondary/80 space-y-0.5">
          {queueItems.length > 0 ? (
            <ul className="space-y-px max-h-24 overflow-y-auto">
              {queueItems.map((item) => (
                <li
                  key={item.id}
                  className="flex items-baseline gap-1 truncate"
                >
                  <span className="shrink-0 text-text-secondary">
                    {TYPE_LABELS[item.type]}:
                  </span>
                  <span className="truncate">
                    {item.textTitle ?? 'Untitled'}
                  </span>
                </li>
              ))}
            </ul>
          ) : indicatorState === 'syncing' ||
            indicatorState === 'syncing-online' ? (
            <span>Syncing queued changes...</span>
          ) : (
            <span>No pending changes</span>
          )}
          <span className="flex items-center gap-1 pt-1 text-text-secondary">
            Click to view settings
          </span>
        </div>
      </div>
    </div>
  )
}
