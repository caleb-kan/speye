import { useState } from 'react'
import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
} from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import type { Text } from '../../types/database'
const mocks = vi.hoisted(() => ({
  log: vi.fn(),
  unload: vi.fn(),
  getActivityId: undefined as (() => string | undefined) | undefined,
}))
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'reader-a' },
    session: { access_token: 'token' },
  }),
}))
vi.mock('../../services/logUserActivity', () => ({
  logUserActivity: mocks.log,
  logUserActivityOnUnload: mocks.unload,
}))
vi.mock('../../hooks/useSectionQuiz', () => ({
  useSectionQuiz: () => ({ isSectional: false, questionSets: [] }),
}))
vi.mock('../../components/StartQuizButton', () => ({
  StartQuizButton: ({
    getActivityId,
  }: {
    getActivityId?: () => string | undefined
  }) => {
    mocks.getActivityId = getActivityId
    return null
  },
}))
vi.mock('../../components/adaptive/AdaptiveReader', () => ({
  AdaptiveReader: ({
    onPositionChange,
    onComplete,
    onRestart,
  }: {
    onPositionChange: (index: number) => void
    onComplete: (value: boolean) => void
    onRestart: () => void
  }) => (
    <>
      <button onClick={() => onPositionChange(1)}>Start</button>
      <button onClick={() => onPositionChange(5)}>Advance</button>
      <button onClick={() => onPositionChange(6)}>Continue</button>
      <button
        onClick={() => {
          onPositionChange(20)
          onComplete(true)
        }}
      >
        Complete
      </button>
      <button
        onClick={() => {
          onRestart()
          onPositionChange(0)
          onComplete(false)
        }}
      >
        Restart
      </button>
    </>
  ),
}))
import { useReadingActivitySession } from '../../hooks/useReadingActivitySession'
import { AdaptiveReadingSession } from '../../components/adaptive/AdaptiveReadingSession'
import { ReadingSession } from '../../components/ReadingSession'
import type { ReadingContext } from '../../types/reading'
import {
  loadReadingActivitySession,
  setReadingActivityOwner,
  upsertReadingActivitySession,
} from '../../utils/readingActivityStorage'
import { useAdaptiveActivitySession } from '../../hooks/useAdaptiveActivitySession'
import { useRsvpActivitySession } from '../../hooks/useRsvpActivitySession'
const text = { id: 'public-text', content: 'word '.repeat(20) } as Text
beforeEach(() => {
  sessionStorage.clear()
  setReadingActivityOwner('reader-a')
  vi.clearAllMocks()
})
it.each(['standard', 'rsvp'] as const)(
  'logs each completed %s reading after Restart without duplicate rerender logs',
  (mode) => {
    const params = {
      currentText: text,
      context: {
        wpm: 300,
        mode,
        readingPosition: 0,
        setReadingPosition: vi.fn(),
      },
      readingComplete: false,
    }
    const { result, rerender } = renderHook(useReadingActivitySession, {
      initialProps: params,
    })
    act(() => result.current.handlePositionChange(1))
    const originalId = result.current.getActivityId()
    expect(originalId).toBe(loadReadingActivitySession('reader-a')?.activityId)
    const complete = {
      ...params,
      context: { ...params.context, readingPosition: 20 },
      readingComplete: true,
    }
    rerender(complete)
    expect(mocks.log).toHaveBeenCalledTimes(1)
    expect(mocks.log.mock.calls[0][0].id).toBe(originalId)
    rerender({ ...complete, context: { ...complete.context, wpm: 400 } })
    expect(mocks.log).toHaveBeenCalledTimes(1)
    expect(loadReadingActivitySession('reader-a')).toEqual(
      expect.objectContaining({
        activityId: originalId,
        completed: true,
        started: false,
      })
    )
    const navigation = renderHook(() =>
      useRsvpActivitySession({
        currentText: text,
        readingPosition: 20,
        fallbackWpm: 400,
      })
    )
    act(() => navigation.result.current.handleModeNavigate('adaptive'))
    expect(mocks.log).toHaveBeenCalledTimes(1)
    navigation.unmount()
    rerender(params)
    act(() => result.current.handleRestart())
    act(() => result.current.handlePositionChange(1))
    const nextId = result.current.getActivityId()
    expect(nextId).not.toBe(originalId)
    rerender(complete)
    expect(mocks.log).toHaveBeenCalledTimes(2)
    expect(mocks.log).toHaveBeenLastCalledWith(
      expect.objectContaining({
        id: nextId,
        textId: text.id,
        mode,
        progressIndex: 20,
      }),
      'reader-a'
    )
  }
)

