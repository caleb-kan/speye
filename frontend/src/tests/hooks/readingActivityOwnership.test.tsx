import { useEffect } from 'react'
import { act, render } from '@testing-library/react'
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RequireUsername } from '../../components/auth/RequireUsername'
import { useReadingActivitySession } from '../../hooks/useReadingActivitySession'
import { useRsvpActivitySession } from '../../hooks/useRsvpActivitySession'
import { useAdaptiveActivitySession } from '../../hooks/useAdaptiveActivitySession'
import {
  loadReadingActivitySession,
  upsertReadingActivitySession,
} from '../../utils/readingActivityStorage'
import { STORAGE_KEYS } from '../../constants/storage'
import type { Text } from '../../types/database'

const state = vi.hoisted(() => ({
  userId: 'account-a' as string | null,
  position: 0,
  loading: false,
  mode: 'standard' as 'standard' | 'adaptive' | 'rsvp',
  switchMode: undefined as
    ((mode: 'standard' | 'adaptive' | 'rsvp') => void) | undefined,
  onPositionChange: undefined as ((index: number) => void) | undefined,
  setPosition: vi.fn(),
  unload: vi.fn(),
  log: vi.fn(),
}))
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: state.userId
      ? { id: state.userId, user_metadata: { username: 'reader' } }
      : null,
    session: state.userId ? { access_token: `token-${state.userId}` } : null,
    loading: state.loading,
  }),
}))
vi.mock('../../services/logUserActivity', () => ({
  logUserActivity: state.log,
  logUserActivityOnUnload: state.unload,
}))
const text = { id: 'public-text', owner_id: null } as Text
const originalStart = '2026-09-16T10:00:00.000Z'
function Reader() {
  const activity = useReadingActivitySession({
    currentText: text,
    context: {
      wpm: 300,
      mode: state.mode,
      readingPosition: state.position,
      setReadingPosition: state.setPosition,
    },
    readingComplete: false,
  })
  const rsvp = useRsvpActivitySession({
    currentText: text,
    readingPosition: state.position,
    fallbackWpm: 300,
  })
  const adaptive = useAdaptiveActivitySession({
    currentText: text,
    adaptiveSessionWpm: null,
    readingPosition: state.position,
    fallbackWpm: 300,
  })
  useEffect(() => {
    state.switchMode =
      state.mode === 'adaptive'
        ? adaptive.handleModeNavigate
        : rsvp.handleModeNavigate
  }, [adaptive.handleModeNavigate, rsvp.handleModeNavigate])
  useEffect(() => {
    state.onPositionChange = activity.handlePositionChange
  }, [activity.handlePositionChange])
  return <Outlet />
}
function App() {
  return (
    <MemoryRouter>
      <Routes>
        <Route element={<RequireUsername />}>
          <Route path="/" element={<Reader />} />
        </Route>
      </Routes>
    </MemoryRouter>
  )
}
function persist(owner: string | null) {
  sessionStorage.setItem(
    STORAGE_KEYS.READING_ACTIVITY_SESSION,
    JSON.stringify({
      userId: owner,
      textId: text.id,
      started: true,
      startTime: originalStart,
      wpm: 300,
      mode: state.mode,
      progressIndex: 10,
    })
  )
}
function saved() {
  return JSON.parse(
    sessionStorage.getItem(STORAGE_KEYS.READING_ACTIVITY_SESSION)!
  )
}
beforeEach(() => {
  sessionStorage.clear()
  vi.clearAllMocks()
  state.userId = 'account-a'
  state.position = 0
  state.loading = false
  state.mode = 'standard'
})
describe('reading activity across account boundaries', () => {
  it("does not log account A's restored session for account B reading the same public text", () => {
    persist('account-a')
    const app = render(<App />)
    state.userId = 'account-b'
    app.rerender(<App />)
    act(() => window.dispatchEvent(new Event('beforeunload')))
    expect(state.unload).not.toHaveBeenCalled()
    expect(saved()).toMatchObject({
      userId: 'account-b',
      started: false,
      startTime: null,
    })
  })
  it('preserves a matching account session across a reload', () => {
    persist('account-a')
    state.position = 10
    render(<App />)
    act(() => window.dispatchEvent(new Event('beforeunload')))
    expect(state.unload).toHaveBeenCalledWith(
      expect.objectContaining({ startTime: originalStart, progressIndex: 10 }),
      'token-account-a',
      'account-a'
    )
  })
  it('preserves guest reloads but does not adopt guest activity after login', () => {
    state.userId = null
    state.position = 10
    persist(null)
    const app = render(<App />)
    expect(saved()).toMatchObject({
      userId: null,
      started: true,
      startTime: originalStart,
    })
    state.userId = 'account-a'
    state.position = 0
    app.rerender(<App />)
    expect(saved()).toMatchObject({
      userId: 'account-a',
      started: false,
      startTime: null,
    })
  })
  it('ignores a position callback retained from the previous account', () => {
    const app = render(<App />)
    const oldPositionChange = state.onPositionChange!
    state.userId = 'account-b'
    app.rerender(<App />)
    act(() => oldPositionChange(12))
    expect(state.setPosition).not.toHaveBeenCalled()
    expect(saved()).toMatchObject({
      userId: 'account-b',
      progressIndex: 0,
      started: false,
    })
  })
  it.each(['rsvp', 'adaptive'] as const)(
    'ignores a retained %s navigation callback after the account changes',
    (mode) => {
      state.mode = mode
      persist('account-a')
      const app = render(<App />)
      const oldNavigate = state.switchMode!
      state.userId = 'account-b'
      app.rerender(<App />)
      upsertReadingActivitySession(
        { started: true, startTime: originalStart, progressIndex: 3 },
        'account-b'
      )
      const current = saved()
      act(() => oldNavigate('standard'))
      expect(state.log).not.toHaveBeenCalled()
      expect(saved()).toEqual(current)
    }
  )

  it('waits for the initial account before restoring its session', () => {
    persist('account-a')
    state.userId = null
    state.loading = true
    const app = render(<App />)
    expect(saved()).toMatchObject({ userId: 'account-a', started: true })
    state.userId = 'account-a'
    state.loading = false
    app.rerender(<App />)
    expect(saved()).toMatchObject({
      userId: 'account-a',
      started: true,
      startTime: originalStart,
    })
  })

  it('keeps the owner and position when switching from RSVP to adaptive', () => {
    state.mode = 'rsvp'
    state.position = 10
    render(<App />)
    upsertReadingActivitySession(
      {
        started: true,
        startTime: originalStart,
        mode: 'rsvp',
        progressIndex: 10,
      },
      'account-a'
    )
    act(() => state.switchMode!('adaptive'))
    expect(state.log).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'rsvp',
        startTime: originalStart,
        progressIndex: 10,
      }),
      'account-a'
    )
    expect(loadReadingActivitySession('account-a')).toMatchObject({
      userId: 'account-a',
      mode: 'adaptive',
      started: false,
      progressIndex: 10,
    })
  })

  it('logs and clears an adaptive session on mode navigation for its owner', () => {
    state.mode = 'adaptive'
    state.position = 10
    render(<App />)
    upsertReadingActivitySession(
      {
        started: true,
        startTime: originalStart,
        mode: 'adaptive',
        progressIndex: 10,
      },
      'account-a'
    )
    act(() => state.switchMode!('standard'))
    expect(state.log).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'adaptive',
        startTime: originalStart,
        progressIndex: 10,
      }),
      'account-a'
    )
    expect(loadReadingActivitySession('account-a')).toBeNull()
  })
})
