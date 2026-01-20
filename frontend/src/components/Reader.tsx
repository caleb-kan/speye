import { TextDisplay } from './TextDisplay'
import { ReadingControls } from './ReadingControls'
import { useReader } from '../hooks/useReader'
import type { ReadingType } from '../types/reading'
import { Resizable } from './Resizable'

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
    <div className="w-full flex flex-col items-center">
      {/* Text Display */}
      <Resizable>
        <TextDisplay
          text={text}
          currentWordIndex={currentWordIndex}
          isPlaying={isPlaying}
          readingType={readingType}
          blurEnabled={blurEnabled}
          wpm={wpm}
        />
      </Resizable>

      {/* Spacer */}
      <div className="h-10 shrink-0" />

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
    </div>
  )
}