it.each(['standard', 'rsvp'] as const)(
  'keeps the unloaded %s segment distinct from resumed completion and quiz',
  (mode) => {
    const params = {
      currentText: text,
      context: {
        wpm: 300,
        mode,
        readingPosition: 0,
        setReadingPosition: vi.fn(),
      },
      readingComplete: false,
    }
    const first = renderHook(useReadingActivitySession, {
      initialProps: params,
    })
    act(() => first.result.current.handlePositionChange(1))
    const partial = {
      ...params,
      context: { ...params.context, readingPosition: 5 },
    }
    first.rerender(partial)
    const partialId = first.result.current.getActivityId()
    act(() => window.dispatchEvent(new Event('pagehide')))
    expect(mocks.unload).toHaveBeenCalledWith(
      expect.objectContaining({ id: partialId, progressIndex: 5, wpm: 300 }),
      'token',
      'reader-a'
    )
    first.unmount()
    const resumed = renderHook(useReadingActivitySession, {
      initialProps: partial,
    })
    act(() => resumed.result.current.handlePositionChange(6))
    resumed.rerender({
      ...params,
      readingComplete: true,
      context: { ...params.context, readingPosition: 20 },
    })
    const completedId = resumed.result.current.getActivityId()
    expect(completedId).not.toBe(partialId)
    expect(mocks.log).toHaveBeenCalledWith(
      expect.objectContaining({ id: completedId, progressIndex: 20, wpm: 300 }),
      'reader-a'
    )
  }
)
function AdaptiveHarness({ wpm = 300, initialPosition = 0 }) {
  const [position, setPosition] = useState(initialPosition)
  return (
    <AdaptiveReadingSession
      currentText={text}
      wpm={wpm}
      initialWordIndex={position}
      onPositionChange={setPosition}
      onNewText={() => {}}
    />
  )
}

