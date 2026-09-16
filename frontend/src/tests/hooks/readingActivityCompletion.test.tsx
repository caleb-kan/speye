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
const mocks = vi.hoisted(() => ({ log: vi.fn() }))
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'reader-a' },
    session: { access_token: 'token' },
  }),
}))
vi.mock('../../services/logUserActivity', () => ({
  logUserActivity: mocks.log,
  logUserActivityOnUnload: vi.fn(),
}))
vi.mock('../../hooks/useSectionQuiz', () => ({
  useSectionQuiz: () => ({ isSectional: false, questionSets: [] }),
}))
vi.mock('../../components/StartQuizButton', () => ({
  StartQuizButton: () => null,
}))
vi.mock('../../components/adaptive/AdaptiveReader', () => ({
  AdaptiveReader: ({
    onPositionChange,
    onComplete,
  }: {
    onPositionChange: (index: number) => void
    onComplete: (value: boolean) => void
  }) => (
    <>
      <button onClick={() => onPositionChange(1)}>Start</button>
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
import {
  loadReadingActivitySession,
  setReadingActivityOwner,
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
    const complete = {
      ...params,
      context: { ...params.context, readingPosition: 20 },
      readingComplete: true,
    }
    rerender(complete)
    expect(mocks.log).toHaveBeenCalledTimes(1)
    rerender({ ...complete, context: { ...complete.context, wpm: 400 } })
    expect(mocks.log).toHaveBeenCalledTimes(1)
    expect(loadReadingActivitySession('reader-a')).toBeNull()
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
    act(() => result.current.handlePositionChange(1))
    rerender(complete)
    expect(mocks.log).toHaveBeenCalledTimes(2)
    expect(mocks.log).toHaveBeenLastCalledWith(
      expect.objectContaining({ textId: text.id, mode, progressIndex: 20 }),
      'reader-a'
    )
  }
)
function AdaptiveHarness({ wpm = 300 }) {
  const [position, setPosition] = useState(0)
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
it('logs a second adaptive completion after Restart but not after a completed rerender', () => {
  const app = render(<AdaptiveHarness />)
  fireEvent.click(screen.getByText('Start'))
  fireEvent.click(screen.getByText('Complete'))
  expect(mocks.log).toHaveBeenCalledTimes(1)
  app.rerender(<AdaptiveHarness wpm={400} />)
  expect(mocks.log).toHaveBeenCalledTimes(1)
  expect(loadReadingActivitySession('reader-a')).toBeNull()
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
  fireEvent.click(screen.getByText('Complete'))
  expect(mocks.log).toHaveBeenCalledTimes(2)
  expect(mocks.log).toHaveBeenLastCalledWith(
    expect.objectContaining({ mode: 'adaptive', progressIndex: 20 }),
    'reader-a'
  )
})
