import { TextDisplay } from './TextDisplay'
import { ReadingControls } from './ReadingControls'
import { useReader } from '../hooks/useReader'
import type { Scrolling } from '../types/reading'
import { Resizable } from './Resizable'

type ReaderProps = {
  text: string
  wpm: number
  scrolling: Scrolling
  blurEnabled: boolean
  onNewText: () => void
  disabled?: boolean
  textWidthPercent: number
  onTextWidthChange: (percent: number) => void
}

export function Reader({
  text,
  wpm,
  scrolling,
  blurEnabled,
  onNewText,
  disabled = false,
  textWidthPercent,
  onTextWidthChange,
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
      <Resizable
        widthPercent={textWidthPercent}
        onWidthChange={onTextWidthChange}
      >
        <TextDisplay
          text={text}
          currentWordIndex={currentWordIndex}
          isPlaying={isPlaying}
          scrolling={scrolling}
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
