import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, BookOpen, Trash2, Play, Lock, Globe } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useAsyncOperation } from '../hooks/useAsyncOperation'
import { UploadTextModal } from '../components/UploadTextModal'
import { ConfirmDialog } from '../components/ConfirmDialog'
import {
  type UploadTextInput,
  uploadText,
} from '../../../backend/supabase/database/texts/uploadText'
import { getLibraryTexts } from '../../../backend/supabase/database/texts/getLibraryTexts'
import { deleteText } from '../../../backend/supabase/database/texts/deleteText'
import { SUCCESS_MESSAGE_DURATION_MS } from '../constants/ui'
import { generateTitle } from '../services/generateTitle'
import type { Text } from '../types/database'

type LibraryTab = 'private' | 'public'

export function Library() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<LibraryTab>('private')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean
    textId: string | null
  }>({ isOpen: false, textId: null })

  // Use async operation hooks for each data source
  const {
    data: privateTexts,
    loading: privateLoading,
    error: privateError,
    execute: executePrivate,
    setData: setPrivateTexts,
  } = useAsyncOperation<Text[]>()
  const {
    data: publicTexts,
    loading: publicLoading,
    error: publicError,
    execute: executePublic,
  } = useAsyncOperation<Text[]>()

  const fetchPrivateTexts = useCallback(
    async (force = false) => {
      if (!user) return
      if (privateTexts !== null && !force) return

      await executePrivate(async () => {
        const result = await getLibraryTexts({ type: 'user', userId: user.id })
        return result || []
      })
    },
    [user, privateTexts, executePrivate]
  )

  const fetchPublicTexts = useCallback(
    async (force = false) => {
      if (publicTexts !== null && !force) return

      await executePublic(async () => {
        const result = await getLibraryTexts({ type: 'public' })
        return result || []
      })
    },
    [publicTexts, executePublic]
  )

  useEffect(() => {
    if (activeTab === 'private' && user) {
      fetchPrivateTexts()
    } else if (activeTab === 'public') {
      fetchPublicTexts()
    }
  }, [activeTab, user, fetchPrivateTexts, fetchPublicTexts])

  useEffect(() => {
    if (!successMessage) return

    setDeleteError(null) // Clear any delete error when showing success
    const timer = setTimeout(() => {
      setSuccessMessage(null)
    }, SUCCESS_MESSAGE_DURATION_MS)

    return () => clearTimeout(timer)
  }, [successMessage])

  useEffect(() => {
    if (!deleteError) return

    const timer = setTimeout(() => {
      setDeleteError(null)
    }, SUCCESS_MESSAGE_DURATION_MS)

    return () => clearTimeout(timer)
  }, [deleteError])

  const handleUpload = async (data: UploadTextInput) => {
    if (!user) {
      throw new Error('You must be logged in to upload texts')
    }

    let title = data.title
    let titleGenerationFailed = false

    if (!title) {
      try {
        title = await generateTitle(data.content)
      } catch (error) {
        console.error('Failed to generate title:', error)
        title = null
        titleGenerationFailed = true
      }
    }

    await uploadText(user.id, { ...data, title })

    if (titleGenerationFailed) {
      setSuccessMessage(
        'Text uploaded successfully, but title generation failed. The text was saved without a title.'
      )
    } else {
      setSuccessMessage('Text uploaded successfully!')
    }

    fetchPrivateTexts(true)
  }

  const handleDeleteClick = (textId: string) => {
    setDeleteConfirm({ isOpen: true, textId })
  }

  const handleDeleteConfirm = async () => {
    if (!user || !deleteConfirm.textId) return

    setDeleteError(null)
    try {
      await deleteText(deleteConfirm.textId)
      setPrivateTexts(
        privateTexts
          ? privateTexts.filter((t) => t.id !== deleteConfirm.textId)
          : null
      )
      setSuccessMessage('Text deleted successfully!')
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : 'Failed to delete text'
      )
    } finally {
      setDeleteConfirm({ isOpen: false, textId: null })
    }
  }

  const handleDeleteCancel = () => {
    setDeleteConfirm({ isOpen: false, textId: null })
  }

  const handleReadText = (text: Text) => {
    navigate('/home', { state: { libraryText: text } })
  }

  const getTextPreview = (content: string, maxLength: number = 150) => {
    if (content.length <= maxLength) return content
    return content.substring(0, maxLength).trim() + '...'
  }

  // Determine current state based on active tab
  const currentTexts = activeTab === 'private' ? privateTexts : publicTexts
  const loading = activeTab === 'private' ? privateLoading : publicLoading
  const fetchError = activeTab === 'private' ? privateError : publicError
  const isInitialLoad =
    (activeTab === 'private' && privateTexts === null) ||
    (activeTab === 'public' && publicTexts === null)

  return (
    <div className="flex flex-1 flex-col items-center w-full px-8 py-6">
      <div className="w-full max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-text">Library</h1>
            <p className="text-text-secondary mt-1">
              {activeTab === 'private'
                ? 'Your personal text library'
                : 'Browse public texts'}
            </p>
          </div>
          {user && activeTab === 'private' && (
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-bg rounded-lg hover:opacity-90 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-bg"
            >
              <Plus className="w-5 h-5" />
              Upload Text
            </button>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 border-b border-text-secondary/20">
          <button
            type="button"
            onClick={() => setActiveTab('private')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === 'private'
                ? 'text-primary border-primary'
                : 'text-text-secondary border-transparent hover:text-text hover:border-text-secondary/50'
            }`}
          >
            <Lock className="w-4 h-4" />
            Private
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('public')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === 'public'
                ? 'text-primary border-primary'
                : 'text-text-secondary border-transparent hover:text-text hover:border-text-secondary/50'
            }`}
          >
            <Globe className="w-4 h-4" />
            Public
          </button>
        </div>

        {successMessage && (
          <div className="mb-4 p-3 bg-success/10 border border-success/20 rounded-lg text-success text-sm">
            {successMessage}
          </div>
        )}

        {(fetchError || deleteError) && (
          <div className="mb-4 p-3 bg-error/10 border border-error/20 rounded-lg text-error text-sm">
            {fetchError || deleteError}
          </div>
        )}

        {activeTab === 'private' && !user ? (
          <div className="text-center py-8">
            <p className="text-text-secondary mb-2">
              Sign in to access your personal library.
            </p>
            <p className="text-text-secondary text-sm">
              Save and organize your favorite texts for speed reading practice.
            </p>
          </div>
        ) : loading && isInitialLoad ? (
          <div className="text-center py-8">
            <p className="text-text-secondary">Loading texts...</p>
          </div>
        ) : currentTexts && currentTexts.length > 0 ? (
          <div className="space-y-4">
            {currentTexts.map((text) => (
              <div
                key={text.id}
                className="p-4 bg-bg-secondary rounded-lg border border-text-secondary/20"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <BookOpen className="w-4 h-4 text-primary" />
                      <h3 className="font-medium text-text truncate">
                        {text.title || 'Untitled'}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded">
                        {text.fiction ? 'Fiction' : 'Non-Fiction'}
                      </span>
                      {text.complexity !== null && (
                        <span className="text-xs text-text-secondary">
                          Complexity: {text.complexity}
                        </span>
                      )}
                    </div>
                    <p className="text-text-secondary text-sm leading-relaxed">
                      {getTextPreview(text.content)}
                    </p>
                    <p className="text-xs text-text-secondary mt-2">
                      Uploaded {new Date(text.uploaded_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleReadText(text)}
                      className="p-2 text-text-secondary hover:text-primary hover:bg-primary/10 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
                      aria-label="Read text"
                    >
                      <Play className="w-4 h-4" />
                    </button>
                    {activeTab === 'private' && (
                      <button
                        type="button"
                        onClick={() => handleDeleteClick(text.id)}
                        className="p-2 text-text-secondary hover:text-error hover:bg-error/10 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-error"
                        aria-label="Delete text"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            {activeTab === 'private' ? (
              <>
                <p className="text-text-secondary mb-2">
                  Your uploaded texts will appear here.
                </p>
                <p className="text-text-secondary text-sm">
                  Click "Upload Text" to add your first text for speed reading
                  practice.
                </p>
              </>
            ) : (
              <p className="text-text-secondary">
                No public texts available at the moment.
              </p>
            )}
          </div>
        )}
      </div>

      <UploadTextModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleUpload}
      />

      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title="Delete Text"
        message="Are you sure you want to delete this text? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        isDestructive
      />
    </div>
  )
}
