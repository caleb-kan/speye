import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useReader } from '../../hooks/useReader'

describe('useReader', () => {
  const tenWordText = 'one two three four five six seven eight nine ten'

  describe('jumpForward', () => {
    it('advances the word index by the given count', () => {
      const { result } = renderHook(() =>
        useReader({ text: tenWordText, wpm: 300 })
      )

      act(() => result.current.jumpForward(3))

      expect(result.current.currentWordIndex).toBe(3)
    })

    it('clamps to the last word when jumping past the end', () => {
      const { result } = renderHook(() =>
        useReader({ text: tenWordText, wpm: 300 })
      )

      act(() => result.current.jumpForward(100))

      expect(result.current.currentWordIndex).toBe(9)
    })

    it('sets isComplete when reaching the last word', () => {
      const { result } = renderHook(() =>
        useReader({ text: tenWordText, wpm: 300 })
      )

      act(() => result.current.jumpForward(100))

      expect(result.current.isComplete).toBe(true)
    })

    it('clears isComplete when not reaching the end', () => {
      const { result } = renderHook(() =>
        useReader({ text: tenWordText, wpm: 300 })
      )

      // First jump to the end
      act(() => result.current.jumpForward(100))
      expect(result.current.isComplete).toBe(true)

      // Jump back then forward partially
      act(() => result.current.jumpBack(5))
      act(() => result.current.jumpForward(1))

      expect(result.current.isComplete).toBe(false)
    })

    it('pauses playback when jumping', () => {
      const { result } = renderHook(() =>
        useReader({ text: tenWordText, wpm: 300 })
      )

      act(() => result.current.play())
      expect(result.current.isPlaying).toBe(true)

      act(() => result.current.jumpForward(3))
      expect(result.current.isPlaying).toBe(false)
    })

    it('does nothing when text is empty', () => {
      const { result } = renderHook(() => useReader({ text: '', wpm: 300 }))

      act(() => result.current.jumpForward(5))

      expect(result.current.currentWordIndex).toBe(0)
    })
  })

  describe('jumpBack', () => {
    it('moves the word index back by the given count', () => {
      const { result } = renderHook(() =>
        useReader({ text: tenWordText, wpm: 300 })
      )

      act(() => result.current.jumpForward(5))
      act(() => result.current.jumpBack(2))

      expect(result.current.currentWordIndex).toBe(3)
    })

    it('clamps to zero when jumping before the start', () => {
      const { result } = renderHook(() =>
        useReader({ text: tenWordText, wpm: 300 })
      )

      act(() => result.current.jumpForward(3))
      act(() => result.current.jumpBack(100))

      expect(result.current.currentWordIndex).toBe(0)
    })

    it('pauses playback when jumping back', () => {
      const { result } = renderHook(() =>
        useReader({ text: tenWordText, wpm: 300 })
      )

      act(() => result.current.play())
      expect(result.current.isPlaying).toBe(true)

      act(() => result.current.jumpBack(1))
      expect(result.current.isPlaying).toBe(false)
    })

    it('clears isComplete when jumping back from the end', () => {
      const { result } = renderHook(() =>
        useReader({ text: tenWordText, wpm: 300 })
      )

      act(() => result.current.jumpForward(100))
      expect(result.current.isComplete).toBe(true)

      act(() => result.current.jumpBack(3))
      expect(result.current.isComplete).toBe(false)
    })

    it('does nothing when text is empty', () => {
      const { result } = renderHook(() => useReader({ text: '', wpm: 300 }))

      act(() => result.current.jumpBack(5))

      expect(result.current.currentWordIndex).toBe(0)
    })
  })

  describe('keyboard shortcuts', () => {
    it('toggles play/pause on Space when body is focused', () => {
      const { result } = renderHook(() =>
        useReader({ text: tenWordText, wpm: 300 })
      )

      act(() => {
        const event = new KeyboardEvent('keydown', {
          code: 'Space',
          bubbles: true,
        })
        Object.defineProperty(event, 'target', {
          value: document.body,
        })
        window.dispatchEvent(event)
      })

      expect(result.current.isPlaying).toBe(true)
    })

    it('does not toggle play/pause on Space when disabled', () => {
      const { result } = renderHook(() =>
        useReader({ text: tenWordText, wpm: 300, disabled: true })
      )

      act(() => {
        const event = new KeyboardEvent('keydown', {
          code: 'Space',
          bubbles: true,
        })
        Object.defineProperty(event, 'target', {
          value: document.body,
        })
        window.dispatchEvent(event)
      })

      expect(result.current.isPlaying).toBe(false)
    })
  })

  describe('timer stops on jump', () => {
    it('clears the interval when jumpForward is called', () => {
      vi.useFakeTimers()

      const { result } = renderHook(() =>
        useReader({ text: tenWordText, wpm: 60000 })
      )

      act(() => result.current.play())
      expect(result.current.isPlaying).toBe(true)

      // Advance to word 1
      act(() => vi.advanceTimersByTime(1))

      act(() => result.current.jumpForward(3))

      const indexAfterJump = result.current.currentWordIndex

      // Advance time significantly - interval should not fire
      act(() => vi.advanceTimersByTime(100))

      expect(result.current.currentWordIndex).toBe(indexAfterJump)

      vi.useRealTimers()
    })
  })
})
