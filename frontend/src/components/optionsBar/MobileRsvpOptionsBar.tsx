import { useEffect } from 'react'
import type { FixedTextInfo } from '../../types'
import type { Text } from '../../types/database'
import { useSliderDisplayValues } from '../../hooks/useSliderDisplayValues'
import { useCustomWpm } from '../../hooks/useCustomWpm'
import { RSVP_WPM_PRESETS, MIN_WPM, MAX_WPM } from '../../constants/wpm'
import { MAX_COMPLEXITY } from '../../constants/complexity'

type MobileRsvpOptionsBarProps = {
  wpm: number
  onWpmChange: (wpm: number) => void
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
  currentText?: Text | null
}

function OptionRow({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2 overflow-visible">
      <span className="text-text-secondary text-xs shrink-0">{label}</span>
      <div className="flex items-center gap-1.5 overflow-visible">
        {children}
      </div>
    </div>
  )
}

export function MobileRsvpOptionsBar({
  wpm,
  onWpmChange,
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
  currentText,
}: MobileRsvpOptionsBarProps) {
  const {
    displayComplexityMin,
    displayComplexityMax,
    displayVisibleLines,
    displayPhraseSize,
    complexitySliderRef,
    visibleLinesSliderRef,
    phraseSizeSliderRef,
  } = useSliderDisplayValues({
    fixedText,
    complexityMin,
    complexityMax,
    onComplexityMinChange,
    onComplexityMaxChange,
    visibleLines,
    onVisibleLinesChange,
    phraseSize,
    onPhraseSizeChange,
    showTooltips: false,
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
  } = useCustomWpm({ wpm, onWpmChange, presets: RSVP_WPM_PRESETS })

  useEffect(() => {
    onInputBlockingChange?.(showCustomInput && isWpmInvalid)
  }, [showCustomInput, isWpmInvalid, onInputBlockingChange])

  return (
    <div className="bg-bg text-sm divide-y divide-text-secondary/10 overflow-visible">
      {/* Genre */}
      <OptionRow label="genre">
        {fixedText ? (
          <span className="text-xs text-primary font-medium whitespace-nowrap px-2 py-2 bg-primary/10 rounded">
            {fixedText.fiction ? 'fiction' : 'non-fiction'}
          </span>
        ) : (
          <>
            <button
              onClick={() => onFictionChange(false)}
              className={`px-2 py-2 -my-1 rounded text-xs transition-colors ${
                !fiction
                  ? 'text-primary font-medium bg-primary/10'
                  : 'text-text-secondary'
              }`}
              aria-label="Non-fiction texts"
              aria-pressed={!fiction}
            >
              non-fiction
            </button>
            <button
              onClick={() => onFictionChange(true)}
              className={`px-2 py-1 rounded text-xs transition-colors ${
                fiction
                  ? 'text-primary font-medium bg-primary/10'
                  : 'text-text-secondary'
              }`}
              aria-label="Fiction texts"
              aria-pressed={fiction}
            >
              fiction
            </button>
          </>
        )}
      </OptionRow>

      {/* Complexity */}
      <OptionRow label="complexity">
        {fixedText ? (
          <span className="text-primary text-xs">
            {fixedText.complexity !== null
              ? fixedText.complexity >= MAX_COMPLEXITY
                ? `${MAX_COMPLEXITY}+`
                : fixedText.complexity
              : 'N/A'}
          </span>
        ) : (
          <>
            {currentText?.complexity != null && (
              <span className="text-xs font-medium whitespace-nowrap px-1.5 py-0.5 rounded bg-primary/15 text-primary">
                {'current: ' +
                  (currentText.complexity >= MAX_COMPLEXITY
                    ? `${MAX_COMPLEXITY}+`
                    : currentText.complexity)}
              </span>
            )}
            <div
              className="flex items-center gap-2"
              style={{ width: 'calc(50vw - 12px)' }}
            >
              <div ref={complexitySliderRef} className="flex-1 my-1" />
              <span className="text-xs text-text-secondary font-medium whitespace-nowrap px-2 py-0.5 bg-text-secondary/10 rounded">
                {displayComplexityMin}–
                {displayComplexityMax >= MAX_COMPLEXITY
                  ? `${MAX_COMPLEXITY}+`
                  : displayComplexityMax}
              </span>
            </div>
          </>
        )}
      </OptionRow>

      {/* Line width */}
      <OptionRow label="line width">
        <div
          className="flex items-center gap-2"
          style={{ width: 'calc(50vw - 12px)' }}
        >
          <div ref={phraseSizeSliderRef} className="flex-1 my-1" />
          <span className="text-xs text-text-secondary font-medium whitespace-nowrap px-2 py-0.5 bg-text-secondary/10 rounded">
            {displayPhraseSize}
          </span>
        </div>
      </OptionRow>

      {/* WPM */}
      <OptionRow label="wpm">
        <div className="flex items-center gap-1 flex-wrap justify-end -my-1">
          {RSVP_WPM_PRESETS.map((preset) => (
            <button
              key={preset}
              onClick={() => {
                onWpmChange(preset)
                resetCustomInput()
              }}
              className={`px-1.5 py-2 rounded text-xs transition-colors ${
                wpm === preset
                  ? 'text-primary font-medium bg-primary/10'
                  : 'text-text-secondary hover:text-text'
              }`}
              aria-label={`Set reading speed to ${preset} words per minute`}
              aria-pressed={wpm === preset}
            >
              {preset}
            </button>
          ))}
          <button
            onClick={openCustomInput}
            className={`flex items-center px-1.5 py-0.5 rounded text-xs transition-colors ${
              isWpmInvalid
                ? 'text-error animate-shake'
                : isCustomActive
                  ? 'text-primary font-medium bg-primary/10'
                  : 'text-text-secondary hover:text-text'
            }`}
            title={
              showCustomInput
                ? isWpmInvalid
                  ? `Value must be between ${MIN_WPM} and ${MAX_WPM}`
                  : undefined
                : !RSVP_WPM_PRESETS.includes(wpm)
                  ? `Custom WPM: ${wpm}`
                  : 'Set custom WPM'
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
                onKeyDown={handleCustomWpmKeyDown}
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
                {!RSVP_WPM_PRESETS.includes(wpm) ? wpm : '\u00A0'}
              </span>
            )}
          </button>
        </div>
      </OptionRow>

      {/* Visible lines */}
      <OptionRow label="visible lines">
        <div
          className="flex items-center gap-2"
          style={{ width: 'calc(50vw - 12px)' }}
        >
          <div ref={visibleLinesSliderRef} className="flex-1 my-1" />
          <span className="text-xs text-text-secondary font-medium whitespace-nowrap px-2 py-0.5 bg-text-secondary/10 rounded">
            {displayVisibleLines}
          </span>
        </div>
      </OptionRow>
    </div>
  )
}
