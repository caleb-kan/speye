import { Trash2, RefreshCw, WifiOff, Download } from 'lucide-react'
import { Button } from '../ui/Button'
import { ConfirmDialog } from '../ConfirmDialog'
import { useOfflineCacheSection } from '../../hooks/useOfflineCacheSection'

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `~${(bytes / 1024).toFixed(1)} KB`
  return `~${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatTimeAgo(timestamp: number | null): string {
  if (!timestamp) return 'Never'
  const diff = Date.now() - timestamp
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function OfflineCacheSection() {
  const {
    isOnline,
    forceOffline,
    setForceOffline,
    pendingOperations,
    isSyncing,
    textCount,
    cacheSize,
    lastSync,
    clearing,
    showClearConfirm,
    setShowClearConfirm,
    isCurrentlyPrefetching,
    hoverSuppressed,
    handleSaveOffline,
    handleSyncNow,
    handleClearConfirmed,
  } = useOfflineCacheSection()

  return (
    <section id="offline-cache" className="mb-5 scroll-mt-20">
      <h2 className="text-sm text-text-secondary mb-2 text-center">
        offline cache
      </h2>
      <div className="bg-bg-secondary rounded-lg p-4 space-y-2">
        <label className="flex items-center justify-between cursor-pointer">
          <span className="flex items-center gap-1.5 text-sm text-text-primary">
            Offline mode
          </span>
          <div className="flex items-center gap-2">
            {!isOnline && (
              <span className="flex items-center gap-1 text-xs text-warning">
                <WifiOff size={14} className="text-warning" />
                No internet connection detected
              </span>
            )}
            <Button
              variant="primary"
              role="button"
              aria-checked={forceOffline}
              onClick={() => setForceOffline(!forceOffline)}
              className={`relative inline-flex h-5 w-9 shrink-0 !p-0 rounded-full ${forceOffline ? '!bg-text-primary' : '!bg-text-secondary/30'}`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 translate-y-0.5 rounded-full bg-white shadow transition-transform ${forceOffline ? 'translate-x-[18px]' : 'translate-x-0.5'}`}
              />
            </Button>
          </div>
        </label>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="text-text-primary">Texts cached</div>
          <div className="text-text text-right">{textCount}</div>

          <div className="text-text-primary">Cache size</div>
          <div className="text-text text-right">{formatBytes(cacheSize)}</div>

          <div className="text-text-primary">Last synced</div>
          <div className="text-text text-right">{formatTimeAgo(lastSync)}</div>

          {pendingOperations > 0 && (
            <>
              <div className="text-text-primary">Pending changes</div>
              <div className="text-text text-right">{pendingOperations}</div>
            </>
          )}
        </div>

        <div
          className={`flex gap-2 pt-1${hoverSuppressed ? ' pointer-events-none' : ''}`}
        >
          <button
            type="button"
            onClick={handleSaveOffline}
            disabled={!isOnline || isCurrentlyPrefetching}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-text-secondary/20 text-text-secondary hover:text-text hover:border-text-secondary/40 transition-colors focus:outline-none focus:ring-0 focus:shadow-none disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <Download
              size={12}
              className={isCurrentlyPrefetching ? 'animate-bounce' : ''}
            />
            {isCurrentlyPrefetching ? 'Saving...' : 'Save texts offline'}
          </button>
          <button
            type="button"
            onClick={handleSyncNow}
            disabled={!isOnline || isSyncing}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-text-secondary/20 text-text-secondary hover:text-text hover:border-text-secondary/40 transition-colors focus:outline-none focus:ring-0 focus:shadow-none disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} />
            {isSyncing ? 'Syncing...' : 'Sync now'}
          </button>
          <button
            type="button"
            onClick={() => setShowClearConfirm(true)}
            disabled={clearing || textCount === 0}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-text-secondary/20 text-text-secondary hover:text-text hover:border-text-secondary/40 transition-colors focus:outline-none focus:ring-0 focus:shadow-none disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <Trash2 size={12} />
            Clear cache
          </button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showClearConfirm}
        title="Clear offline cache?"
        message="This will remove all cached texts and data. You will need to be online to reload them."
        confirmLabel="Clear cache"
        cancelLabel="Cancel"
        onConfirm={handleClearConfirmed}
        onCancel={() => setShowClearConfirm(false)}
        isDestructive
      />
    </section>
  )
}
