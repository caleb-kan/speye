import { beforeEach, describe, expect, it, vi } from 'vitest'
import { saveQuizResult } from '../supabase/database/userActivity/saveQuizResult'

const { getUser, from } = vi.hoisted(() => ({
  getUser: vi.fn(),
  from: vi.fn(),
}))
vi.mock('../../lib/supabase', () => ({ supabase: { auth: { getUser }, from } }))
vi.mock('../supabase/database/logger', () => ({ logDbQuery: vi.fn() }))

beforeEach(() => {
  getUser
    .mockReset()
    .mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
  from.mockReset()
  const row = {
    id: 'activity-1',
    user_id: 'user-1',
    score: null as number | null,
  }
  const query = {
    select: () => query,
    eq: () => query,
    order: () => query,
    limit: async () => ({ data: [{ id: row.id }], error: null }),
    update: (values: { score: number }) => {
      Object.assign(row, values)
      return query
    },
    single: async () => ({ data: { ...row }, error: null }),
  }
  from.mockReturnValue(query)
})

describe('saved quiz percentage boundary', () => {
  it.each([NaN, Infinity, -Infinity, -1, 100.1])(
    'rejects an invalid percentage %s before a database request',
    async (score) => {
      await expect(
        saveQuizResult({ text_id: 'text-1', score })
      ).rejects.toThrow('Score must be a finite number between 0 and 100')
      expect(getUser).not.toHaveBeenCalled()
      expect(from).not.toHaveBeenCalled()
    }
  )

  it.each([0, 87.5, 100])(
    'saves valid percentage %s for the signed-in user',
    async (score) => {
      expect(await saveQuizResult({ text_id: 'text-1', score })).toEqual({
        id: 'activity-1',
        user_id: 'user-1',
        score,
      })
    }
  )
})

describe('quiz activity ownership', () => {
  function activities() {
    const rows = [
      {
        id: 'original',
        user_id: 'user-1',
        text_id: 'text-1',
        end_time: '2026-10-09T10:00:00Z',
        score: null as number | null,
      },
      {
        id: 'newer',
        user_id: 'user-1',
        text_id: 'text-1',
        end_time: '2026-10-09T12:00:00Z',
        score: null as number | null,
      },
      {
        id: 'other-user',
        user_id: 'user-2',
        text_id: 'text-1',
        end_time: '2026-10-09T13:00:00Z',
        score: null as number | null,
      },
    ]
    from.mockImplementation(() => {
      const filters: ((row: (typeof rows)[number]) => boolean)[] = []
      let update: { score: number } | undefined
      const matching = () =>
        rows
          .filter((row) => filters.every((filter) => filter(row)))
          .sort((a, b) => b.end_time.localeCompare(a.end_time))
      const query = {
        select: () => query,
        eq: (key: keyof (typeof rows)[number], value: unknown) => {
          filters.push((row) => row[key] === value)
          return query
        },
        lte: (_key: string, value: string) => {
          filters.push((row) => row.end_time <= value)
          return query
        },
        order: () => query,
        limit: async () => ({
          data: matching()
            .slice(0, 1)
            .map((row) => ({ id: row.id })),
          error: null,
        }),
        update: (values: { score: number }) => {
          update = values
          return query
        },
        single: async () => {
          const row = matching()[0]
          if (row && update) Object.assign(row, update)
          return { data: row ? { ...row } : null, error: null }
        },
      }
      return query
    })
    return rows
  }

  it('updates the originating activity after a newer read of the same text', async () => {
    const rows = activities()
    await saveQuizResult({
      activity_id: 'original',
      text_id: 'text-1',
      score: 80,
    })
    expect(rows[0].score).toBe(80)
    expect(rows[1].score).toBeNull()
  })

  it('bounds a legacy quiz by its original timestamp', async () => {
    const rows = activities()
    await saveQuizResult({
      text_id: 'text-1',
      score: 80,
      completed_at: '2026-10-09T11:00:00Z',
    })
    expect(rows[0].score).toBe(80)
    expect(rows[1].score).toBeNull()
  })

  it.each([
    { activity_id: 'other-user', text_id: 'text-1' },
    { activity_id: 'original', text_id: 'other-text' },
  ])(
    'does not update an activity belonging to a different user or text',
    async (params) => {
      const rows = activities()
      expect(await saveQuizResult({ ...params, score: 80 })).toBeNull()
      expect(rows.every((row) => row.score === null)).toBe(true)
    }
  )
})

it.each(['select', 'update'] as const)(
  'preserves %s transport failures for the retry caller',
  async (failure) => {
    const query = {
      select: () => query,
      eq: () => query,
      order: () => query,
      update: () => query,
      limit: async () =>
        failure === 'select'
          ? { data: null, error: { message: 'TypeError: Failed to fetch' } }
          : { data: [{ id: 'activity-1' }], error: null },
      single: async () => ({
        data: null,
        error: { message: 'TypeError: Failed to fetch' },
      }),
    }
    from.mockReturnValue(query)
    await expect(
      saveQuizResult({ text_id: 'text-1', score: 80 })
    ).rejects.toThrow('TypeError: Failed to fetch')
  }
)
