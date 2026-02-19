import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { splitTextToWords } from '../utils/textParsing'
import { wpmToMsPerWord } from '../utils/wpmCalculations'
import { calculateProgressPercentage } from '../utils/progressCalculation'
import {
  buildPhrases,
  getPhraseWordCounts,
  getCumulativeWordCounts,
  findPhraseIndexForWord,
} from '../utils/rsvpPhrasing'

type UseRsvpReaderOptions = {
  text: string
  wpm: number
  phraseSize: number
  disabled?: boolean
  initialWordIndex?: number
}

type UseRsvpReaderReturn = {
  currentPhraseIndex: number
  currentWordIndex: number
  isPlaying: boolean
  isComplete: boolean
  totalWords: number
  progress: number
  togglePlayPause: () => void
  restart: () => void
  hasText: boolean
  phrases: string[]
}

export function useRsvpReader({
  text,
  wpm,
  phraseSize,
  disabled = false,
  initialWordIndex = 0,
}: UseRsvpReaderOptions): UseRsvpReaderReturn {
  const words = useMemo(() => splitTextToWords(text), [text])
  const hasText = words.length > 0
  const totalWords = words.length

  const phrases = useMemo(
    () => buildPhrases(words, phraseSize),
    [words, phraseSize]
  )

  const totalPhrases = phrases.length

  const phraseWordCounts = useMemo(
    () => getPhraseWordCounts(phrases),
    [phrases]
  )

  const cumulativeWordCounts = useMemo(
    () => getCumulativeWordCounts(phraseWordCounts),
    [phraseWordCounts]
  )

  const initialPhraseIndex = useMemo(
    () =>
      hasText
        ? findPhraseIndexForWord(
            cumulativeWordCounts,
            initialWordIndex,
            totalPhrases
          )
        : 0,
    [hasText, cumulativeWordCounts, initialWordIndex, totalPhrases]
  )

  const [currentPhraseIndex, setCurrentPhraseIndex] =
    useState(initialPhraseIndex)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isComplete, setIsComplete] = useState(
    hasText && initialPhraseIndex >= totalPhrases - 1
  )
  const intervalRef = useRef<number | null>(null)

  const currentWordIndex = Math.min(
    cumulativeWordCounts[currentPhraseIndex] ?? 0,
    totalWords - 1
  )
  const progress = calculateProgressPercentage(currentWordIndex, totalWords)

  const currentPhraseWordCount = phraseWordCounts[currentPhraseIndex] ?? 1
  const msPerPhrase = wpmToMsPerWord(wpm) * currentPhraseWordCount

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearTimeout(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const play = useCallback(() => {
    if (currentPhraseIndex >= totalPhrases - 1) {
      setCurrentPhraseIndex(0)
      setIsComplete(false)
    }
    setIsPlaying(true)
  }, [currentPhraseIndex, totalPhrases])

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
    setCurrentPhraseIndex(0)
    setIsPlaying(false)
    setIsComplete(false)
  }, [clearTimer])

  useEffect(() => {
    if (isPlaying && currentPhraseIndex < totalPhrases) {
      intervalRef.current = window.setTimeout(() => {
        setCurrentPhraseIndex((prev) => {
          if (prev >= totalPhrases - 1) {
            setIsPlaying(false)
            setIsComplete(true)
            return prev
          }
          return prev + 1
        })
      }, msPerPhrase)
    }

    return clearTimer
  }, [isPlaying, msPerPhrase, totalPhrases, clearTimer, currentPhraseIndex])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (e.code === 'Space' && tag !== 'INPUT' && tag !== 'TEXTAREA') {
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
    currentPhraseIndex,
    currentWordIndex,
    isPlaying,
    isComplete,
    totalWords,
    progress,
    togglePlayPause,
    restart,
    hasText,
    phrases,
  }
}
