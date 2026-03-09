import type { ReactNode } from 'react'
import { useIsMobile } from '../../hooks/useIsMobile'
import { TextTitle } from '../TextTitle'

type RsvpDisplayProps = {
  title: string | null
  source: string | null
  isSummary?: boolean
  phrases: string[]
  currentPhraseIndex: number
  visibleLines: number
  children?: ReactNode
}

export function RsvpDisplay({
  title,
  source,
  isSummary,
  phrases,
  currentPhraseIndex,
  visibleLines,
  children,
}: RsvpDisplayProps) {
  const isMobile = useIsMobile()

  // Calculate the range of phrases to show around the current one
  // subtract one from visible lines so that the current phrase can be centered, and 1 more line below than above for even visibleLines
  const half = Math.floor((visibleLines - 1) / 2)

  return (
    <div
      className={`relative overflow-hidden flex flex-col ${
        isMobile
          ? 'flex-1 w-full min-h-0'
          : 'h-full shrink-0 rounded-3xl border border-text-secondary/20 bg-bg-secondary shadow-2xl'
      }`}
      style={isMobile ? undefined : { aspectRatio: '3 / 5' }}
    >
      {title && (
        <div className="px-4 pt-6 shrink-0">
          <TextTitle title={title} source={source} isSummary={isSummary} />
        </div>
      )}

      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-2 w-full min-h-0 min-w-0 overflow-hidden">
        {Array.from({ length: visibleLines }, (_, i) => {
          const offset = i - half
          const phraseIndex = currentPhraseIndex + offset
          const phrase = phrases[phraseIndex]
          const isCurrent = offset === 0

          if (phrase === undefined) {
            return (
              <div key={`empty-${i}`} className="h-10" aria-hidden="true" />
            )
          }

          const distance = Math.abs(offset)
          const opacity = isCurrent
            ? 1
            : Math.max(0.1, 0.5 - (distance - 1) * 0.1)

          return (
            <div
              key={phraseIndex}
              className={`text-center max-w-full break-words shrink-0 ${
                isCurrent
                  ? 'text-3xl font-medium text-primary'
                  : 'text-xl text-text-secondary'
              }`}
              style={isCurrent ? undefined : { opacity }}
            >
              {phrase}
            </div>
          )
        })}
      </div>

      {children && <div className="px-4 pb-4">{children}</div>}
    </div>
  )
}
