import { useState, useEffect, useCallback } from 'react'
import {
  fetchPendingApprovals,
  approveText,
  rejectText,
  regenerateQuiz,
  retryTextProcessing,
  type AdminReviewText,
} from '../services/adminService'
import { useAuth } from './useAuth'
import { useIsAdmin } from './useIsAdmin'
import { getErrorMessage } from '../utils/getErrorMessage'
import { createNotification } from '../services/notificationService'
import { UNTITLED_TEXT_FALLBACK } from '../constants/admin'

export type UseAdminApprovalsResult = {
  approvals: AdminReviewText[]
  loading: boolean
  error: string | null
  successMessage: string | null
  processing: string | null
  selectedText: AdminReviewText | null
  quizPreviewText: AdminReviewText | null
  isAdmin: boolean
  setSelectedText: (text: AdminReviewText | null) => void
  setQuizPreviewText: (text: AdminReviewText | null) => void
  setSuccessMessage: (message: string | null) => void
  handleApprove: (textId: string) => Promise<void>
  handleReject: (textId: string, notes?: string) => Promise<void>
  handleRegenerate: (textId: string) => Promise<void>
}

export const useAdminApprovals = (): UseAdminApprovalsResult => {
  const { user } = useAuth()
  const isAdmin = useIsAdmin()
  const [approvals, setApprovals] = useState<AdminReviewText[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [processing, setProcessing] = useState<string | null>(null)
  const [selectedText, setSelectedText] = useState<AdminReviewText | null>(null)
  const [quizPreviewText, setQuizPreviewText] =
    useState<AdminReviewText | null>(null)

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false)
      return
    }

    const load = async () => {
      setLoading(true)
      try {
        const data = await fetchPendingApprovals()
        setApprovals(data)
      } catch (err) {
        setError(getErrorMessage(err, 'Failed to fetch pending approvals'))
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [isAdmin])

  const handleApprove = useCallback(
    async (textId: string) => {
      if (!user || processing) return

      setProcessing(textId)
      setError(null)
      setSuccessMessage(null)
      try {
        const approval = approvals.find((t) => t.id === textId)
        await approveText(textId, user.id)

        // Approval succeeded - remove from UI immediately so the admin
        // sees it disappear even if reprocessing fails below
        setApprovals((prev) => prev.filter((t) => t.id !== textId))
        setSelectedText(null)

        // If the text had a failed processing status (TOS violation or
        // other failure), trigger reprocessing after approval
        if (approval?.processing_status === 'failed') {
          try {
            await retryTextProcessing(textId)
            setSuccessMessage('Text approved and queued for reprocessing')
          } catch {
            setSuccessMessage(
              'Text approved, but reprocessing failed. ' +
                'The text owner can retry from their library.'
            )
          }
        } else {
          setSuccessMessage('Text approved successfully')
        }

        // Notify text owner about approval (non-critical, fire-and-forget).
        // Unlike rejection (handled atomically by admin_reject_text RPC),
        // approval notification is sent client-side as a best-effort action.
        if (approval?.owner_id) {
          createNotification(
            approval.owner_id,
            `Your text "${approval.title || UNTITLED_TEXT_FALLBACK}" has been approved`,
            'info',
            '/library'
          ).catch((err) =>
            console.error('Failed to send approval notification:', err)
          )
        }
      } catch (err) {
        setError(getErrorMessage(err, 'Failed to approve text'))
      } finally {
        setProcessing(null)
      }
    },
    [user, approvals, processing]
  )

  const handleReject = useCallback(
    async (textId: string, notes?: string) => {
      if (!user || processing) return

      setProcessing(textId)
      setError(null)
      setSuccessMessage(null)
      try {
        // Note: the admin_reject_text RPC handles owner notification atomically
        await rejectText(textId, user.id, notes)

        setApprovals((prev) => prev.filter((t) => t.id !== textId))
        setSelectedText(null)
        setSuccessMessage('Text rejected, deleted, and owner notified')
      } catch (err) {
        setError(getErrorMessage(err, 'Failed to reject text'))
      } finally {
        setProcessing(null)
      }
    },
    [user, processing]
  )

  const handleRegenerate = useCallback(
    async (textId: string) => {
      if (!user || processing) return

      const approval = approvals.find((t) => t.id === textId)
      const isReprocess = approval?.processing_status === 'failed'

      setProcessing(textId)
      setError(null)
      setSuccessMessage(null)
      try {
        // Use full reprocessing for processing failures,
        // quiz-specific regeneration for quiz issues
        if (isReprocess) {
          await retryTextProcessing(textId)
        } else {
          await regenerateQuiz(textId, user.id)
        }

        setApprovals((prev) => prev.filter((t) => t.id !== textId))
        setSelectedText(null)
        setSuccessMessage('Text reprocessing queued')
      } catch (err) {
        const fallback = isReprocess
          ? 'Failed to reprocess text'
          : 'Failed to regenerate quiz'
        setError(getErrorMessage(err, fallback))
      } finally {
        setProcessing(null)
      }
    },
    [user, approvals, processing]
  )

  return {
    approvals,
    loading,
    error,
    successMessage,
    processing,
    selectedText,
    quizPreviewText,
    isAdmin,
    setSelectedText,
    setQuizPreviewText,
    setSuccessMessage,
    handleApprove,
    handleReject,
    handleRegenerate,
  }
}
