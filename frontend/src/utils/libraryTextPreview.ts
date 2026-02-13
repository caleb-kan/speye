import type { Text, TextPreview } from '../types/database'
import { TEXT_PREVIEW_LENGTH } from '../constants/library'
import { truncateText } from './truncateText'

export const createTextFromPreview = (
  textPreview: TextPreview,
  content: string,
  summary: string | null
): Text => {
  return {
    id: textPreview.id,
    title: textPreview.title,
    content,
    summary,
    uploaded_at: textPreview.uploaded_at,
    owner_id: textPreview.owner_id,
    quiz: textPreview.quiz,
    fiction: textPreview.fiction,
    complexity: textPreview.complexity,
    source: textPreview.source,
    processing_status: textPreview.processing_status,
    quiz_valid: textPreview.quiz_valid,
    llm_decision: null,
    llm_violation_type: null,
    admin_decision: null,
    admin_reviewed_by: textPreview.admin_reviewed_by,
    admin_reviewed_at: textPreview.admin_reviewed_at,
    rejection_reason: textPreview.rejection_reason,
    rejection_stage: textPreview.rejection_stage,
  }
}

export const createPreviewFromText = (textRecord: Text): TextPreview => {
  return {
    id: textRecord.id,
    title: textRecord.title,
    preview: truncateText(textRecord.content, TEXT_PREVIEW_LENGTH),
    uploaded_at: textRecord.uploaded_at,
    owner_id: textRecord.owner_id,
    quiz: textRecord.quiz,
    fiction: textRecord.fiction,
    complexity: textRecord.complexity,
    source: textRecord.source,
    processing_status: textRecord.processing_status,
    quiz_valid: textRecord.quiz_valid,
    has_summary: textRecord.summary !== null,
    rejection_reason: textRecord.rejection_reason,
    rejection_stage: textRecord.rejection_stage,
    admin_reviewed_by: textRecord.admin_reviewed_by,
    admin_reviewed_at: textRecord.admin_reviewed_at,
  }
}
