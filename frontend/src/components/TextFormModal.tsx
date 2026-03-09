import { useEffect, useCallback } from 'react'
import { X } from 'lucide-react'
import type { TextInput } from '../types/database'
import {
  MAX_TITLE_CHARACTERS,
  TITLE_CHARACTER_WARNING_THRESHOLD,
} from '../constants/textUpload'
import { formatNumberWithCommas } from '../utils/textUtils'
import { ConfirmDialog } from './ConfirmDialog'
import { useEscapeKey } from '../hooks/useEscapeKey'
import { useTextFormState } from '../hooks/useTextFormState'
import { SectionEditor } from './textForm/SectionEditor'
import { SimpleContentEditor } from './textForm/SimpleContentEditor'
import {
  validateSectionalContent,
  validateSimpleContent,
} from '../utils/textFormValidation'

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
  const config = MODE_CONFIG[mode]

  const {
    title,
    setTitle,
    content,
    setContent,
    fiction,
    setFiction,
    isSectional,
    setIsSectional,
    sections,
    setSections,
    isSubmitting,
    setIsSubmitting,
    isMakingPublicCopy,
    setIsMakingPublicCopy,
    error,
    setError,
    showUnsavedWarning,
    setShowUnsavedWarning,
    showDeleteWarning,
    sectionToDelete,
    hasUnsavedChanges,
    addSection,
    removeSection,
    updateSection,
    confirmDeleteSection,
    cancelDeleteSection,
  } = useTextFormState({ isOpen, mode, initialData })

  useEffect(() => {
    onUnsavedChangesUpdate?.(hasUnsavedChanges)
  }, [hasUnsavedChanges, onUnsavedChangesUpdate])

  const handleCloseClick = useCallback(() => {
    if (hasUnsavedChanges) {
      setShowUnsavedWarning(true)
    } else {
      onClose()
    }
  }, [hasUnsavedChanges, onClose, setShowUnsavedWarning])

  // ESC handling disabled in embedded mode (parent handles it)
  // and when unsaved warning is shown (ConfirmDialog handles its own ESC)
  useEscapeKey(handleCloseClick, isOpen && !embedded && !showUnsavedWarning)

  if (!isOpen) return null

  const validate = (): boolean => {
    setError(null)
    const validation = isSectional
      ? validateSectionalContent(sections)
      : validateSimpleContent(content)
    if (!validation.isValid) {
      setError(validation.error)
      return false
    }
    return true
  }

  const buildFormData = (overrides?: Partial<TextInput>): TextInput => ({
    title: title.trim() || null,
    content: isSectional
      ? sections.map((s) => s.content.trim()).join('\n\n---\n\n')
      : content.trim(),
    fiction: mode === 'upload' ? null : fiction,
    ...(isSectional && {
      sectional: true,
      section_content: sections.map((section) => ({
        title: section.title.trim(),
        content: section.content.trim(),
      })),
    }),
    ...overrides,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setIsSubmitting(true)
    try {
      await onSubmit(buildFormData())
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : config.errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleMakePublicCopy = async () => {
    if (!validate() || !onMakePublicCopy) return

    setIsMakingPublicCopy(true)
    try {
      await onMakePublicCopy(buildFormData({ fiction, isPublic: true }))
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
    <form onSubmit={handleSubmit} className="p-4 space-y-4" noValidate>
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

      {mode === 'upload' && (
        <div>
          <label className="flex items-center space-x-3 ml-1">
            <input
              type="checkbox"
              checked={isSectional}
              onChange={(e) => setIsSectional(e.target.checked)}
              className="w-4 h-4 text-primary bg-bg border-text-secondary/20 rounded focus:ring-primary focus:ring-2"
              disabled={isSubmitting}
            />
            <span className="text-sm font-medium text-text">
              Sectional Text (book, research paper, etc.)
            </span>
          </label>
          <p className="mt-1 text-xs text-text-secondary ml-1">
            Sectional texts have multiple parts and won't generate summaries
          </p>
        </div>
      )}

      {!isSectional ? (
        <SimpleContentEditor
          content={content}
          onContentChange={setContent}
          mode={mode}
          isSubmitting={isSubmitting}
        />
      ) : (
        <SectionEditor
          sections={sections}
          setSections={setSections}
          isSubmitting={isSubmitting}
          onUpdateSection={updateSection}
          onAddSection={addSection}
          onRemoveSection={removeSection}
        />
      )}

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
            disabled={
              isSubmitting ||
              isMakingPublicCopy ||
              (!isSectional && !content.trim()) ||
              (isSectional &&
                sections.some((s) => !s.title.trim() || !s.content.trim()))
            }
          >
            {isMakingPublicCopy ? 'Creating Public Copy...' : 'Make Public'}
          </button>
        )}
        <button
          type="submit"
          className="px-4 py-2 bg-primary text-bg rounded-lg hover:opacity-90 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-bg-secondary disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={!hasUnsavedChanges || isSubmitting || isMakingPublicCopy}
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
      <ConfirmDialog
        isOpen={showDeleteWarning}
        title="Delete Section?"
        message={`Are you sure you want to delete "${sectionToDelete !== null ? sections[sectionToDelete]?.title || `Section ${sectionToDelete + 1}` : 'this section'}"? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={confirmDeleteSection}
        onCancel={cancelDeleteSection}
        isDestructive
      />
    </div>
  )
}
