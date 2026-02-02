import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import type { TextInput } from '../../../backend/supabase/database/texts/types'

export type { TextInput }

interface TextFormModalProps {
  isOpen: boolean
  mode: 'upload' | 'edit'
  initialData?: TextInput
  onClose: () => void
  onSubmit: (data: TextInput) => Promise<void>
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
}: TextFormModalProps) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [fiction, setFiction] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const config = MODE_CONFIG[mode]

  // Initialize/reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setTitle(initialData.title || '')
        setContent(initialData.content)
        setFiction(initialData.fiction)
      } else {
        setTitle('')
        setContent('')
        setFiction(true)
      }
      setError(null)
    }
  }, [isOpen, initialData])

  // Handle ESC key to close modal
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

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
        fiction,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : config.errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const modalId = `${mode}-modal-title`

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
            onClick={onClose}
            className="text-text-secondary hover:text-text p-1 rounded-lg hover:bg-bg transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="Close modal"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label
              htmlFor={`${mode}-text-title`}
              className="block text-sm font-medium text-text mb-1"
            >
              Title
              <span className="font-normal text-text-secondary ml-1">
                (optional)
              </span>
            </label>
            <input
              id={`${mode}-text-title`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter a title..."
              className="w-full p-3 bg-bg border border-text-secondary/20 rounded-lg text-text placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              disabled={isSubmitting}
            />
            <p className="mt-1 text-xs text-text-secondary">
              {config.titleHint}
            </p>
          </div>

          <div>
            <label
              htmlFor={`${mode}-text-content`}
              className="block text-sm font-medium text-text mb-2"
            >
              Text Content
            </label>
            <textarea
              id={`${mode}-text-content`}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Paste or type your text here..."
              className="w-full h-64 p-3 bg-bg border border-text-secondary/20 rounded-lg text-text placeholder-text-secondary resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              disabled={isSubmitting}
            />
            <p className="mt-1 text-sm text-text-secondary">
              {content.length} characters
            </p>
          </div>

          {mode !== 'upload' && (
            <div>
              <label
                htmlFor={`${mode}-fiction-select`}
                className="block text-sm font-medium text-text mb-2"
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
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-text-secondary hover:text-text hover:bg-bg rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-bg-secondary"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary text-bg rounded-lg hover:opacity-90 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-bg-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting || !content.trim()}
            >
              {isSubmitting ? config.submittingLabel : config.submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
