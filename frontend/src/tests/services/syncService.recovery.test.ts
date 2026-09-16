import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { QueuedOperation } from '../../services/operationQueue'
import { SYNC } from '../../constants/offline'

const state = vi.hoisted(() => ({
  operations: new Map<string, QueuedOperation>(),
  failPersistenceFor: '',
  failNextInsert: false,
  latestActivity: 'earlier-session',
  updated: [] as { id: string; score: unknown }[],
  order: [] as string[],
  afterPersist: undefined as (() => void) | undefined,
}))

// Exercise the real queue and database helpers. Only storage and the Supabase
// transport are mocked, including the database's latest-activity lookup.
vi.mock('localforage', () => ({
  default: {
    createInstance: () => ({
      setItem: async (key: string, value: QueuedOperation) => {
        if (state.failPersistenceFor === key) {
          throw new DOMException('Quota exceeded', 'QuotaExceededError')
        }
        state.operations.set(key, value)
        state.afterPersist?.()
      },
      iterate: async (callback: (value: QueuedOperation) => void) => {
        for (const value of state.operations.values()) callback(value)
      },
      removeItem: async (key: string) => state.operations.delete(key),
    }),
  },
}))

vi.mock('../../../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: async () => ({
        data: { session: { user: { id: 'reader-a' } } },
      }),
      getUser: async () => ({
        data: { user: { id: 'reader-a' } },
        error: null,
      }),
    },
    from: () => {
      let action = 'select'
      let payload: Record<string, unknown> = {}
      let activityId = ''
      const query = {
        insert: (value: Record<string, unknown>) => {
          action = 'insert'
          payload = value
          return query
        },
        update: (value: Record<string, unknown>) => {
          action = 'update'
          payload = value
          return query
        },
        select: () => query,
        eq: (key: string, value: string) => {
          if (key === 'id') activityId = value
          return query
        },
        order: () => query,
        limit: async () => ({
          data: [{ id: state.latestActivity }],
          error: null,
        }),
        single: async () => {
          if (action === 'insert') {
            state.order.push('activity')
            if (state.failNextInsert) {
              state.failNextInsert = false
              return { data: null, error: { message: 'Failed to fetch' } }
            }
            state.latestActivity = 'new-session'
            return {
              data: { id: state.latestActivity, ...payload },
              error: null,
            }
          }
          state.order.push('quiz')
          state.updated.push({ id: activityId, score: payload.score })
          return {
            data: { id: activityId, user_id: 'reader-a', ...payload },
            error: null,
          }
        },
      }
      return query
    },
  },
}))

