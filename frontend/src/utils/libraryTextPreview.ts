import type { Text, TextPreview } from '../types/database'
import { TEXT_PREVIEW_LENGTH } from '../constants/library'

export const createPreviewFromText = (textRecord: Text): TextPreview => {
  return {
    id: textRecord.id,
    title: textRecord.title,
    preview:
      textRecord.content.slice(0, TEXT_PREVIEW_LENGTH) +
      (textRecord.content.length > TEXT_PREVIEW_LENGTH ? '...' : ''),
    uploaded_at: textRecord.uploaded_at,
    owner_id: textRecord.owner_id,
    quiz: textRecord.quiz,
    fiction: textRecord.fiction,
    category: textRecord.category,
    complexity: textRecord.complexity,
    source: textRecord.source,
    processing_status: textRecord.processing_status,
    quiz_valid: textRecord.quiz_valid,
  }
}
