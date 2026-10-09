import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { QueuedOperation } from '../../services/operationQueue'
import { SYNC } from '../../constants/offline'

const state = vi.hoisted(() => ({
  operations: new Map<string, QueuedOperation>(),
  activities: new Map<string, Record<string, unknown>>(),
  attempts: [] as Record<string, unknown>[],
  loseNextResponse: false,
  failPersistence: false,
  offline: false,
}))

vi.mock('localforage', () => ({
  default: {
    createInstance: () => ({
      setItem: async (key: string, value: QueuedOperation) => {
        if (state.failPersistence) throw new Error('Quota exceeded')
        state.operations.set(key, value)
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
      let payload: Record<string, unknown> = {}
      let ignoreDuplicates = false
      const commit = async () => {
        state.attempts.push(payload)
        const id = (payload.id as string | undefined) ?? crypto.randomUUID()
        if (state.activities.has(id)) {
          return ignoreDuplicates
            ? { data: null, error: null }
            : { data: null, error: { message: 'Duplicate primary key' } }
        }
        const row = { ...payload, id, score: null }
        state.activities.set(id, row)
        if (state.loseNextResponse) {
          state.loseNextResponse = false
          return { data: null, error: { message: 'Failed to fetch' } }
        }
        return { data: row, error: null }
      }
      const query = {
        insert: (value: Record<string, unknown>) => {
          payload = value
          return query
        },
        upsert: (
          value: Record<string, unknown>,
          options: { onConflict: string; ignoreDuplicates: boolean }
        ) => {
          payload = value
          ignoreDuplicates =
            options.onConflict === 'id' && options.ignoreDuplicates
          return query
        },
        select: () => query,
        single: commit,
        maybeSingle: commit,
      }
      return query
    },
  },
}))
vi.mock('../../services/leaderboardService', () => ({
  updateLeaderboardCache: vi.fn(),
}))
vi.mock('../../services/offlineCache', () => ({ setLastSyncTime: vi.fn() }))
vi.mock('../../services/networkStatus', () => ({
  isOffline: () => state.offline,
}))
vi.mock('../../utils/pwaLogger', () => ({
  pwaLogger: { debug: vi.fn(), warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}))

import {
  logUserActivity,
  logUserActivityOnUnload,
} from '../../services/logUserActivity'
import { enqueueOperation } from '../../services/operationQueue'
import {
  processQueue,
  recoverUnloadQueue,
  syncPendingOperations,
} from '../../services/syncService'

const params = {
  textId: 'text-a',
  wpm: 300,
  startTime: '2026-09-16T08:00:00Z',
  mode: 'standard' as const,
  progressIndex: 25,
}
const legacyOperation = (): QueuedOperation => ({
  id: 'legacy-activity',
  userId: 'reader-a',
  type: 'logUserActivity',
  timestamp: 1,
  retryCount: 0,
  payload: params,
})

beforeEach(() => {
  state.operations.clear()
  state.activities.clear()
  state.attempts = []
  state.loseNextResponse = false
  state.failPersistence = false
  state.offline = false
  localStorage.clear()
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('activity replay identity', () => {
  it('replays a committed insert with a lost response without duplicating it or clearing its quiz score', async () => {
    state.loseNextResponse = true
    await logUserActivity(params)
    const original = [...state.activities.values()][0]
    original.score = 90
    const queued = [...state.operations.values()][0]

    await syncPendingOperations()

    expect(state.activities.size).toBe(1)
    expect([...state.activities.values()]).toEqual([original])
    expect(original.score).toBe(90)
    expect(queued.payload).toMatchObject({ ...params, id: original.id })
    expect(state.attempts.map((attempt) => attempt.id)).toEqual([
      original.id,
      original.id,
    ])
    expect(state.operations.size).toBe(0)
  })

  it('persists an identity for legacy queued activity before its first replay attempt', async () => {
    state.operations.set('legacy-activity', legacyOperation())
    state.loseNextResponse = true

    await processQueue()

    const original = [...state.activities.values()][0]
    original.score = 95
    const queued = state.operations.get('legacy-activity')!
    expect(queued.payload).toMatchObject({ ...params, id: original.id })
    expect(queued.retryCount).toBe(1)

    await processQueue()

    expect(state.activities.size).toBe(1)
    expect(original.score).toBe(95)
    expect(state.attempts.map((attempt) => attempt.id)).toEqual([
      original.id,
      original.id,
    ])
    expect(state.operations.size).toBe(0)
  })

  it('does not submit legacy activity when its new identity cannot be persisted', async () => {
    state.operations.set('legacy-activity', legacyOperation())
    state.failPersistence = true

    await expect(processQueue()).rejects.toThrow('Quota exceeded')

    expect(state.attempts).toEqual([])
    expect(state.activities.size).toBe(0)
    expect(state.operations.get('legacy-activity')).toEqual(legacyOperation())
  })

  it('preserves the unload payload identity through synchronous storage, recovery, and replay', async () => {
    state.offline = true
    logUserActivityOnUnload(params, 'token', 'reader-a')
    const [unload] = JSON.parse(localStorage.getItem(SYNC.UNLOAD_QUEUE_KEY)!)
    expect(unload.payload.id).toEqual(expect.any(String))

    await recoverUnloadQueue()
    expect(state.operations.get(unload.id)?.payload).toEqual(unload.payload)
    await processQueue()

    expect([...state.activities.keys()]).toEqual([unload.payload.id])
    expect(state.operations.size).toBe(0)
  })

  it('assigns an identity even when activity is enqueued directly', async () => {
    await enqueueOperation('logUserActivity', params)
    const queued = [...state.operations.values()][0]
    expect(queued.payload).toMatchObject({ ...params, id: expect.any(String) })

    await processQueue()

    expect([...state.activities.keys()]).toEqual([
      (queued as Extract<QueuedOperation, { type: 'logUserActivity' }>).payload
        .id,
    ])
  })

  it('replays an online unload with a lost response using conflict-ignore and its persisted identity', async () => {
    const fetch = vi.fn((_url: string, request: RequestInit) => {
      const body = JSON.parse(request.body as string)
      const [unload] = JSON.parse(localStorage.getItem(SYNC.UNLOAD_QUEUE_KEY)!)
      expect(unload.payload.id).toBe(body.id)
      state.activities.set(body.id, { ...body, score: 88 })
      return new Promise<Response>(() => {})
    })
    vi.stubGlobal('fetch', fetch)
    const id = 'b3384fb8-4bce-4aa5-98a2-059e9204ed73'

    logUserActivityOnUnload({ ...params, id }, 'token', 'reader-a')

    expect(fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/rest\/v1\/user_activity\?on_conflict=id$/),
      expect.objectContaining({
        headers: expect.objectContaining({
          Prefer: 'return=minimal,resolution=ignore-duplicates',
        }),
        body: expect.any(String),
        keepalive: true,
      })
    )
    expect(JSON.parse(fetch.mock.calls[0][1].body as string)).toMatchObject({
      id,
    })

    await syncPendingOperations()

    expect([...state.activities.values()]).toEqual([
      expect.objectContaining({ id, score: 88 }),
    ])
    expect(state.operations.size).toBe(0)
    expect(localStorage.getItem(SYNC.UNLOAD_QUEUE_KEY)).toBeNull()
  })
})
