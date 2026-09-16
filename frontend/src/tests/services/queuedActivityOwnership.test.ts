import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { getUser, from } = vi.hoisted(() => ({
  getUser: vi.fn(),
  from: vi.fn(),
}))
vi.mock('../../../../lib/supabase', () => ({
  supabase: { auth: { getUser }, from },
}))

import { logUserActivityOnUnload } from '../../services/logUserActivity'
import { logUserActivity } from '../../../../backend/supabase/database/userActivity/logUserActivity'
import { saveQuizResult } from '../../../../backend/supabase/database/userActivity/saveQuizResult'

const params = {
  textId: 'text-1',
  wpm: 250,
  startTime: '2026-09-16T08:00:00Z',
  mode: 'standard' as const,
  progressIndex: 10,
}

describe('queued activity account ownership', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
  })
  afterEach(() => vi.restoreAllMocks())

  it('records the original account when persisting an offline unload', () => {
    logUserActivityOnUnload(params, 'test-token', 'original-user')
    expect(JSON.parse(localStorage.getItem('speye-unload-queue')!)).toEqual([
      expect.objectContaining({ userId: 'original-user', payload: params }),
    ])
  })

  it('does not save anonymous or empty unload sessions for a future account', () => {
    logUserActivityOnUnload(params, null, null)
    logUserActivityOnUnload({ ...params, progressIndex: 0 }, 'token', 'user')
    expect(localStorage.getItem('speye-unload-queue')).toBeNull()
  })

  it('does not insert activity if the account changes during queue processing', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'new-user' } } })
    await expect(logUserActivity(params, 'original-user')).resolves.toBeNull()
    expect(from).not.toHaveBeenCalled()
  })

  it('does not update a quiz if the account changes during queue processing', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'new-user' } } })
    await expect(
      saveQuizResult({ text_id: 'text-1', score: 90 }, 'original-user')
    ).resolves.toBeNull()
    expect(from).not.toHaveBeenCalled()
  })

  it('propagates transient authentication failures so queued writes can retry', async () => {
    const error = new Error('Failed to fetch')
    getUser.mockResolvedValue({ data: { user: null }, error })
    await expect(logUserActivity(params, 'original-user')).rejects.toBe(error)
    await expect(
      saveQuizResult({ text_id: 'text-1', score: 90 }, 'original-user')
    ).rejects.toBe(error)
    expect(from).not.toHaveBeenCalled()
  })
})
