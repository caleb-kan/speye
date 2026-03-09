import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import type { LocationState } from '../types'
import type { Mode, Scrolling, FixedTextInfo } from '../types'
import type { Text } from '../types/database'
import { useAuth } from '../hooks/useAuth'
import { useOptionsBarSliders } from '../hooks/useOptionsBarSliders'
import { useCustomWpm } from '../hooks/useCustomWpm'
import { useIsMobile } from '../hooks/useIsMobile'
import { ROUTES } from '../utils/routes'
import { buildModeNavigationState } from '../utils/optionsBarNavigation'
import { ModeSelector } from './optionsBar/ModeSelector'
import { GenreSelector } from './optionsBar/GenreSelector'
import { ComplexitySelector } from './optionsBar/ComplexitySelector'
import { StandardOptions } from './optionsBar/StandardOptions'
import { RsvpOptions } from './optionsBar/RsvpOptions'

type OptionsBarProps = {
  wpm: number
  onWpmChange: (wpm: number) => void
  mode: Mode
  onModeChange: (mode: Mode) => void
  onModeNavigate?: (mode: Mode) => void
  scrolling?: Scrolling
  onScrollingChange?: (scrolling: Scrolling) => void
  blurEnabled?: boolean
  onBlurChange?: (enabled: boolean) => void
  fiction: boolean
  onFictionChange: (fiction: boolean) => void
  complexityMin: number
  complexityMax: number
  onComplexityMinChange: (min: number) => void
  onComplexityMaxChange: (max: number) => void
  visibleLines: number
  onVisibleLinesChange: (lines: number) => void
  phraseSize: number
  onPhraseSizeChange: (size: number) => void
  onInputBlockingChange?: (isBlocking: boolean) => void
  fixedText?: FixedTextInfo
  currentTextComplexity?: number | null
  currentText?: Text | null
  readingPosition?: number
  preventModeNavigation?: boolean
}

export function OptionsBar({
  wpm,
  onWpmChange,
  mode,
  onModeChange,
  onModeNavigate,
  scrolling = 'static',
  onScrollingChange = () => {},
  blurEnabled = false,
  onBlurChange = () => {},
  fiction,
  onFictionChange,
  complexityMin,
  complexityMax,
  onComplexityMinChange,
  onComplexityMaxChange,
  visibleLines,
  onVisibleLinesChange,
  phraseSize,
  onPhraseSizeChange,
  onInputBlockingChange,
  fixedText,
  currentTextComplexity,
  currentText,
  readingPosition = 0,
  preventModeNavigation = false,
}: OptionsBarProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const isMobile = useIsMobile()

  const locationState = location.state as LocationState | null
  const libraryText = locationState?.libraryText
  const isSummary = locationState?.isSummary

  const { complexitySliderRef, visibleLinesSliderRef, phraseSizeSliderRef } =
    useOptionsBarSliders({
      fixedText,
      complexityMin,
      complexityMax,
      onComplexityMinChange,
      onComplexityMaxChange,
      visibleLines,
      onVisibleLinesChange,
      phraseSize,
      onPhraseSizeChange,
      mode,
    })

  const {
    customWpm,
    showCustomInput,
    isWpmInvalid,
    isCustomActive,
    openCustomInput,
    resetCustomInput,
    handleCustomWpmChange,
    handleCustomWpmSubmit,
    handleCustomWpmKeyDown,
  } = useCustomWpm({ wpm, onWpmChange })

  useEffect(() => {
    onInputBlockingChange?.(showCustomInput && isWpmInvalid)
  }, [showCustomInput, isWpmInvalid, onInputBlockingChange])

  return (
    <div className="z-40 bg-bg">
      <div className="flex flex-wrap items-center justify-center gap-6 py-4 text-sm">
        {!isMobile && (
          <>
            <ModeSelector
              mode={mode}
              user={user}
              onStandardClick={() => {
                if (mode !== 'standard') {
                  onModeNavigate?.('standard')
                  onModeChange('standard')
                  if (
                    !preventModeNavigation &&
                    (mode === 'adaptive' || mode === 'rsvp')
                  ) {
                    navigate(ROUTES.HOME, {
                      state: buildModeNavigationState({
                        includeTimestamp: true,
                        readingPosition,
                        libraryText,
                        currentText,
                        isSummary,
                      }),
                      replace: true,
                    })
                  }
                }
              }}
              onRsvpClick={() => {
                if (mode === 'rsvp') return
                onModeNavigate?.('rsvp')
                onModeChange('rsvp')
                if (!preventModeNavigation) {
                  navigate(ROUTES.RSVP, {
                    state: buildModeNavigationState({
                      includeTimestamp: true,
                      readingPosition,
                      libraryText,
                      currentText,
                      isSummary,
                    }),
                  })
                }
              }}
              onAdaptiveClick={() => {
                if (mode !== 'adaptive' && user) {
                  onModeNavigate?.('adaptive')
                  onModeChange('adaptive')
                  if (!preventModeNavigation) {
                    navigate(ROUTES.ADAPTIVE, {
                      state: buildModeNavigationState({
                        includeTimestamp: false,
                        readingPosition,
                        libraryText,
                        currentText,
                        isSummary,
                      }),
                    })
                  }
                }
              }}
            />

            <div className="w-px h-6 bg-text-secondary opacity-30" />
          </>
        )}

        <GenreSelector
          fiction={fiction}
          fixedText={fixedText}
          onFictionChange={onFictionChange}
        />

        <div className="w-px h-6 bg-text-secondary opacity-30" />

        <ComplexitySelector
          fixedText={fixedText}
          currentTextComplexity={currentTextComplexity}
          sliderRef={complexitySliderRef}
        />

        {mode === 'standard' && (
          <StandardOptions
            scrolling={scrolling}
            onScrollingChange={onScrollingChange}
            blurEnabled={blurEnabled}
            onBlurChange={onBlurChange}
            wpm={wpm}
            onWpmChange={onWpmChange}
            visibleLinesSliderRef={visibleLinesSliderRef}
            showCustomInput={showCustomInput}
            isWpmInvalid={isWpmInvalid}
            customWpm={customWpm}
            isCustomActive={isCustomActive}
            onOpenCustomInput={openCustomInput}
            onResetCustomInput={resetCustomInput}
            onCustomWpmChange={handleCustomWpmChange}
            onCustomWpmSubmit={handleCustomWpmSubmit}
            onCustomWpmKeyDown={handleCustomWpmKeyDown}
          />
        )}

        {mode === 'rsvp' && (
          <RsvpOptions
            wpm={wpm}
            onWpmChange={onWpmChange}
            visibleLinesSliderRef={visibleLinesSliderRef}
            phraseSizeSliderRef={phraseSizeSliderRef}
            showCustomInput={showCustomInput}
            isWpmInvalid={isWpmInvalid}
            customWpm={customWpm}
            isCustomActive={isCustomActive}
            onOpenCustomInput={openCustomInput}
            onResetCustomInput={resetCustomInput}
            onCustomWpmChange={handleCustomWpmChange}
            onCustomWpmSubmit={handleCustomWpmSubmit}
            onCustomWpmKeyDown={handleCustomWpmKeyDown}
          />
        )}
      </div>
    </div>
  )
}
