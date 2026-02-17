import { useRef, useState } from 'react'
import { Search } from 'lucide-react'
import type { UsernameRecord } from '../../../services/userService'
import {
  NOTIFICATION_INPUT_CLASS,
  NOTIFICATION_LABEL_CLASS,
} from '../../../constants/admin'

interface UserSearchProps {
  searchQuery: string
  onSearchChange: (value: string) => void
  filteredUsers: UsernameRecord[]
  loadingUsers: boolean
  selectedUserId: string | null
  onSelectUser: (user: UsernameRecord) => void
  disabled: boolean
}

export function UserSearch({
  searchQuery,
  onSearchChange,
  filteredUsers,
  loadingUsers,
  selectedUserId,
  onSelectUser,
  disabled,
}: UserSearchProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)

  const showDropdown = open && !selectedUserId

  const closeIfFocusLeaves = (nextFocused: Node | null) => {
    if (!nextFocused) {
      setOpen(false)
      return
    }

    if (containerRef.current?.contains(nextFocused)) return
    setOpen(false)
  }

  return (
    <div
      ref={containerRef}
      className="space-y-0"
      onBlurCapture={(e) => closeIfFocusLeaves(e.relatedTarget as Node | null)}
    >
      <label
        htmlFor="admin-promote-search"
        className={NOTIFICATION_LABEL_CLASS}
      >
        Search User
      </label>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary pointer-events-none" />
        <input
          id="admin-promote-search"
          type="text"
          value={searchQuery}
          onFocus={() => !disabled && setOpen(true)}
          onClick={() => !disabled && setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setOpen(false)
          }}
          onChange={(e) => {
            onSearchChange(e.target.value)
            setOpen(true)
          }}
          placeholder="Search by username..."
          className={`${NOTIFICATION_INPUT_CLASS} pl-9`}
          disabled={disabled}
        />
      </div>

      {showDropdown && (
        <div
          className="mt-1 max-h-40 overflow-y-auto border border-text-secondary/20 rounded-lg bg-bg shadow-lg"
          role="listbox"
          aria-label="User search results"
        >
          {loadingUsers ? (
            <p className="p-3 text-sm text-text-secondary animate-pulse">
              Loading users...
            </p>
          ) : filteredUsers.length === 0 ? (
            <p className="p-3 text-sm text-text-secondary">No users found</p>
          ) : (
            filteredUsers.map((user) => (
              <button
                key={user.id}
                type="button"
                onClick={() => {
                  onSelectUser(user)
                  setOpen(false)
                }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-primary/10 transition-colors ${
                  selectedUserId === user.id
                    ? 'bg-primary/15 text-primary font-medium'
                    : 'text-text'
                }`}
              >
                {user.username || `User ${user.id.slice(0, 8)}...`}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
