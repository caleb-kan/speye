import { useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { useAdminPromotion } from '../../../hooks/useAdminPromotion'
import { useAutoClearMessage } from '../../../hooks/useAutoClearMessage'
import { AlertMessages } from '../../ui/AlertMessages'
import { ConfirmDialog } from '../../ConfirmDialog'
import { SUCCESS_MESSAGE_DURATION_MS } from '../../../constants/ui'
import { UserSearch } from './UserSearch'

export function AdminPromotion() {
  const {
    loadingUsers,
    searchQuery,
    setSearchQuery,
    selectedUserId,
    setSelectedUserId,
    filteredUsers,
    promoting,
    successMessage,
    setSuccessMessage,
    error,
    handlePromote,
  } = useAdminPromotion()

  const [showConfirm, setShowConfirm] = useState(false)

  useAutoClearMessage(
    successMessage,
    setSuccessMessage,
    SUCCESS_MESSAGE_DURATION_MS
  )

  const handleSelectUser = (userId: string) => {
    setSelectedUserId(userId)
    setSearchQuery(userId)
    setShowConfirm(false)
  }

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    setSelectedUserId(null)
    setShowConfirm(false)
  }

  const handleGrantClick = () => {
    if (!selectedUserId) return
    setShowConfirm(true)
  }

  const handleConfirm = async () => {
    const success = await handlePromote()
    if (success) setShowConfirm(false)
  }

  const handleCancel = () => {
    setShowConfirm(false)
  }

  const isDisabled = promoting || loadingUsers

  return (
    <div className="space-y-4">
      <AlertMessages successMessage={successMessage} errorMessage={error} />

      <UserSearch
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        filteredUsers={filteredUsers}
        loadingUsers={loadingUsers}
        selectedUserId={selectedUserId}
        onSelectUser={handleSelectUser}
        disabled={isDisabled}
      />

      {selectedUserId && (
        <button
          type="button"
          onClick={handleGrantClick}
          disabled={promoting}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-primary hover:bg-primary/90 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ShieldCheck className="w-4 h-4" />
          Grant Admin Role
        </button>
      )}

      <ConfirmDialog
        isOpen={showConfirm && !!selectedUserId}
        title="Grant Admin Privileges"
        message={`Are you sure you want to grant admin privileges to ${selectedUserId}?`}
        confirmLabel={promoting ? 'Promoting...' : 'Confirm'}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </div>
  )
}
