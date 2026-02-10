import { useAuth } from '../hooks/useAuth'
import { useIsAdmin } from '../hooks/useIsAdmin'
import { TextFormModal, type TextInput } from './TextFormModal'

interface UploadTextModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: TextInput) => Promise<void>
}

export function UploadTextModal({
  isOpen,
  onClose,
  onSubmit,
}: UploadTextModalProps) {
  const { user } = useAuth()
  const isAdmin = useIsAdmin()

  const handleSubmit = async (data: TextInput) => {
    if (!user) {
      throw new Error('You must be logged in to upload texts')
    }
    await onSubmit(data)
  }

  return (
    <TextFormModal
      isOpen={isOpen}
      mode="upload"
      onClose={onClose}
      onSubmit={handleSubmit}
      isAdmin={isAdmin}
    />
  )
}
