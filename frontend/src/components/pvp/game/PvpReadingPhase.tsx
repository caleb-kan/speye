import { useCallback, useState } from 'react'
import { OptionsBar } from '../../OptionsBar'
import { RsvpShell } from '../../rsvp/RsvpShell'
import { Reader } from '../../Reader'
import { AdaptiveReader } from '../../adaptive/AdaptiveReader'
import { RsvpReader } from '../../rsvp/RsvpReader'
import { useReadingPreferences } from '../../../hooks/useReadingPreferences'
import { useIsMobile } from '../../../hooks/useIsMobile'
import type { PvpTextData } from '../../../types/database'

// PvP uses a fixed text; onNewText is hidden but the reader prop is required.
const NOOP = () => {}

type PvpReadingPhaseProps = {
  text: PvpTextData
  wpm: number
  onComplete: (isComplete: boolean) => void
  onPositionChange: (wordIndex: number) => void
  onAdaptiveWpmChange?: (wpm: number) => void
}

export function PvpReadingPhase({
  text,
  wpm,
  onComplete,
  onPositionChange,
  onAdaptiveWpmChange,
}: PvpReadingPhaseProps) {
  const [readingPosition, setReadingPosition] = useState(0)
  const [inputBlocking, setInputBlocking] = useState(false)

  const handlePositionChange = useCallback(
    (wordIndex: number) => {
      setReadingPosition(wordIndex)
      onPositionChange(wordIndex)
    },
    [onPositionChange]
  )

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
    setPhraseSize,
  } = useReadingPreferences()

  const isMobile = useIsMobile()
  const mode = isMobile ? 'rsvp' : preferences.mode

  const optionsBarProps = {
    wpm,
    onWpmChange: setWpm,
    mode,
    onModeChange: setMode,
    scrolling: preferences.scrolling,
    onScrollingChange: setScrolling,
    blurEnabled: preferences.blurEnabled,
    onBlurChange: setBlurEnabled,
    fiction: preferences.fiction,
    onFictionChange: setFiction,
    complexityMin: preferences.complexityMin,
    complexityMax: preferences.complexityMax,
    onComplexityMinChange: setComplexityMin,
    onComplexityMaxChange: setComplexityMax,
    visibleLines: preferences.visibleLines,
    onVisibleLinesChange: setVisibleLines,
    phraseSize: preferences.phraseSize,
    onPhraseSizeChange: setPhraseSize,
    fixedText: {
      fiction: text.fiction,
      complexity: text.complexity,
    } as const,
    onInputBlockingChange: setInputBlocking,
    preventModeNavigation: true,
  }

  const commonProps = {
    title: text.title,
    text: text.content,
    source: text.source,
    initialWordIndex: readingPosition,
    onNewText: NOOP,
    onComplete,
    onPositionChange: handlePositionChange,
    hideNewText: true as const,
  }

  const readerContent = (() => {
    if (mode === 'adaptive')
      return (
        <div className="relative flex-1 flex flex-col min-h-0 overflow-hidden pb-20">
          <AdaptiveReader
            {...commonProps}
            onCalculatedWpmChange={onAdaptiveWpmChange}
          />
        </div>
      )

    if (mode === 'rsvp')
      return (
        <div className="relative flex-1 flex flex-col w-full min-h-0 overflow-hidden pb-20">
          <RsvpReader
            {...commonProps}
            wpm={wpm}
            phraseSize={preferences.phraseSize}
            disabled={inputBlocking}
            visibleLines={preferences.visibleLines}
          />
        </div>
      )

    return (
      <div className="flex-1 flex flex-col items-center px-4 sm:px-8">
        <div className="relative flex-1 flex flex-col w-full h-full overflow-hidden pb-20">
          <Reader
            {...commonProps}
            wpm={wpm}
            scrolling={preferences.scrolling}
            blurEnabled={preferences.blurEnabled}
            disabled={inputBlocking}
            textWidthPercent={preferences.textWidthPercent}
            onTextWidthChange={setTextWidthPercent}
            visibleLines={preferences.visibleLines}
          />
        </div>
      </div>
    )
  })()

  if (isMobile) {
    return (
      <div className="flex-1 flex flex-col min-h-0 pb-[calc(3rem+env(safe-area-inset-bottom,0px))]">
        <RsvpShell
          optionsBarProps={optionsBarProps}
          contentClassName="flex-1 flex flex-col min-h-0"
        >
          {readerContent}
        </RsvpShell>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <OptionsBar {...optionsBarProps} />
      {readerContent}
    </div>
  )
}
