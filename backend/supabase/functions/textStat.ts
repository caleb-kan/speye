import { textstat } from 'textstat-ts'

const MIN_READABILITY = 1

export function calculateReadability(text: string): number {
  const grade = textstat.fleschKincaidGrade(text)

  if (!Number.isFinite(grade)) {
    return MIN_READABILITY
  }

  return Math.max(MIN_READABILITY, Math.floor(grade))
}
