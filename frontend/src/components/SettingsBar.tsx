import { useState } from 'react'

type Mode = 'standard' | 'adaptive' | 'summarized'

type SettingsBarProps = {
  wpm: number
  onWpmChange: (wpm: number) => void
  mode: Mode
  onModeChange: (mode: Mode) => void
}

const WPM_PRESETS = [100, 150, 200, 250, 300, 400, 500]

export function SettingsBar({
  wpm,
  onWpmChange,
  mode,
  onModeChange,
}: SettingsBarProps) {
  const [customWpm, setCustomWpm] = useState('')
  const [showCustomInput, setShowCustomInput] = useState(false)

  const handleCustomWpmSubmit = () => {
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
        <button
          onClick={() => onModeChange('standard')}
          className={`px-3 py-1.5 rounded transition-all ${
            mode === 'standard'
              ? 'bg-[var(--color-bg-secondary)] text-[var(--color-primary)]'
              : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
          }`}
        >
          standard
        </button>
        <button
          disabled
          className="px-3 py-1.5 rounded text-[var(--color-text-secondary)] opacity-50 cursor-not-allowed flex items-center gap-1"
          title="Coming soon - requires sign in"
        >
          adaptive
          <LockIcon />
        </button>
        <button
          disabled
          className="px-3 py-1.5 rounded text-[var(--color-text-secondary)] opacity-50 cursor-not-allowed flex items-center gap-1"
          title="Coming soon - requires sign in"
        >
          summarized
          <LockIcon />
        </button>
      </div>

      {/* Divider */}
      <div className="w-px h-6 bg-[var(--color-text-secondary)] opacity-30" />

      {/* WPM Selection */}
      <div className="flex items-center gap-2">
        <span className="text-[var(--color-text-secondary)] mr-1">wpm</span>
        {WPM_PRESETS.map((preset) => (
          <button
            key={preset}
            onClick={() => onWpmChange(preset)}
            className={`px-2 py-1 rounded transition-all ${
              wpm === preset
                ? 'bg-[var(--color-bg-secondary)] text-[var(--color-primary)]'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
            }`}
          >
            {preset}
          </button>
        ))}

        {/* Custom WPM */}
        {showCustomInput ? (
          <input
            type="number"
            value={customWpm}
            onChange={(e) => setCustomWpm(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleCustomWpmSubmit}
            placeholder="50-1000"
            min={50}
            max={1000}
            autoFocus
            className="w-20 px-2 py-1 rounded bg-[var(--color-bg-secondary)] text-[var(--color-text)] border border-[var(--color-text-secondary)] focus:border-[var(--color-primary)] focus:outline-none text-center"
          />
        ) : (
          <button
            onClick={() => setShowCustomInput(true)}
            className={`px-2 py-1 rounded transition-all ${
              !WPM_PRESETS.includes(wpm)
                ? 'bg-[var(--color-bg-secondary)] text-[var(--color-primary)]'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
            }`}
            title="Enter custom WPM"
          >
            {!WPM_PRESETS.includes(wpm) ? wpm : 'custom'}
          </button>
        )}
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
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}
