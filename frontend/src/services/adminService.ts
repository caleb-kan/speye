import {
  getPendingAdminReviews,
  approveText as approveTextDb,
  rejectText as rejectTextDb,
  regenerateQuiz as regenerateQuizDb,
  type AdminReviewText,
} from '../../../backend/supabase/database/texts/adminService'
import { retryProcessing } from '../../../backend/supabase/database/texts/retryProcessing'

export type { AdminReviewText }

export const fetchPendingApprovals = (): Promise<AdminReviewText[]> => {
  return getPendingAdminReviews()
}

export const approveText = async (
  textId: string,
  adminId: string
): Promise<void> => {
  await approveTextDb(textId, adminId)
}

export const rejectText = async (
  textId: string,
  adminId: string,
  notes?: string
): Promise<void> => {
  await rejectTextDb(textId, adminId, notes)
}

export const regenerateQuiz = async (
  textId: string,
  adminId: string
): Promise<void> => {
  await regenerateQuizDb(textId, adminId)
}

export const retryTextProcessing = (textId: string): Promise<void> => {
  return retryProcessing(textId)
}
