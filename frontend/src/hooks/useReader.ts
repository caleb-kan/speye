import { useState, useEffect, useCallback, useRef, useMemo } from 'react'

type UseReaderOptions = {
  text: string
  wpm: number
  disabled?: boolean
}

export function useReader({ text, wpm, disabled = false }: UseReaderOptions) {
  const [currentWordIndex, setCurrentWordIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const intervalRef = useRef<number | null>(null)

  const words = useMemo(
    () =>
      typeof text === 'string' && text.trim().length > 0
        ? text.split(/\s+/).filter((word) => word.length > 0)
        : [],
    [text]
  )
  const hasText = words.length > 0
  const totalWords = words.length
  const progress =
    totalWords > 0 ? ((currentWordIndex + 1) / totalWords) * 100 : 0

  const msPerWord = (60 / wpm) * 1000

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
