import { useState } from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import type { Text } from '../../types/database'

const state = vi.hoisted(() => ({
  entries: new Map<string, unknown>(),
  log: vi.fn(),
  unload: vi.fn(),
  save: vi.fn(),
}))
vi.mock('../../../../lib/supabase', () => ({ supabase: {} }))
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'reader-a' },
    session: { access_token: 'token' },
  }),
}))
vi.mock('../../services/logUserActivity', () => ({
  logUserActivity: state.log,
  logUserActivityOnUnload: state.unload,
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
vi.mock('../../components/StartQuizButton', () => ({
  StartQuizButton: ({
    readingComplete,
    onFinish,
  }: {
    readingComplete: boolean
    onFinish: (correct: number, total: number) => void
  }) =>
    readingComplete ? (
      <button onClick={() => onFinish(1, 2)}>Finish quiz</button>
    ) : null,
}))
vi.mock('../../components/adaptive/AdaptiveReader', () => ({
  AdaptiveReader: TestReader,
}))

function TestReader({
  onPositionChange,
  onComplete,
  onSectionComplete,
  onSectionIndexChange,
  onRestart,
}: {
  onPositionChange: (index: number) => void
  onComplete: (complete: boolean) => void
  onSectionComplete: (index: number) => void
  onSectionIndexChange: (index: number) => void
  onRestart: () => void
}) {
  return (
    <>
      <button onClick={() => onPositionChange(1)}>Start</button>
      <button
        onClick={() => {
          onPositionChange(5)
          onSectionIndexChange(0)
          onSectionComplete(0)
        }}
      >
        First section
      </button>
      <button
        onClick={() => {
          onPositionChange(10)
          onComplete(true)
          onSectionIndexChange(1)
          onSectionComplete(1)
        }}
      >
        Last section
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
      <button
        onClick={() => {
          onPositionChange(0)
          onComplete(false)
          onSectionIndexChange(0)
        }}
      >
        Previous section
      </button>
    </>
  )
}

import { useReadingActivitySession } from '../../hooks/useReadingActivitySession'
import { useSectionQuiz } from '../../hooks/useSectionQuiz'
import { AdaptiveReadingSession } from '../../components/adaptive/AdaptiveReadingSession'
import {
  loadReadingActivitySession,
  setReadingActivityOwner,
} from '../../utils/readingActivityStorage'

const text = {
  id: 'sectional-text',
  content: 'word '.repeat(10),
  sectional: true,
  section_content: ['word '.repeat(5), 'word '.repeat(5)],
  quiz: { questionSets: [{ questions: [] }, { questions: [] }] },
} as Text

function StandardHarness({ initialPosition = 0, wpm = 300 }) {
  const [position, setPosition] = useState(initialPosition)
  const [complete, setComplete] = useState(false)
  const activity = useReadingActivitySession({
    currentText: text,
    context: {
      mode: 'standard',
      wpm,
      readingPosition: position,
      setReadingPosition: setPosition,
    },
    readingComplete: complete,
  })
  const quiz = useSectionQuiz(
    text,
    activity.getActivityId,
    activity.readingSessionId
  )
  return (
    <>
      <TestReader
        onPositionChange={activity.handlePositionChange}
        onComplete={setComplete}
        onSectionComplete={quiz.handleSectionComplete}
        onSectionIndexChange={quiz.setCurrentSectionIndex}
        onRestart={() => {
          setComplete(false)
          activity.handleRestart()
        }}
      />
      {quiz.isSectionQuizActive && (
        <button onClick={() => quiz.handleSectionQuizFinish(1, 2)}>
          Finish quiz
        </button>
      )}
    </>
  )
}

function AdaptiveHarness({ initialPosition = 0, wpm = 300 }) {
  const [position, setPosition] = useState(initialPosition)
  return (
    <AdaptiveReadingSession
      currentText={text}
      onNewText={() => {}}
      wpm={wpm}
      initialWordIndex={position}
      onPositionChange={setPosition}
    />
  )
}

beforeEach(() => {
  sessionStorage.clear()
  setReadingActivityOwner('reader-a')
  state.entries.clear()
  vi.clearAllMocks()
  state.save.mockResolvedValue({ user_id: 'reader-a' })
})

const cases = (['standard', 'adaptive'] as const).flatMap((mode) =>
  (['remount', 'pageshow', 'canceled navigation'] as const).map((resume) => ({
    mode,
    resume,
  }))
)
it.each(cases)(
  'retains section answers and scores the completed $mode record after $resume',
  async ({ mode, resume }) => {
    const Harness = mode === 'standard' ? StandardHarness : AdaptiveHarness
    let app = render(<Harness />)
    await act(async () => fireEvent.click(screen.getByText('Start')))
    await act(async () => fireEvent.click(screen.getByText('First section')))
    await act(async () => fireEvent.click(screen.getByText('Finish quiz')))
    const original = loadReadingActivitySession('reader-a')!
    await act(async () => window.dispatchEvent(new Event('beforeunload')))
    if (resume !== 'canceled navigation') {
      await act(async () => window.dispatchEvent(new Event('pagehide')))
    }
    expect(state.unload).toHaveBeenCalledTimes(1)
    const resumedRecord = loadReadingActivitySession('reader-a')!
    expect(resumedRecord.readingSessionId).toBe(original.readingSessionId)
    expect(resumedRecord.activityId).not.toBe(original.activityId)
    if (resume === 'remount') {
      app.unmount()
      app = render(<Harness initialPosition={5} />)
      await act(async () => {})
    } else if (resume === 'pageshow') {
      await act(async () => window.dispatchEvent(new Event('pageshow')))
    }
    await act(async () => fireEvent.click(screen.getByText('Last section')))
    await act(async () => fireEvent.click(screen.getByText('Finish quiz')))
    expect(state.log).toHaveBeenCalledWith(
      expect.objectContaining({
        id: resumedRecord.activityId,
        progressIndex: 10,
      }),
      'reader-a'
    )
    expect(state.save).toHaveBeenCalledExactlyOnceWith(
      { text_id: text.id, score: 50, activity_id: resumedRecord.activityId },
      'reader-a'
    )
    expect(
      state.entries.has(`reader-a:${text.id}:${original.readingSessionId}`)
    ).toBe(false)
    app.unmount()
  }
)

it.each(['standard', 'adaptive'] as const)(
  'isolates an unfinished %s restart from the previous attempt',
  async (mode) => {
    const Harness = mode === 'standard' ? StandardHarness : AdaptiveHarness
    const app = render(<Harness />)
    await act(async () => fireEvent.click(screen.getByText('Start')))
    await act(async () => fireEvent.click(screen.getByText('First section')))
    await act(async () => fireEvent.click(screen.getByText('Finish quiz')))
    const originalId = loadReadingActivitySession('reader-a')!.readingSessionId
    await act(async () => fireEvent.click(screen.getByText('Restart')))
    expect(loadReadingActivitySession('reader-a')!.readingSessionId).not.toBe(
      originalId
    )
    await act(async () => fireEvent.click(screen.getByText('Last section')))
    await act(async () => fireEvent.click(screen.getByText('Finish quiz')))
    expect(state.save).not.toHaveBeenCalled()
    await act(async () => fireEvent.click(screen.getByText('First section')))
    await act(async () => fireEvent.click(screen.getByText('Finish quiz')))
    expect(state.save).toHaveBeenCalledTimes(1)
    app.unmount()
  }
)

it.each(['standard', 'adaptive'] as const)(
  'keeps answered sections when navigating back to word zero in %s',
  async (mode) => {
    const Harness = mode === 'standard' ? StandardHarness : AdaptiveHarness
    const app = render(<Harness />)
    await act(async () => fireEvent.click(screen.getByText('Start')))
    await act(async () => fireEvent.click(screen.getByText('First section')))
    await act(async () => fireEvent.click(screen.getByText('Finish quiz')))
    const original = loadReadingActivitySession('reader-a')!
    await act(async () => fireEvent.click(screen.getByText('Previous section')))
    expect(loadReadingActivitySession('reader-a')!.readingSessionId).toBe(
      original.readingSessionId
    )
    await act(async () => fireEvent.click(screen.getByText('Last section')))
    await act(async () => fireEvent.click(screen.getByText('Finish quiz')))
    expect(state.save).toHaveBeenCalledExactlyOnceWith(
      { text_id: text.id, score: 50, activity_id: original.activityId },
      'reader-a'
    )
    app.unmount()
  }
)

it('retains section answers across a standard WPM activity split', async () => {
  const app = render(<StandardHarness />)
  await act(async () => fireEvent.click(screen.getByText('Start')))
  await act(async () => fireEvent.click(screen.getByText('First section')))
  await act(async () => fireEvent.click(screen.getByText('Finish quiz')))
  const original = loadReadingActivitySession('reader-a')!
  await act(async () => app.rerender(<StandardHarness wpm={400} />))
  const next = loadReadingActivitySession('reader-a')!
  expect(next.readingSessionId).toBe(original.readingSessionId)
  expect(next.activityId).not.toBe(original.activityId)
  await act(async () => fireEvent.click(screen.getByText('Last section')))
  await act(async () => fireEvent.click(screen.getByText('Finish quiz')))
  expect(state.save).toHaveBeenCalledExactlyOnceWith(
    { text_id: text.id, score: 50, activity_id: next.activityId },
    'reader-a'
  )
  app.unmount()
})

it.each(['standard', 'adaptive'] as const)(
  'retains completed %s quiz identity through a remount before the final quiz',
  async (mode) => {
    const Harness = mode === 'standard' ? StandardHarness : AdaptiveHarness
    let app = render(<Harness />)
    await act(async () => fireEvent.click(screen.getByText('Start')))
    await act(async () => fireEvent.click(screen.getByText('First section')))
    await act(async () => fireEvent.click(screen.getByText('Finish quiz')))
    await act(async () => fireEvent.click(screen.getByText('Last section')))
    const completed = loadReadingActivitySession('reader-a')!
    expect(completed.completed).toBe(true)
    expect(completed.started).toBe(false)
    expect(state.log).toHaveBeenCalledTimes(1)
    app.unmount()
    app = render(<Harness initialPosition={10} />)
    await act(async () => {})
    expect(loadReadingActivitySession('reader-a')!.readingSessionId).toBe(
      completed.readingSessionId
    )
    await act(async () => fireEvent.click(screen.getByText('Last section')))
    await act(async () => fireEvent.click(screen.getByText('Finish quiz')))
    expect(state.save).toHaveBeenCalledExactlyOnceWith(
      { text_id: text.id, score: 50, activity_id: completed.activityId },
      'reader-a'
    )
    await act(async () => window.dispatchEvent(new Event('pagehide')))
    expect(state.log).toHaveBeenCalledTimes(1)
    expect(state.unload).not.toHaveBeenCalled()
    app.unmount()
  }
)