vi.mock('../../services/leaderboardService', () => ({
  updateLeaderboardCache: vi.fn(),
}))
vi.mock('../../services/offlineCache', () => ({ setLastSyncTime: vi.fn() }))
vi.mock('../../services/networkStatus', () => ({ isOffline: () => true }))
vi.mock('../../utils/pwaLogger', () => ({
  pwaLogger: { debug: vi.fn(), warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}))

import {
  processQueue,
  recoverUnloadQueue,
  syncPendingOperations,
} from '../../services/syncService'
import { logUserActivityOnUnload } from '../../services/logUserActivity'

const activity = (
  id = 'activity',
  timestamp = 1
): Extract<QueuedOperation, { type: 'logUserActivity' }> => ({
  id,
  userId: 'reader-a',
  type: 'logUserActivity',
  timestamp,
  retryCount: 0,
  payload: {
    textId: 'text-a',
    wpm: 300,
    startTime: '2026-09-16T08:00:00Z',
    mode: 'standard',
    progressIndex: 25,
  },
})
const quiz = (id = 'quiz', timestamp = 2): QueuedOperation => ({
  id,
  userId: 'reader-a',
  type: 'saveQuizResult',
  timestamp,
  retryCount: 0,
  payload: { text_id: 'text-a', score: 90 },
})

beforeEach(() => {
  state.operations.clear()
  state.failPersistenceFor = ''
  state.failNextInsert = false
  state.latestActivity = 'earlier-session'
  state.updated = []
  state.order = []
  state.afterPersist = undefined
  localStorage.clear()
})
afterEach(() => vi.restoreAllMocks())

describe('durable ordered queue replay', () => {
  it('keeps distinct unload records created in the same millisecond', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(1234)
    logUserActivityOnUnload(activity().payload, 'token', 'reader-a')
    logUserActivityOnUnload(activity().payload, 'token', 'reader-a')

    await recoverUnloadQueue()

    expect(state.operations.size).toBe(2)
  })

  it('retains the unload copy and defers quizzes when IndexedDB persistence fails', async () => {
    const raw = JSON.stringify([activity()])
    localStorage.setItem(SYNC.UNLOAD_QUEUE_KEY, raw)
    state.operations.set('quiz', quiz())
    state.failPersistenceFor = 'activity'

    await syncPendingOperations()

    expect(localStorage.getItem(SYNC.UNLOAD_QUEUE_KEY)).toBe(raw)
    expect(state.operations.has('quiz')).toBe(true)
    expect(state.order).toEqual([])
  })

  it('retries partial recovery without duplicating persisted operations', async () => {
    const entries = [activity(), activity('activity-2', 2)]
    const raw = JSON.stringify(entries)
    localStorage.setItem(SYNC.UNLOAD_QUEUE_KEY, raw)
    state.failPersistenceFor = 'activity-2'

    await recoverUnloadQueue()

    expect(localStorage.getItem(SYNC.UNLOAD_QUEUE_KEY)).toBe(raw)
    expect([...state.operations.values()]).toEqual([entries[0]])
    state.failPersistenceFor = ''
    await recoverUnloadQueue()

    expect([...state.operations.values()]).toEqual(entries)
    expect(localStorage.getItem(SYNC.UNLOAD_QUEUE_KEY)).toBeNull()
  })

  it('preserves unload records appended by another tab during recovery', async () => {
    const entries = [activity(), activity('activity-2', 2)]
    localStorage.setItem(SYNC.UNLOAD_QUEUE_KEY, JSON.stringify([entries[0]]))
    state.afterPersist = () => {
      state.afterPersist = undefined
      localStorage.setItem(SYNC.UNLOAD_QUEUE_KEY, JSON.stringify(entries))
    }

    await syncPendingOperations()

    expect(state.order).toEqual([])
    expect(JSON.parse(localStorage.getItem(SYNC.UNLOAD_QUEUE_KEY)!)).toEqual(
      entries
    )
    await recoverUnloadQueue()
    expect([...state.operations.values()]).toEqual(entries)
  })

  it('replays recovered unload activity before a later offline quiz', async () => {
    localStorage.setItem(SYNC.UNLOAD_QUEUE_KEY, JSON.stringify([activity()]))
    state.operations.set('quiz', quiz())

    await syncPendingOperations()

    expect(state.order).toEqual(['activity', 'quiz'])
    expect(state.updated).toEqual([{ id: 'new-session', score: 90 }])
    expect(state.operations.size).toBe(0)
  })

  it('keeps a quiz queued until its preceding activity insert succeeds', async () => {
    state.operations.set('activity', activity())
    state.operations.set('quiz', quiz())
    state.failNextInsert = true

    await processQueue()

    expect(state.updated).toEqual([])
    expect(state.operations.get('activity')?.retryCount).toBe(1)
    expect(state.operations.has('quiz')).toBe(true)
    await processQueue()
    expect(state.updated).toEqual([{ id: 'new-session', score: 90 }])
    expect(state.operations.size).toBe(0)
  })

  it('discards a quiz after its activity exhausts retries, but allows a later session', async () => {
    state.operations.set('activity', {
      ...activity(),
      retryCount: SYNC.MAX_RETRY_COUNT,
    })
    state.operations.set('quiz', quiz())
    state.operations.set('later-activity', activity('later-activity', 3))
    state.operations.set('later-quiz', quiz('later-quiz', 4))

    await processQueue()

    expect(state.order).toEqual(['activity', 'quiz'])
    expect(state.updated).toEqual([{ id: 'new-session', score: 90 }])
    expect(state.operations.size).toBe(0)
  })

  it('does not retain an abandoned activity quiz when another text interrupts replay', async () => {
    const otherActivity = activity('other-activity', 2)
    otherActivity.payload.textId = 'other-text'
    state.operations.set('activity', {
      ...activity(),
      retryCount: SYNC.MAX_RETRY_COUNT,
    })
    state.operations.set(otherActivity.id, otherActivity)
    state.operations.set('quiz', quiz('quiz', 3))
    state.failNextInsert = true

    await processQueue()

    expect(state.operations.has('quiz')).toBe(false)
    expect(state.updated).toEqual([])
    await processQueue()
    expect(state.updated).toEqual([])
    expect(state.operations.size).toBe(0)
  })

  it('saves the quiz to the new session when activity replay succeeds first', async () => {
    state.operations.set('activity', activity())
    state.operations.set('quiz', quiz())

    await processQueue()

    expect(state.order).toEqual(['activity', 'quiz'])
    expect(state.updated).toEqual([{ id: 'new-session', score: 90 }])
    expect(state.operations.size).toBe(0)
  })
})
