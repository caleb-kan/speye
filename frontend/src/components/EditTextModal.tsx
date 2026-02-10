import { useMemo } from 'react'
import { useIsAdmin } from '../hooks/useIsAdmin'
import type { Text } from '../types/database'
import { TextFormModal, type TextInput } from './TextFormModal'

interface EditTextModalProps {
  isOpen: boolean
  text: Text | null
  onClose: () => void
  onSubmit: (textId: string, data: TextInput) => Promise<void>
  onMakePublicCopy?: (textId: string, data: TextInput) => Promise<void>
}

export function EditTextModal({
  isOpen,
  text,
  onClose,
  onSubmit,
  onMakePublicCopy,
}: EditTextModalProps) {
  const isAdmin = useIsAdmin()
  const isPrivateText = text?.owner_id !== null

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

  return (
    <TextFormModal
      isOpen={isOpen && text !== null}
      mode="edit"
      initialData={initialData}
      onClose={onClose}
      onSubmit={handleSubmit}
      isAdmin={isAdmin}
      canMakePublicCopy={isAdmin && isPrivateText && !!onMakePublicCopy}
      onMakePublicCopy={onMakePublicCopy ? handleMakePublicCopy : undefined}
    />
  )
}
