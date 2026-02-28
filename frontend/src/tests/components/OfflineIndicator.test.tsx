import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { OfflineIndicator } from '../../components/ui/OfflineIndicator'

const mockNetworkStatus = {
  isOnline: true,
  forceOffline: false,
  setForceOffline: vi.fn(),
  pendingOperations: 0,
  isSyncing: false,
  syncNow: vi.fn(),
}

vi.mock('../../hooks/useNetworkStatus', () => ({
  useNetworkStatus: () => mockNetworkStatus,
}))

vi.mock('../../services/operationQueue', () => ({
  getQueuedOperations: vi.fn().mockResolvedValue([]),
}))

vi.mock('../../services/offlineCache', () => ({
  getCachedText: vi.fn().mockResolvedValue(null),
}))

function renderIndicator() {
  return render(
    <MemoryRouter>
      <OfflineIndicator />
    </MemoryRouter>
  )
}

function rerender(
  rerenderFn: ReturnType<typeof render>['rerender'],
  isOnline: boolean,
  isSyncing: boolean
) {
  mockNetworkStatus.isOnline = isOnline
  mockNetworkStatus.isSyncing = isSyncing
  rerenderFn(
    <MemoryRouter>
      <OfflineIndicator />
    </MemoryRouter>
  )
}

describe('OfflineIndicator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    mockNetworkStatus.isOnline = true
    mockNetworkStatus.pendingOperations = 0
    mockNetworkStatus.isSyncing = false
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should not render when online and not syncing', () => {
    renderIndicator()
    expect(screen.queryByTestId('offline-indicator')).toBeNull()
  })

  it('should show offline state with pending operations and correct accessibility role', () => {
    mockNetworkStatus.isOnline = false
    mockNetworkStatus.pendingOperations = 3
    renderIndicator()

    expect(screen.getByTestId('offline-indicator')).toBeDefined()
    expect(screen.getByRole('status')).toBeDefined()
    expect(screen.getByTestId('offline-indicator-status').textContent).toBe(
      'Offline'
    )
    expect(screen.getByTestId('offline-indicator-badge').textContent).toBe('3')
  })

  it('should show syncing state', () => {
    mockNetworkStatus.isSyncing = true
    renderIndicator()
    expect(screen.getByTestId('offline-indicator-status').textContent).toBe(
      'Syncing...'
    )
  })

  describe('offline → syncing → synced → hidden state machine', () => {
    it('should show "All synced" after going offline then back online and syncing completes', () => {
      mockNetworkStatus.isOnline = false
      const { rerender: rr } = renderIndicator()

      expect(screen.getByTestId('offline-indicator-status').textContent).toBe(
        'Offline'
      )

      rerender(rr, true, true)
      expect(screen.getByTestId('offline-indicator-status').textContent).toBe(
        'Syncing...'
      )

      rerender(rr, true, false)
      expect(screen.getByTestId('offline-indicator-status').textContent).toBe(
        'All synced'
      )
    })

    it('should auto-hide "All synced" after 2 seconds', () => {
      mockNetworkStatus.isOnline = false
      const { rerender: rr } = renderIndicator()

      rerender(rr, true, true)
      rerender(rr, true, false)
      expect(screen.getByTestId('offline-indicator-status').textContent).toBe(
        'All synced'
      )

      act(() => {
        vi.advanceTimersByTime(2100)
      })

      rerender(rr, true, false)
      expect(screen.queryByTestId('offline-indicator')).toBeNull()
    })

    it('should not show "All synced" if we never went offline', () => {
      const { rerender: rr } = renderIndicator()

      rerender(rr, true, true)
      rerender(rr, true, false)

      expect(screen.queryByTestId('offline-indicator')).toBeNull()
    })

    it('should clear "All synced" banner if we go offline again', () => {
      mockNetworkStatus.isOnline = false
      const { rerender: rr } = renderIndicator()

      rerender(rr, true, false)
      expect(screen.getByTestId('offline-indicator-status').textContent).toBe(
        'All synced'
      )

      rerender(rr, false, false)
      expect(screen.getByTestId('offline-indicator-status').textContent).toBe(
        'Offline'
      )
    })
  })
})
