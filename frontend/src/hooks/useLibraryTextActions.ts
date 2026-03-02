import type { NavigateFunction } from 'react-router-dom'
import type { Dispatch, SetStateAction } from 'react'
import { useCallback, useState } from 'react'
import type { Text, TextInput, TextPreview, Quiz } from '../types/database'
import { getErrorMessage } from '../utils/getErrorMessage'
import {
  createPreviewFromText,
  createTextFromPreview,
} from '../utils/libraryTextPreview'
import { getDefaultReadingRoute } from '../utils/routes'
import {
  deleteLibraryText,
  fetchTextContent,
  retryLibraryTextProcessing,
  updateLibraryText,
  updateLibraryTextQuiz,
  uploadLibraryText,
} from '../services/libraryService'

export type DeleteConfirmState =
  | { isOpen: false }
  | { isOpen: true; textId: string }

export type EditModalState = { isOpen: false } | { isOpen: true; text: Text }

export type UseLibraryTextActionsParams = {
  userId: string | null
  navigate: NavigateFunction
  setPrivateTexts: Dispatch<SetStateAction<TextPreview[] | null>>
  setSuccessMessage: (message: string | null) => void
  setDeleteError: (message: string | null) => void
  activeTab: 'private' | 'public'
  refetchPublicTexts?: () => void
}

export type UseLibraryTextActionsResult = {
  deleteConfirm: DeleteConfirmState
  editModal: EditModalState
  retryingTextIds: Set<string>
  handleUpload: (data: TextInput) => Promise<void>
  handleDeleteClick: (textId: string) => void
  handleDeleteConfirm: () => Promise<void>
  handleDeleteCancel: () => void
  handleRetryProcessing: (textId: string) => Promise<void>
  handleEditClick: (textPreview: TextPreview) => Promise<void>
  handleEditClose: () => void
  handleEditSubmit: (textId: string, data: TextInput) => Promise<void>
  handleMakePublicCopy: (textId: string, data: TextInput) => Promise<void>
  handleReadText: (textPreview: TextPreview) => Promise<void>
  handleReadSummary: (textPreview: TextPreview) => Promise<void>
  handleQuizSubmit: (textId: string, quiz: Quiz) => Promise<void>
}

