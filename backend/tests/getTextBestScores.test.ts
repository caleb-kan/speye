import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getTextBestScores } from '../supabase/database/texts/getTextBestScores'

const { eq } = vi.hoisted(() => ({ eq: vi.fn() }))
vi.mock('../../lib/supabase', () => ({
  supabase: { from: () => ({ select: () => ({ eq }) }) },
}))
vi.mock('../supabase/database/logger', () => ({ logDbQuery: vi.fn() }))

beforeEach(() => eq.mockReset())

describe('library best scores', () => {
  it('returns the highest saved score for each text', async () => {
    eq.mockResolvedValue({
      data: [
        { text_id: 'text-1', score: 60 },
        { text_id: 'text-1', score: 90 },
        { text_id: 'text-1', score: 80 },
        { text_id: 'text-2', score: 75 },
      ],
      error: null,
    })

    expect(await getTextBestScores('user-1')).toEqual({
      'text-1': 90,
      'text-2': 75,
    })
  })

  it('propagates query failure so callers can preserve cached scores', async () => {
    const error = new Error('Database unavailable')
    eq.mockResolvedValue({ data: null, error })

    await expect(getTextBestScores('user-1')).rejects.toBe(error)
  })

  it('keeps a completed zero score distinct from an unscored read', async () => {
    eq.mockResolvedValue({
      data: [
        { text_id: 'unscored', score: null },
        { text_id: 'zero-score', score: 0 },
        { text_id: 'zero-score', score: null },
      ],
      error: null,
    })

    expect(await getTextBestScores('user-1')).toEqual({ 'zero-score': 0 })
  })
})
