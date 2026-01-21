import { useState } from 'react'
import { OptionsBar } from '../components/OptionsBar'
import { Outlet, useLocation } from 'react-router-dom'
import type {
  Mode,
  ReadingType,
  ReadingContext,
  FixedTextInfo,
} from '../types/reading'
import type { Text } from '../types/database'
import {
  DEFAULT_MIN_DIFFICULTY,
  DEFAULT_MAX_DIFFICULTY,
} from '../constants/difficulty'
import { DEFAULT_WPM } from '../constants/wpm'

interface LocationState {
  libraryText?: Text
}

export function ReadingLayout() {
  const location = useLocation()
  const state = location.state as LocationState | null
  const libraryText = state?.libraryText

  // Create fixed text info if reading from library
  const fixedText: FixedTextInfo | undefined = libraryText
    ? { fiction: libraryText.fiction, readability: libraryText.readability }
    : undefined

  // Keep the states here
  const [wpm, setWpm] = useState(DEFAULT_WPM)
  const [mode, setMode] = useState<Mode>('standard')
  const [readingType, setReadingType] = useState<ReadingType>('dynamic')
  const [blurEnabled, setBlurEnabled] = useState(false)
  const [fiction, setFiction] = useState(false)
  const [inputBlocking, setInputBlocking] = useState(false)
  const [difficultyMin, setDifficultyMin] = useState(DEFAULT_MIN_DIFFICULTY)
  const [difficultyMax, setDifficultyMax] = useState(DEFAULT_MAX_DIFFICULTY)

  return (
    <div className="flex-1 flex flex-col">
      <OptionsBar
        wpm={wpm}
        onWpmChange={setWpm}
        mode={mode}
        onModeChange={setMode}
        readingType={readingType}
        onReadingTypeChange={setReadingType}
        blurEnabled={blurEnabled}
        onBlurChange={setBlurEnabled}
        fiction={fiction}
        onFictionChange={setFiction}
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
              wpm,
              mode,
              readingType,
              blurEnabled,
              fiction,
              difficultyMin,
              difficultyMax,
              inputBlocking,
            } satisfies ReadingContext
          }
        />
      </div>
    </div>
  )
}
