import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus,
  BookOpen,
  Trash2,
  Play,
  Lock,
  Globe,
  Pencil,
  Search,
  X,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useAsyncOperation } from '../hooks/useAsyncOperation'
import { UploadTextModal } from '../components/UploadTextModal'
import { EditTextModal } from '../components/EditTextModal'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { uploadText } from '../../../backend/supabase/database/texts/uploadText'
import { getLibraryTexts } from '../../../backend/supabase/database/texts/getLibraryTexts'
import { getTextContent } from '../../../backend/supabase/database/texts/getTextContent'
import { deleteText } from '../../../backend/supabase/database/texts/deleteText'
import { updateText } from '../../../backend/supabase/database/texts/updateText'
import type { TextInput } from '../components/TextFormModal'
import { SUCCESS_MESSAGE_DURATION_MS } from '../constants/ui'
import { generateTitle } from '../services/generateTitle'
import type { Text, TextPreview } from '../types/database'
import noUiSlider, { type API } from 'nouislider'
import { MIN_COMPLEXITY, MAX_COMPLEXITY } from '../constants/complexity'

type LibraryTab = 'private' | 'public'

interface FilterOptions {
  genre: 'all' | 'fiction' | 'non-fiction'
  minComplexity: number | null
  maxComplexity: number | null
}

// Extended HTML element type with noUiSlider API
interface SliderElement extends HTMLDivElement {
  noUiSlider?: API
}

