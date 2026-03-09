import { useEffect, useMemo, useRef, useState } from 'react'
import { Search, X } from 'lucide-react'
import type { UsernameRecord } from '../../../services/userService'

interface UserSearchInputProps {
  searchQuery: string
  setSearchQuery: (val: string) => void
  isFocused: boolean
  setIsFocused: (val: boolean) => void
  selectedUserId: string | null
  setSelectedUserId: (val: string | null) => void
  loadingUsers: boolean
  filteredUsers: UsernameRecord[]
  disabled: boolean
  onSelect: (id: string) => void
}

export function UserSearchInput({
  searchQuery,
  setSearchQuery,
  isFocused,
  setIsFocused,
  selectedUserId,
  setSelectedUserId,
  loadingUsers,
  filteredUsers,
  disabled,
  onSelect,
}: UserSearchInputProps) {
  const dropdownOpen = useMemo(
    () => Boolean(isFocused && searchQuery),
    [isFocused, searchQuery]
  )

  const [activeIndex, setActiveIndex] = useState<number>(-1)
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([])

  const dropdownReady =
    dropdownOpen && !loadingUsers && filteredUsers.length > 0
  const [prevDropdownReady, setPrevDropdownReady] = useState(dropdownReady)
  if (dropdownReady !== prevDropdownReady) {
    setPrevDropdownReady(dropdownReady)
    setActiveIndex(dropdownReady ? 0 : -1)
  }

  useEffect(() => {
    if (activeIndex < 0) return
    itemRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  return (
    <div className="relative group">
      <div
        className={`flex items-center bg-bg border rounded-lg px-3 py-2 transition-colors ${
          isFocused ? 'border-primary/50' : 'border-text-secondary/20'
        }`}
      >
        <Search size={14} className="text-text-secondary mr-2" />
        <input
          type="text"
          value={searchQuery}
          onFocus={() => {
            setIsFocused(true)

            if (selectedUserId) setSelectedUserId(null)
          }}
          onBlur={() => setIsFocused(false)}
          onKeyDown={(e) => {
            if (!dropdownOpen || loadingUsers) return
            if (filteredUsers.length === 0) return

            if (e.key === 'ArrowDown') {
              e.preventDefault()
              setActiveIndex((idx) => {
                const next = idx < 0 ? 0 : idx + 1
                return Math.min(next, filteredUsers.length - 1)
              })
              return
            }

            if (e.key === 'ArrowUp') {
              e.preventDefault()
              setActiveIndex((idx) => {
                const next = idx < 0 ? 0 : idx - 1
                return Math.max(next, 0)
              })
              return
            }

            if (e.key === 'Enter') {
              if (filteredUsers.length === 0) return
              e.preventDefault()

              const idx = activeIndex < 0 ? 0 : activeIndex
              setIsFocused(false)
              onSelect(filteredUsers[idx].id)
              return
            }

            if (e.key === 'Escape') {
              e.preventDefault()
              setIsFocused(false)
            }
          }}
          onChange={(e) => {
            setIsFocused(true)
            setSearchQuery(e.target.value)
            setSelectedUserId(null)
          }}
          placeholder="Search by username..."
          className="bg-transparent w-full text-xs text-text focus:outline-none placeholder:text-text-secondary/50"
          disabled={disabled}
        />
        {selectedUserId && (
          <button
            onClick={() => {
              setSearchQuery('')
              setSelectedUserId(null)
            }}
            className="text-text-secondary hover:text-text"
            aria-label="Clear selection"
          >
            <X size={12} />
          </button>
        )}
      </div>

      {dropdownOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-bg-secondary border border-text-secondary/20 rounded-lg shadow-2xl z-20 max-h-40 overflow-y-auto">
          {loadingUsers ? (
            <div className="p-3 text-xs text-text-secondary text-center animate-pulse">
              Searching directory...
            </div>
          ) : filteredUsers.length > 0 ? (
            filteredUsers.map((user, idx) => {
              const isActive = idx === activeIndex
              return (
                <button
                  key={user.id}
                  ref={(el) => {
                    itemRefs.current[idx] = el
                  }}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onMouseDown={() => {
                    setIsFocused(false)
                    onSelect(user.id)
                  }}
                  className={`w-full text-left px-3 py-2 text-xs text-text-secondary transition-colors border-b border-text-secondary/10 last:border-0 ${
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'hover:bg-primary/10 hover:text-primary'
                  }`}
                >
                  {user.username || user.id}
                </button>
              )
            })
          ) : (
            <div className="p-3 text-xs text-text-secondary text-center">
              No users found.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
