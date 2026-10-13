import { act, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NetworkStatusProvider } from '../../context/NetworkStatusProvider'
import { useNetworkStatus } from '../../hooks/useNetworkStatus'

const mocks = vi.hoisted(() => ({
  userId: null as string | null,
  accessToken: 'token-1',
  offline: false,
  count: 0,
  sync: vi.fn(),
}))
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: mocks.userId ? { id: mocks.userId } : null,
    session: mocks.userId ? { access_token: mocks.accessToken } : null,
  }),
}))
vi.mock('../../services/syncService', () => ({
  syncPendingOperations: mocks.sync,
}))
vi.mock('../../services/operationQueue', () => ({
  getQueueLength: async () => mocks.count,
  onQueueChange: () => () => {},
}))
vi.mock('../../services/prefetchService', () => ({ prefetchAllTexts: vi.fn() }))
vi.mock('../../services/networkStatus', () => ({
  isOffline: () => mocks.offline,
  getForceOffline: () => mocks.offline,
  setForceOffline: (offline: boolean) => {
    mocks.offline = offline
  },
}))

function Probe() {
  const network = useNetworkStatus()
  return (
    <>
      <output data-testid="pending">{network.pendingOperations}</output>
      <output data-testid="syncing">{String(network.isSyncing)}</output>
      <button onClick={() => network.setForceOffline(false)}>Reconnect</button>
    </>
  )
}
const provider = (
  <NetworkStatusProvider>
    <Probe />
  </NetworkStatusProvider>
)

beforeEach(() => {
  mocks.userId = null
  mocks.offline = false
  mocks.accessToken = 'token-1'
  mocks.count = 1
  mocks.sync.mockReset().mockImplementation(async () => {
    if (mocks.userId) mocks.count = 0
  })
})

describe('authenticated queue recovery', () => {
  it('automatically replays queued activity when the signed-out owner logs in', async () => {
    const { rerender } = render(provider)
    await waitFor(() =>
      expect(screen.getByTestId('pending')).toHaveTextContent('1')
    )
    await waitFor(() =>
      expect(screen.getByTestId('syncing')).toHaveTextContent('false')
    )
    mocks.userId = 'reader-a'
    rerender(
      <NetworkStatusProvider>
        <Probe />
      </NetworkStatusProvider>
    )
    await waitFor(() =>
      expect(screen.getByTestId('pending')).toHaveTextContent('0')
    )
    mocks.userId = null
    rerender(
      <NetworkStatusProvider>
        <Probe />
      </NetworkStatusProvider>
    )
    mocks.count = 1
    mocks.userId = 'reader-a'
    rerender(
      <NetworkStatusProvider>
        <Probe />
      </NetworkStatusProvider>
    )
    await waitFor(() => expect(mocks.count).toBe(0))
  })

  it('replays after token refresh when the user ID stays the same', async () => {
    mocks.userId = 'reader-a'
    const { rerender } = render(provider)
    await waitFor(() =>
      expect(screen.getByTestId('pending')).toHaveTextContent('0')
    )
    await waitFor(() =>
      expect(screen.getByTestId('syncing')).toHaveTextContent('false')
    )
    mocks.count = 1
    mocks.accessToken = 'token-2'
    rerender(
      <NetworkStatusProvider>
        <Probe />
      </NetworkStatusProvider>
    )
    await waitFor(() => expect(mocks.count).toBe(0))
  })

  it('replays a new authentication after the already-running sync finishes', async () => {
    let finish!: () => void
    mocks.sync.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve
        })
    )
    const { rerender } = render(provider)
    await waitFor(() =>
      expect(screen.getByTestId('syncing')).toHaveTextContent('true')
    )
    mocks.userId = 'reader-a'
    rerender(
      <NetworkStatusProvider>
        <Probe />
      </NetworkStatusProvider>
    )
    expect(mocks.sync).toHaveBeenCalledTimes(1)
    await act(async () => finish())
    await waitFor(() =>
      expect(screen.getByTestId('pending')).toHaveTextContent('0')
    )
    expect(mocks.sync).toHaveBeenCalledTimes(2)
  })

  it('retains queued activity on offline login and syncs when reconnected', async () => {
    mocks.offline = true
    const { rerender } = render(provider)
    mocks.userId = 'reader-a'
    rerender(
      <NetworkStatusProvider>
        <Probe />
      </NetworkStatusProvider>
    )
    await waitFor(() =>
      expect(screen.getByTestId('pending')).toHaveTextContent('1')
    )
    expect(mocks.sync).not.toHaveBeenCalled()
    await act(async () =>
      screen.getByRole('button', { name: 'Reconnect' }).click()
    )
    await waitFor(() =>
      expect(screen.getByTestId('pending')).toHaveTextContent('0')
    )
  })
})
