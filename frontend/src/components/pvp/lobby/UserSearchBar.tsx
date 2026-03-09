import { Search, X } from 'lucide-react'
import { useState, useCallback, useEffect, useRef } from 'react'
import { useSearchPvpUser } from '../../../hooks/useSearchPvpUser'
import type { PvpLeaderboardEntry } from '../../../types/database'

type UserSearchBarProps = {
  onUserFound?: (user: PvpLeaderboardEntry) => void
}

export function UserSearchBar({ onUserFound }: UserSearchBarProps) {
  const [searchInput, setSearchInput] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const { results, loading, error, search, reset } = useSearchPvpUser()

  const dropdownOpen = isFocused && Boolean(searchInput)

  const [rawActiveIndex, setRawActiveIndex] = useState<number>(0)
  const activeIndex =
    !dropdownOpen || loading || results.length === 0
      ? -1
      : Math.min(rawActiveIndex, results.length - 1)
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([])

  useEffect(() => {
    if (activeIndex < 0) return
    itemRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value
      setSearchInput(value)
      setSelectedUserId(null)
      setIsFocused(true)
      search(value)
    },
    [search]
  )

  const handleInputFocus = useCallback(() => {
    setIsFocused(true)
    if (selectedUserId) setSelectedUserId(null)
    if (results.length === 0) {
      search(searchInput)
    }
  }, [selectedUserId, results.length, searchInput, search])

  const handleSelectUser = useCallback(
    (user: PvpLeaderboardEntry) => {
      onUserFound?.(user)
      setSelectedUserId(user.user_id)
      setSearchInput('')
      setIsFocused(false)
      reset()
    },
    [onUserFound, reset]
  )

  const handleClear = useCallback(() => {
    setSearchInput('')
    setSelectedUserId(null)
    reset()
  }, [reset])

  return (
    <div className="w-full relative group">
      <div
        className={`flex items-center bg-bg border rounded-lg px-3 py-2 transition-colors ${
          isFocused ? 'border-primary/50' : 'border-text-secondary/20'
        }`}
      >
        <Search size={14} className="text-text-secondary mr-2" />
        <input
          type="text"
          value={searchInput}
          onFocus={handleInputFocus}
          onBlur={() => setIsFocused(false)}
          onKeyDown={(e) => {
            if (!dropdownOpen || loading) return
            if (results.length === 0) return

            if (e.key === 'ArrowDown') {
              e.preventDefault()
              setRawActiveIndex((idx) => Math.min(idx + 1, results.length - 1))
              return
            }

            if (e.key === 'ArrowUp') {
              e.preventDefault()
              setRawActiveIndex((idx) => Math.max(idx - 1, 0))
              return
            }

            if (e.key === 'Enter') {
              if (results.length === 0) return
              e.preventDefault()

              const idx = activeIndex < 0 ? 0 : activeIndex
              setIsFocused(false)
              handleSelectUser(results[idx])
              return
            }

            if (e.key === 'Escape') {
              e.preventDefault()
              setIsFocused(false)
            }
          }}
          onChange={handleInputChange}
          placeholder="Search players by username..."
          className="bg-transparent w-full text-xs text-text focus:outline-none placeholder:text-text-secondary/50"
        />
        {selectedUserId && (
          <button
            onClick={handleClear}
            className="text-text-secondary hover:text-text"
            aria-label="Clear selection"
          >
            <X size={12} />
          </button>
        )}
      </div>

      {dropdownOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-bg-secondary border border-text-secondary/20 rounded-lg shadow-2xl z-20 max-h-40 overflow-y-auto">
          {loading ? (
            <div className="p-3 text-xs text-text-secondary text-center animate-pulse">
              Searching players...
            </div>
          ) : results.length > 0 ? (
            results.map((user, idx) => {
              const isActive = idx === activeIndex
              return (
                <button
                  key={user.user_id}
                  ref={(el) => {
                    itemRefs.current[idx] = el
                  }}
                  onMouseEnter={() => setRawActiveIndex(idx)}
                  onMouseDown={() => {
                    setIsFocused(false)
                    handleSelectUser(user)
                  }}
                  className={`w-full text-left px-3 py-2 text-xs transition-colors border-b border-text-secondary/10 last:border-0 ${
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'hover:bg-primary/10 hover:text-primary'
                  }`}
                >
                  <div className="font-medium">{user.username}</div>
                  <div className="text-[10px] text-text-secondary">
                    Elo: {user.elo_rating} • {user.wins}W {user.losses}L
                  </div>
                </button>
              )
            })
          ) : (
            <div className="p-3 text-xs text-text-secondary text-center">
              {error || 'No players found.'}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
