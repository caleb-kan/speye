import type { SectionData } from '../types/database'
import { MAX_CONTENT_CHARACTERS } from '../constants/textUpload'
import { formatNumberWithCommas } from './textUtils'

type ValidationResult =
  | { isValid: true; error: null }
  | { isValid: false; error: string }

export function validateSectionalContent(
  sections: SectionData[]
): ValidationResult {
  const hasEmptyTitle = sections.some((section) => !section.title.trim())
  const hasEmptyContent = sections.some((section) => !section.content.trim())
  const hasOversizedSection = sections.some(
    (section) => section.content.trim().length > MAX_CONTENT_CHARACTERS
  )
  const totalCharacters = sections.reduce(
    (total, section) => total + section.content.trim().length,
    0
  )
  const exceedsTotalLimit = totalCharacters > MAX_CONTENT_CHARACTERS

  if (hasOversizedSection) {
    return {
      isValid: false,
      error: `Each section must not exceed ${formatNumberWithCommas(MAX_CONTENT_CHARACTERS)} characters`,
    }
  }

  if (exceedsTotalLimit) {
    return {
      isValid: false,
      error: `Total content cannot exceed ${formatNumberWithCommas(MAX_CONTENT_CHARACTERS)} characters`,
    }
  }

  if (hasEmptyTitle || hasEmptyContent) {
    return {
      isValid: false,
      error: 'All sections must have both title and content',
    }
  }

  return { isValid: true, error: null }
}

export function validateSimpleContent(content: string): ValidationResult {
  if (!content.trim()) {
    return {
      isValid: false,
      error: 'Please enter some text',
    }
  }

  if (content.length > MAX_CONTENT_CHARACTERS) {
    return {
      isValid: false,
      error: `Content cannot exceed ${formatNumberWithCommas(MAX_CONTENT_CHARACTERS)} characters`,
    }
  }

  return { isValid: true, error: null }
}

export function getTotalSectionCharacterCount(sections: SectionData[]): number {
  return sections.reduce((total, section) => total + section.content.length, 0)
}

export function sectionHasContent(section: SectionData): boolean {
  return !!(section.content.trim() || section.title.trim())
}
