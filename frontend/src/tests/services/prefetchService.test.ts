import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  fetchPublicLibraryTexts: vi.fn(),
  fetchUserLibraryTexts: vi.fn(),
}))
vi.mock('../../services/authService', () => ({
  getCurrentUser: mocks.getCurrentUser,
}))
vi.mock('../../services/libraryService', () => ({
  fetchPublicLibraryTexts: mocks.fetchPublicLibraryTexts,
  fetchUserLibraryTexts: mocks.fetchUserLibraryTexts,
}))
vi.mock('../../services/offlineCache', () => ({
  getCachedText: vi.fn(),
  setCachedText: vi.fn(),
}))
vi.mock('../../services/textService', () => ({ getTextById: vi.fn() }))
vi.mock('../../services/networkStatus', () => ({ isOffline: () => false }))

import { prefetchAllTexts } from '../../services/prefetchService'

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  mocks.fetchPublicLibraryTexts.mockResolvedValue([])
  mocks.fetchUserLibraryTexts.mockResolvedValue([])
})
afterEach(() => vi.restoreAllMocks())

describe('background prefetch ownership', () => {
  it('runs one prefetch when two callers await the same auth lookup', async () => {
    let resolveUser!: (user: { id: string }) => void
    mocks.getCurrentUser.mockReturnValue(
      new Promise((resolve) => {
        resolveUser = resolve
      })
    )
    const first = prefetchAllTexts()
    const second = prefetchAllTexts()
    resolveUser({ id: 'reader-a' })
    await Promise.all([first, second])

    expect(mocks.fetchPublicLibraryTexts).toHaveBeenCalledTimes(1)
    expect(mocks.fetchUserLibraryTexts).toHaveBeenCalledTimes(1)
  })

  it('absorbs auth failure and releases the prefetch lock for the next run', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    mocks.getCurrentUser.mockRejectedValueOnce(
      new Error('Network request failed')
    )
    await expect(prefetchAllTexts()).resolves.toBeUndefined()
    mocks.getCurrentUser.mockResolvedValue({ id: 'reader-a' })
    await prefetchAllTexts()
    expect(mocks.fetchPublicLibraryTexts).toHaveBeenCalledTimes(1)
  })
})
