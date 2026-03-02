import { useState, useEffect, useCallback } from 'react'
import { X } from 'lucide-react'
import type { TextInput } from '../types/database'
import {
  MAX_TITLE_CHARACTERS,
  MAX_CONTENT_CHARACTERS,
  CONTENT_CHARACTER_WARNING_THRESHOLD,
  TITLE_CHARACTER_WARNING_THRESHOLD,
} from '../constants/textUpload'
import { formatNumberWithCommas, countWords } from '../utils/textUtils'
import { ConfirmDialog } from './ConfirmDialog'
import { useEscapeKey } from '../hooks/useEscapeKey'

interface TextFormModalProps {
  isOpen: boolean
  mode: 'upload' | 'edit'
  initialData?: TextInput
  onClose: () => void
  onSubmit: (data: TextInput) => Promise<void>
  canMakePublicCopy?: boolean
  onMakePublicCopy?: (data: TextInput) => Promise<void>
  embedded?: boolean
  onUnsavedChangesUpdate?: (hasChanges: boolean) => void
}

const MODE_CONFIG = {
  upload: {
    title: 'Upload Text',
    submitLabel: 'Upload Text',
    submittingLabel: 'Uploading...',
    errorMessage: 'Failed to upload text',
    titleHint: 'Leave blank to auto-generate from content',
  },
  edit: {
    title: 'Edit Text',
    submitLabel: 'Save Changes',
    submittingLabel: 'Saving...',
    errorMessage: 'Failed to save changes',
    titleHint: 'Leave blank to auto-generate from content',
  },
} as const

