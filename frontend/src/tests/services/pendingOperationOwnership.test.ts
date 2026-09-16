import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  userId: 'reader-a',
  offline: false,
  entries: new Map<string, unknown>(),
  log: vi.fn(),
  quiz: vi.fn(),
  getScores: vi.fn(),
  setScores: vi.fn(),
}))
vi.mock('../../../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: async () => ({
        data: { session: { user: { id: state.userId } } },
      }),
    },
  },
}))
vi.mock('../../services/networkStatus', () => ({
  isOffline: () => state.offline,
}))
vi.mock(
  '../../../../backend/supabase/database/userActivity/logUserActivity',
  () => ({ logUserActivity: state.log })
)
vi.mock(
  '../../../../backend/supabase/database/userActivity/saveQuizResult',
  () => ({ saveQuizResult: state.quiz })
)
vi.mock('../../services/leaderboardService', () => ({
  updateLeaderboardCache: vi.fn(),
}))
vi.mock('../../services/offlineCache', () => ({
  getCachedBestScores: state.getScores,
  setCachedBestScores: state.setScores,
}))
vi.mock('localforage', () => ({
  default: {
    createInstance: () => ({
      setItem: async (key: string, value: unknown) =>
        state.entries.set(key, value),
    }),
  },
}))

import { logUserActivity } from '../../services/logUserActivity'
import { saveQuizResult } from '../../services/saveQuizResult'

const activity = {
  textId: 'text-a',
  wpm: 300,
  startTime: '2026-09-16T10:00:00Z',
  mode: 'standard' as const,
  progressIndex: 10,
}
const quiz = { text_id: 'text-a', score: 90 }

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: Error) => void
  const promise = new Promise<T>((done, fail) => {
    resolve = done
    reject = fail
  })
  return { promise, resolve, reject }
}

describe('pending operation ownership', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    state.userId = 'reader-a'
    state.offline = false
    state.entries.clear()
  })

  it.each(['activity', 'quiz'] as const)(
    'does not reassign a failed pending %s request to another account',
    async (type) => {
      const request = deferred<null>()
      const db = type === 'activity' ? state.log : state.quiz
      db.mockReturnValue(request.promise)
      const work =
        type === 'activity' ? logUserActivity(activity) : saveQuizResult(quiz)
      await vi.waitFor(() =>
        expect(db).toHaveBeenCalledWith(
          type === 'activity' ? activity : quiz,
          'reader-a'
        )
      )
      state.userId = 'reader-b'
      request.reject(new Error('Failed to fetch'))
      expect(await work).toBeNull()
      expect(state.entries.size).toBe(0)
      expect(state.setScores).not.toHaveBeenCalled()
    }
  )

  it('still queues a transient failure for the account that started it', async () => {
    state.log.mockRejectedValue(new Error('Failed to fetch'))
    await logUserActivity(activity)
    expect([...state.entries.values()]).toEqual([
      expect.objectContaining({ userId: 'reader-a', payload: activity }),
    ])
  })

  it('keeps offline score cache writes pinned to their original account', async () => {
    state.offline = true
    const scores = deferred<Record<string, number>>()
    state.getScores.mockReturnValue(scores.promise)
    const work = saveQuizResult(quiz)
    await vi.waitFor(() =>
      expect(state.getScores).toHaveBeenCalledWith('reader-a')
    )
    state.userId = 'reader-b'
    scores.resolve({})
    expect(await work).toBeNull()
    expect(state.setScores).toHaveBeenCalledWith('reader-a', { 'text-a': 90 })
    expect([...state.entries.values()]).toEqual([
      expect.objectContaining({ userId: 'reader-a' }),
    ])
  })

  it('rejects old callbacks and anonymous owners before beginning a new write', async () => {
    state.userId = 'reader-b'
    await logUserActivity(activity, 'reader-a')
    await saveQuizResult(quiz, 'reader-a')
    await logUserActivity(activity, null)
    await saveQuizResult(quiz, null)
    expect(state.log).not.toHaveBeenCalled()
    expect(state.quiz).not.toHaveBeenCalled()
    expect(state.entries.size).toBe(0)
  })
})
