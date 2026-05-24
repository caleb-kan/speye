import type { RefObject } from 'react'
import type { FixedTextInfo } from '../../types'
import { formatComplexityDisplay } from '../../constants/complexity'
import {
  COMPLEXITY_BADGE_MIN_WIDTH,
  SLIDER_RENDERED_HEIGHT_PX,
} from '../../constants/ui'
import type { SliderElement } from '../../hooks/useOptionsBarSliders'

export type ComplexitySelectorProps = {
  fixedText?: FixedTextInfo
  currentTextComplexity?: number | null
  sliderRef: RefObject<SliderElement | null>
}

export function ComplexitySelector({
  fixedText,
  currentTextComplexity,
  sliderRef,
}: ComplexitySelectorProps) {
  const hasCurrent =
    currentTextComplexity !== null && currentTextComplexity !== undefined

  return (
    <div className="flex items-center gap-2">
      <span className="text-text-secondary mr-1">complexity:</span>
      {fixedText ? (
        <span className="px-3 py-1.5 text-primary">
          {fixedText.complexity !== null
            ? formatComplexityDisplay(fixedText.complexity)
            : 'N/A'}
        </span>
      ) : (
        <div className="flex items-center gap-3">
          <div
            ref={sliderRef}
            style={{ width: '200px', height: SLIDER_RENDERED_HEIGHT_PX }}
          />
          {/* Badge always rendered (visibility:hidden when no value) and
              width-reserved so the OptionsBar's centered flex layout
              doesn't shift when the value lands. See
              COMPLEXITY_BADGE_MIN_WIDTH in constants/ui.ts for the why. */}
          <span
            className="text-sm text-primary font-medium whitespace-nowrap px-2 py-0.5 bg-primary/10 rounded text-center"
            style={{
              visibility: hasCurrent ? 'visible' : 'hidden',
              fontVariantNumeric: 'tabular-nums',
              display: 'inline-block',
              minWidth: COMPLEXITY_BADGE_MIN_WIDTH,
            }}
            aria-hidden={!hasCurrent}
          >
            current:{' '}
            {hasCurrent ? formatComplexityDisplay(currentTextComplexity) : 0}
          </span>
        </div>
      )}
    </div>
  )
}
