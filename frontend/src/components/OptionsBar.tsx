import { useState, useEffect, useRef } from 'react'
import type { Mode, Scrolling, FixedTextInfo } from '../types'
import noUiSlider, { type API } from 'nouislider'
import { MIN_COMPLEXITY, MAX_COMPLEXITY } from '../constants/complexity'
import { WPM_PRESETS, MIN_WPM, MAX_WPM } from '../constants/wpm'
import {
  MIN_VISIBLE_LINES,
  MAX_VISIBLE_LINES,
  VISIBLE_LINES_PRESETS,
} from '../constants/visibleLines'
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
}

// Extended HTML element type with noUiSlider API
interface SliderElement extends HTMLDivElement {
  noUiSlider?: API
}

// Type guard to check if a value is a preset visible lines value
const isPresetVisibleLines = (
  value: number
): value is (typeof VISIBLE_LINES_PRESETS)[number] =>
  VISIBLE_LINES_PRESETS.includes(
    value as (typeof VISIBLE_LINES_PRESETS)[number]
  )

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
}: OptionsBarProps) {
  const [customWpm, setCustomWpm] = useState('')
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [isWpmInvalid, setIsWpmInvalid] = useState(false)
  const [customLines, setCustomLines] = useState('')
  const [showCustomLinesInput, setShowCustomLinesInput] = useState(false)
  const [isLinesInvalid, setIsLinesInvalid] = useState(false)

  const sliderRef = useRef<SliderElement>(null)
  const onComplexityMinChangeRef = useRef(onComplexityMinChange)
  const onComplexityMaxChangeRef = useRef(onComplexityMaxChange)

  // Keep refs up to date with latest callbacks
  useEffect(() => {
    onComplexityMinChangeRef.current = onComplexityMinChange
    onComplexityMaxChangeRef.current = onComplexityMaxChange
  }, [onComplexityMinChange, onComplexityMaxChange])

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
    onInputBlockingChange?.(
      (showCustomInput && isWpmInvalid) ||
        (showCustomLinesInput && isLinesInvalid)
    )
  }, [
    showCustomInput,
    isWpmInvalid,
    showCustomLinesInput,
    isLinesInvalid,
    onInputBlockingChange,
  ])

  const isValueInvalid = (value: string) => {
    if (!value.trim()) return false
    const num = parseInt(value, 10)
    return isNaN(num) || num < MIN_WPM || num > MAX_WPM
  }

  const isLinesValueInvalid = (value: string) => {
    if (!value.trim()) return false
    const num = parseInt(value, 10)
    return isNaN(num) || num < MIN_VISIBLE_LINES || num > MAX_VISIBLE_LINES
  }

  const handleCustomWpmChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '')
    setCustomWpm(value)
    setIsWpmInvalid(isValueInvalid(value))
  }

  const handleCustomLinesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '')
    setCustomLines(value)
    setIsLinesInvalid(isLinesValueInvalid(value))
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

  const handleCustomLinesSubmit = () => {
    if (!customLines.trim()) {
      setShowCustomLinesInput(false)
      setCustomLines('')
      setIsLinesInvalid(false)
      return
    }

    const value = parseInt(customLines, 10)
    if (!isNaN(value)) {
      const clampedValue = Math.min(
        Math.max(value, MIN_VISIBLE_LINES),
        MAX_VISIBLE_LINES
      )
      onVisibleLinesChange(clampedValue)
    }
    setShowCustomLinesInput(false)
    setCustomLines('')
    setIsLinesInvalid(false)
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

  const handleLinesKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCustomLinesSubmit()
    } else if (e.key === 'Escape') {
      setShowCustomLinesInput(false)
      setCustomLines('')
      setIsLinesInvalid(false)
    }
  }

  return (
    <div className="top-24 left-0 right-0 z-40 bg-bg">
      <div className="flex flex-wrap items-center justify-center gap-6 py-4 text-sm">
        {/* Mode Selection */}
        <div className="flex items-center gap-2">
          <span className="text-text-secondary mr-1">mode:</span>
          <button
            onClick={() => onModeChange('standard')}
            className={`px-3 py-1.5 transition-colors ${
              mode === 'standard'
                ? 'text-primary'
                : 'text-text-secondary hover:text-text'
            }`}
            aria-label="Standard mode"
            aria-pressed={mode === 'standard'}
          >
            standard
          </button>
          <button
            disabled
            className="px-3 py-1.5 rounded text-text-secondary opacity-50 cursor-not-allowed flex items-center gap-1"
            title="Coming soon - requires sign in"
            aria-label="Adaptive mode (coming soon, requires sign in)"
          >
            adaptive
            <Lock size={12} />
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
            <div ref={sliderRef} style={{ width: '200px' }}></div>
          )}
        </div>

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
          {VISIBLE_LINES_PRESETS.map((preset) => (
            <button
              key={preset}
              onClick={() => {
                onVisibleLinesChange(preset)
                setShowCustomLinesInput(false)
                setCustomLines('')
                setIsLinesInvalid(false)
              }}
              className={`px-2 py-1 transition-colors ${
                visibleLines === preset
                  ? 'text-primary'
                  : 'text-text-secondary hover:text-text'
              }`}
              aria-label={`Set visible lines to ${preset}`}
              aria-pressed={visibleLines === preset}
            >
              {preset}
            </button>
          ))}

          {/* Custom Lines */}
          <button
            onClick={() =>
              !showCustomLinesInput && setShowCustomLinesInput(true)
            }
            className={`flex items-center px-2 py-1 transition-colors ${
              isLinesInvalid
                ? 'text-error animate-shake'
                : !isPresetVisibleLines(visibleLines) || showCustomLinesInput
                  ? 'text-primary'
                  : 'text-text-secondary hover:text-text'
            }`}
            title={
              showCustomLinesInput
                ? isLinesInvalid
                  ? `Value must be between ${MIN_VISIBLE_LINES} and ${MAX_VISIBLE_LINES}`
                  : undefined
                : !isPresetVisibleLines(visibleLines)
                  ? `Click to change custom lines (currently ${visibleLines})`
                  : 'Click to set custom visible lines'
            }
            aria-label="Enter custom visible lines value"
          >
            <span>custom:&nbsp;</span>
            {showCustomLinesInput ? (
              <input
                type="text"
                inputMode="numeric"
                value={customLines}
                onChange={handleCustomLinesChange}
                onKeyDown={handleLinesKeyDown}
                onBlur={handleCustomLinesSubmit}
                autoFocus
                aria-label="Custom visible lines value"
                aria-invalid={isLinesInvalid}
                className={`bg-transparent border-b focus:outline-none text-center ${
                  isLinesInvalid ? 'border-error' : 'border-current'
                }`}
                style={{ width: `${Math.max(1, customLines.length || 1)}ch` }}
              />
            ) : (
              <span className="border-b border-current inline-block min-w-[1ch]">
                {!isPresetVisibleLines(visibleLines) ? visibleLines : '\u00A0'}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
