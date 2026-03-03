import { useMemo, useEffect, Fragment } from 'react'
import { ChevronLeft, ChevronRight, BookOpen } from 'lucide-react'
import type { SectionData } from '../types/database'
import { computeSectionWordOffsets } from '../utils/textUtils'

interface SectionalTextDisplayProps {
  sections: SectionData[]
  currentWordIndex: number
  onWordIndexChange: (index: number) => void
  onSectionComplete?: (sectionIndex: number) => void
  onSectionIndexChange?: (sectionIndex: number) => void
  /** Sections where the quiz was actually answered (controls dot colour) */
  quizzedSections?: Set<number>
  /** Total number of sections that have quizzes (for last-section status display) */
  totalSectionQuizCount?: number
  children: (props: {
    sectionText: string
    sectionWordIndex: number
  }) => React.ReactNode
}

export function SectionalTextDisplay({
  sections,
  currentWordIndex,
  onWordIndexChange,
  onSectionComplete,
  onSectionIndexChange,
  quizzedSections,
  totalSectionQuizCount,
  children,
}: SectionalTextDisplayProps) {
  const sectionWordOffsets = useMemo(
    () => computeSectionWordOffsets(sections),
    [sections]
  )

  // Find which section the current word index belongs to
  const targetSectionIndex = useMemo(() => {
    // Default to the last section so that reading past the final word doesn't
    // snap back to section 0.
    let targetIndex = sectionWordOffsets.length - 2
    for (let i = 0; i < sectionWordOffsets.length - 1; i++) {
      if (
        currentWordIndex >= sectionWordOffsets[i] &&
        currentWordIndex < sectionWordOffsets[i + 1]
      ) {
        targetIndex = i
        break
      }
    }
    return Math.max(0, targetIndex)
  }, [currentWordIndex, sectionWordOffsets])

  const currentSection = sections[targetSectionIndex] as SectionData | undefined

  // Calculate current word index within the current section
  const currentSectionWordIndex =
    currentWordIndex - (sectionWordOffsets[targetSectionIndex] ?? 0)

  const totalWordsInCurrentSection =
    (sectionWordOffsets[targetSectionIndex + 1] ?? 0) -
    (sectionWordOffsets[targetSectionIndex] ?? 0)

  // Notify parent when the active section changes (e.g. user navigates back)
  useEffect(() => {
    onSectionIndexChange?.(targetSectionIndex)
  }, [targetSectionIndex, onSectionIndexChange])

  // Pause (and notify parent) whenever the reader reaches the last word of a section.
  // No ref guard here -- fires on every read-through so the reader always pauses at
  // the end. Quiz re-triggering is prevented separately in ReadingSession.
  useEffect(() => {
    if (!onSectionComplete || totalWordsInCurrentSection <= 0) return
    if (currentSectionWordIndex >= totalWordsInCurrentSection - 1) {
      onSectionComplete(targetSectionIndex)
    }
  }, [
    currentSectionWordIndex,
    targetSectionIndex,
    totalWordsInCurrentSection,
    onSectionComplete,
  ])

  if (!currentSection) return null

  const handleSectionChange = (newSectionIndex: number) => {
    if (newSectionIndex >= 0 && newSectionIndex < sections.length) {
      onWordIndexChange(sectionWordOffsets[newSectionIndex])
    }
  }

  const goToPreviousSection = () => {
    handleSectionChange(targetSectionIndex - 1)
  }

  const goToNextSection = () => {
    handleSectionChange(targetSectionIndex + 1)
  }

  const currentSectionQuizDone =
    quizzedSections?.has(targetSectionIndex) ?? false
  const isLastSection = targetSectionIndex === sections.length - 1
  const showQuizDots = quizzedSections !== undefined

  const completedQuizCount = quizzedSections?.size ?? 0
  const totalQuizzes = totalSectionQuizCount ?? 0
  const remainingQuizzes = Math.max(0, totalQuizzes - completedQuizCount)
  const allQuizzesDone = totalQuizzes > 0 && remainingQuizzes === 0

  let nextBtnLabel: string
  let nextBtnClass: string
  if (isLastSection) {
    if (allQuizzesDone) {
      nextBtnLabel = 'All quizzes done!'
      nextBtnClass =
        'bg-success/20 text-success border border-success/30 font-medium cursor-default'
    } else if (totalQuizzes > 0) {
      nextBtnLabel = `${remainingQuizzes} quiz${remainingQuizzes === 1 ? '' : 'zes'} left`
      nextBtnClass =
        'bg-bg border border-text-secondary/20 text-text-secondary opacity-70 cursor-default'
    } else {
      nextBtnLabel = 'Last Section'
      nextBtnClass =
        'bg-bg border border-text-secondary/20 text-text-secondary opacity-50 cursor-not-allowed'
    }
  } else if (currentSectionQuizDone) {
    nextBtnLabel = 'Continue'
    nextBtnClass = 'bg-primary text-bg hover:bg-primary/90 font-medium'
  } else {
    nextBtnLabel = 'Skip Section'
    nextBtnClass =
      'bg-bg border border-text-secondary/20 hover:bg-text-secondary/10'
  }

  return (
    <div className="flex flex-col h-full w-full">
      {/* Reading content */}
      <div className="flex-1 overflow-hidden">
        {children({
          sectionText: currentSection.content,
          sectionWordIndex: currentSectionWordIndex,
        })}
      </div>

      {/* Section Navigation Header */}
      <div className="rounded-lg mx-60 min-w-3xl">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <BookOpen className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-text">
              {currentSection.title || `Section ${targetSectionIndex + 1}`}
            </h2>
          </div>
          <div className="text-sm text-text-secondary">
            {targetSectionIndex + 1} of {sections.length}
          </div>
        </div>

        {/* Progress bar: section pills with quiz indicator dots between them */}
        <div className="flex items-center mb-3">
          <div className="flex items-center flex-1 gap-1">
            {sections.map((_, index) => (
              <Fragment key={index}>
                {/* Section progress pill */}
                {index === targetSectionIndex ? (
                  <div className="relative h-2 flex-1 rounded-full bg-text-secondary/20 overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 bg-primary rounded-full"
                      style={{
                        width: `${
                          totalWordsInCurrentSection <= 1
                            ? 100
                            : Math.min(
                                100,
                                (currentSectionWordIndex /
                                  (totalWordsInCurrentSection - 1)) *
                                  100
                              )
                        }%`,
                        transition: 'width 150ms linear',
                      }}
                    />
                  </div>
                ) : (
                  <div
                    className={`h-2 flex-1 rounded-full transition-colors ${
                      index < targetSectionIndex
                        ? 'bg-primary/30'
                        : 'bg-text-secondary/20'
                    }`}
                  />
                )}
                {/* Quiz completion dot shown between and after pills */}
                {showQuizDots && (
                  <div
                    className={`w-2 h-2 rounded-full flex-shrink-0 transition-colors ${
                      quizzedSections!.has(index)
                        ? 'bg-success'
                        : 'bg-text-secondary/20'
                    }`}
                  />
                )}
              </Fragment>
            ))}
          </div>
        </div>

        {/* Section Navigation Buttons */}
        <div className="grid grid-cols-3 items-center">
          <button
            onClick={goToPreviousSection}
            disabled={targetSectionIndex === 0}
            className="flex items-center space-x-2 px-3 py-2 text-sm bg-bg border border-text-secondary/20 rounded-lg hover:bg-text-secondary/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors justify-self-start"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous Section</span>
          </button>

          <div className="flex flex-row items-center justify-center justify-self-center text-xs text-text-secondary">
            {Math.min(currentSectionWordIndex + 1, totalWordsInCurrentSection)}{' '}
            / {totalWordsInCurrentSection} words •{' '}
            {Math.round(
              (Math.min(
                currentSectionWordIndex + 1,
                totalWordsInCurrentSection
              ) /
                totalWordsInCurrentSection) *
                100
            )}
            % of section complete
          </div>

          <button
            onClick={goToNextSection}
            disabled={isLastSection}
            className={`flex items-center space-x-2 px-3 py-2 text-sm rounded-lg transition-all duration-200 justify-self-end ${nextBtnClass}`}
          >
            <span>{nextBtnLabel}</span>
            {!isLastSection && <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  )
}
