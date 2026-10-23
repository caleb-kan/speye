import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  eq: vi.fn(),
  getCachedBestScores: vi.fn(),
  setCachedBestScores: vi.fn(),
}))

vi.mock('../../../../lib/supabase', () => ({
  supabase: { from: () => ({ select: () => ({ eq: mocks.eq }) }) },
}))
vi.mock('../../services/networkStatus', () => ({ isOffline: () => false }))
vi.mock('../../services/offlineCache', () => ({
  getCachedBestScores: mocks.getCachedBestScores,
  setCachedBestScores: mocks.setCachedBestScores,
}))
vi.mock('../../utils/pwaLogger', () => ({
  pwaLogger: { debug: vi.fn(), warn: vi.fn() },
}))

import { fetchTextBestScores } from '../../services/libraryService'

beforeEach(() => {
  vi.clearAllMocks()
  mocks.getCachedBestScores.mockResolvedValue({ 'text-1': 90 })
  mocks.setCachedBestScores.mockResolvedValue(undefined)
})

describe('library score cache recovery', () => {
  it('returns and caches saved scores after a successful query', async () => {
    mocks.eq.mockResolvedValue({
      data: [{ text_id: 'text-1', score: 95 }],
      error: null,
    })

    expect(await fetchTextBestScores('user-1')).toEqual({ 'text-1': 95 })
    expect(mocks.setCachedBestScores).toHaveBeenCalledWith('user-1', {
      'text-1': 95,
    })
  })

  it('returns cached scores without replacing them when the query fails', async () => {
    mocks.eq.mockResolvedValue({
      data: null,
      error: new Error('Database unavailable'),
    })

    expect(await fetchTextBestScores('user-1')).toEqual({ 'text-1': 90 })
    expect(mocks.setCachedBestScores).not.toHaveBeenCalled()
  })

  it('reports query failure when no cached scores exist', async () => {
    const error = new Error('Database unavailable')
    mocks.eq.mockResolvedValue({ data: null, error })
    mocks.getCachedBestScores.mockResolvedValue(null)

    await expect(fetchTextBestScores('user-1')).rejects.toBe(error)
  })
})