export function TextFormModal({
  isOpen,
  mode,
  initialData,
  onClose,
  onSubmit,
  canMakePublicCopy = false,
  onMakePublicCopy,
  embedded,
  onUnsavedChangesUpdate,
}: TextFormModalProps) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [fiction, setFiction] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isMakingPublicCopy, setIsMakingPublicCopy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false)
  const config = MODE_CONFIG[mode]

  const hasUnsavedChanges =
    mode === 'upload'
      ? content.trim() !== '' || title.trim() !== ''
      : content.trim() !== initialData?.content ||
        title.trim() !== (initialData?.title || '') ||
        fiction !== initialData?.fiction

  // Initialize/reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setTitle(initialData.title || '')
        setContent(initialData.content)
        setFiction(initialData.fiction ?? true)
      } else {
        setTitle('')
        setContent('')
        setFiction(true)
      }
      setError(null)
      setShowUnsavedWarning(false)
    }
  }, [isOpen, initialData])

  useEffect(() => {
    onUnsavedChangesUpdate?.(hasUnsavedChanges)
  }, [hasUnsavedChanges, onUnsavedChangesUpdate])

  const handleCloseClick = useCallback(() => {
    if (hasUnsavedChanges) {
      setShowUnsavedWarning(true)
    } else {
      onClose()
    }
  }, [hasUnsavedChanges, onClose])

  // ESC handling disabled in embedded mode (parent handles it)
  // and when unsaved warning is shown (ConfirmDialog handles its own ESC)
  useEscapeKey(handleCloseClick, isOpen && !embedded && !showUnsavedWarning)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!content.trim()) {
      setError('Please enter some text')
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit({
        title: title.trim() || null,
        content: content.trim(),
        // For upload mode, let LLM auto-classify fiction; for edit mode, use user selection
        fiction: mode === 'upload' ? null : fiction,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : config.errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleMakePublicCopy = async () => {
    setError(null)

    if (!content.trim()) {
      setError('Please enter some text')
      return
    }

    if (!onMakePublicCopy) return

    setIsMakingPublicCopy(true)
    try {
      await onMakePublicCopy({
        title: title.trim() || null,
        content: content.trim(),
        fiction: fiction,
        isPublic: true,
      })
      onClose()
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to create public copy'
      )
    } finally {
      setIsMakingPublicCopy(false)
    }
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleCloseClick()
    }
  }

  const handleConfirmDiscard = () => {
    setShowUnsavedWarning(false)
    onClose()
  }

  const handleCancelDiscard = () => {
    setShowUnsavedWarning(false)
  }

  const modalId = `${mode}-modal-title`

  const formContent = (
    <form onSubmit={handleSubmit} className="p-4 space-y-4">
      <div>
        <div className="flex">
          {/* div used here to separate span from label so that test can find the label */}
          <label
            htmlFor={`${mode}-text-title`}
            className="block text-sm font-medium text-text mb-1 ml-1"
          >
            Title
          </label>
          <span className="text-sm font-normal text-text-secondary ml-1">
            (optional)
          </span>
        </div>
        <input
          id={`${mode}-text-title`}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter a title..."
          className="w-full text-sm p-3 bg-bg border border-text-secondary/20 rounded-lg text-text placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          maxLength={MAX_TITLE_CHARACTERS}
          disabled={isSubmitting}
        />
        <div className="flex justify-between">
          <div className="mt-1 text-xs text-text-secondary ml-1">
            {config.titleHint}
          </div>
          <div
            className={`mt-1 text-xs mr-1 text-right ${title.length / MAX_TITLE_CHARACTERS > TITLE_CHARACTER_WARNING_THRESHOLD ? 'text-error' : 'text-text-secondary'}`}
          >
            {title.length}/{formatNumberWithCommas(MAX_TITLE_CHARACTERS)}{' '}
            characters
          </div>
        </div>
      </div>

      <div>
        <label
          htmlFor={`${mode}-text-content`}
          className="block text-sm font-medium text-text mb-2 ml-1"
        >
          Text Content
        </label>
        <textarea
          id={`${mode}-text-content`}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Paste or type your text here..."
          className="w-full text-sm h-64 p-3 bg-bg border border-text-secondary/20 rounded-lg text-text placeholder-text-secondary resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          maxLength={MAX_CONTENT_CHARACTERS}
          disabled={isSubmitting}
          required={true}
        />
        <div className="w-full flex justify-between">
          <div className="text-xs text-text-secondary ml-1 text-left">
            {countWords(content)} words
          </div>
          <div
            className={`text-xs mr-1 text-right ${content.length / MAX_CONTENT_CHARACTERS > CONTENT_CHARACTER_WARNING_THRESHOLD ? 'text-error' : 'text-text-secondary'}`}
          >
            {content.length}/{formatNumberWithCommas(MAX_CONTENT_CHARACTERS)}{' '}
            characters
          </div>
        </div>
      </div>

      {mode !== 'upload' && (
        <div>
          <label
            htmlFor={`${mode}-fiction-select`}
            className="block text-sm font-medium text-text mb-2 ml-1"
          >
            Genre
          </label>
          <select
            id={`${mode}-fiction-select`}
            value={fiction ? 'fiction' : 'non-fiction'}
            onChange={(e) => setFiction(e.target.value === 'fiction')}
            className="w-full p-3 bg-bg border border-text-secondary/20 rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            disabled={isSubmitting}
          >
            <option value="fiction">Fiction</option>
            <option value="non-fiction">Non-Fiction</option>
          </select>
        </div>
      )}

      {error && (
        <div className="p-3 bg-error/10 border border-error/20 rounded-lg text-error text-sm">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2">
        {!embedded && (
          <button
            type="button"
            onClick={handleCloseClick}
            className="px-4 py-2 text-text-secondary hover:text-text hover:bg-bg rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-bg-secondary"
            disabled={isSubmitting || isMakingPublicCopy}
          >
            Cancel
          </button>
        )}
        {canMakePublicCopy && (
          <button
            type="button"
            onClick={handleMakePublicCopy}
            className="px-4 py-2 bg-text-secondary/15 text-primary hover:bg-primary/20 hover:text-primary border border-primary/30 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-bg-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isSubmitting || isMakingPublicCopy || !content.trim()}
          >
            {isMakingPublicCopy ? 'Creating Public Copy...' : 'Make Public'}
          </button>
        )}
        <button
          type="submit"
          className="px-4 py-2 bg-primary text-bg rounded-lg hover:opacity-90 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-bg-secondary disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={
            isSubmitting ||
            isMakingPublicCopy ||
            !content.trim() ||
            (mode === 'edit' &&
              content.trim() === initialData?.content &&
              title.trim() === (initialData?.title || '') &&
              fiction === initialData?.fiction)
          }
        >
          {isSubmitting ? config.submittingLabel : config.submitLabel}
        </button>
      </div>
    </form>
  )

  if (embedded) {
    return formContent
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby={modalId}
    >
      <div className="bg-bg-secondary rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-text-secondary/20">
          <h2 id={modalId} className="text-xl font-semibold text-text">
            {config.title}
          </h2>
          <button
            type="button"
            onClick={handleCloseClick}
            className="text-text-secondary hover:text-text p-1 rounded-lg hover:bg-bg transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="Close modal"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {formContent}
      </div>

      <ConfirmDialog
        isOpen={showUnsavedWarning}
        title="Discard Changes?"
        message={`You have unsaved ${mode === 'upload' ? 'text' : 'changes'}. Are you sure you want to leave without saving?`}
        confirmLabel="Discard"
        cancelLabel="Keep Editing"
        onConfirm={handleConfirmDiscard}
        onCancel={handleCancelDiscard}
        isDestructive
      />
    </div>
  )
}
