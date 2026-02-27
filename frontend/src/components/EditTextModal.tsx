import { useCallback, useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { useIsAdmin } from '../hooks/useIsAdmin'
import { useEscapeKey } from '../hooks/useEscapeKey'
import type { Text, TextInput, Quiz } from '../types/database'
import { TextFormModal } from './TextFormModal'
import { QuizEditor } from './library/QuizEditor'
import { ConfirmDialog } from './ConfirmDialog'

type EditTab = 'text' | 'quiz'

const TAB_BASE =
  'px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px'
const TAB_ACTIVE = `${TAB_BASE} text-primary border-primary`
const TAB_INACTIVE = `${TAB_BASE} text-text-secondary border-transparent hover:text-text hover:border-text-secondary/50`

function tabClass(isActive: boolean): string {
  return isActive ? TAB_ACTIVE : TAB_INACTIVE
}

interface EditTextModalProps {
  isOpen: boolean
  text: Text | null
  onClose: () => void
  onSubmit: (textId: string, data: TextInput) => Promise<void>
  onMakePublicCopy?: (textId: string, data: TextInput) => Promise<void>
  onQuizSubmit?: (textId: string, quiz: Quiz) => Promise<void>
}

export function EditTextModal({
  isOpen,
  text,
  onClose,
  onSubmit,
  onMakePublicCopy,
  onQuizSubmit,
}: EditTextModalProps) {
  const isAdmin = useIsAdmin()
  const isPrivateText = text?.owner_id !== null
  const showQuizTab = text?.quiz != null && !!onQuizSubmit

  const [activeTab, setActiveTab] = useState<EditTab>('text')
  const [textHasUnsavedChanges, setTextHasUnsavedChanges] = useState(false)
  const [quizHasUnsavedChanges, setQuizHasUnsavedChanges] = useState(false)
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false)

  const hasUnsavedChanges = textHasUnsavedChanges || quizHasUnsavedChanges

  // Reset derived state when modal opens - syncing internal state with the isOpen prop
  useEffect(() => {
    if (isOpen) {
      /* eslint-disable react-hooks/set-state-in-effect -- syncing internal state with isOpen prop */
      setActiveTab('text')
      setTextHasUnsavedChanges(false)
      setQuizHasUnsavedChanges(false)
      setShowUnsavedWarning(false)
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [isOpen])

  const initialData = useMemo(
    () =>
      text
        ? {
            title: text.title,
            content: text.content,
            fiction: text.fiction,
          }
        : undefined,
    [text]
  )

  const handleSubmit = async (data: TextInput) => {
    if (!text) return
    await onSubmit(text.id, data)
  }

  const handleMakePublicCopy = async (data: TextInput) => {
    if (!text || !onMakePublicCopy) return
    await onMakePublicCopy(text.id, data)
  }

  const handleQuizSubmit = async (quiz: Quiz) => {
    if (!text || !onQuizSubmit) return
    await onQuizSubmit(text.id, quiz)
    onClose()
  }

  const handleCloseClick = useCallback(() => {
    if (hasUnsavedChanges) {
      setShowUnsavedWarning(true)
    } else {
      onClose()
    }
  }, [hasUnsavedChanges, onClose])

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

  useEscapeKey(handleCloseClick, isOpen && !showUnsavedWarning)

  if (!isOpen || !text) return null

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-modal-title"
    >
      <div className="bg-bg-secondary rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-text-secondary/20">
          <h2 id="edit-modal-title" className="text-xl font-semibold text-text">
            Edit Text & Quiz
          </h2>
          <button
            type="button"
            onClick={handleCloseClick}
            className="text-text-secondary hover:text-text p-1 rounded-lg hover:bg-bg transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="Close modal"
            data-testid="edit-modal-close-button"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {showQuizTab && (
          <div
            className="flex gap-2 px-4 border-b border-text-secondary/20"
            role="tablist"
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                e.preventDefault()
                const next: EditTab = activeTab === 'text' ? 'quiz' : 'text'
                setActiveTab(next)
                document.getElementById(`tab-${next}`)?.focus()
              }
            }}
          >
            <button
              type="button"
              role="tab"
              id="tab-text"
              aria-selected={activeTab === 'text'}
              aria-controls="tabpanel-text"
              tabIndex={activeTab === 'text' ? 0 : -1}
              onClick={() => setActiveTab('text')}
              className={tabClass(activeTab === 'text')}
              data-testid="edit-modal-text-tab"
            >
              Text
            </button>
            <button
              type="button"
              role="tab"
              id="tab-quiz"
              aria-selected={activeTab === 'quiz'}
              aria-controls="tabpanel-quiz"
              tabIndex={activeTab === 'quiz' ? 0 : -1}
              onClick={() => setActiveTab('quiz')}
              className={tabClass(activeTab === 'quiz')}
              data-testid="edit-modal-quiz-tab"
            >
              Quiz
            </button>
          </div>
        )}

        {/* Render both tabs simultaneously to preserve state across tab switches */}
        <div
          id="tabpanel-text"
          role={showQuizTab ? 'tabpanel' : undefined}
          aria-labelledby={showQuizTab ? 'tab-text' : undefined}
          className={activeTab !== 'text' ? 'hidden' : undefined}
        >
          <TextFormModal
            isOpen
            mode="edit"
            initialData={initialData}
            onClose={onClose}
            onSubmit={handleSubmit}
            isAdmin={isAdmin}
            canMakePublicCopy={isAdmin && isPrivateText && !!onMakePublicCopy}
            onMakePublicCopy={
              onMakePublicCopy ? handleMakePublicCopy : undefined
            }
            embedded
            onUnsavedChangesUpdate={setTextHasUnsavedChanges}
          />
        </div>
        {showQuizTab && (
          <div
            id="tabpanel-quiz"
            role="tabpanel"
            aria-labelledby="tab-quiz"
            className={activeTab !== 'quiz' ? 'hidden' : undefined}
          >
            <QuizEditor
              quiz={text.quiz!}
              onSubmit={handleQuizSubmit}
              onUnsavedChangesUpdate={setQuizHasUnsavedChanges}
              textHasUnsavedChanges={textHasUnsavedChanges}
            />
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={showUnsavedWarning}
        title="Discard Changes?"
        message="You have unsaved changes. Are you sure you want to leave without saving?"
        confirmLabel="Discard"
        cancelLabel="Keep Editing"
        onConfirm={handleConfirmDiscard}
        onCancel={handleCancelDiscard}
        isDestructive
      />
    </div>
  )
}
