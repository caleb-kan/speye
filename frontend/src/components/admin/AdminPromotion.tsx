import { useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { useAdminPromotion } from '../../hooks/useAdminPromotion'
import { useAutoClearMessage } from '../../hooks/useAutoClearMessage'
import { SUCCESS_MESSAGE_DURATION_MS } from '../../constants/ui'

import { UserSearchInput } from './adminPromotion/UserSearchInput'
import { SelectionCard } from './adminPromotion/SelectionCard'
import { ConfirmPromotion } from './adminPromotion/ConfirmPromotion'

export function AdminPromotion() {
  const {
    loadingUsers,
    searchQuery,
    setSearchQuery,
    selectedUserId,
    setSelectedUserId,
    filteredUsers,
    selectedUserLabel,
    promoting,
    successMessage,
    setSuccessMessage,
    error,
    handlePromote,
  } = useAdminPromotion()

  const [showConfirm, setShowConfirm] = useState(false)
  const [isFocused, setIsFocused] = useState(false)

  useAutoClearMessage(
    successMessage,
    setSuccessMessage,
    SUCCESS_MESSAGE_DURATION_MS
  )

  const handleSelect = (id: string) => {
    const user = filteredUsers.find((u) => u.id === id)

    setSelectedUserId(id)
    setSearchQuery(user?.username?.trim() || '')
    setShowConfirm(false)
  }

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="space-y-2">
        <p className="text-[10px] text-text-secondary leading-relaxed">
          Search for a user by ID to upgrade their privileges to Administrator
          status.
        </p>

        {/* Status Messages */}
        {successMessage && (
          <div className="p-2 bg-success/10 border border-success/20 rounded-lg text-xs text-success flex items-center gap-2">
            <ShieldCheck size={14} /> {successMessage}
          </div>
        )}
        {error && (
          <div className="p-2 bg-error/10 border border-error/20 rounded-lg text-xs text-error">
            {error}
          </div>
        )}
      </div>

      <UserSearchInput
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        isFocused={isFocused}
        setIsFocused={setIsFocused}
        selectedUserId={selectedUserId}
        setSelectedUserId={setSelectedUserId}
        loadingUsers={loadingUsers}
        filteredUsers={filteredUsers}
        disabled={promoting}
        onSelect={handleSelect}
      />

      {/* Selection Logic */}
      {selectedUserId && !showConfirm && (
        <SelectionCard
          selectedUsername={selectedUserLabel}
          onGrantClick={() => setShowConfirm(true)}
        />
      )}

      {/* Confirmation Logic */}
      {showConfirm && selectedUserId && (
        <ConfirmPromotion
          selectedUsername={selectedUserLabel}
          promoting={promoting}
          onConfirm={handlePromote}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </div>
  )
}
