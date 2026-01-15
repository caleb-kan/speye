import { useState } from 'react'
import { Header } from '../components/Header'
import { SettingsBar } from '../components/SettingsBar'
import { Reader } from '../components/Reader'
import { useTexts } from '../hooks/useTexts'

type Mode = 'standard' | 'adaptive' | 'summarized'

export function Home() {
  const [wpm, setWpm] = useState(200)
  const [mode, setMode] = useState<Mode>('standard')

  const { currentText, loading, error, selectRandomText } = useTexts()

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col">
      <Header />

      <main className="flex-1 flex flex-col items-center justify-center px-8">
        {/* Settings Bar */}
        <SettingsBar
          wpm={wpm}
          onWpmChange={setWpm}
          mode={mode}
          onModeChange={setMode}
        />

        {/* Spacer */}
        <div className="h-12" />

        {/* Main Content */}
        <div className="w-full max-w-3xl">
          {loading ? (
            <div className="text-[var(--color-text-secondary)] text-center">
              Loading texts...
            </div>
          ) : error ? (
            <div className="text-center">
              <p className="text-[var(--color-error)] mb-4">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="text-[var(--color-primary)] hover:underline"
              >
                Try again
              </button>
            </div>
          ) : currentText ? (
            <Reader
              key={currentText.id}
              text={currentText.content}
              wpm={wpm}
              onNewText={selectRandomText}
            />
          ) : (
            <div className="text-[var(--color-text-secondary)] text-center">
              No texts available
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
