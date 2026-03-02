import { useAuth } from '../hooks/useAuth'
import type { LibraryTab } from './library/LibraryTabs'
import type { TextInput } from '../types/database'
import { TextFormModal } from './TextFormModal'

interface UploadTextModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: TextInput) => Promise<void>
  activeTab: LibraryTab
}

export function UploadTextModal({
  isOpen,
  onClose,
  onSubmit,
  activeTab,
}: UploadTextModalProps) {
  const { user } = useAuth()

  const handleSubmit = async (data: TextInput) => {
    if (!user) {
      throw new Error('You must be logged in to upload texts')
    }
    await onSubmit({ ...data, isPublic: activeTab === 'public' })
  }

  return (
    <TextFormModal
      isOpen={isOpen}
      mode="upload"
      onClose={onClose}
      onSubmit={handleSubmit}
    />
  )
}
