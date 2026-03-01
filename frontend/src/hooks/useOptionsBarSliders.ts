import type { MutableRefObject, RefObject } from 'react'
import { useEffect, useRef } from 'react'
import noUiSlider, { type API } from 'nouislider'
import { MAX_COMPLEXITY, MIN_COMPLEXITY } from '../constants/complexity'
import { MAX_VISIBLE_LINES, MIN_VISIBLE_LINES } from '../constants/visibleLines'
import { MAX_PHRASE_SIZE, MIN_PHRASE_SIZE } from '../constants/rsvp'
import type { FixedTextInfo } from '../types'

export type SliderElement = HTMLDivElement & {
  noUiSlider?: API
}

/** Creates or updates a single-value noUiSlider on the given ref. */
function syncSingleValueSlider(
  ref: RefObject<SliderElement | null>,
  value: number,
  range: { min: number; max: number },
  showTooltips: boolean,
  onChangeRef: MutableRefObject<(value: number) => void>
): (() => void) | undefined {
  if (!ref.current) return

  const existing = ref.current.noUiSlider
  if (existing) {
    existing.set([value])
    return
  }

  if (ref.current.hasChildNodes()) return

  noUiSlider.create(ref.current, {
    start: [value],
    connect: [true, false],
    range,
    tooltips: showTooltips,
    step: 1,
    format: {
      to: (v) => Math.round(v).toString(),
      from: (v) => Number(v),
    },
  })

  const newSlider = ref.current.noUiSlider

  newSlider?.on('set', (values: (string | number)[]) => {
    onChangeRef.current(parseInt(String(values[0]), 10))
  })

  return () => {
    newSlider?.destroy()
  }
}

export type UseOptionsBarSlidersParams = {
  fixedText?: FixedTextInfo
  complexityMin: number
  complexityMax: number
  onComplexityMinChange: (min: number) => void
  onComplexityMaxChange: (max: number) => void
  visibleLines: number
  onVisibleLinesChange: (lines: number) => void
  phraseSize: number
  onPhraseSizeChange: (size: number) => void
  showTooltips?: boolean
  /** Forces slider re-initialization when the mode changes (e.g. PvP in-place mode switching). */
  mode?: string
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
    showTooltips = true,
    mode,
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
    if (!complexitySliderRef.current) return

    const slider = complexitySliderRef.current.noUiSlider

    if (slider) {
      // Slider already exists, update its values
      slider.set([complexityMin, complexityMax])
      return
    }

    if (complexitySliderRef.current.hasChildNodes()) return

    noUiSlider.create(complexitySliderRef.current, {
      start: [complexityMin, complexityMax],
      connect: true,
      behaviour: 'unconstrained-tap',
      range: {
        min: MIN_COMPLEXITY,
        max: MAX_COMPLEXITY,
      },
      tooltips: showTooltips,
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

    const newSlider = complexitySliderRef.current.noUiSlider

    newSlider?.on('set', (values: (string | number)[]) => {
      const val0 = parseInt(String(values[0]), 10)
      const val1 = parseInt(String(values[1]), 10)
      const minVal = Math.min(val0, val1)
      const maxVal = Math.max(val0, val1)
      onComplexityMinChangeRef.current(minVal)
      onComplexityMaxChangeRef.current(maxVal)
    })

    return () => {
      newSlider?.destroy()
    }
  }, [complexityMax, complexityMin, fixedText, showTooltips, mode])

  useEffect(
    () =>
      syncSingleValueSlider(
        visibleLinesSliderRef,
        visibleLines,
        { min: MIN_VISIBLE_LINES, max: MAX_VISIBLE_LINES },
        showTooltips,
        onVisibleLinesChangeRef
      ),
    [visibleLines, showTooltips, mode]
  )

  useEffect(
    () =>
      syncSingleValueSlider(
        phraseSizeSliderRef,
        phraseSize,
        { min: MIN_PHRASE_SIZE, max: MAX_PHRASE_SIZE },
        showTooltips,
        onPhraseSizeChangeRef
      ),
    [phraseSize, showTooltips, mode]
  )

  return { complexitySliderRef, visibleLinesSliderRef, phraseSizeSliderRef }
}
