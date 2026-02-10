import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import type { LocationState } from '../types'
import type { Mode, Scrolling, FixedTextInfo } from '../types'
import type { Text } from '../types/database'
import { useAuth } from '../hooks/useAuth'
import { useOptionsBarSliders } from '../hooks/useOptionsBarSliders'
import { useCustomWpm } from '../hooks/useCustomWpm'
import { buildModeNavigationState } from '../utils/optionsBarNavigation'
import { ModeSelector } from './optionsBar/ModeSelector'
import { GenreSelector } from './optionsBar/GenreSelector'
import { ComplexitySelector } from './optionsBar/ComplexitySelector'
import { StandardOptions } from './optionsBar/StandardOptions'

type OptionsBarProps = {
  wpm: number
  onWpmChange: (wpm: number) => void
  mode: Mode
  onModeChange: (mode: Mode) => void
  onModeNavigate?: (mode: Mode) => void
  scrolling: Scrolling
  onScrollingChange: (scrolling: Scrolling) => void
  blurEnabled: boolean
  onBlurChange: (enabled: boolean) => void
  fiction: boolean
  onFictionChange: (fiction: boolean) => void
  complexityMin: number
  complexityMax: number
  onComplexityMinChange: (min: number) => void
  onComplexityMaxChange: (max: number) => void
  visibleLines: number
  onVisibleLinesChange: (lines: number) => void
  onInputBlockingChange?: (isBlocking: boolean) => void
  fixedText?: FixedTextInfo
  currentTextComplexity?: number | null
  currentText?: Text | null
  isAdaptiveMode?: boolean
  readingPosition?: number
}

export function OptionsBar({
  wpm,
  onWpmChange,
  mode,
  onModeChange,
  onModeNavigate,
  scrolling,
  onScrollingChange,
  blurEnabled,
  onBlurChange,
  fiction,
  onFictionChange,
  complexityMin,
  complexityMax,
  onComplexityMinChange,
  onComplexityMaxChange,
  visibleLines,
  onVisibleLinesChange,
  onInputBlockingChange,
  fixedText,
  currentTextComplexity,
  currentText,
  isAdaptiveMode = false,
  readingPosition = 0,
}: OptionsBarProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()

  // Get library text from location state (if reading a library text)
  const locationState = location.state as LocationState | null
  const libraryText = locationState?.libraryText

  const { complexitySliderRef, visibleLinesSliderRef } = useOptionsBarSliders({
    fixedText,
    complexityMin,
    complexityMax,
    onComplexityMinChange,
    onComplexityMaxChange,
    visibleLines,
    onVisibleLinesChange,
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
        <ModeSelector
          mode={mode}
          isAdaptiveMode={isAdaptiveMode}
          user={user}
          onStandardClick={() => {
            if (mode !== 'standard' || isAdaptiveMode) {
              onModeNavigate?.('standard')
            }
            if (isAdaptiveMode) {
              navigate('/home', {
                state: buildModeNavigationState({
                  includeTimestamp: true,
                  readingPosition,
                  libraryText,
                  currentText,
                }),
                replace: true,
              })
            } else {
              onModeChange('standard')
            }
          }}
          onAdaptiveClick={() => {
            if (!isAdaptiveMode && user) {
              if (mode !== 'adaptive') {
                onModeNavigate?.('adaptive')
              }
              navigate('/adaptive', {
                state: buildModeNavigationState({
                  includeTimestamp: false,
                  readingPosition,
                  libraryText,
                  currentText,
                }),
              })
            }
          }}
        />

        {/* Divider */}
        <div className="w-px h-6 bg-text-secondary opacity-30" />

        <GenreSelector
          fiction={fiction}
          fixedText={fixedText}
          onFictionChange={onFictionChange}
        />

        {/* Divider */}
        <div className="w-px h-6 bg-text-secondary opacity-30" />

        <ComplexitySelector
          fixedText={fixedText}
          currentTextComplexity={currentTextComplexity}
          sliderRef={complexitySliderRef}
        />

        {!isAdaptiveMode && (
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
      </div>
    </div>
  )
}
