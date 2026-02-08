import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { OptionsBar } from '../components/OptionsBar'
import { AdaptiveReadingSession } from '../components/adaptive/AdaptiveReadingSession'
import { useAuth } from '../hooks/useAuth'
import { useReadingPreferences } from '../hooks/useReadingPreferences'
import { useTextNavigation } from '../hooks/useTextNavigation'
import { useReadingPositionSync } from '../hooks/useReadingPositionSync'
import { Loader2 } from 'lucide-react'
import type { LocationState, FixedTextInfo } from '../types'
import { logUserActivity } from '../services/logUserActivity'
import {
  clearReadingActivitySession,
  loadReadingActivitySession,
  upsertReadingActivitySession,
} from '../utils/readingActivityStorage'

/**
 * Adaptive reading mode page
 *
 * Requires authentication. If not logged in, redirects to login page.
 * Uses WebGazer eye tracking for gaze-based reading.
 * Supports reading library texts via navigation state.
 */
export function Adaptive() {
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as LocationState | null
  const libraryText = state?.libraryText
  const preservedText = state?.preservedText
  const initialReadingPosition = state?.readingPosition ?? 0
  const modeTimestamp = state?._ts

  const { user, loading: authLoading } = useAuth()
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

  const clearLibraryText = useCallback(() => {
    navigate('/adaptive', { replace: true, state: null })
  }, [navigate])

  const { currentText, loading, error, handleNewText, refetch } =
    useTextNavigation({
      filters: { fiction, complexityMin, complexityMax },
      libraryText,
      preservedText,
      onClearLibraryText: clearLibraryText,
      currentTextComplexity,
    })

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing derived state from fetched text
    setCurrentTextComplexity(currentText?.complexity ?? null)
    setAdaptiveSessionWpm(null)
  }, [currentText])

  useEffect(() => {
    if (!adaptiveSessionWpm || !currentText) return
    upsertReadingActivitySession({
      textId: currentText.id,
      wpm: Math.round(adaptiveSessionWpm),
      mode: 'adaptive',
    })
  }, [adaptiveSessionWpm, currentText])

  const {
    position: readingPosition,
    setPosition: setReadingPosition,
    resetPosition,
  } = useReadingPositionSync({
    textId: currentText?.id ?? null,
    initialPosition: initialReadingPosition,
    modeTimestamp,
  })

  const handleNewTextWithReset = useCallback(() => {
    resetPosition()
    handleNewText()
  }, [resetPosition, handleNewText])

  // Create fixed text info if reading from library (shows fixed genre/complexity in OptionsBar)
  const fixedText: FixedTextInfo | undefined = libraryText
    ? { fiction: libraryText.fiction, complexity: libraryText.complexity }
    : undefined

  // Auth check - redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login', { state: { returnTo: '/adaptive' } })
    }
  }, [user, authLoading, navigate])

  // Shared OptionsBar props for adaptive mode (blur is always off in adaptive mode)
  const optionsBarProps = {
    wpm,
    onWpmChange: setWpm,
    mode,
    onModeChange: setMode,
    onModeNavigate: () => {
      // Log session when switching away from adaptive mode

      if (!currentText) return
      const session = loadReadingActivitySession()
      if (!session?.started || session.textId !== currentText.id) return

      const effectiveWpm = adaptiveSessionWpm
        ? Math.round(adaptiveSessionWpm)
        : (session.wpm ?? wpm)

      const effectiveProgress = Math.max(
        session.progressIndex ?? 0,
        readingPosition
      )

      void logUserActivity({
        textId: currentText.id,
        wpm: effectiveWpm,
        startTime: session.startTime ?? new Date().toISOString(),
        endTime: new Date().toISOString(),
        mode: session.mode ?? 'adaptive',
        progressIndex: effectiveProgress,
      })

      clearReadingActivitySession()
    },
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
    isAdaptiveMode: true,
    currentTextComplexity: currentText?.complexity ?? null,
    currentText: currentText,
    fixedText,
    readingPosition,
  }

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    )
  }

  // Don't render if not authenticated (will redirect)
  if (!user) {
    return null
  }

  // Show loading state while fetching texts
  if (loading) {
    return (
      <div className="flex-1 flex flex-col">
        <OptionsBar {...optionsBarProps} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-4" />
            <p className="text-text-secondary">Loading texts...</p>
          </div>
        </div>
      </div>
    )
  }

  // Show error state
  if (error || !currentText) {
    return (
      <div className="flex-1 flex flex-col">
        <OptionsBar {...optionsBarProps} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md">
            <p className="text-error mb-4">
              {error || 'No texts available for the selected criteria.'}
            </p>
            <button
              onClick={() => refetch()}
              className="px-4 py-2 bg-primary text-bg rounded hover:bg-primary/90 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col">
      <OptionsBar {...optionsBarProps} />
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <AdaptiveReadingSession
          key={currentText.id}
          currentText={currentText}
          onNewText={handleNewTextWithReset}
          wpm={wpm}
          initialWordIndex={readingPosition}
          onPositionChange={setReadingPosition}
          onCalculatedWpmChange={setAdaptiveSessionWpm}
          adaptiveSessionWpm={adaptiveSessionWpm}
        />
      </div>
    </div>
  )
}