export function Library() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<LibraryTab>('private')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState<FilterOptions>({
    genre: 'all',
    minComplexity: null,
    maxComplexity: null,
  })
  const [showFilters, setShowFilters] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean
    textId: string | null
  }>({ isOpen: false, textId: null })
  const [editModal, setEditModal] = useState<{
    isOpen: boolean
    text: Text | null
  }>({ isOpen: false, text: null })

  const complexitySliderRef = useRef<SliderElement>(null)

  const {
    data: privateTexts,
    loading: privateLoading,
    error: privateError,
    execute: executePrivate,
    setData: setPrivateTexts,
  } = useAsyncOperation<TextPreview[]>()
  const {
    data: publicTexts,
    loading: publicLoading,
    error: publicError,
    execute: executePublic,
  } = useAsyncOperation<TextPreview[]>()

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

  // Initialize complexity slider
  useEffect(() => {
    if (!showFilters) return
    if (
      !complexitySliderRef.current ||
      complexitySliderRef.current.hasChildNodes()
    )
      return

    const minValue = filters.minComplexity ?? MIN_COMPLEXITY
    const maxValue = filters.maxComplexity ?? MAX_COMPLEXITY

    noUiSlider.create(complexitySliderRef.current, {
      start: [minValue, maxValue],
      connect: true,
      behaviour: 'unconstrained-tap',
      range: {
        min: MIN_COMPLEXITY,
        max: MAX_COMPLEXITY,
      },
      tooltips: true,
      step: 1,
      format: {
        to: (value) => {
          const intValue = Math.round(value)
          if (intValue === MAX_COMPLEXITY) {
            return `${MAX_COMPLEXITY}+`
          } else {
            return intValue.toString()
          }
        },
        from: (value) => {
          return Number(value)
        },
      },
    })

    const slider = complexitySliderRef.current.noUiSlider

    slider?.on('set', (values: (string | number)[]) => {
      const val0 = parseInt(String(values[0]))
      const val1 = parseInt(String(values[1]))
      const minVal = Math.min(val0, val1)
      const maxVal = Math.max(val0, val1)
      setFilters((prev) => ({
        ...prev,
        minComplexity: minVal,
        maxComplexity: maxVal,
      }))
    })

    return () => {
      slider?.destroy()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- slider only created on mount, filter values are initial state only
  }, [showFilters])

  // Filter and search texts
  const filterAndSearchTexts = useCallback(
    (texts: TextPreview[] | null): TextPreview[] => {
      if (!texts) return []

      return texts.filter((text) => {
        // Search filter
        const searchLower = searchQuery.toLowerCase()
        const matchesSearch =
          !searchQuery ||
          (text.title?.toLowerCase().includes(searchLower) ?? false) ||
          text.preview.toLowerCase().includes(searchLower)

        if (!matchesSearch) return false

        // Genre filter
        if (filters.genre !== 'all') {
          const isFiction = filters.genre === 'fiction'
          if (text.fiction !== isFiction) return false
        }

        // Complexity filter
        if (text.complexity !== null) {
          if (
            filters.minComplexity !== null &&
            text.complexity < filters.minComplexity
          ) {
            return false
          }
          if (
            filters.maxComplexity !== null &&
            text.complexity > filters.maxComplexity
          ) {
            return false
          }
        }

        return true
      })
    },
    [searchQuery, filters]
  )

  const handleClearFilters = () => {
    setSearchQuery('')
    setFilters({
      genre: 'all',
      minComplexity: null,
      maxComplexity: null,
    })

    // Reset slider
    const slider = complexitySliderRef.current?.noUiSlider
    if (slider) {
      slider.set([MIN_COMPLEXITY, MAX_COMPLEXITY])
    }
  }

  const handleResetSearch = () => {
    setSearchQuery('')
  }

  useEffect(() => {
    if (activeTab === 'private' && user) {
      fetchPrivateTexts()
    } else if (activeTab === 'public') {
      fetchPublicTexts()
    }
  }, [activeTab, user, fetchPrivateTexts, fetchPublicTexts])

  useEffect(() => {
    if (!successMessage) return

    setDeleteError(null)
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

  const resolveTitle = async (
    data: TextInput
  ): Promise<{ title: string | null; titleGenerationFailed: boolean }> => {
    if (data.title) {
      return { title: data.title, titleGenerationFailed: false }
    }

    try {
      const generatedTitle = await generateTitle(data.content)
      return { title: generatedTitle, titleGenerationFailed: false }
    } catch (error) {
      console.error('Failed to generate title:', error)
      return { title: null, titleGenerationFailed: true }
    }
  }

  const handleUpload = async (data: TextInput) => {
    if (!user) {
      throw new Error('You must be logged in to upload texts')
    }

    const { title, titleGenerationFailed } = await resolveTitle(data)

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

  const handleEditClick = async (textPreview: TextPreview) => {
    try {
      const content = await getTextContent(textPreview.id)
      const fullText: Text = {
        ...textPreview,
        content,
      }
      setEditModal({ isOpen: true, text: fullText })
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : 'Failed to load text content'
      )
    }
  }

  const handleEditClose = () => {
    setEditModal({ isOpen: false, text: null })
  }

  const handleEditSubmit = async (textId: string, data: TextInput) => {
    const { title, titleGenerationFailed } = await resolveTitle(data)

    const updatedTextRecord = await updateText(textId, { ...data, title })

    const updatedPreview: TextPreview = {
      id: updatedTextRecord.id,
      title: updatedTextRecord.title,
      preview:
        updatedTextRecord.content.slice(0, 200) +
        (updatedTextRecord.content.length > 200 ? '...' : ''),
      uploaded_at: updatedTextRecord.uploaded_at,
      owner_id: updatedTextRecord.owner_id,
      quiz: updatedTextRecord.quiz,
      fiction: updatedTextRecord.fiction,
      category: updatedTextRecord.category,
      complexity: updatedTextRecord.complexity,
      source: updatedTextRecord.source,
    }

    setPrivateTexts(
      privateTexts
        ? privateTexts.map((t) => (t.id === textId ? updatedPreview : t))
        : null
    )

    if (titleGenerationFailed) {
      setSuccessMessage(
        'Text updated successfully, but title generation failed. The text was saved without a title.'
      )
    } else {
      setSuccessMessage('Text updated successfully!')
    }
  }

  const handleReadText = async (textPreview: TextPreview) => {
    try {
      const content = await getTextContent(textPreview.id)
      const fullText: Text = {
        ...textPreview,
        content,
      }
      navigate('/home', { state: { libraryText: fullText } })
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : 'Failed to load text content'
      )
    }
  }

  const currentTexts = activeTab === 'private' ? privateTexts : publicTexts
  const loading = activeTab === 'private' ? privateLoading : publicLoading
  const fetchError = activeTab === 'private' ? privateError : publicError
  const isInitialLoad =
    (activeTab === 'private' && privateTexts === null) ||
    (activeTab === 'public' && publicTexts === null)

  const filteredTexts = filterAndSearchTexts(currentTexts)
  const hasActiveFilters =
    searchQuery ||
    filters.genre !== 'all' ||
    filters.minComplexity !== null ||
    filters.maxComplexity !== null

  return (
    <div className="flex flex-1 flex-col items-center w-full px-8 py-6 overflow-y-auto">
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

        {/* Search and Filter Section */}
        {!isInitialLoad && (
          <div className="mb-6 space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-text-secondary" />
              <input
                type="text"
                placeholder="Search texts by title or content..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 bg-bg border border-text-secondary/20 rounded-lg text-text placeholder-text-secondary/60 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={handleResetSearch}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-secondary hover:text-text"
                  aria-label="Clear search"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Filter Toggle and Active Filters */}
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className="px-3 py-2 text-sm font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors"
              >
                {showFilters ? 'Hide Filters' : 'Show Filters'}
              </button>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="px-3 py-2 text-sm text-text-secondary hover:text-primary transition-colors"
                >
                  Clear all filters
                </button>
              )}
            </div>

            {/* Filter Panel */}
            {showFilters && (
              <div className="p-4 bg-bg-secondary rounded-lg border border-text-secondary/20">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Genre Filter */}
                  <div>
                    <label className="block text-sm font-medium text-text mb-2">
                      Genre
                    </label>
                    <div className="flex flex-col gap-2">
                      {(['all', 'fiction', 'non-fiction'] as const).map(
                        (genre) => (
                          <button
                            key={genre}
                            type="button"
                            onClick={() => setFilters({ ...filters, genre })}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                              filters.genre === genre
                                ? 'bg-primary text-bg'
                                : 'bg-bg border border-text-secondary/20 text-text-secondary hover:text-text'
                            }`}
                          >
                            {genre === 'all'
                              ? 'All'
                              : genre === 'fiction'
                                ? 'Fiction'
                                : 'Non-Fiction'}
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  {/* Complexity Filter */}
                  <div>
                    <label className="block text-sm font-medium text-text mb-2">
                      Complexity Range
                    </label>
                    <div className="flex items-center pt-6">
                      <div
                        ref={complexitySliderRef}
                        style={{ width: '100%' }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Results count */}
            {hasActiveFilters && (
              <p className="text-sm text-text-secondary">
                Found {filteredTexts.length} text
                {filteredTexts.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        )}

        {/* Main Content */}
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
        ) : filteredTexts.length > 0 ? (
          <div className="space-y-4">
            {filteredTexts.map((text) => (
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
                      {text.preview}...
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
                      <>
                        <button
                          type="button"
                          onClick={() => handleEditClick(text)}
                          className="p-2 text-text-secondary hover:text-primary hover:bg-primary/10 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
                          aria-label="Edit text"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteClick(text.id)}
                          className="p-2 text-text-secondary hover:text-error hover:bg-error/10 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-error"
                          aria-label="Delete text"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            {hasActiveFilters ? (
              <>
                <p className="text-text-secondary mb-2">
                  No texts match your search criteria.
                </p>
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="text-primary hover:underline"
                >
                  Clear filters
                </button>
              </>
            ) : activeTab === 'private' ? (
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

      <EditTextModal
        isOpen={editModal.isOpen}
        text={editModal.text}
        onClose={handleEditClose}
        onSubmit={handleEditSubmit}
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
