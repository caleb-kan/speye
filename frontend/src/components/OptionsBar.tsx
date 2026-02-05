import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import type { LocationState } from '../types'
import type { Mode, Scrolling, FixedTextInfo } from '../types'
import type { Text } from '../types/database'
import noUiSlider, { type API } from 'nouislider'
import { MIN_COMPLEXITY, MAX_COMPLEXITY } from '../constants/complexity'
import { WPM_PRESETS, MIN_WPM, MAX_WPM } from '../constants/wpm'
import { MIN_VISIBLE_LINES, MAX_VISIBLE_LINES } from '../constants/visibleLines'
import { useAuth } from '../hooks/useAuth'
import { Lock } from 'lucide-react'

type OptionsBarProps = {
  wpm: number
  onWpmChange: (wpm: number) => void
  mode: Mode
  onModeChange: (mode: Mode) => void
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

// Extended HTML element type with noUiSlider API
interface SliderElement extends HTMLDivElement {
  noUiSlider?: API
}

export function OptionsBar({
  wpm,
  onWpmChange,
  mode,
  onModeChange,
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

  /**
   * Build navigation state for mode switching.
   * - libraryText: locks filters (from library selection)
   * - preservedText: keeps text but allows filter changes
   * - Neither: just pass position and timestamp
   */
  const buildModeNavigationState = (
    includeTimestamp: boolean
  ): LocationState => {
    const textToPass = libraryText || currentText
    const baseState: LocationState = { readingPosition }

    if (includeTimestamp) {
      baseState._ts = Date.now()
    }

    if (!textToPass) {
      return baseState
    }

    // libraryText takes priority - it locks filters
    if (libraryText) {
      return { ...baseState, libraryText: textToPass }
    }

    // Otherwise use preservedText - allows filter changes
    return { ...baseState, preservedText: textToPass }
  }

  const [customWpm, setCustomWpm] = useState('')
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [isWpmInvalid, setIsWpmInvalid] = useState(false)
  const sliderRef = useRef<SliderElement>(null)
  const onComplexityMinChangeRef = useRef(onComplexityMinChange)
  const onComplexityMaxChangeRef = useRef(onComplexityMaxChange)
  const visibleLinesSliderRef = useRef<SliderElement>(null)
  const onVisibleLinesChangeRef = useRef(onVisibleLinesChange)

  // Keep refs up to date with latest callbacks
  useEffect(() => {
    onComplexityMinChangeRef.current = onComplexityMinChange
    onComplexityMaxChangeRef.current = onComplexityMaxChange
    onVisibleLinesChangeRef.current = onVisibleLinesChange
  }, [onComplexityMinChange, onComplexityMaxChange, onVisibleLinesChange])

  // Create complexity slider once on mount
  // Note: complexityMin/Max are intentionally not in deps because:
  // 1. They're loaded synchronously from localStorage before first render
  // 2. The slider is only created once (hasChildNodes check prevents recreation)
  // 3. The slider's 'set' event handler updates preferences, not vice versa
  useEffect(() => {
    // Only create slider when fixedText is not set and the div is rendered
    if (fixedText) return
    if (!sliderRef.current || sliderRef.current.hasChildNodes()) return

    noUiSlider.create(sliderRef.current, {
      start: [complexityMin, complexityMax],
      connect: true,
      behaviour: 'unconstrained-tap', // Allow handles to cross each other
      range: {
        min: MIN_COMPLEXITY,
        max: MAX_COMPLEXITY,
      },
      tooltips: true,
      step: 1,
      format: {
        to: (value) => {
          const intValue = Math.round(value)
          if (intValue === MAX_COMPLEXITY) {
            return `${MAX_COMPLEXITY}+`
          } else {
            return intValue.toString()
          }
        },
        from: (value) => {
          return Number(value)
        },
      },
    })

    const slider = sliderRef.current.noUiSlider

    // Sort values so min <= max (handles can cross with unconstrained behaviour)
    slider?.on('set', (values: (string | number)[]) => {
      const val0 = parseInt(String(values[0]))
      const val1 = parseInt(String(values[1]))
      const minVal = Math.min(val0, val1)
      const maxVal = Math.max(val0, val1)
      onComplexityMinChangeRef.current(minVal)
      onComplexityMaxChangeRef.current(maxVal)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fixedText])

  useEffect(() => {
    if (
      !visibleLinesSliderRef.current ||
      visibleLinesSliderRef.current.hasChildNodes()
    )
      return

    noUiSlider.create(visibleLinesSliderRef.current, {
      start: [visibleLines],
      connect: [true, false],
      range: {
        min: MIN_VISIBLE_LINES,
        max: MAX_VISIBLE_LINES,
      },
      tooltips: true,
      step: 1,
      format: {
        to: (value) => Math.round(value).toString(),
        from: (value) => Number(value),
      },
    })

    const slider = visibleLinesSliderRef.current.noUiSlider

    slider?.on('update', (values: (string | number)[]) => {
      const val = parseInt(String(values[0]))
      onVisibleLinesChangeRef.current(val)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    onInputBlockingChange?.(showCustomInput && isWpmInvalid)
  }, [showCustomInput, isWpmInvalid, onInputBlockingChange])

  const isValueInvalid = (value: string) => {
    if (!value.trim()) return false
    const num = parseInt(value, 10)
    return isNaN(num) || num < MIN_WPM || num > MAX_WPM
  }

  const handleCustomWpmChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '')
    setCustomWpm(value)
    setIsWpmInvalid(isValueInvalid(value))
  }

  const handleCustomWpmSubmit = () => {
    if (!customWpm.trim()) {
      setShowCustomInput(false)
      setCustomWpm('')
      setIsWpmInvalid(false)
      return
    }

    const value = parseInt(customWpm, 10)
    if (!isNaN(value)) {
      const clampedValue = Math.min(Math.max(value, MIN_WPM), MAX_WPM)
      onWpmChange(clampedValue)
    }
    setShowCustomInput(false)
    setCustomWpm('')
    setIsWpmInvalid(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCustomWpmSubmit()
    } else if (e.key === 'Escape') {
      setShowCustomInput(false)
      setCustomWpm('')
      setIsWpmInvalid(false)
    }
  }

  return (
    <div className="z-40 bg-bg">
      <div className="flex flex-wrap items-center justify-center gap-6 py-4 text-sm">
        {/* Mode Selection */}
        <div className="flex items-center gap-2">
          <span className="text-text-secondary mr-1">mode:</span>
          <button
            onClick={() => {
              if (isAdaptiveMode) {
                // Navigate to standard mode, preserving text and position
                navigate('/home', {
                  state: buildModeNavigationState(true),
                  replace: true,
                })
              } else {
                onModeChange('standard')
              }
            }}
            className={`px-3 py-1.5 transition-colors ${
              mode === 'standard' && !isAdaptiveMode
                ? 'text-primary'
                : 'text-text-secondary hover:text-text'
            }`}
            aria-label="Standard mode"
            aria-pressed={mode === 'standard' && !isAdaptiveMode}
          >
            standard
          </button>
          <button
            onClick={() => {
              if (!isAdaptiveMode && user) {
                // Navigate to adaptive mode, preserving text and position
                navigate('/adaptive', {
                  state: buildModeNavigationState(false),
                })
              }
            }}
            disabled={!user && !isAdaptiveMode}
            className={`px-3 py-1.5 transition-colors flex items-center gap-1 ${
              isAdaptiveMode
                ? 'text-primary'
                : !user
                  ? 'text-text-secondary opacity-50 cursor-not-allowed'
                  : 'text-text-secondary hover:text-text'
            }`}
            title={
              isAdaptiveMode
                ? 'Currently in adaptive mode'
                : !user
                  ? 'Requires sign in'
                  : 'Adaptive reading mode with eye tracking'
            }
            aria-label={
              isAdaptiveMode
                ? 'Adaptive mode (active)'
                : !user
                  ? 'Adaptive mode (requires sign in)'
                  : 'Adaptive mode'
            }
            aria-pressed={isAdaptiveMode}
          >
            adaptive
            {!user && !isAdaptiveMode && <Lock size={12} />}
          </button>
          <button
            disabled
            className="px-3 py-1.5 rounded text-text-secondary opacity-50 cursor-not-allowed flex items-center gap-1"
            title="Coming soon - requires sign in"
            aria-label="Summarized mode (coming soon, requires sign in)"
          >
            summarized
            <Lock size={12} />
          </button>
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-text-secondary opacity-30" />

        {/* Fiction/Non-Fiction Selection */}
        <div className="flex items-center gap-2">
          <span className="text-text-secondary mr-1">genre:</span>
          {fixedText ? (
            <span className="px-3 py-1.5 text-primary">
              {fixedText.fiction ? 'fiction' : 'non-fiction'}
            </span>
          ) : (
            <>
              <button
                onClick={() => onFictionChange(false)}
                className={`px-3 py-1.5 transition-colors ${
                  !fiction
                    ? 'text-primary'
                    : 'text-text-secondary hover:text-text'
                }`}
                aria-label="Non-fiction texts"
                aria-pressed={!fiction}
              >
                non-fiction
              </button>
              <button
                onClick={() => onFictionChange(true)}
                className={`px-3 py-1.5 transition-colors ${
                  fiction
                    ? 'text-primary'
                    : 'text-text-secondary hover:text-text'
                }`}
                aria-label="Fiction texts"
                aria-pressed={fiction}
              >
                fiction
              </button>
            </>
          )}
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-text-secondary opacity-30" />

        {/* Complexity Selection */}
        <div className="flex items-center gap-2">
          <span className="text-text-secondary mr-1">complexity:</span>
          {fixedText ? (
            <span className="px-3 py-1.5 text-primary">
              {fixedText.complexity !== null
                ? fixedText.complexity >= MAX_COMPLEXITY
                  ? `${MAX_COMPLEXITY}+`
                  : fixedText.complexity
                : 'N/A'}
            </span>
          ) : (
            <div className="flex items-center gap-3">
              <div ref={sliderRef} style={{ width: '200px' }}></div>
              {/* Current text complexity indicator */}
              {currentTextComplexity !== null &&
                currentTextComplexity !== undefined && (
                  <span className="text-sm text-primary font-medium whitespace-nowrap px-2 py-0.5 bg-primary/10 rounded">
                    current: {currentTextComplexity}
                  </span>
                )}
            </div>
          )}
        </div>

        {/* Standard mode options - hidden in adaptive mode */}
        {!isAdaptiveMode && (
          <>
            {/* Divider */}
            <div className="w-px h-6 bg-text-secondary opacity-30" />

            {/* Scrolling Selection */}
            <div className="flex items-center gap-2">
              <span className="text-text-secondary mr-1">scrolling:</span>
              <button
                onClick={() => onScrollingChange('dynamic')}
                className={`px-3 py-1.5 transition-colors ${
                  scrolling === 'dynamic'
                    ? 'text-primary'
                    : 'text-text-secondary hover:text-text'
                }`}
                aria-label="Dynamic scrolling"
                aria-pressed={scrolling === 'dynamic'}
              >
                dynamic
              </button>
              <button
                onClick={() => onScrollingChange('static')}
                className={`px-3 py-1.5 transition-colors ${
                  scrolling === 'static'
                    ? 'text-primary'
                    : 'text-text-secondary hover:text-text'
                }`}
                aria-label="Static scrolling"
                aria-pressed={scrolling === 'static'}
              >
                static
              </button>
            </div>

            {/* Divider */}
            <div className="w-px h-6 bg-text-secondary opacity-30" />

            {/* Blur Toggle */}
            <div className="flex items-center gap-2">
              <span className="text-text-secondary mr-1">blur:</span>
              <button
                onClick={() => onBlurChange(!blurEnabled)}
                className={`px-3 py-1.5 transition-colors ${
                  blurEnabled
                    ? 'text-primary'
                    : 'text-text-secondary hover:text-text'
                }`}
                aria-label={`Blur unread text: ${blurEnabled ? 'enabled' : 'disabled'}`}
                aria-pressed={blurEnabled}
              >
                {blurEnabled ? 'on' : 'off'}
              </button>
            </div>

            {/* Divider */}
            <div className="w-px h-6 bg-text-secondary opacity-30" />

            {/* WPM Selection */}
            <div className="flex items-center gap-2">
              <span className="text-text-secondary mr-1">wpm:</span>
              {WPM_PRESETS.map((preset) => (
                <button
                  key={preset}
                  onClick={() => {
                    onWpmChange(preset)
                    setShowCustomInput(false)
                    setCustomWpm('')
                    setIsWpmInvalid(false)
                  }}
                  className={`px-2 py-1 transition-colors ${
                    wpm === preset
                      ? 'text-primary'
                      : 'text-text-secondary hover:text-text'
                  }`}
                  aria-label={`Set reading speed to ${preset} words per minute`}
                  aria-pressed={wpm === preset}
                >
                  {preset}
                </button>
              ))}

              {/* Custom WPM */}
              <button
                onClick={() => !showCustomInput && setShowCustomInput(true)}
                className={`flex items-center px-2 py-1 transition-colors ${
                  isWpmInvalid
                    ? 'text-error animate-shake'
                    : !WPM_PRESETS.includes(wpm) || showCustomInput
                      ? 'text-primary'
                      : 'text-text-secondary hover:text-text'
                }`}
                title={
                  showCustomInput
                    ? isWpmInvalid
                      ? `Value must be between ${MIN_WPM} and ${MAX_WPM}`
                      : undefined
                    : !WPM_PRESETS.includes(wpm)
                      ? `Click to change custom WPM (currently ${wpm})`
                      : 'Click to set a custom WPM'
                }
                aria-label="Enter custom words per minute value"
              >
                <span>custom:&nbsp;</span>
                {showCustomInput ? (
                  <input
                    type="text"
                    inputMode="numeric"
                    value={customWpm}
                    onChange={handleCustomWpmChange}
                    onKeyDown={handleKeyDown}
                    onBlur={handleCustomWpmSubmit}
                    autoFocus
                    aria-label="Custom words per minute value"
                    aria-invalid={isWpmInvalid}
                    className={`bg-transparent border-b focus:outline-none text-center ${
                      isWpmInvalid ? 'border-error' : 'border-current'
                    }`}
                    style={{ width: `${Math.max(2, customWpm.length || 1)}ch` }}
                  />
                ) : (
                  <span className="border-b border-current inline-block min-w-[2ch]">
                    {!WPM_PRESETS.includes(wpm) ? wpm : '\u00A0'}
                  </span>
                )}
              </button>
            </div>

            {/* Divider */}
            <div className="w-px h-6 bg-text-secondary opacity-30" />

            {/* Visible Lines Selection */}
            <div className="flex items-center gap-2">
              <span className="text-text-secondary mr-1">visible lines:</span>
              <div ref={visibleLinesSliderRef} style={{ width: '120px' }}></div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
