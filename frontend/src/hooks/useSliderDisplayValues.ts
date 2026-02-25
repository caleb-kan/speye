import { useEffect, useState } from 'react'
import { useOptionsBarSliders } from './useOptionsBarSliders'
import type { FixedTextInfo } from '../types'

type UseSliderDisplayValuesOptions = {
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
}

export function useSliderDisplayValues({
  fixedText,
  complexityMin,
  complexityMax,
  onComplexityMinChange,
  onComplexityMaxChange,
  visibleLines,
  onVisibleLinesChange,
  phraseSize,
  onPhraseSizeChange,
  showTooltips = false,
}: UseSliderDisplayValuesOptions) {
  const [displayComplexityMin, setDisplayComplexityMin] =
    useState(complexityMin)
  const [displayComplexityMax, setDisplayComplexityMax] =
    useState(complexityMax)
  const [displayVisibleLines, setDisplayVisibleLines] = useState(visibleLines)
  const [displayPhraseSize, setDisplayPhraseSize] = useState(phraseSize)

  const { complexitySliderRef, visibleLinesSliderRef, phraseSizeSliderRef } =
    useOptionsBarSliders({
      fixedText,
      complexityMin,
      complexityMax,
      onComplexityMinChange,
      onComplexityMaxChange,
      visibleLines,
      onVisibleLinesChange,
      phraseSize,
      onPhraseSizeChange,
      showTooltips,
    })

  useEffect(() => {
    setDisplayComplexityMin(complexityMin)
    setDisplayComplexityMax(complexityMax)
  }, [complexityMin, complexityMax])

  useEffect(() => {
    setDisplayVisibleLines(visibleLines)
  }, [visibleLines])

  useEffect(() => {
    setDisplayPhraseSize(phraseSize)
  }, [phraseSize])

  // noUiSlider fires the 'update' handler immediately on attach,
  // so no separate initial read is needed.
  useEffect(() => {
    const complexitySlider = complexitySliderRef.current?.noUiSlider
    const visibleLinesSlider = visibleLinesSliderRef.current?.noUiSlider
    const phraseSizeSlider = phraseSizeSliderRef.current?.noUiSlider

    const handleComplexityUpdate = () => {
      if (!complexitySlider) return
      const values = complexitySlider.get() as string[]
      const min = parseInt(String(values[0]), 10)
      const max = parseInt(String(values[1]), 10)
      if (!isNaN(min)) setDisplayComplexityMin(min)
      if (!isNaN(max)) setDisplayComplexityMax(max)
    }

    const handleVisibleLinesUpdate = () => {
      if (!visibleLinesSlider) return
      const parsed = parseInt(visibleLinesSlider.get() as string, 10)
      if (!isNaN(parsed)) setDisplayVisibleLines(parsed)
    }

    const handlePhraseSizeUpdate = () => {
      if (!phraseSizeSlider) return
      const parsed = parseInt(phraseSizeSlider.get() as string, 10)
      if (!isNaN(parsed)) setDisplayPhraseSize(parsed)
    }

    complexitySlider?.on('update', handleComplexityUpdate)
    visibleLinesSlider?.on('update', handleVisibleLinesUpdate)
    phraseSizeSlider?.on('update', handlePhraseSizeUpdate)

    return () => {
      complexitySlider?.off('update')
      visibleLinesSlider?.off('update')
      phraseSizeSlider?.off('update')
    }
  }, [
    complexitySliderRef,
    visibleLinesSliderRef,
    phraseSizeSliderRef,
    complexityMin,
    complexityMax,
    visibleLines,
    phraseSize,
  ])

  return {
    displayComplexityMin,
    displayComplexityMax,
    displayVisibleLines,
    displayPhraseSize,
    complexitySliderRef,
    visibleLinesSliderRef,
    phraseSizeSliderRef,
  }
}
