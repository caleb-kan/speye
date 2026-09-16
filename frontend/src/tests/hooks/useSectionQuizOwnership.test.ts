import { act, renderHook } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import type { Text } from '../../types/database'

const state = vi.hoisted(() => ({
  userId: 'reader-a',
  entries: new Map<string, unknown>(),
  save: vi.fn(),
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
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: state.userId } }),
}))
vi.mock('../../services/saveQuizResult', () => ({ saveQuizResult: state.save }))
vi.mock('localforage', () => ({
  default: {
    createInstance: () => ({
      getItem: async (key: string) => state.entries.get(key) ?? null,
      setItem: async (key: string, value: unknown) =>
        state.entries.set(key, value),
      removeItem: async (key: string) => state.entries.delete(key),
    }),
  },
}))
import { useSectionQuiz } from '../../hooks/useSectionQuiz'

beforeEach(() => {
  state.userId = 'reader-a'
  state.entries.clear()
  vi.clearAllMocks()
})

it('clears only the original account progress when an unmounted reader finishes saving', async () => {
  const bProgress = {
    data: { results: [{ correct: 0, total: 1 }], quizzedSectionIds: [0] },
    timestamp: Date.now(),
  }
  state.entries.set('reader-b:text-a', bProgress)
  let resolve!: (value: { user_id: string }) => void
  state.save.mockReturnValue(
    new Promise((done) => {
      resolve = done
    })
  )
  const text = {
    id: 'text-a',
    sectional: true,
    quiz: {
      questionSets: [
        {
          questions: [
            { question: 'Question?', options: ['A'], correctAnswer: 0 },
          ],
        },
      ],
    },
  } as Text
  const reader = renderHook(() => useSectionQuiz(text))
  await act(async () => reader.result.current.handleSectionComplete(0))
  await act(async () => reader.result.current.handleSectionQuizFinish(1, 1))
  expect(state.save).toHaveBeenCalledWith(
    { text_id: 'text-a', score: 100 },
    'reader-a'
  )
  reader.unmount()
  state.userId = 'reader-b'
  await act(async () => resolve({ user_id: 'reader-a' }))
  expect(state.entries.get('reader-b:text-a')).toEqual(bProgress)
  expect(state.entries.has('reader-a:text-a')).toBe(false)
})
