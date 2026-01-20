import { useState, useEffect, useRef } from 'react'
import type { Mode, ReadingType } from '../types'
import noUiSlider from 'nouislider'
import {
  DEFAULT_MIN_DIFFICULTY,
  DEFAULT_MAX_DIFFICULTY,
  MIN_DIFFICULTY,
  MAX_DIFFICULTY,
} from '../constants/difficulty'
import { WPM_PRESETS, MIN_WPM, MAX_WPM } from '../constants/wpm'

type OptionsBarProps = {
  wpm: number
  onWpmChange: (wpm: number) => void
  mode: Mode
  onModeChange: (mode: Mode) => void
  readingType: ReadingType
  onReadingTypeChange: (type: ReadingType) => void
  blurEnabled: boolean
  onBlurChange: (enabled: boolean) => void
  fiction: boolean
  onFictionChange: (fiction: boolean) => void
  onDifficultyMinChange: (min: number) => void
  onDifficultyMaxChange: (max: number) => void
  onInputBlockingChange?: (isBlocking: boolean) => void
}

export function OptionsBar({
  wpm,
  onWpmChange,
  mode,
  onModeChange,
  readingType,
  onReadingTypeChange,
  blurEnabled,
  onBlurChange,
  fiction,
  onFictionChange,
  onDifficultyMinChange,
  onDifficultyMaxChange,
  onInputBlockingChange,
}: OptionsBarProps) {
  const [customWpm, setCustomWpm] = useState('')
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [isInvalid, setIsInvalid] = useState(false)

  const sliderRef = useRef<HTMLDivElement>(null)
  const onDifficultyMinChangeRef = useRef(onDifficultyMinChange)
  const onDifficultyMaxChangeRef = useRef(onDifficultyMaxChange)

  // Keep refs up to date with latest callbacks
  useEffect(() => {
    onDifficultyMinChangeRef.current = onDifficultyMinChange
    onDifficultyMaxChangeRef.current = onDifficultyMaxChange
  }, [onDifficultyMinChange, onDifficultyMaxChange])

  useEffect(() => {
    if (sliderRef.current && !sliderRef.current.hasChildNodes()) {
      noUiSlider.create(sliderRef.current, {
        start: [DEFAULT_MIN_DIFFICULTY, DEFAULT_MAX_DIFFICULTY],
        connect: true,
        behaviour: 'unconstrained-tap', // Allow handles to cross each other
        range: {
          min: MIN_DIFFICULTY,
          max: MAX_DIFFICULTY,
        },
        tooltips: true,
        step: 1,
        format: {
          to: (value) => {
            const intValue = Math.round(value)
            if (intValue === MAX_DIFFICULTY) {
              return `${MAX_DIFFICULTY}+`
            } else {
              return intValue.toString()
            }
          },
          from: (value) => {
            return Number(value)
          },
        },
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const slider = (sliderRef.current as any).noUiSlider

      // Sort values so min <= max (handles can cross with unconstrained behaviour)
      slider.on('set', (values: (string | number)[]) => {
        const val0 = parseInt(String(values[0]))
        const val1 = parseInt(String(values[1]))
        const minVal = Math.min(val0, val1)
        const maxVal = Math.max(val0, val1)
        onDifficultyMinChangeRef.current(minVal)
        onDifficultyMaxChangeRef.current(maxVal)
      })
    }
  }, [])

  useEffect(() => {
    onInputBlockingChange?.(showCustomInput && isInvalid)
  }, [showCustomInput, isInvalid, onInputBlockingChange])

  const isValueInvalid = (value: string) => {
    if (!value.trim()) return false
    const num = parseInt(value, 10)
    return isNaN(num) || num < MIN_WPM || num > MAX_WPM
  }

  const handleCustomWpmChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '')
    setCustomWpm(value)
    setIsInvalid(isValueInvalid(value))
  }

  const handleCustomWpmSubmit = () => {
    if (!customWpm.trim()) {
      setShowCustomInput(false)
      setCustomWpm('')
      setIsInvalid(false)
      return
    }

    const value = parseInt(customWpm, 10)
    if (!isNaN(value)) {
      const clampedValue = Math.min(Math.max(value, MIN_WPM), MAX_WPM)
      onWpmChange(clampedValue)
    }
    setShowCustomInput(false)
    setCustomWpm('')
    setIsInvalid(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCustomWpmSubmit()
    } else if (e.key === 'Escape') {
      setShowCustomInput(false)
      setCustomWpm('')
      setIsInvalid(false)
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
            <LockIcon />
          </button>
          <button
            disabled
            className="px-3 py-1.5 rounded text-text-secondary opacity-50 cursor-not-allowed flex items-center gap-1"
            title="Coming soon - requires sign in"
            aria-label="Summarized mode (coming soon, requires sign in)"
          >
            summarized
            <LockIcon />
          </button>
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-text-secondary opacity-30" />

        {/* Fiction/Non-Fiction Selection */}
        <div className="flex items-center gap-2">
          <span className="text-text-secondary mr-1">genre:</span>
          <button
            onClick={() => onFictionChange(false)}
            className={`px-3 py-1.5 transition-colors ${
              !fiction ? 'text-primary' : 'text-text-secondary hover:text-text'
            }`}
            aria-label="Non-fiction texts"
            aria-pressed={!fiction}
          >
            non-fiction
          </button>
          <button
            onClick={() => onFictionChange(true)}
            className={`px-3 py-1.5 transition-colors ${
              fiction ? 'text-primary' : 'text-text-secondary hover:text-text'
            }`}
            aria-label="Fiction texts"
            aria-pressed={fiction}
          >
            fiction
          </button>
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-text-secondary opacity-30" />

        {/* Difficulty Selection */}
        {/* range slider from 1 to 15+ with tooltips, set to difficultyMin and difficultyMax*/}
        <div className="flex items-center gap-2">
          <span className="text-text-secondary mr-1">difficulty:</span>
          <div ref={sliderRef} style={{ width: '200px' }}></div>
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-text-secondary opacity-30" />

        {/* Reading Type Selection */}
        <div className="flex items-center gap-2">
          <span className="text-text-secondary mr-1">type:</span>
          <button
            onClick={() => onReadingTypeChange('dynamic')}
            className={`px-3 py-1.5 transition-colors ${
              readingType === 'dynamic'
                ? 'text-primary'
                : 'text-text-secondary hover:text-text'
            }`}
            aria-label="Dynamic reading type"
            aria-pressed={readingType === 'dynamic'}
          >
            dynamic
          </button>
          <button
            onClick={() => onReadingTypeChange('static')}
            className={`px-3 py-1.5 transition-colors ${
              readingType === 'static'
                ? 'text-primary'
                : 'text-text-secondary hover:text-text'
            }`}
            aria-label="Static reading type"
            aria-pressed={readingType === 'static'}
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
                setIsInvalid(false)
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
              isInvalid
                ? 'text-error animate-shake'
                : !WPM_PRESETS.includes(wpm) || showCustomInput
                  ? 'text-primary'
                  : 'text-text-secondary hover:text-text'
            }`}
            title={
              showCustomInput
                ? isInvalid
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
                aria-invalid={isInvalid}
                className={`bg-transparent border-b focus:outline-none text-center ${
                  isInvalid ? 'border-error' : 'border-current'
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
      </div>
    </div>
  )
}

function LockIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}