export const useLibraryTextActions = (
  params: UseLibraryTextActionsParams
): UseLibraryTextActionsResult => {
  const {
    userId,
    navigate,
    setPrivateTexts,
    setSuccessMessage,
    setDeleteError,
    activeTab,
    refetchPublicTexts,
  } = params
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState>({
    isOpen: false,
  })
  const [editModal, setEditModal] = useState<EditModalState>({
    isOpen: false,
  })
  const [retryingTextIds, setRetryingTextIds] = useState<Set<string>>(new Set())

  const setSuccess = useCallback(
    (message: string): void => {
      setDeleteError(null)
      setSuccessMessage(message)
    },
    [setDeleteError, setSuccessMessage]
  )

  const handleUpload = useCallback(
    async (data: TextInput): Promise<void> => {
      if (!userId) {
        throw new Error('You must be logged in to upload texts')
      }

      await uploadLibraryText(userId, {
        ...data,
        processing_status: 'pending',
      })

      if (activeTab === 'public' && refetchPublicTexts) {
        refetchPublicTexts()
      }

      setSuccess('Text uploaded! Processing in background...')
    },
    [setSuccess, userId, activeTab, refetchPublicTexts]
  )

  const handleDeleteClick = useCallback((textId: string): void => {
    setDeleteConfirm({ isOpen: true, textId })
  }, [])

  const handleDeleteConfirm = useCallback(async (): Promise<void> => {
    if (!userId || !deleteConfirm.isOpen) return

    const textIdToDelete = deleteConfirm.textId
    setDeleteError(null)
    try {
      await deleteLibraryText(textIdToDelete)

      if (activeTab === 'private') {
        setPrivateTexts((prev) =>
          prev ? prev.filter((t) => t.id !== textIdToDelete) : null
        )
      } else if (activeTab === 'public' && refetchPublicTexts) {
        refetchPublicTexts()
      }

      setSuccess('Text deleted successfully!')
    } catch (err) {
      setDeleteError(getErrorMessage(err, 'Failed to delete text'))
    } finally {
      setDeleteConfirm({ isOpen: false })
    }
  }, [
    deleteConfirm,
    setDeleteError,
    setPrivateTexts,
    setSuccess,
    userId,
    activeTab,
    refetchPublicTexts,
  ])

  const handleDeleteCancel = useCallback((): void => {
    setDeleteConfirm({ isOpen: false })
  }, [])

  const handleRetryProcessing = useCallback(
    async (textId: string): Promise<void> => {
      if (retryingTextIds.has(textId)) return

      setRetryingTextIds((prev) => new Set(prev).add(textId))

      try {
        await retryLibraryTextProcessing(textId)

        if (activeTab === 'private') {
          setPrivateTexts((prev) =>
            prev
              ? prev.map((t) =>
                  t.id === textId
                    ? {
                        ...t,
                        processing_status: 'pending' as const,
                        quiz_valid: null,
                      }
                    : t
                )
              : null
          )
        } else if (activeTab === 'public' && refetchPublicTexts) {
          refetchPublicTexts()
        }

        setSuccess('Text queued for reprocessing!')
      } catch (err) {
        setDeleteError(getErrorMessage(err, 'Failed to retry processing'))
      } finally {
        setRetryingTextIds((prev) => {
          const next = new Set(prev)
          next.delete(textId)
          return next
        })
      }
    },
    [
      retryingTextIds,
      setDeleteError,
      setPrivateTexts,
      setSuccess,
      activeTab,
      refetchPublicTexts,
    ]
  )

  const handleEditClick = useCallback(
    async (textPreview: TextPreview): Promise<void> => {
      try {
        const { content, summary } = await fetchTextContent(textPreview.id)
        const fullText = createTextFromPreview(textPreview, content, summary)
        setEditModal({ isOpen: true, text: fullText })
      } catch (err) {
        setDeleteError(getErrorMessage(err, 'Failed to load text content'))
      }
    },
    [setDeleteError]
  )

  const handleEditClose = useCallback((): void => {
    setEditModal({ isOpen: false })
  }, [])

  const updatePrivateTextsWithPreview = useCallback(
    (textId: string, preview: TextPreview): void => {
      setPrivateTexts((prev) =>
        prev ? prev.map((t) => (t.id === textId ? preview : t)) : null
      )
    },
    [setPrivateTexts]
  )

  const handleEditSubmit = useCallback(
    async (textId: string, data: TextInput): Promise<void> => {
      try {
        const updatedTextRecord = await updateLibraryText(textId, {
          ...data,
          quiz: null,
          quiz_valid: false,
          summary: null,
        })

        const preview: TextPreview = {
          ...createPreviewFromText(updatedTextRecord),
          processing_status: 'pending',
        }

        if (activeTab === 'private') {
          updatePrivateTextsWithPreview(textId, preview)
        } else if (activeTab === 'public' && refetchPublicTexts) {
          refetchPublicTexts()
        }

        await retryLibraryTextProcessing(textId)

        setSuccess('Text updated! Reprocessing in background...')
      } catch (err) {
        setDeleteError(getErrorMessage(err, 'Failed to update text'))
      }
    },
    [
      setDeleteError,
      setSuccess,
      updatePrivateTextsWithPreview,
      activeTab,
      refetchPublicTexts,
    ]
  )

  const handleMakePublicCopy = useCallback(
    async (_textId: string, data: TextInput): Promise<void> => {
      if (!userId) return

      try {
        await uploadLibraryText(userId, {
          ...data,
          isPublic: true,
          processing_status: 'pending',
        })

        setSuccess('Public copy created! Processing in background...')

        if (refetchPublicTexts) {
          refetchPublicTexts()
        }
      } catch (err) {
        setDeleteError(getErrorMessage(err, 'Failed to create public copy'))
      }
    },
    [userId, setSuccess, setDeleteError, refetchPublicTexts]
  )

  const handleReadText = useCallback(
    async (textPreview: TextPreview): Promise<void> => {
      try {
        const { content, summary } = await fetchTextContent(textPreview.id)
        const fullText = createTextFromPreview(textPreview, content, summary)
        navigate(getDefaultReadingRoute(), { state: { libraryText: fullText } })
      } catch (err) {
        setDeleteError(getErrorMessage(err, 'Failed to load text content'))
      }
    },
    [navigate, setDeleteError]
  )

  // DB errors from updateLibraryTextQuiz intentionally propagate to
  // QuizEditor's catch block for inline display. Local state sync is wrapped
  // separately so a UI update failure does not mask a successful save.
  const handleQuizSubmit = useCallback(
    async (textId: string, quiz: Quiz): Promise<void> => {
      const updatedTextRecord = await updateLibraryTextQuiz(textId, quiz)

      try {
        const preview: TextPreview = {
          ...createPreviewFromText(updatedTextRecord),
          quiz_valid: true,
        }

        if (activeTab === 'private') {
          updatePrivateTextsWithPreview(textId, preview)
        } else if (activeTab === 'public' && refetchPublicTexts) {
          refetchPublicTexts()
        }
      } catch (err) {
        // Local state sync failed but the quiz was saved successfully.
        // The UI will refresh on next navigation.
        console.error('Quiz saved but local state sync failed:', err)
      }

      setSuccess('Quiz updated successfully!')
    },
    [setSuccess, updatePrivateTextsWithPreview, activeTab, refetchPublicTexts]
  )

  const handleReadSummary = useCallback(
    async (textPreview: TextPreview): Promise<void> => {
      try {
        const { summary } = await fetchTextContent(textPreview.id)
        if (!summary) {
          setDeleteError('No summary available for this text')
          return
        }
        const fullText = createTextFromPreview(textPreview, summary, summary)
        navigate(getDefaultReadingRoute(), {
          state: { libraryText: fullText, isSummary: true },
        })
      } catch (err) {
        setDeleteError(getErrorMessage(err, 'Failed to load summary'))
      }
    },
    [navigate, setDeleteError]
  )

  return {
    deleteConfirm,
    editModal,
    retryingTextIds,
    handleUpload,
    handleDeleteClick,
    handleDeleteConfirm,
    handleDeleteCancel,
    handleRetryProcessing,
    handleEditClick,
    handleEditClose,
    handleEditSubmit,
    handleMakePublicCopy,
    handleReadText,
    handleReadSummary,
    handleQuizSubmit,
  }
}
