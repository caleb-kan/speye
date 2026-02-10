import type { ChangeEvent, KeyboardEvent, RefObject } from 'react'
import { WPM_PRESETS, MIN_WPM, MAX_WPM } from '../../constants/wpm'
import type { Scrolling } from '../../types'
import type { SliderElement } from '../../hooks/useOptionsBarSliders'

export type StandardOptionsProps = {
  scrolling: Scrolling
  onScrollingChange: (scrolling: Scrolling) => void
  blurEnabled: boolean
  onBlurChange: (enabled: boolean) => void
  wpm: number
  onWpmChange: (wpm: number) => void
  visibleLinesSliderRef: RefObject<SliderElement | null>
  showCustomInput: boolean
  isWpmInvalid: boolean
  customWpm: string
  isCustomActive: boolean
  onOpenCustomInput: () => void
  onResetCustomInput: () => void
  onCustomWpmChange: (event: ChangeEvent<HTMLInputElement>) => void
  onCustomWpmSubmit: () => void
  onCustomWpmKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void
}

export function StandardOptions({
  scrolling,
  onScrollingChange,
  blurEnabled,
  onBlurChange,
  wpm,
  onWpmChange,
  visibleLinesSliderRef,
  showCustomInput,
  isWpmInvalid,
  customWpm,
  isCustomActive,
  onOpenCustomInput,
  onResetCustomInput,
  onCustomWpmChange,
  onCustomWpmSubmit,
  onCustomWpmKeyDown,
}: StandardOptionsProps) {
  return (
    <>
      <div className="w-px h-6 bg-text-secondary opacity-30" />
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

      <div className="w-px h-6 bg-text-secondary opacity-30" />
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

      <div className="w-px h-6 bg-text-secondary opacity-30" />
      <div className="flex items-center gap-2">
        <span className="text-text-secondary mr-1">wpm:</span>
        {WPM_PRESETS.map((preset) => (
          <button
            key={preset}
            onClick={() => {
              onWpmChange(preset)
              onResetCustomInput()
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

        <button
          onClick={onOpenCustomInput}
          className={`flex items-center px-2 py-1 transition-colors ${
            isWpmInvalid
              ? 'text-error animate-shake'
              : isCustomActive
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
              onChange={onCustomWpmChange}
              onKeyDown={onCustomWpmKeyDown}
              onBlur={onCustomWpmSubmit}
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

      <div className="w-px h-6 bg-text-secondary opacity-30" />
      <div className="flex items-center gap-2">
        <span className="text-text-secondary mr-1">visible lines:</span>
        <div ref={visibleLinesSliderRef} style={{ width: '120px' }} />
      </div>
    </>
  )
}
