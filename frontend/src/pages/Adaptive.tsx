import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { AdaptiveReadingSession } from '../components/adaptive/AdaptiveReadingSession'
import { useAuth } from '../hooks/useAuth'
import { useReadingPreferences } from '../hooks/useReadingPreferences'
import { useTextNavigation } from '../hooks/useTextNavigation'
import { useReadingPositionSync } from '../hooks/useReadingPositionSync'
import type { LocationState, FixedTextInfo } from '../types'
import { useAdaptiveActivitySession } from '../hooks/useAdaptiveActivitySession'
import { useAdaptiveTextSync } from '../hooks/useAdaptiveTextSync'
import { useNewTextWithReset } from '../hooks/useNewTextWithReset'
import { useClearLocationState } from '../hooks/useClearLocationState'
import { AdaptiveTextLoadingSkeleton } from '../components/adaptive/AdaptiveTextLoadingSkeleton'
import { AdaptiveErrorState } from '../components/adaptive/AdaptiveErrorState'
import { AdaptiveReaderLayout } from '../components/adaptive/AdaptiveReaderLayout'

/**
 * Adaptive reading mode page
 *
 * Open to everyone — no account required, matching the normal and RSVP
 * reading modes. Uses WebGazer eye tracking for gaze-based reading.
 * Supports reading library texts via navigation state.
 */
export function Adaptive() {
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
  const [adaptiveSessionWpm, setAdaptiveSessionWpm] = useState<number | null>(
    null
  )

  const {
    preferences,
    setWpm,
    setMode,
    setScrolling,
    setFiction,
    setComplexityMin,
    setComplexityMax,
    setVisibleLines,
    setPhraseSize,
  } = useReadingPreferences()

  const {
    wpm,
    mode,
    scrolling,
    fiction,
    complexityMin,
    complexityMax,
    visibleLines,
  } = preferences

  const clearLibraryText = useClearLocationState('/adaptive')

  const { currentText, loading, error, handleNewText, refetch } =
    useTextNavigation({
      filters: { fiction, complexityMin, complexityMax },
      libraryText,
      preservedText,
      onClearLibraryText: clearLibraryText,
      currentTextComplexity,
      userId: user?.id,
    })

  useAdaptiveTextSync(
    currentText,
    setCurrentTextComplexity,
    setAdaptiveSessionWpm
  )

  const {
    position: readingPosition,
    setPosition: setReadingPosition,
    resetPosition,
  } = useReadingPositionSync({
    textId: currentText?.id ?? null,
    initialPosition: initialReadingPosition,
    modeTimestamp,
  })

  const { handleModeNavigate } = useAdaptiveActivitySession({
    currentText: currentText ?? null,
    adaptiveSessionWpm,
    readingPosition,
    fallbackWpm: wpm,
  })

  const handleNewTextWithReset = useNewTextWithReset(
    resetPosition,
    handleNewText
  )

  // Shows fixed genre/complexity in OptionsBar when reading from library
  const fixedText: FixedTextInfo | undefined = libraryText
    ? { fiction: libraryText.fiction, complexity: libraryText.complexity }
    : undefined

  // Blur is always off in adaptive mode
  const optionsBarProps = {
    wpm,
    onWpmChange: setWpm,
    mode,
    onModeChange: setMode,
    onModeNavigate: handleModeNavigate,
    scrolling,
    onScrollingChange: setScrolling,
    blurEnabled: false,
    onBlurChange: () => {},
    fiction,
    onFictionChange: setFiction,
    complexityMin,
    complexityMax,
    onComplexityMinChange: setComplexityMin,
    onComplexityMaxChange: setComplexityMax,
    visibleLines,
    onVisibleLinesChange: setVisibleLines,
    phraseSize: preferences.phraseSize,
    onPhraseSizeChange: setPhraseSize,
    currentTextComplexity: currentText?.complexity ?? null,
    currentText: currentText,
    fixedText,
    readingPosition,
  }

  if (loading) {
    return <AdaptiveTextLoadingSkeleton optionsBarProps={optionsBarProps} />
  }

  if (error || !currentText) {
    return (
      <AdaptiveErrorState
        optionsBarProps={optionsBarProps}
        message={error || 'No texts available for the selected criteria.'}
        onRetry={() => refetch()}
      />
    )
  }

  return (
    <AdaptiveReaderLayout optionsBarProps={optionsBarProps}>
      <AdaptiveReadingSession
        key={currentText.id}
        currentText={currentText}
        onNewText={handleNewTextWithReset}
        wpm={wpm}
        initialWordIndex={readingPosition}
        onPositionChange={setReadingPosition}
        onCalculatedWpmChange={setAdaptiveSessionWpm}
        adaptiveSessionWpm={adaptiveSessionWpm}
        isSummary={isSummary}
        hideNewText={!!libraryText || isSummary}
      />
    </AdaptiveReaderLayout>
  )
}
