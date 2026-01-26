import { useMemo } from 'react'
import type { Text } from '../types/database'
import { TextFormModal, type TextInput } from './TextFormModal'

interface EditTextModalProps {
  isOpen: boolean
  text: Text | null
  onClose: () => void
  onSubmit: (textId: string, data: TextInput) => Promise<void>
}

export function EditTextModal({
  isOpen,
  text,
  onClose,
  onSubmit,
}: EditTextModalProps) {
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

  return (
    <TextFormModal
      isOpen={isOpen && text !== null}
      mode="edit"
      initialData={initialData}
      onClose={onClose}
      onSubmit={handleSubmit}
    />
  )
}
