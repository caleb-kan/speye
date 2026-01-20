import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { type UploadTextInput } from '../../../backend/supabase/database/texts/uploadText'

interface UploadTextModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (uploadData: UploadTextInput) => Promise<void>
}

export function UploadTextModal({
  isOpen,
  onClose,
  onSubmit,
}: UploadTextModalProps) {
  const { user } = useAuth()
  const [content, setContent] = useState('')
  const [fiction, setFiction] = useState(true)
  const [isPublic, setIsPublic] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

    if (!user) {
      setError('You must be logged in to upload texts')
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit({ content: content.trim(), fiction, isPublic })
      setContent('')
      setFiction(true)
      setIsPublic(false)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload text')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="upload-modal-title"
    >
      <div className="bg-bg-secondary rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-text-secondary/20">
          <h2
            id="upload-modal-title"
            className="text-xl font-semibold text-text"
          >
            Upload Text
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
              htmlFor="text-content"
              className="block text-sm font-medium text-text mb-2"
            >
              Text Content
            </label>
            <textarea
              id="text-content"
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

          <div className="flex gap-4">
            <div className="flex-1">
              <label
                htmlFor="fiction-select"
                className="block text-sm font-medium text-text mb-2"
              >
                Category
              </label>
              <select
                id="fiction-select"
                value={fiction ? 'fiction' : 'non-fiction'}
                onChange={(e) => setFiction(e.target.value === 'fiction')}
                className="w-full p-3 bg-bg border border-text-secondary/20 rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                disabled={isSubmitting}
              >
                <option value="fiction">Fiction</option>
                <option value="non-fiction">Non-Fiction</option>
              </select>
            </div>

            <div className="flex-1">
              <label
                htmlFor="visibility-select"
                className="block text-sm font-medium text-text mb-2"
              >
                Visibility
              </label>
              <select
                id="visibility-select"
                value={isPublic ? 'public' : 'private'}
                onChange={(e) => setIsPublic(e.target.value === 'public')}
                className="w-full p-3 bg-bg border border-text-secondary/20 rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                disabled={isSubmitting}
              >
                <option value="private">Private</option>
                <option value="public">Public</option>
              </select>
              <p className="mt-1 text-xs text-text-secondary">
                {isPublic
                  ? 'Anyone can read this text'
                  : 'Only you can read this text'}
              </p>
            </div>
          </div>

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
              {isSubmitting ? 'Uploading...' : 'Upload Text'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
