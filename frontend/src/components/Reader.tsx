import { TextDisplay } from './TextDisplay'
import { ReadingControls } from './ReadingControls'
import { useReader } from '../hooks/useReader'

type ReadingType = 'dynamic' | 'static'

type ReaderProps = {
  text: string
  wpm: number
  readingType: ReadingType
  onNewText: () => void
}

export function Reader({ text, wpm, readingType, onNewText }: ReaderProps) {
  const {
    currentWordIndex,
    isPlaying,
    totalWords,
    progress,
    togglePlayPause,
    restart,
  } = useReader({ text, wpm })

  return (
    <>
      {/* Text Display */}
      <div className="w-full max-w-3xl">
        <TextDisplay
          text={text}
          currentWordIndex={currentWordIndex}
          isPlaying={isPlaying}
          readingType={readingType}
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
      />
    </>
  )
}
