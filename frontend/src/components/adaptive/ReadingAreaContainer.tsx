import { forwardRef, type ReactNode, type CSSProperties } from 'react'
import {
  SINGLE_LINE_HEIGHT,
  READING_CONTAINER_CLASSES,
} from '../../constants/adaptive'

type ReadingAreaContainerProps = {
  children: ReactNode
  /** Visual variant for different use cases */
  variant?: 'reading' | 'calibration'
  /** Additional styles for the inner container */
  containerStyle?: CSSProperties
  /** Additional classes for the inner container */
  containerClassName?: string
}

/**
 * Shared container for single-line reading area.
 * Provides consistent centering, max-width, and base dimensions.
 * Used by SingleLineTextDisplay and CalibrationProgress to ensure
 * calibration points align with actual reading positions.
 */
export const ReadingAreaContainer = forwardRef<
  HTMLDivElement,
  ReadingAreaContainerProps
>(function ReadingAreaContainer(
  { children, variant = 'reading', containerStyle, containerClassName = '' },
  ref
) {
  const baseContainerClass = `relative flex items-center justify-center ${READING_CONTAINER_CLASSES}`

  const variantClass =
    variant === 'calibration' ? 'border-2 border-dashed border-primary/30' : ''

  const defaultBackground =
    variant === 'calibration'
      ? 'color-mix(in srgb, var(--color-primary) 5%, var(--color-bg))'
      : undefined

  return (
    <div className="flex-1 flex items-center justify-center px-4 min-h-0">
      <div className="w-full max-w-5xl">
        <div
          ref={ref}
          className={`${baseContainerClass} ${variantClass} ${containerClassName}`}
          style={{
            minHeight: SINGLE_LINE_HEIGHT,
            background: defaultBackground,
            ...containerStyle,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  )
})
