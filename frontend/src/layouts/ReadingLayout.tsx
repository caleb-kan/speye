import { useState } from 'react'
import { OptionsBar } from '../components/OptionsBar'
import { Outlet, useLocation } from 'react-router-dom'
import type { ReadingContext, FixedTextInfo, LocationState } from '../types'
import { useReadingPreferences } from '../hooks/useReadingPreferences'

export function ReadingLayout() {
  const location = useLocation()
  const state = location.state as LocationState | null
  const libraryText = state?.libraryText

  // Create fixed text info if reading from library
  const fixedText: FixedTextInfo | undefined = libraryText
    ? { fiction: libraryText.fiction, readability: libraryText.readability }
    : undefined

  // Get preferences from context (persisted to localStorage)
  const {
    preferences,
    setWpm,
    setMode,
    setReadingType,
    setBlurEnabled,
    setFiction,
    setDifficultyMin,
    setDifficultyMax,
    setTextWidthPercent,
  } = useReadingPreferences()

  const [inputBlocking, setInputBlocking] = useState(false)

  return (
    <div className="flex-1 flex flex-col">
      <OptionsBar
        wpm={preferences.wpm}
        onWpmChange={setWpm}
        mode={preferences.mode}
        onModeChange={setMode}
        readingType={preferences.readingType}
        onReadingTypeChange={setReadingType}
        blurEnabled={preferences.blurEnabled}
        onBlurChange={setBlurEnabled}
        fiction={preferences.fiction}
        onFictionChange={setFiction}
        difficultyMin={preferences.difficultyMin}
        difficultyMax={preferences.difficultyMax}
        onDifficultyMinChange={setDifficultyMin}
        onDifficultyMaxChange={setDifficultyMax}
        onInputBlockingChange={setInputBlocking}
        fixedText={fixedText}
      />

      <div className="flex-1 flex flex-col items-center justify-center px-8">
        {/* Nested page content */}
        <Outlet
          context={
            {
              wpm: preferences.wpm,
              mode: preferences.mode,
              readingType: preferences.readingType,
              blurEnabled: preferences.blurEnabled,
              fiction: preferences.fiction,
              difficultyMin: preferences.difficultyMin,
              difficultyMax: preferences.difficultyMax,
              inputBlocking,
              textWidthPercent: preferences.textWidthPercent,
              onTextWidthChange: setTextWidthPercent,
            } satisfies ReadingContext
          }
        />
      </div>
    </div>
  )
}
