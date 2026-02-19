import type { RefObject } from 'react'
import { useEffect, useRef } from 'react'
import noUiSlider, { type API } from 'nouislider'
import { MAX_COMPLEXITY, MIN_COMPLEXITY } from '../constants/complexity'
import { MAX_VISIBLE_LINES, MIN_VISIBLE_LINES } from '../constants/visibleLines'
import { MAX_PHRASE_SIZE, MIN_PHRASE_SIZE } from '../constants/rsvp'
import type { FixedTextInfo } from '../types'

export type SliderElement = HTMLDivElement & {
  noUiSlider?: API
}

export type UseOptionsBarSlidersParams = {
  fixedText?: FixedTextInfo
  complexityMin: number
  complexityMax: number
  onComplexityMinChange: (min: number) => void
  onComplexityMaxChange: (max: number) => void
  visibleLines: number
  onVisibleLinesChange: (lines: number) => void
  phraseSize?: number
  onPhraseSizeChange?: (size: number) => void
}

export type UseOptionsBarSlidersResult = {
  complexitySliderRef: RefObject<SliderElement | null>
  visibleLinesSliderRef: RefObject<SliderElement | null>
  phraseSizeSliderRef: RefObject<SliderElement | null>
}

export const useOptionsBarSliders = (
  params: UseOptionsBarSlidersParams
): UseOptionsBarSlidersResult => {
  const {
    fixedText,
    complexityMin,
    complexityMax,
    onComplexityMinChange,
    onComplexityMaxChange,
    visibleLines,
    onVisibleLinesChange,
    phraseSize,
    onPhraseSizeChange,
  } = params

  const complexitySliderRef = useRef<SliderElement>(null)
  const visibleLinesSliderRef = useRef<SliderElement>(null)
  const phraseSizeSliderRef = useRef<SliderElement>(null)
  const onComplexityMinChangeRef = useRef(onComplexityMinChange)
  const onComplexityMaxChangeRef = useRef(onComplexityMaxChange)
  const onVisibleLinesChangeRef = useRef(onVisibleLinesChange)
  const onPhraseSizeChangeRef = useRef(onPhraseSizeChange)

  useEffect(() => {
    onComplexityMinChangeRef.current = onComplexityMinChange
    onComplexityMaxChangeRef.current = onComplexityMaxChange
    onVisibleLinesChangeRef.current = onVisibleLinesChange
    onPhraseSizeChangeRef.current = onPhraseSizeChange
  }, [
    onComplexityMinChange,
    onComplexityMaxChange,
    onVisibleLinesChange,
    onPhraseSizeChange,
  ])

  useEffect(() => {
    if (fixedText) return
    if (
      !complexitySliderRef.current ||
      complexitySliderRef.current.hasChildNodes()
    )
      return

    noUiSlider.create(complexitySliderRef.current, {
      start: [complexityMin, complexityMax],
      connect: true,
      behaviour: 'unconstrained-tap',
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
          }
          return intValue.toString()
        },
        from: (value) => Number(value),
      },
    })

    const slider = complexitySliderRef.current.noUiSlider

    slider?.on('set', (values: (string | number)[]) => {
      const val0 = parseInt(String(values[0]), 10)
      const val1 = parseInt(String(values[1]), 10)
      const minVal = Math.min(val0, val1)
      const maxVal = Math.max(val0, val1)
      onComplexityMinChangeRef.current(minVal)
      onComplexityMaxChangeRef.current(maxVal)
    })

    return () => {
      slider?.destroy()
    }
  }, [complexityMax, complexityMin, fixedText])

  useEffect(() => {
    if (
      !visibleLinesSliderRef.current ||
      visibleLinesSliderRef.current.hasChildNodes()
    ) {
      return
    }

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

    slider?.on('set', (values: (string | number)[]) => {
      const val = parseInt(String(values[0]), 10)
      onVisibleLinesChangeRef.current(val)
    })

    return () => {
      slider?.destroy()
    }
  }, [visibleLines])

  useEffect(() => {
    if (phraseSize === undefined) return
    if (
      !phraseSizeSliderRef.current ||
      phraseSizeSliderRef.current.hasChildNodes()
    ) {
      return
    }

    noUiSlider.create(phraseSizeSliderRef.current, {
      start: [phraseSize],
      connect: [true, false],
      range: {
        min: MIN_PHRASE_SIZE,
        max: MAX_PHRASE_SIZE,
      },
      tooltips: true,
      step: 1,
      format: {
        to: (value) => Math.round(value).toString(),
        from: (value) => Number(value),
      },
    })

    const slider = phraseSizeSliderRef.current.noUiSlider

    slider?.on('set', (values: (string | number)[]) => {
      const val = parseInt(String(values[0]), 10)
      onPhraseSizeChangeRef.current?.(val)
    })

    return () => {
      slider?.destroy()
    }
  }, [phraseSize])

  return { complexitySliderRef, visibleLinesSliderRef, phraseSizeSliderRef }
}
