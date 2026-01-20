import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { UploadTextModal } from '../components/UploadTextModal'
import {
  type UploadTextInput,
  uploadText,
} from '../../../backend/supabase/database/texts/uploadText'
import { SUCCESS_MESSAGE_DURATION_MS } from '../constants/ui'

export function Library() {
  const { user } = useAuth()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!successMessage) return

    const timer = setTimeout(() => {
      setSuccessMessage(null)
    }, SUCCESS_MESSAGE_DURATION_MS)

    return () => clearTimeout(timer)
  }, [successMessage])

  const handleUpload = async (data: UploadTextInput) => {
    if (!user) {
      throw new Error('You must be logged in to upload texts')
    }
    await uploadText(user.id, data)
    setSuccessMessage('Text uploaded successfully!')
  }

  return (
    <div className="flex flex-1 flex-col items-center w-full px-8 py-8">
      <div className="w-full max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-text">Library</h1>
            <p className="text-text-secondary mt-1">
              Your personal text library
            </p>
          </div>
          {user && (
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Upload Text
            </button>
          )}
        </div>

        {successMessage && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-green-500">
            {successMessage}
          </div>
        )}

        {user ? (
          <div className="text-center py-16">
            <p className="text-text-secondary mb-2">
              Your uploaded texts will appear here.
            </p>
            <p className="text-text-secondary text-sm">
              Click "Upload Text" to add your first text for speed reading
              practice.
            </p>
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-text-secondary mb-2">
              Sign in to access your personal library.
            </p>
            <p className="text-text-secondary text-sm">
              Save and organize your favorite texts for speed reading practice.
            </p>
          </div>
        )}
      </div>

      <UploadTextModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleUpload}
      />
    </div>
  )
}
