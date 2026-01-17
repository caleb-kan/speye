import { TextDisplay } from './TextDisplay'
import { ReadingControls } from './ReadingControls'
import { useReader } from '../hooks/useReader'
import type { ReadingType } from '../types/reading'

type ReaderProps = {
  text: string
  wpm: number
  readingType: ReadingType
  blurEnabled: boolean
  onNewText: () => void
  disabled?: boolean
}

export function Reader({
  text,
  wpm,
  readingType,
  blurEnabled,
  onNewText,
  disabled = false,
}: ReaderProps) {
  const {
    currentWordIndex,
    isPlaying,
    totalWords,
    progress,
    togglePlayPause,
    restart,
  } = useReader({ text, wpm, disabled })

  return (
    <>
      {/* Text Display */}
      <div className="w-full max-w-3xl">
        <TextDisplay
          text={text}
          currentWordIndex={currentWordIndex}
          isPlaying={isPlaying}
          readingType={readingType}
          blurEnabled={blurEnabled}
          wpm={wpm}
        />
      </div>

      {/* Spacer */}
      <div className="h-14 shrink-0" />

      {/* Controls */}
      <ReadingControls
        isPlaying={isPlaying}
        onPlayPause={togglePlayPause}
        onRestart={restart}
        onNewText={onNewText}
        progress={progress}
        currentWord={currentWordIndex + 1}
        totalWords={totalWords}
        disabled={disabled}
      />
    </>
  )
}
