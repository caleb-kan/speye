import { useState, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { STORAGE_KEYS } from '../constants/storage'
import { RsvpReadingSession } from '../components/rsvp/RsvpReadingSession'
import { useReadingPreferences } from '../hooks/useReadingPreferences'
import { useTextNavigation } from '../hooks/useTextNavigation'
import { useReadingPositionSync } from '../hooks/useReadingPositionSync'
import { useRsvpActivitySession } from '../hooks/useRsvpActivitySession'
import { useNewTextWithReset } from '../hooks/useNewTextWithReset'
import { useClearLocationState } from '../hooks/useClearLocationState'
import { RsvpTextLoadingSkeleton } from '../components/rsvp/RsvpTextLoadingSkeleton'
import { RsvpErrorState } from '../components/rsvp/RsvpErrorState'
import { RsvpReaderLayout } from '../components/rsvp/RsvpReaderLayout'
import type { LocationState, FixedTextInfo } from '../types'

export function Rsvp() {
  const location = useLocation()
  const state = location.state as LocationState | null
  const libraryText = state?.libraryText
  const preservedText = state?.preservedText
  const initialReadingPosition = state?.readingPosition ?? 0
  const modeTimestamp = state?._ts
  const isSummary = state?.isSummary ?? false

  const { user } = useAuth()
  const [currentTextComplexity, setCurrentTextComplexity] = useState<
    number | null
  >(null)
  const [inputBlocking, setInputBlocking] = useState(false)
  const [optionsOpen, setOptionsOpen] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.RSVP_OPTIONS_OPEN) === 'true'
    } catch {
      return false
    }
  })

  const setOptionsOpenPersisted = useCallback((open: boolean) => {
    setOptionsOpen(open)
    try {
      localStorage.setItem(STORAGE_KEYS.RSVP_OPTIONS_OPEN, String(open))
    } catch {
      // localStorage may be unavailable
    }
  }, [])

  const handlePlayingChange = useCallback(
    (playing: boolean) => {
      if (playing) {
        setOptionsOpenPersisted(false)
      }
    },
    [setOptionsOpenPersisted]
  )

  const {
    preferences,
    setWpm,
    setMode,
    setFiction,
    setComplexityMin,
    setComplexityMax,
    setVisibleLines,
    setPhraseSize,
  } = useReadingPreferences()

  const {
    wpm,
    mode,
    fiction,
    complexityMin,
    complexityMax,
    visibleLines,
    phraseSize,
  } = preferences

  const clearLibraryText = useClearLocationState('/rsvp')

  const { currentText, loading, error, handleNewText, refetch } =
    useTextNavigation({
      filters: { fiction, complexityMin, complexityMax },
      libraryText,
      preservedText,
      onClearLibraryText: clearLibraryText,
      currentTextComplexity,
      userId: user?.id,
    })

  const derivedComplexity = currentText?.complexity ?? null
  if (derivedComplexity !== currentTextComplexity) {
    setCurrentTextComplexity(derivedComplexity)
  }

  const {
    position: readingPosition,
    setPosition: setReadingPosition,
    resetPosition,
  } = useReadingPositionSync({
    textId: currentText?.id ?? null,
    initialPosition: initialReadingPosition,
    modeTimestamp,
  })

  const { handleModeNavigate } = useRsvpActivitySession({
    currentText: currentText ?? null,
    readingPosition,
    fallbackWpm: wpm,
  })

  const handleNewTextWithReset = useNewTextWithReset(
    resetPosition,
    handleNewText
  )

  const fixedText: FixedTextInfo | undefined = libraryText
    ? { fiction: libraryText.fiction, complexity: libraryText.complexity }
    : undefined

  const optionsBarProps = {
    wpm,
    onWpmChange: setWpm,
    mode: mode,
    onModeChange: setMode,
    onModeNavigate: handleModeNavigate,
    fiction,
    onFictionChange: setFiction,
    complexityMin,
    complexityMax,
    onComplexityMinChange: setComplexityMin,
    onComplexityMaxChange: setComplexityMax,
    visibleLines,
    onVisibleLinesChange: setVisibleLines,
    phraseSize,
    onPhraseSizeChange: setPhraseSize,
    onInputBlockingChange: setInputBlocking,
    currentTextComplexity: currentText?.complexity ?? null,
    currentText: currentText,
    fixedText,
    readingPosition,
  }

  if (loading) {
    return <RsvpTextLoadingSkeleton optionsBarProps={optionsBarProps} />
  }

  if (error || !currentText) {
    return (
      <RsvpErrorState
        optionsBarProps={optionsBarProps}
        message={error || 'No texts available for the selected criteria.'}
        onRetry={() => refetch()}
      />
    )
  }

  return (
    <RsvpReaderLayout
      optionsBarProps={optionsBarProps}
      optionsOpen={optionsOpen}
      onOptionsOpenChange={setOptionsOpenPersisted}
    >
      <RsvpReadingSession
        key={currentText.id}
        currentText={currentText}
        modeTimestamp={modeTimestamp}
        wpm={wpm}
        phraseSize={phraseSize}
        visibleLines={visibleLines}
        readingPosition={readingPosition}
        onPositionChange={setReadingPosition}
        inputBlocking={inputBlocking}
        onNewText={handleNewTextWithReset}
        isSummary={isSummary}
        hideNewText={!!libraryText || isSummary}
        forcePause={optionsOpen}
        onPlayingChange={handlePlayingChange}
      />
    </RsvpReaderLayout>
  )
}
