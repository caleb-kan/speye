import { useState } from 'react'
import { OptionsBar } from '../components/OptionsBar'
import { Outlet } from 'react-router-dom'
import type { Mode, ReadingType } from '../types/reading'
import {
  DEFAULT_MIN_DIFFICULTY,
  DEFAULT_MAX_DIFFICULTY,
} from '../constants/difficulty'
import { DEFAULT_WPM } from '../constants/wpm'

export function ReadingLayout() {
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
    <div className="flex flex-col h-full">
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
      />

      <div className="h-18" />

      <main className="mt-4">
        {/* Nested page content */}
        <Outlet
          context={{
            wpm,
            mode,
            readingType,
            blurEnabled,
            fiction,
            difficultyMin,
            difficultyMax,
            inputBlocking,
          }}
        />
      </main>
    </div>
  )
}
