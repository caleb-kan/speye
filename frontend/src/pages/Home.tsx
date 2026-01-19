import { useState } from 'react'
import { Header } from '../components/Header'
import { OptionsBar } from '../components/OptionsBar'
import { Reader } from '../components/Reader'
import { useTexts } from '../hooks/useTexts'
import type { Mode, ReadingType } from '../types/reading'

export function Home() {
  const [wpm, setWpm] = useState(200)
  const [mode, setMode] = useState<Mode>('standard')
  const [readingType, setReadingType] = useState<ReadingType>('dynamic')
  const [blurEnabled, setBlurEnabled] = useState(false)
  const [fiction, setFiction] = useState(false)
  const [difficultyMin, setDifficultyMin] = useState(8)
  const [difficultyMax, setDifficultyMax] = useState(12)
  const [inputBlocking, setInputBlocking] = useState(false)

  const { currentText, loading, error, selectRandomText, refetch } = useTexts({
    fiction,
    difficultyMin,
    difficultyMax,
  })

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <Header />
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
        difficultyMin={difficultyMin}
        difficultyMax={difficultyMax}
        onDifficultyMinChange={setDifficultyMin}
        onDifficultyMaxChange={setDifficultyMax}
        onInputBlockingChange={setInputBlocking}
      />

      <main className="min-h-screen flex flex-col items-center justify-center px-8 pt-32">
        <div className="w-full max-w-3xl">
          {loading ? (
            <div className="text-text-secondary text-center">
              Loading texts...
            </div>
          ) : error ? (
            <div className="text-center">
              <p className="text-error mb-4">{error}</p>
              <button
                onClick={refetch}
                className="text-primary hover:underline"
              >
                Try again
              </button>
            </div>
          ) : currentText ? (
            <Reader
              key={currentText.id}
              text={currentText.content}
              wpm={wpm}
              readingType={readingType}
              blurEnabled={blurEnabled}
              onNewText={selectRandomText}
              disabled={inputBlocking}
            />
          ) : (
            <div className="text-text-secondary text-center">
              No texts available
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
