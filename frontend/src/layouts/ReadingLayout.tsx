import { useState } from 'react'
import { OptionsBar } from '../components/OptionsBar'
import { Outlet, useLocation } from 'react-router-dom'
import type { ReadingContext, FixedTextInfo, LocationState } from '../types'
import type { Text } from '../types/database'
import { useReadingPreferences } from '../hooks/useReadingPreferences'
import { useReadingPositionSync } from '../hooks/useReadingPositionSync'

export function ReadingLayout() {
  const location = useLocation()
  const state = location.state as LocationState | null
  const libraryText = state?.libraryText
  const initialReadingPosition = state?.readingPosition ?? 0
  const modeTimestamp = state?._ts

  // Create fixed text info if reading from library
  const fixedText: FixedTextInfo | undefined = libraryText
    ? { fiction: libraryText.fiction, complexity: libraryText.complexity }
    : undefined

  // Get preferences from context (persisted to localStorage)
  const {
    preferences,
    setWpm,
    setMode,
    setScrolling,
    setBlurEnabled,
    setFiction,
    setComplexityMin,
    setComplexityMax,
    setTextWidthPercent,
    setVisibleLines,
  } = useReadingPreferences()

  const [inputBlocking, setInputBlocking] = useState(false)
  const [quizOpen, setQuizOpen] = useState(false)
  const [currentTextComplexity, setCurrentTextComplexity] = useState<
    number | null
  >(null)
  const [currentText, setCurrentText] = useState<Text | null>(null)

  const { position: readingPosition, setPosition: setReadingPosition } =
    useReadingPositionSync({
      textId: currentText?.id ?? null,
      initialPosition: initialReadingPosition,
      modeTimestamp,
    })

  return (
    <div
      className={`flex-1 flex flex-col relative transition-all duration-300 ${
        quizOpen ? 'blur-[1.5px]' : ''
      }`}
    >
      <OptionsBar
        wpm={preferences.wpm}
        onWpmChange={setWpm}
        mode={preferences.mode}
        onModeChange={setMode}
        scrolling={preferences.scrolling}
        onScrollingChange={setScrolling}
        blurEnabled={preferences.blurEnabled}
        onBlurChange={setBlurEnabled}
        fiction={preferences.fiction}
        onFictionChange={setFiction}
        complexityMin={preferences.complexityMin}
        complexityMax={preferences.complexityMax}
        onComplexityMinChange={setComplexityMin}
        onComplexityMaxChange={setComplexityMax}
        visibleLines={preferences.visibleLines}
        onVisibleLinesChange={setVisibleLines}
        onInputBlockingChange={setInputBlocking}
        fixedText={fixedText}
        currentTextComplexity={currentTextComplexity}
        currentText={currentText}
        readingPosition={readingPosition}
      />

      <div className="flex-1 flex flex-col items-center px-8">
        {/* Nested page content */}
        <Outlet
          context={
            {
              wpm: preferences.wpm,
              mode: preferences.mode,
              scrolling: preferences.scrolling,
              blurEnabled: preferences.blurEnabled,
              fiction: preferences.fiction,
              complexityMin: preferences.complexityMin,
              complexityMax: preferences.complexityMax,
              inputBlocking,
              textWidthPercent: preferences.textWidthPercent,
              visibleLines: preferences.visibleLines,
              onTextWidthChange: setTextWidthPercent,
              quizOpen,
              setQuizOpen,
              currentTextComplexity,
              setCurrentTextComplexity,
              currentText,
              setCurrentText,
              readingPosition,
              setReadingPosition,
            } satisfies ReadingContext
          }
        />
      </div>
    </div>
  )
}
