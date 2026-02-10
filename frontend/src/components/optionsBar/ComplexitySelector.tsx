import type { RefObject } from 'react'
import type { FixedTextInfo } from '../../types'
import { MAX_COMPLEXITY } from '../../constants/complexity'
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
  return (
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
          <div ref={sliderRef} style={{ width: '200px' }} />
          {currentTextComplexity !== null &&
            currentTextComplexity !== undefined && (
              <span className="text-sm text-primary font-medium whitespace-nowrap px-2 py-0.5 bg-primary/10 rounded">
                current: {currentTextComplexity}
              </span>
            )}
        </div>
      )}
    </div>
  )
}
