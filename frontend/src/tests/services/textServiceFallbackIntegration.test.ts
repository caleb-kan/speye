import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getTextById } from '../../services/textService'
import type { Text } from '../../types/database'

const { read, getCachedText, setCachedText } = vi.hoisted(() => ({
  read: vi.fn(),
  getCachedText: vi.fn(),
  setCachedText: vi.fn(),
}))
vi.mock('../../../../lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: read }) }),
    }),
  },
}))
vi.mock('../../services/offlineCache', () => ({
  getCachedText,
  setCachedText,
  getAllCachedTexts: vi.fn(),
}))
vi.mock('../../services/networkStatus', () => ({ isOffline: () => false }))
vi.mock('../../utils/pwaLogger', () => ({
  pwaLogger: { debug: vi.fn(), warn: vi.fn() },
}))
vi.mock('../../../../backend/supabase/database/logger', () => ({
  logDbQuery: vi.fn(),
}))

const cachedText: Text = {
  id: 'saved-text',
  title: 'Saved text',
  content: 'Available while the network is unavailable.',
  summary: null,
  owner_id: null,
  uploaded_at: '2026-10-23T00:00:00Z',
  fiction: false,
  complexity: 5,
  quiz: null,
  source: null,
  processing_status: 'completed',
  quiz_valid: null,
  llm_decision: null,
  llm_violation_type: null,
  admin_decision: null,
  admin_reviewed_by: null,
  admin_reviewed_at: null,
  rejection_reason: null,
  rejection_stage: null,
  sectional: false,
  section_content: null,
}

beforeEach(() => {
  read.mockReset()
  getCachedText.mockReset().mockResolvedValue(cachedText)
  setCachedText.mockReset().mockResolvedValue(undefined)
})

describe('real text database reader with local cached fallback', () => {
  it('returns cached text when Supabase resolves with a network error', async () => {
    read.mockResolvedValue({
      data: null,
      error: { message: 'TypeError: Failed to fetch', code: '' },
    })

    expect(await getTextById('saved-text')).toEqual(cachedText)
    expect(getCachedText).toHaveBeenCalledWith('saved-text')
    expect(setCachedText).not.toHaveBeenCalled()
  })

  it('preserves a genuine missing text instead of returning a stale cached copy', async () => {
    read.mockResolvedValue({ data: null, error: null })

    expect(await getTextById('saved-text')).toBeNull()
    expect(getCachedText).not.toHaveBeenCalled()
  })

  it('propagates a database error when no cached text is available', async () => {
    const error = { message: 'Database unavailable', code: '503' }
    read.mockResolvedValue({ data: null, error })
    getCachedText.mockResolvedValue(null)

    await expect(getTextById('saved-text')).rejects.toBe(error)
  })

  it('returns and caches a successful database read', async () => {
    read.mockResolvedValue({ data: cachedText, error: null })

    expect(await getTextById('saved-text')).toEqual(cachedText)
    expect(setCachedText).toHaveBeenCalledWith(cachedText)
    expect(getCachedText).not.toHaveBeenCalled()
  })
})
