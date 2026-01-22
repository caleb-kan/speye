import { textstat } from 'textstat-ts'

const MIN_COMPLEXITY = 1

export function calculateComplexity(text: string): number {
  const grade = textstat.fleschKincaidGrade(text)

  if (!Number.isFinite(grade)) {
    return MIN_COMPLEXITY
  }

  return Math.max(MIN_COMPLEXITY, Math.floor(grade))
}