it.each(['remount', 'pageshow', 'canceled navigation'])(
  'uses a new adaptive activity after an unloaded partial read and %s',
  (resume) => {
    let app = render(<AdaptiveHarness />)
    fireEvent.click(screen.getByText('Start'))
    fireEvent.click(screen.getByText('Advance'))
    const partialId = mocks.getActivityId?.()
    act(() => window.dispatchEvent(new Event('beforeunload')))
    if (resume !== 'canceled navigation') {
      act(() => window.dispatchEvent(new Event('pagehide')))
    }
    expect(mocks.unload).toHaveBeenCalledTimes(1)
    expect(mocks.unload).toHaveBeenCalledWith(
      expect.objectContaining({ id: partialId, progressIndex: 5, wpm: 300 }),
      'token',
      'reader-a'
    )
    if (resume === 'remount') {
      app.unmount()
      app = render(<AdaptiveHarness initialPosition={5} />)
    } else if (resume === 'pageshow') {
      act(() => window.dispatchEvent(new Event('pageshow')))
    }
    fireEvent.click(screen.getByText('Continue'))
    fireEvent.click(screen.getByText('Complete'))
    const completedId = mocks.getActivityId?.()
    expect(completedId).not.toBe(partialId)
    expect(mocks.log).toHaveBeenCalledWith(
      expect.objectContaining({ id: completedId, progressIndex: 20, wpm: 300 }),
      'reader-a'
    )
    app.unmount()
  }
)
it('logs a second adaptive completion after Restart but not after a completed rerender', () => {
  const app = render(<AdaptiveHarness />)
  fireEvent.click(screen.getByText('Start'))
  const originalId = mocks.getActivityId?.()
  expect(originalId).toBe(loadReadingActivitySession('reader-a')?.activityId)
  fireEvent.click(screen.getByText('Complete'))
  expect(mocks.log).toHaveBeenCalledTimes(1)
  expect(mocks.log.mock.calls[0][0].id).toBe(originalId)
  app.rerender(<AdaptiveHarness wpm={400} />)
  expect(mocks.log).toHaveBeenCalledTimes(1)
  expect(loadReadingActivitySession('reader-a')).toEqual(
    expect.objectContaining({
      activityId: originalId,
      completed: true,
      started: false,
    })
  )
  const navigation = renderHook(() =>
    useAdaptiveActivitySession({
      currentText: text,
      readingPosition: 20,
      fallbackWpm: 400,
      adaptiveSessionWpm: null,
    })
  )
  act(() => navigation.result.current.handleModeNavigate())
  expect(mocks.log).toHaveBeenCalledTimes(1)
  navigation.unmount()
  fireEvent.click(screen.getByText('Restart'))
  fireEvent.click(screen.getByText('Start'))
  const nextId = mocks.getActivityId?.()
  expect(nextId).not.toBe(originalId)
  fireEvent.click(screen.getByText('Complete'))
  expect(mocks.log).toHaveBeenCalledTimes(2)
  expect(mocks.log).toHaveBeenLastCalledWith(
    expect.objectContaining({
      id: nextId,
      mode: 'adaptive',
      progressIndex: 20,
    }),
    'reader-a'
  )
})

it.each(['standard', 'rsvp'] as const)(
  'starts a fresh %s attempt after explicit Restart of a completed one-word text',
  (mode) => {
    const params = {
      currentText: { ...text, content: 'word' },
      context: {
        mode,
        wpm: 300,
        readingPosition: 0,
        setReadingPosition: vi.fn(),
      },
      readingComplete: false,
    }
    const reader = renderHook(useReadingActivitySession, {
      initialProps: params,
    })
    reader.rerender({ ...params, readingComplete: true })
    const original = loadReadingActivitySession('reader-a')!
    expect(original.completed).toBe(true)
    expect(original.progressIndex).toBe(0)
    reader.rerender(params)
    act(() => reader.result.current.handleRestart())
    expect(loadReadingActivitySession('reader-a')!.completed).toBe(false)
    expect(reader.result.current.getActivityId()).not.toBe(original.activityId)
    reader.rerender({ ...params, readingComplete: true })
    expect(mocks.log).toHaveBeenCalledTimes(2)
    reader.unmount()
  }
)

it('preserves completed identity during the actual Reader initial position notification and resets only on Restart', () => {
  Element.prototype.scrollTo = vi.fn()
  const original = upsertReadingActivitySession(
    {
      textId: text.id,
      completed: true,
      started: false,
      progressIndex: 20,
      mode: 'standard',
    },
    'reader-a'
  )!
  const context = {
    wpm: 300,
    mode: 'standard',
    scrolling: 'static',
    readingPosition: 0,
    setReadingPosition: vi.fn(),
    blurEnabled: false,
    inputBlocking: false,
    textWidthPercent: 100,
    visibleLines: 3,
    onTextWidthChange: vi.fn(),
  } as unknown as ReadingContext
  const app = render(
    <ReadingSession currentText={text} context={context} onNewText={() => {}} />
  )
  expect(loadReadingActivitySession('reader-a')!.readingSessionId).toBe(
    original.readingSessionId
  )
  expect(loadReadingActivitySession('reader-a')!.activityId).toBe(
    original.activityId
  )
  expect(mocks.log).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Restart' }))
  expect(loadReadingActivitySession('reader-a')!.readingSessionId).not.toBe(
    original.readingSessionId
  )
  expect(loadReadingActivitySession('reader-a')!.completed).toBe(false)
  app.unmount()
})
