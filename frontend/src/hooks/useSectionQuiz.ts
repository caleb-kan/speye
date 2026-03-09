import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import type { Text, QuestionSet } from '../types/database'
import { saveQuizResult } from '../services/saveQuizResult'
import {
  getSectionQuizProgress,
  setSectionQuizProgress,
  clearSectionQuizProgress,
} from '../services/offlineCache'

/**
 * Manages section-level quiz state for sectional texts.
 *
 * Handles:
 * - IndexedDB persistence of per-section quiz progress
 * - Tracking which sections have been quizzed vs. dismissed
 * - Aggregate score computation once all section quizzes are done
 * - Quiz overlay activation based on current section
 *
 * Used by both ReadingSession and AdaptiveReadingSession.
 */
export function useSectionQuiz(currentText: Text) {
  const [pendingSectionQuizIndex, setPendingSectionQuizIndex] = useState<
    number | null
  >(null)
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0)
  const [quizzedSections, setQuizzedSections] = useState<Set<number>>(new Set())
  const [completedSectionQuizzes, setCompletedSectionQuizzes] = useState<
    Set<number>
  >(new Set())
  const sectionResultsRef = useRef<
    ({ correct: number; total: number } | null)[]
  >([])
  const triggeredSectionsRef = useRef(new Set<number>())

  const isSectional = currentText.sectional
  const questionSets = useMemo(
    () => currentText.quiz?.questionSets ?? [],
    [currentText.quiz]
  )

  useEffect(() => {
    if (!isSectional) return
    getSectionQuizProgress(currentText.id)
      .then((progress) => {
        if (!progress) return
        sectionResultsRef.current = progress.results
        const completed = new Set(progress.quizzedSectionIds)
        setQuizzedSections(completed)
        setCompletedSectionQuizzes(completed)
      })
      .catch(console.error)
  }, [currentText.id, isSectional])

  const persistProgress = (
    results: typeof sectionResultsRef.current,
    quizzed: Set<number>
  ) => {
    setSectionQuizProgress(currentText.id, {
      results,
      quizzedSectionIds: [...quizzed],
    }).catch(console.error)
  }

  const saveAggregateIfAllDone = (
    results: typeof sectionResultsRef.current,
    nextCompleted: Set<number>
  ) => {
    if (questionSets.length === 0 || nextCompleted.size < questionSets.length)
      return
    const totalCorrect = results.reduce((sum, r) => sum + (r?.correct ?? 0), 0)
    const totalQuestions = results.reduce((sum, r) => sum + (r?.total ?? 0), 0)
    if (totalQuestions > 0) {
      const aggregateScore = Math.round((totalCorrect / totalQuestions) * 100)
      saveQuizResult({ text_id: currentText.id, score: aggregateScore })
        .then(() =>
          clearSectionQuizProgress(currentText.id).catch(console.error)
        )
        .catch(console.error)
    }
  }

  const handleSectionComplete = useCallback(
    (sectionIndex: number) => {
      if (
        questionSets[sectionIndex] &&
        !quizzedSections.has(sectionIndex) &&
        !triggeredSectionsRef.current.has(sectionIndex)
      ) {
        triggeredSectionsRef.current.add(sectionIndex)
        setPendingSectionQuizIndex(sectionIndex)
      }
    },
    [questionSets, quizzedSections]
  )

  const handleSectionQuizFinish = (correct: number, total: number) => {
    if (pendingSectionQuizIndex === null) return
    const idx = pendingSectionQuizIndex
    const updatedResults = [...sectionResultsRef.current]
    updatedResults[idx] = { correct, total }
    sectionResultsRef.current = updatedResults

    const nextCompleted = new Set(completedSectionQuizzes).add(idx)
    setCompletedSectionQuizzes(nextCompleted)
    setQuizzedSections((prev) => new Set(prev).add(idx))
    persistProgress(updatedResults, nextCompleted)
    saveAggregateIfAllDone(updatedResults, nextCompleted)
  }

  const handleSectionQuizDismiss = () => {
    if (pendingSectionQuizIndex === null) return
    setQuizzedSections((prev) => new Set(prev).add(pendingSectionQuizIndex))
  }

  const hasUnfinishedSectionQuiz =
    pendingSectionQuizIndex !== null &&
    !quizzedSections.has(pendingSectionQuizIndex)

  const isSectionQuizActive =
    hasUnfinishedSectionQuiz && currentSectionIndex === pendingSectionQuizIndex

  const sectionQuestionSet: QuestionSet | null =
    pendingSectionQuizIndex !== null
      ? (questionSets[pendingSectionQuizIndex] ?? null)
      : null

  const showSectionMiniQuiz =
    isSectional &&
    pendingSectionQuizIndex !== null &&
    pendingSectionQuizIndex === currentSectionIndex &&
    quizzedSections.has(pendingSectionQuizIndex) &&
    !completedSectionQuizzes.has(pendingSectionQuizIndex)

  return {
    isSectional,
    questionSets,
    currentSectionIndex,
    setCurrentSectionIndex,
    handleSectionComplete,
    handleSectionQuizFinish,
    handleSectionQuizDismiss,
    isSectionQuizActive,
    sectionQuestionSet,
    showSectionMiniQuiz,
    completedSectionQuizzes,
  }
}
