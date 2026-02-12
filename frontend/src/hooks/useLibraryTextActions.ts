import type { NavigateFunction } from 'react-router-dom'
import type { Dispatch, SetStateAction } from 'react'
import { useCallback, useState } from 'react'
import type { TextInput } from '../components/TextFormModal'
import type { Text, TextPreview } from '../types/database'
import { getErrorMessage } from '../utils/getErrorMessage'
import { createPreviewFromText } from '../utils/libraryTextPreview'
import {
  deleteLibraryText,
  fetchTextContent,
  retryLibraryTextProcessing,
  updateLibraryText,
  uploadLibraryText,
} from '../services/libraryService'

export type DeleteConfirmState = {
  isOpen: boolean
  textId: string | null
}

export type EditModalState = {
  isOpen: boolean
  text: Text | null
}

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
    textId: null,
  })
  const [editModal, setEditModal] = useState<EditModalState>({
    isOpen: false,
    text: null,
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

      setSuccess('Text uploaded! Processing in background...')
    },
    [setSuccess, userId]
  )

  const handleDeleteClick = useCallback((textId: string): void => {
    setDeleteConfirm({ isOpen: true, textId })
  }, [])

  const handleDeleteConfirm = useCallback(async (): Promise<void> => {
    if (!userId || !deleteConfirm.textId) return

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
      setDeleteConfirm({ isOpen: false, textId: null })
    }
  }, [
    deleteConfirm.textId,
    setDeleteError,
    setPrivateTexts,
    setSuccess,
    userId,
    activeTab,
    refetchPublicTexts,
  ])

  const handleDeleteCancel = useCallback((): void => {
    setDeleteConfirm({ isOpen: false, textId: null })
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
        const fullText: Text = {
          ...textPreview,
          content,
          summary,
        }
        setEditModal({ isOpen: true, text: fullText })
      } catch (err) {
        setDeleteError(getErrorMessage(err, 'Failed to load text content'))
      }
    },
    [setDeleteError]
  )

  const handleEditClose = useCallback((): void => {
    setEditModal({ isOpen: false, text: null })
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
        const fullText: Text = {
          ...textPreview,
          content,
          summary,
        }
        navigate('/home', { state: { libraryText: fullText } })
      } catch (err) {
        setDeleteError(getErrorMessage(err, 'Failed to load text content'))
      }
    },
    [navigate, setDeleteError]
  )

  const handleReadSummary = useCallback(
    async (textPreview: TextPreview): Promise<void> => {
      try {
        const { summary } = await fetchTextContent(textPreview.id)
        if (!summary) {
          setDeleteError('No summary available for this text')
          return
        }
        const fullText: Text = {
          ...textPreview,
          content: summary,
          summary,
        }
        navigate('/home', {
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
  }
}
