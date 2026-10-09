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
  it('completes a single chunk through the forward control', () => {
    const { result } = renderHook(() =>
      useHorizontalReader({
        ...options,
        text: 'one two',
        totalChunks: 1,
        chunkWordCounts: [2],
      })
    )
    act(() => vi.advanceTimersByTime(5000))
    act(() => result.current.goForward())
    expect(result.current.isComplete).toBe(true)
    expect(result.current.wordsRead).toBe(1)
    expect(result.current.calculatedWpm).toBe(24)
  })

  it('completes a single chunk on a gaze return sweep', () => {
    const { result, rerender } = renderHook(
      ({ gazeX }) =>
        useHorizontalReader({
          ...options,
          text: 'one two',
          totalChunks: 1,
          chunkWordCounts: [2],
          gazeX,
        }),
      { initialProps: { gazeX: 0 } }
    )
    act(() => vi.advanceTimersByTime(5000))
    rerender({ gazeX: 700 })
    act(() => vi.advanceTimersByTime(100))
    rerender({ gazeX: 0 })
    expect(result.current.isComplete).toBe(true)
    expect(result.current.wordsRead).toBe(1)
    expect(result.current.calculatedWpm).toBe(24)
  })

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
