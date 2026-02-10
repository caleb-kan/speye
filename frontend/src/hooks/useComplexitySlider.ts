import type { RefObject } from 'react'
import { useEffect, useRef } from 'react'
import noUiSlider, { type API } from 'nouislider'
import { MAX_COMPLEXITY, MIN_COMPLEXITY } from '../constants/complexity'
import type { FilterOptions } from './useLibraryFilters'

export type UseComplexitySliderParams = {
  showFilters: boolean
  filters: FilterOptions
  setFilters: (updater: (prev: FilterOptions) => FilterOptions) => void
  onPageReset: () => void
}

export type SliderElement = HTMLDivElement & {
  noUiSlider?: API
}

export type UseComplexitySliderResult = {
  sliderRef: RefObject<SliderElement | null>
  resetSlider: () => void
}

export const useComplexitySlider = (
  params: UseComplexitySliderParams
): UseComplexitySliderResult => {
  const { showFilters, filters, setFilters, onPageReset } = params
  const sliderRef = useRef<SliderElement>(null)

  useEffect(() => {
    if (!showFilters) return
    if (!sliderRef.current || sliderRef.current.hasChildNodes()) return

    const minValue = filters.minComplexity ?? MIN_COMPLEXITY
    const maxValue = filters.maxComplexity ?? MAX_COMPLEXITY

    noUiSlider.create(sliderRef.current, {
      start: [minValue, maxValue],
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
        from: (value) => {
          return Number(value)
        },
      },
    })

    const slider = sliderRef.current.noUiSlider

    slider?.on('set', (values: (string | number)[]) => {
      const val0 = parseInt(String(values[0]), 10)
      const val1 = parseInt(String(values[1]), 10)
      const minVal = Math.min(val0, val1)
      const maxVal = Math.max(val0, val1)
      setFilters((prev) => ({
        ...prev,
        minComplexity: minVal,
        maxComplexity: maxVal,
      }))
      onPageReset()
    })

    return () => {
      slider?.destroy()
    }
  }, [filters, onPageReset, setFilters, showFilters])

  const resetSlider = (): void => {
    const slider = sliderRef.current?.noUiSlider
    if (slider) {
      slider.set([MIN_COMPLEXITY, MAX_COMPLEXITY])
    }
  }

  return { sliderRef, resetSlider }
}
