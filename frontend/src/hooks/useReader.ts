import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { splitTextToWords } from '../utils/textParsing'
import { wpmToMsPerWord } from '../utils/wpmCalculations'
import { calculateProgressPercentage } from '../utils/progressCalculation'

type UseReaderOptions = {
  /** Text content to read */
  text: string
  /** Words per minute reading speed */
  wpm: number
  /** Whether keyboard controls are disabled */
  disabled?: boolean
}

type UseReaderReturn = {
  /** Current word index (0-based) */
  currentWordIndex: number
  /** Whether reading is currently playing */
  isPlaying: boolean
  /** Whether reading has completed */
  isComplete: boolean
  /** Total number of words in text */
  totalWords: number
  /** Reading progress percentage (0-100) */
  progress: number
  /** Start or resume reading */
  play: () => void
  /** Pause reading */
  pause: () => void
  /** Toggle between play and pause */
  togglePlayPause: () => void
  /** Restart reading from beginning */
  restart: () => void
  /** Whether text content is available */
  hasText: boolean
}

/**
 * Hook for timer-based reading with word-by-word progression.
 * Handles play/pause controls, keyboard shortcuts (Space to toggle), and progress tracking.
 *
 * @param options.text - Text content to read
 * @param options.wpm - Words per minute reading speed
 * @param options.disabled - Whether keyboard controls are disabled
 */
export function useReader({
  text,
  wpm,
  disabled = false,
}: UseReaderOptions): UseReaderReturn {
  const [currentWordIndex, setCurrentWordIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const intervalRef = useRef<number | null>(null)

  const words = useMemo(() => splitTextToWords(text), [text])
  const hasText = words.length > 0
  const totalWords = words.length
  const progress = calculateProgressPercentage(currentWordIndex, totalWords)

  const msPerWord = wpmToMsPerWord(wpm)

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const play = useCallback(() => {
    if (currentWordIndex >= totalWords - 1) {
      setCurrentWordIndex(0)
      setIsComplete(false)
    }
    setIsPlaying(true)
  }, [currentWordIndex, totalWords])

  const pause = useCallback(() => {
    setIsPlaying(false)
  }, [])

  const togglePlayPause = useCallback(() => {
    if (isPlaying) {
      pause()
    } else {
      play()
    }
  }, [isPlaying, play, pause])

  const restart = useCallback(() => {
    clearTimer()
    setCurrentWordIndex(0)
    setIsPlaying(false)
    setIsComplete(false)
  }, [clearTimer])

  useEffect(() => {
    if (isPlaying && currentWordIndex < totalWords) {
      intervalRef.current = window.setInterval(() => {
        setCurrentWordIndex((prev) => {
          if (prev >= totalWords - 1) {
            setIsPlaying(false)
            setIsComplete(true)
            return prev
          }
          return prev + 1
        })
      }, msPerWord)
    }

    return clearTimer
  }, [isPlaying, msPerWord, totalWords, clearTimer, currentWordIndex])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && e.target === document.body) {
        e.preventDefault()
        if (!disabled) {
          togglePlayPause()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [togglePlayPause, disabled])

  return {
    currentWordIndex,
    isPlaying,
    isComplete,
    totalWords,
    progress,
    play,
    pause,
    togglePlayPause,
    restart,
    hasText,
  }
}
