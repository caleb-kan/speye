import { useState, useEffect, useCallback } from 'react'
import { X, Plus, Trash2, GripVertical } from 'lucide-react'
import type { TextInput, SectionData } from '../types/database'
import {
  MAX_TITLE_CHARACTERS,
  MAX_CONTENT_CHARACTERS,
  MAX_SECTIONS,
  CONTENT_CHARACTER_WARNING_THRESHOLD,
  SECTION_WARNING_THRESHOLD,
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
  const [showDeleteWarning, setShowDeleteWarning] = useState(false)
  const [sectionToDelete, setSectionToDelete] = useState<number | null>(null)
  const [isSectional, setIsSectional] = useState(false)
  const [sections, setSections] = useState<SectionData[]>([
    { title: '', content: '' },
  ])
  const [draggedSectionIndex, setDraggedSectionIndex] = useState<number | null>(
    null
  )
  const [dragOverSectionIndex, setDragOverSectionIndex] = useState<
    number | null
  >(null)
  const config = MODE_CONFIG[mode]

  // Helper function to get default section content
  const getDefaultSectionContent = useCallback(
    () => [{ title: '', content: '' }],
    []
  )

  // Helper function to safely get section content with consistent null handling
  const getSectionContent = useCallback(
    (data: TextInput | undefined) => {
      return data?.section_content ?? getDefaultSectionContent()
    },
    [getDefaultSectionContent]
  )

  const hasUnsavedChanges =
    mode === 'upload'
      ? content.trim() !== '' ||
        title.trim() !== '' ||
        isSectional ||
        sections.some((s) => s.title.trim() !== '' || s.content.trim() !== '')
      : content.trim() !== initialData?.content ||
        title.trim() !== (initialData?.title || '') ||
        fiction !== initialData?.fiction ||
        isSectional !== (initialData?.sectional ?? false) ||
        JSON.stringify(sections) !==
          JSON.stringify(getSectionContent(initialData))

  // Section management functions
  const addSection = useCallback(() => {
    if (sections.length < MAX_SECTIONS) {
      setSections([...sections, { title: '', content: '' }])
    }
  }, [sections])

  const removeSection = useCallback(
    (index: number) => {
      const section = sections[index]
      // Show confirmation if section has any content (title or content)
      if (section.content.trim() || section.title.trim()) {
        setSectionToDelete(index)
        setShowDeleteWarning(true)
      } else {
        // Section is completely empty, just remove it
        setSections(sections.filter((_, i) => i !== index))
      }
    },
    [sections]
  )

  const handleConfirmDelete = useCallback(() => {
    if (sectionToDelete !== null) {
      setSections(sections.filter((_, i) => i !== sectionToDelete))
      setSectionToDelete(null)
      setShowDeleteWarning(false)
    }
  }, [sections, sectionToDelete])

  const handleCancelDelete = useCallback(() => {
    setSectionToDelete(null)
    setShowDeleteWarning(false)
  }, [])

  const updateSection = useCallback(
    (index: number, field: keyof SectionData, value: string) => {
      const newSections = [...sections]
      newSections[index] = { ...newSections[index], [field]: value }
      setSections(newSections)
    },
    [sections]
  )

  const getTotalCharacterCount = useCallback(() => {
    return sections.reduce(
      (total, section) => total + section.content.length,
      0
    )
  }, [sections])

  // Drag and drop handlers
  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    setDraggedSectionIndex(index)
    e.dataTransfer.effectAllowed = 'move'
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverSectionIndex(index)
  }, [])

  const handleDragLeave = useCallback(() => {
    setDragOverSectionIndex(null)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent, dropIndex: number) => {
      e.preventDefault()
      setDragOverSectionIndex(null)

      if (draggedSectionIndex === null || draggedSectionIndex === dropIndex) {
        return
      }

      const newSections = [...sections]
      const draggedSection = newSections[draggedSectionIndex]

      // Remove the dragged section
      newSections.splice(draggedSectionIndex, 1)

      // Insert it at the new position
      const adjustedDropIndex =
        draggedSectionIndex < dropIndex ? dropIndex - 1 : dropIndex
      newSections.splice(adjustedDropIndex, 0, draggedSection)

      setSections(newSections)
      setDraggedSectionIndex(null)
    },
    [sections, draggedSectionIndex]
  )

  const handleDragEnd = useCallback(() => {
    setDraggedSectionIndex(null)
    setDragOverSectionIndex(null)
  }, [])

  // Initialize/reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setTitle(initialData.title || '')
        setContent(initialData.content)
        setFiction(initialData.fiction ?? true)

        // Check if this was originally a sectional text
        const hasSectionalData =
          'sectional' in initialData && 'section_content' in initialData
        const isOriginallySectional = hasSectionalData
          ? (initialData.sectional ?? false)
          : false

        setIsSectional(isOriginallySectional)
        setSections(
          hasSectionalData && initialData.section_content
            ? initialData.section_content
            : getDefaultSectionContent()
        )
      } else {
        setTitle('')
        setContent('')
        setFiction(true)
        setIsSectional(false)
        setSections(getDefaultSectionContent())
      }
      setError(null)
      setShowUnsavedWarning(false)
    }
  }, [isOpen, initialData, getDefaultSectionContent])

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

    // Validation for sectional texts
    if (isSectional) {
      const hasEmptyTitle = sections.some((section) => !section.title.trim())
      const hasEmptyContent = sections.some(
        (section) => !section.content.trim()
      )
      const hasInvalidSection = sections.some(
        (section) =>
          section.content.trim().length > MAX_CONTENT_CHARACTERS ||
          !section.content.trim()
      )
      const totalCharacters = getTotalCharacterCount()
      const exceedsTotalLimit = totalCharacters > MAX_CONTENT_CHARACTERS

      if (
        hasEmptyTitle ||
        hasEmptyContent ||
        hasInvalidSection ||
        exceedsTotalLimit
      ) {
        if (exceedsTotalLimit) {
          setError(
            `Total content cannot exceed ${formatNumberWithCommas(MAX_CONTENT_CHARACTERS)} characters`
          )
        } else if (hasInvalidSection) {
          setError(
            `Each section must not exceed ${formatNumberWithCommas(MAX_CONTENT_CHARACTERS)} characters`
          )
        } else {
          setError('All sections must have both title and content')
        }
        return
      }
    } else if (!content.trim() && !isSectional) {
      setError('Please enter some text')
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit({
        title: title.trim() || null,
        content: isSectional
          ? sections.map((s) => s.content.trim()).join('\n\n---\n\n')
          : content.trim(),
        // For upload mode, let LLM auto-classify fiction; for edit mode, use user selection
        fiction: mode === 'upload' ? null : fiction,
        ...(isSectional && {
          sectional: true,
          section_content: sections.map((section) => ({
            title: section.title.trim(),
            content: section.content.trim(),
          })),
        }),
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

    if (isSectional) {
      if (sections.some((s) => !s.title.trim() || !s.content.trim())) {
        setError('All sections must have both title and content')
        return
      }
    } else if (!content.trim()) {
      setError('Please enter some text')
      return
    }

    if (!onMakePublicCopy) return

    setIsMakingPublicCopy(true)
    try {
      await onMakePublicCopy({
        title: title.trim() || null,
        content: isSectional
          ? sections.map((s) => s.content.trim()).join('\n\n---\n\n')
          : content.trim(),
        fiction: fiction,
        isPublic: true,
        ...(isSectional && {
          sectional: true,
          section_content: sections.map((section) => ({
            title: section.title.trim(),
            content: section.content.trim(),
          })),
        }),
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
            <div className="text-xs text-text-secondary ml-1">
              {countWords(content)} words
            </div>
            <div
              className={`text-xs mr-1 text-right ${
                content.length / MAX_CONTENT_CHARACTERS >
                CONTENT_CHARACTER_WARNING_THRESHOLD
                  ? 'text-error'
                  : 'text-text-secondary'
              }`}
            >
              {content.length}/{formatNumberWithCommas(MAX_CONTENT_CHARACTERS)}{' '}
              characters
            </div>
          </div>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-2">
            <div>
              <label className="text-sm font-medium text-text ml-1">
                Sections
              </label>
              <p className="text-xs text-text-secondary ml-1">
                Drag sections to reorder them
              </p>
            </div>
            <button
              type="button"
              onClick={addSection}
              disabled={isSubmitting || sections.length >= MAX_SECTIONS}
              className="flex items-center space-x-1 px-3 py-1 text-sm bg-primary text-bg rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
              <span>Add Section</span>
            </button>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {sections.map((section, index) => (
              <div
                key={index}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                role="button"
                tabIndex={0}
                aria-label={`Section ${index + 1}: ${section.title || 'Untitled section'}. Press spacebar to drag and reorder.`}
                aria-pressed={draggedSectionIndex === index}
                className={`border rounded-lg p-3 transition-all duration-200 ease-in-out cursor-move ${
                  draggedSectionIndex === index
                    ? 'opacity-50 scale-95 shadow-lg'
                    : 'shadow-sm hover:shadow-md'
                } ${
                  dragOverSectionIndex === index &&
                  draggedSectionIndex !== index
                    ? 'border-primary bg-primary/10 scale-105'
                    : draggedSectionIndex === null
                      ? 'border-text-secondary/20 hover:border-text-secondary/40'
                      : 'border-text-secondary/20'
                }`}
              >
                <div className="mb-2">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-medium text-text-secondary bg-text-secondary/10 px-2 py-1 rounded">
                        {index + 1}
                      </span>
                      <div
                        className="cursor-grab active:cursor-grabbing p-1 hover:bg-text-secondary/10 rounded transition-colors"
                        draggable={false}
                        aria-label={`Drag section ${index + 1} to reorder`}
                        title="Drag to reorder"
                      >
                        <GripVertical className="w-4 h-4 text-text-secondary" />
                      </div>
                    </div>
                    <input
                      type="text"
                      value={section.title}
                      onChange={(e) =>
                        updateSection(index, 'title', e.target.value)
                      }
                      placeholder={`Section ${index + 1} Title`}
                      className="flex-1 text-sm p-2 bg-bg border border-text-secondary/20 rounded-lg text-text placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      maxLength={MAX_TITLE_CHARACTERS}
                      disabled={isSubmitting}
                    />
                    {sections.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeSection(index)}
                        disabled={isSubmitting}
                        className="p-2 text-error hover:bg-error/10 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
                <textarea
                  value={section.content}
                  onChange={(e) =>
                    updateSection(index, 'content', e.target.value)
                  }
                  placeholder={`Section ${index + 1} Content...`}
                  className="w-full text-sm h-32 p-2 bg-bg border border-text-secondary/20 rounded-lg text-text placeholder-text-secondary resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  maxLength={MAX_CONTENT_CHARACTERS}
                  disabled={isSubmitting}
                  required={true}
                />
                <div className="w-full flex justify-between mt-1">
                  <div className="text-xs text-text-secondary ml-1">
                    {countWords(section.content)} words
                  </div>
                  <div
                    className={`text-xs mr-1 text-right ${
                      section.content.length / MAX_CONTENT_CHARACTERS >
                      CONTENT_CHARACTER_WARNING_THRESHOLD
                        ? 'text-error'
                        : 'text-text-secondary'
                    }`}
                  >
                    {section.content.length}/
                    {formatNumberWithCommas(MAX_CONTENT_CHARACTERS)} characters
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-2 text-xs text-text-secondary ml-1 flex justify-between">
            {isSectional && (
              <>
                <div
                  className={
                    sections.length / MAX_SECTIONS > SECTION_WARNING_THRESHOLD
                      ? 'text-error'
                      : 'text-text-secondary'
                  }
                >
                  {sections.length}/{MAX_SECTIONS} sections max
                </div>
                <div
                  className={
                    getTotalCharacterCount() > MAX_CONTENT_CHARACTERS
                      ? 'text-error'
                      : 'text-text-secondary'
                  }
                >
                  Total: {getTotalCharacterCount()}/
                  {formatNumberWithCommas(MAX_CONTENT_CHARACTERS)} characters
                </div>
              </>
            )}
          </div>
        </div>
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
          disabled={
            isSubmitting ||
            isMakingPublicCopy ||
            (!isSectional && !content.trim()) ||
            (isSectional &&
              sections.some((s) => !s.title.trim() || !s.content.trim())) ||
            (mode === 'edit' &&
              ((!isSectional &&
                content.trim() === initialData?.content &&
                title.trim() === (initialData?.title || '') &&
                fiction === initialData?.fiction) ||
                (isSectional &&
                  isSectional === (initialData?.sectional ?? false) &&
                  JSON.stringify(sections) ===
                    JSON.stringify(getSectionContent(initialData)))))
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
      <ConfirmDialog
        isOpen={showDeleteWarning}
        title="Delete Section?"
        message={`Are you sure you want to delete "${sectionToDelete !== null ? sections[sectionToDelete]?.title || `Section ${sectionToDelete + 1}` : 'this section'}"? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        isDestructive
      />
    </div>
  )
}
