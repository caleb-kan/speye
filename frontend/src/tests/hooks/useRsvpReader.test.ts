import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useRsvpReader } from '../../hooks/useRsvpReader'

describe('useRsvpReader', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const defaultOpts = {
    text: 'the quick brown fox jumps over the lazy dog',
    wpm: 300,
    phraseSize: 20,
  }

  describe('initial state', () => {
    it('returns hasText=false and totalWords=0 for empty text', () => {
      const { result } = renderHook(() =>
        useRsvpReader({ text: '', wpm: 300, phraseSize: 20 })
      )
      expect(result.current.hasText).toBe(false)
      expect(result.current.totalWords).toBe(0)
      expect(result.current.phrases).toEqual([])
      expect(result.current.progress).toBe(0)
    })

    it('returns correct values for normal text', () => {
      const { result } = renderHook(() => useRsvpReader(defaultOpts))
      expect(result.current.hasText).toBe(true)
      expect(result.current.totalWords).toBe(9)
      expect(result.current.phrases.length).toBeGreaterThan(0)
      expect(result.current.isPlaying).toBe(false)
      expect(result.current.currentWordIndex).toBe(0)
      expect(result.current.currentPhraseIndex).toBe(0)
    })

    it('respects initialWordIndex', () => {
      const { result } = renderHook(() =>
        useRsvpReader({ ...defaultOpts, initialWordIndex: 5 })
      )
      expect(result.current.currentWordIndex).toBe(5)
    })

    it('clamps initialWordIndex to totalWords - 1', () => {
      const { result } = renderHook(() =>
        useRsvpReader({ ...defaultOpts, initialWordIndex: 100 })
      )
      expect(result.current.currentWordIndex).toBe(8) // 9 words, max index 8
    })
  })

  describe('phrase building', () => {
    it('creates more phrases with smaller phraseSize', () => {
      const { result: smallPhrase } = renderHook(() =>
        useRsvpReader({ ...defaultOpts, phraseSize: 10 })
      )
      const { result: largePhrase } = renderHook(() =>
        useRsvpReader({ ...defaultOpts, phraseSize: 100 })
      )
      expect(smallPhrase.current.phrases.length).toBeGreaterThan(
        largePhrase.current.phrases.length
      )
    })

    it('recalculates phrases when phraseSize changes', () => {
      const { result, rerender } = renderHook((props) => useRsvpReader(props), {
        initialProps: { ...defaultOpts, phraseSize: 10 },
      })
      const initialPhraseCount = result.current.phrases.length

      rerender({ ...defaultOpts, phraseSize: 50 })
      expect(result.current.phrases.length).not.toBe(initialPhraseCount)
    })
  })

  describe('playback', () => {
    it('togglePlayPause starts playing', () => {
      const { result } = renderHook(() => useRsvpReader(defaultOpts))
      expect(result.current.isPlaying).toBe(false)

      act(() => {
        result.current.togglePlayPause()
      })
      expect(result.current.isPlaying).toBe(true)
    })

    it('togglePlayPause again pauses', () => {
      const { result } = renderHook(() => useRsvpReader(defaultOpts))

      act(() => {
        result.current.togglePlayPause()
      })
      expect(result.current.isPlaying).toBe(true)

      act(() => {
        result.current.togglePlayPause()
      })
      expect(result.current.isPlaying).toBe(false)
    })

    it('advances to next phrase after timer', () => {
      const { result } = renderHook(() =>
        useRsvpReader({ ...defaultOpts, phraseSize: 10 })
      )
      const initialPhraseIndex = result.current.currentPhraseIndex

      act(() => {
        result.current.togglePlayPause()
      })

      // Advance enough time for one phrase interval
      act(() => {
        vi.advanceTimersByTime(2000)
      })

      expect(result.current.currentPhraseIndex).toBeGreaterThan(
        initialPhraseIndex
      )
    })

    it('auto-stops at last phrase', () => {
      const { result } = renderHook(() =>
        useRsvpReader({ ...defaultOpts, wpm: 60000, phraseSize: 5 })
      )

      act(() => {
        result.current.togglePlayPause()
      })

      // Each phrase schedules a new setTimeout after React re-renders,
      // so step through one timer at a time until playback stops
      for (let i = 0; i < 50 && result.current.isPlaying; i++) {
        act(() => {
          vi.advanceTimersToNextTimer()
        })
      }

      expect(result.current.isPlaying).toBe(false)
      expect(result.current.isComplete).toBe(true)
    })

    it('restarts from word 0 when playing after complete', () => {
      const { result } = renderHook(() =>
        useRsvpReader({ ...defaultOpts, wpm: 60000, phraseSize: 5 })
      )

      // Play through to completion
      act(() => {
        result.current.togglePlayPause()
      })
      for (let i = 0; i < 50 && result.current.isPlaying; i++) {
        act(() => {
          vi.advanceTimersToNextTimer()
        })
      }
      expect(result.current.isComplete).toBe(true)

      // Toggle again should restart
      act(() => {
        result.current.togglePlayPause()
      })
      expect(result.current.isPlaying).toBe(true)
      expect(result.current.currentWordIndex).toBe(0)
    })
  })

  describe('controls', () => {
    it('restart() resets to word 0 and stops playing', () => {
      const { result } = renderHook(() =>
        useRsvpReader({ ...defaultOpts, phraseSize: 10 })
      )

      // Start playing and advance
      act(() => {
        result.current.togglePlayPause()
      })
      act(() => {
        vi.advanceTimersByTime(2000)
      })

      act(() => {
        result.current.restart()
      })

      expect(result.current.currentWordIndex).toBe(0)
      expect(result.current.isPlaying).toBe(false)
    })
  })

  // With phraseSize=10, the text "the quick brown fox jumps over the lazy dog"
  // produces 5 phrases: ["the quick", "brown fox", "jumps over", "the lazy", "dog"]
  // cumulative word indices: [0, 2, 4, 6, 8]

  describe('jumpForward', () => {
    it('advances to the next phrase', () => {
      const { result } = renderHook(() =>
        useRsvpReader({ ...defaultOpts, phraseSize: 10 })
      )

      expect(result.current.currentPhraseIndex).toBe(0)

      act(() => result.current.jumpForward())

      expect(result.current.currentPhraseIndex).toBe(1)
      expect(result.current.currentWordIndex).toBe(2)
    })

    it('can jump multiple phrases sequentially', () => {
      const { result } = renderHook(() =>
        useRsvpReader({ ...defaultOpts, phraseSize: 10 })
      )

      act(() => result.current.jumpForward())
      act(() => result.current.jumpForward())
      act(() => result.current.jumpForward())

      expect(result.current.currentPhraseIndex).toBe(3)
      expect(result.current.currentWordIndex).toBe(6)
    })

    it('does not advance past the last phrase', () => {
      const { result } = renderHook(() =>
        useRsvpReader({ ...defaultOpts, phraseSize: 10 })
      )

      // Jump to the last phrase and beyond
      for (let i = 0; i < 10; i++) {
        act(() => result.current.jumpForward())
      }

      expect(result.current.currentPhraseIndex).toBe(
        result.current.phrases.length - 1
      )
    })

    it('pauses playback when jumping forward', () => {
      const { result } = renderHook(() =>
        useRsvpReader({ ...defaultOpts, phraseSize: 10 })
      )

      act(() => result.current.togglePlayPause())
      expect(result.current.isPlaying).toBe(true)

      act(() => result.current.jumpForward())
      expect(result.current.isPlaying).toBe(false)
    })

    it('does nothing when text is empty', () => {
      const { result } = renderHook(() =>
        useRsvpReader({ text: '', wpm: 300, phraseSize: 10 })
      )

      const initialWordIndex = result.current.currentWordIndex
      act(() => result.current.jumpForward())

      expect(result.current.currentWordIndex).toBe(initialWordIndex)
      expect(result.current.currentPhraseIndex).toBe(0)
    })
  })

  describe('jumpBack', () => {
    it('moves back to the previous phrase', () => {
      const { result } = renderHook(() =>
        useRsvpReader({ ...defaultOpts, phraseSize: 10 })
      )

      // Move forward first, then back
      act(() => result.current.jumpForward())
      act(() => result.current.jumpForward())
      expect(result.current.currentPhraseIndex).toBe(2)

      act(() => result.current.jumpBack())

      expect(result.current.currentPhraseIndex).toBe(1)
      expect(result.current.currentWordIndex).toBe(2)
    })

    it('clamps to the first phrase when jumping back from the start', () => {
      const { result } = renderHook(() =>
        useRsvpReader({ ...defaultOpts, phraseSize: 10 })
      )

      act(() => result.current.jumpBack())

      expect(result.current.currentPhraseIndex).toBe(0)
      expect(result.current.currentWordIndex).toBe(0)
    })

    it('pauses playback when jumping back', () => {
      const { result } = renderHook(() =>
        useRsvpReader({ ...defaultOpts, phraseSize: 10 })
      )

      act(() => result.current.jumpForward())
      act(() => result.current.togglePlayPause())
      expect(result.current.isPlaying).toBe(true)

      act(() => result.current.jumpBack())
      expect(result.current.isPlaying).toBe(false)
    })

    it('clears isComplete when jumping back from the end', () => {
      const { result } = renderHook(() =>
        useRsvpReader({ ...defaultOpts, wpm: 60000, phraseSize: 10 })
      )

      // Play through to completion
      act(() => result.current.togglePlayPause())
      for (let i = 0; i < 50 && result.current.isPlaying; i++) {
        act(() => vi.advanceTimersToNextTimer())
      }
      expect(result.current.isComplete).toBe(true)

      act(() => result.current.jumpBack())
      expect(result.current.isComplete).toBe(false)
    })

    it('does nothing when text is empty', () => {
      const { result } = renderHook(() =>
        useRsvpReader({ text: '', wpm: 300, phraseSize: 10 })
      )

      act(() => result.current.jumpBack())

      expect(result.current.currentWordIndex).toBe(0)
      expect(result.current.currentPhraseIndex).toBe(0)
    })
  })

  describe('progress', () => {
    it('calculates progress correctly', () => {
      const { result } = renderHook(() => useRsvpReader(defaultOpts))
      // At word 0 with 9 total words: (0 + 1) / 9 * 100 ≈ 11.11
      expect(result.current.progress).toBeCloseTo((1 / 9) * 100, 1)
    })

    it('returns 0 progress for empty text', () => {
      const { result } = renderHook(() =>
        useRsvpReader({ text: '', wpm: 300, phraseSize: 20 })
      )
      expect(result.current.progress).toBe(0)
    })
  })

  describe('keyboard', () => {
    it('space bar toggles play/pause', () => {
      const { result } = renderHook(() => useRsvpReader(defaultOpts))
      expect(result.current.isPlaying).toBe(false)

      act(() => {
        window.dispatchEvent(
          new KeyboardEvent('keydown', { code: 'Space', bubbles: true })
        )
      })
      expect(result.current.isPlaying).toBe(true)

      act(() => {
        window.dispatchEvent(
          new KeyboardEvent('keydown', { code: 'Space', bubbles: true })
        )
      })
      expect(result.current.isPlaying).toBe(false)
    })

    it('space bar is ignored when disabled=true', () => {
      const { result } = renderHook(() =>
        useRsvpReader({ ...defaultOpts, disabled: true })
      )

      act(() => {
        window.dispatchEvent(
          new KeyboardEvent('keydown', { code: 'Space', bubbles: true })
        )
      })
      expect(result.current.isPlaying).toBe(false)
    })

    it('space bar is ignored when target is INPUT', () => {
      const { result } = renderHook(() => useRsvpReader(defaultOpts))

      const input = document.createElement('input')
      document.body.appendChild(input)
      input.focus()

      act(() => {
        input.dispatchEvent(
          new KeyboardEvent('keydown', { code: 'Space', bubbles: true })
        )
      })
      expect(result.current.isPlaying).toBe(false)

      document.body.removeChild(input)
    })

    it('space bar is ignored when target is TEXTAREA', () => {
      const { result } = renderHook(() => useRsvpReader(defaultOpts))

      const textarea = document.createElement('textarea')
      document.body.appendChild(textarea)
      textarea.focus()

      act(() => {
        textarea.dispatchEvent(
          new KeyboardEvent('keydown', { code: 'Space', bubbles: true })
        )
      })
      expect(result.current.isPlaying).toBe(false)

      document.body.removeChild(textarea)
    })

    it('cleans up keydown listener on unmount', () => {
      const removeSpy = vi.spyOn(window, 'removeEventListener')
      const { unmount } = renderHook(() => useRsvpReader(defaultOpts))

      unmount()

      expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function))
      removeSpy.mockRestore()
    })
  })
})
