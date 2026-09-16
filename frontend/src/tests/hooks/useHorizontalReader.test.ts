import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useHorizontalReader } from '../../hooks/useHorizontalReader'

const options = {
  text: 'one two three four five six seven eight nine ten eleven twelve',
  gazeX: null,
  isGazeReliable: true,
  containerLeft: 0,
  containerWidth: 800,
  totalChunks: 3,
  chunkWordCounts: [4, 4, 4],
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-09-16T10:00:00Z'))
})

afterEach(() => vi.useRealTimers())

describe('adaptive reading session timing', () => {
  it('starts a new WPM clock when restarting with reliable gaze', () => {
    const { result } = renderHook(() => useHorizontalReader(options))
    act(() => vi.advanceTimersByTime(4000))
    act(() => result.current.goForward())
    expect(result.current.calculatedWpm).toBe(60)

    act(() => result.current.restart())
    act(() => vi.advanceTimersByTime(4000))
    act(() => result.current.goForward())
    expect(result.current.calculatedWpm).toBe(60)
  })

  it('starts a new WPM clock when the text changes with reliable gaze', () => {
    const { result, rerender } = renderHook(
      ({ text }) => useHorizontalReader({ ...options, text }),
      { initialProps: { text: options.text } }
    )
    act(() => vi.advanceTimersByTime(4000))
    act(() => result.current.goForward())
    rerender({ text: 'a b c d e f g h i j k l' })
    act(() => vi.advanceTimersByTime(4000))
    act(() => result.current.goForward())
    expect(result.current.calculatedWpm).toBe(60)
  })
})
