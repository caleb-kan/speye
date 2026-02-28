import {
  getPendingAdminReviews,
  approveText as approveTextDb,
  rejectText as rejectTextDb,
  deleteTosViolation as deleteTosViolationDb,
  regenerateQuiz as regenerateQuizDb,
  getAdminStats as getAdminStatsDb,
  getUserTrend as getUserTrendDb,
  type AdminReviewText,
  type AdminStats,
  type UserTrendData,
} from '../../../backend/supabase/database/admin/adminService.ts'
import { retryProcessing } from '../../../backend/supabase/database/texts/retryProcessing'
import { pwaLogger } from '../utils/pwaLogger'
import { isOffline } from './networkStatus'
import { OFFLINE_WRITE_ERROR } from '../constants/offline'

const TAG = 'adminService'

export type { AdminReviewText, AdminStats, UserTrendData }

export const fetchPendingApprovals = (): Promise<AdminReviewText[]> => {
  if (isOffline()) {
    pwaLogger.warn(TAG, 'Blocked fetchPendingApprovals — offline')
    throw new Error(OFFLINE_WRITE_ERROR)
  }
  return getPendingAdminReviews()
}

export const approveText = async (
  textId: string,
  adminId: string
): Promise<void> => {
  if (isOffline()) {
    pwaLogger.warn(TAG, 'Blocked approveText — offline', { textId })
    throw new Error(OFFLINE_WRITE_ERROR)
  }
  await approveTextDb(textId, adminId)
}

export const rejectText = async (
  textId: string,
  adminId: string,
  notes?: string
): Promise<void> => {
  if (isOffline()) {
    pwaLogger.warn(TAG, 'Blocked rejectText — offline', { textId })
    throw new Error(OFFLINE_WRITE_ERROR)
  }
  await rejectTextDb(textId, adminId, notes)
}

export const regenerateQuiz = async (
  textId: string,
  adminId: string
): Promise<void> => {
  if (isOffline()) {
    pwaLogger.warn(TAG, 'Blocked regenerateQuiz — offline', { textId })
    throw new Error(OFFLINE_WRITE_ERROR)
  }
  await regenerateQuizDb(textId, adminId)
}

export const deleteTosViolation = (
  textId: string,
  adminId: string
): Promise<void> => {
  if (isOffline()) {
    pwaLogger.warn(TAG, 'Blocked deleteTosViolation — offline', { textId })
    throw new Error(OFFLINE_WRITE_ERROR)
  }
  return deleteTosViolationDb(textId, adminId)
}

export const retryTextProcessing = (textId: string): Promise<void> => {
  if (isOffline()) {
    pwaLogger.warn(TAG, 'Blocked retryTextProcessing — offline', { textId })
    throw new Error(OFFLINE_WRITE_ERROR)
  }
  return retryProcessing(textId)
}

export async function getAdminStats(): Promise<AdminStats> {
  if (isOffline()) {
    pwaLogger.warn(TAG, 'Blocked getAdminStats — offline')
    throw new Error(OFFLINE_WRITE_ERROR)
  }
  return getAdminStatsDb()
}

export async function getUserTrend(): Promise<UserTrendData[]> {
  if (isOffline()) {
    pwaLogger.warn(TAG, 'Blocked getUserTrend — offline')
    throw new Error(OFFLINE_WRITE_ERROR)
  }
  return getUserTrendDb()
}
