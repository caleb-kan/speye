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
  jumpBack: () => void
  jumpForward: () => void
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

  const [currentWordIndex, setCurrentWordIndex] = useState(
    totalWords > 0 ? Math.min(initialWordIndex, totalWords - 1) : 0
  )
  const [isPlaying, setIsPlaying] = useState(false)
  const intervalRef = useRef<number | null>(null)

  // Derive phrase index from word index — automatically correct when
  // phraseSize changes because cumulativeWordCounts recalculates while
  // currentWordIndex (the true reading position) stays the same.
  const currentPhraseIndex = useMemo(
    () =>
      hasText
        ? findPhraseIndexForWord(
            cumulativeWordCounts,
            currentWordIndex,
            totalPhrases
          )
        : 0,
    [hasText, cumulativeWordCounts, currentWordIndex, totalPhrases]
  )

  const isComplete = hasText && currentPhraseIndex >= totalPhrases - 1
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
      setCurrentWordIndex(0)
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
    setCurrentWordIndex(0)
    setIsPlaying(false)
  }, [clearTimer])

  const jumpBack = useCallback(() => {
    setIsPlaying(false)
    setCurrentWordIndex((prev) => {
      const phraseIdx = findPhraseIndexForWord(
        cumulativeWordCounts,
        prev,
        totalPhrases
      )
      if (phraseIdx <= 0) return 0
      return cumulativeWordCounts[phraseIdx - 1]
    })
  }, [cumulativeWordCounts, totalPhrases])

  const jumpForward = useCallback(() => {
    setIsPlaying(false)
    setCurrentWordIndex((prev) => {
      const phraseIdx = findPhraseIndexForWord(
        cumulativeWordCounts,
        prev,
        totalPhrases
      )
      if (phraseIdx >= totalPhrases - 1) return prev
      return cumulativeWordCounts[phraseIdx + 1]
    })
  }, [cumulativeWordCounts, totalPhrases])

  useEffect(() => {
    if (isPlaying && currentPhraseIndex < totalPhrases) {
      intervalRef.current = window.setTimeout(() => {
        if (currentPhraseIndex >= totalPhrases - 1) {
          setIsPlaying(false)
          return
        }
        // Advance to the start of the next phrase
        const nextWordIndex = cumulativeWordCounts[currentPhraseIndex + 1]
        if (nextWordIndex !== undefined) {
          setCurrentWordIndex(nextWordIndex)
        }
      }, msPerPhrase)
    }

    return clearTimer
  }, [
    isPlaying,
    msPerPhrase,
    totalPhrases,
    clearTimer,
    currentPhraseIndex,
    cumulativeWordCounts,
  ])

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
    jumpBack,
    jumpForward,
    hasText,
    phrases,
  }
}
