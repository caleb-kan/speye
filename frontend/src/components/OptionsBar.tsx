import { useState } from 'react'
import type { Mode, ReadingType } from '../types'

type OptionsBarProps = {
  wpm: number
  onWpmChange: (wpm: number) => void
  mode: Mode
  onModeChange: (mode: Mode) => void
  readingType: ReadingType
  onReadingTypeChange: (type: ReadingType) => void
  blurEnabled: boolean
  onBlurChange: (enabled: boolean) => void
}

const WPM_PRESETS = [100, 200, 300, 400]

export function OptionsBar({
  wpm,
  onWpmChange,
  mode,
  onModeChange,
  readingType,
  onReadingTypeChange,
  blurEnabled,
  onBlurChange,
}: OptionsBarProps) {
  const [customWpm, setCustomWpm] = useState('')
  const [showCustomInput, setShowCustomInput] = useState(false)

  const handleCustomWpmSubmit = () => {
    if (!customWpm.trim()) {
      setShowCustomInput(false)
      setCustomWpm('')
      return
    }

    const value = parseInt(customWpm, 10)
    if (value >= 50 && value <= 1000) {
      onWpmChange(value)
      setShowCustomInput(false)
      setCustomWpm('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCustomWpmSubmit()
    } else if (e.key === 'Escape') {
      setShowCustomInput(false)
      setCustomWpm('')
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-8 py-6 text-sm">
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
            blurEnabled ? 'text-primary' : 'text-text-secondary hover:text-text'
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
            !WPM_PRESETS.includes(wpm) || showCustomInput
              ? 'text-primary'
              : 'text-text-secondary hover:text-text'
          }`}
          title={
            showCustomInput
              ? undefined
              : !WPM_PRESETS.includes(wpm)
                ? `Click to change custom WPM (currently ${wpm})`
                : 'Click to set a custom WPM'
          }
          aria-label="Enter custom words per minute value"
        >
          <span>custom:&nbsp;</span>
          {showCustomInput ? (
            <input
              type="number"
              value={customWpm}
              onChange={(e) => setCustomWpm(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleCustomWpmSubmit}
              min={50}
              max={1000}
              autoFocus
              aria-label="Custom words per minute value"
              className="bg-transparent border-b border-current focus:outline-none text-center appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
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
