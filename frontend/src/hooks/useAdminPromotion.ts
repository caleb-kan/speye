import { useCallback, useMemo, useState } from 'react'
import { promoteToAdmin } from '../services/userService'
import { getErrorMessage } from '../utils/getErrorMessage'
import { useUsers } from './useUsers'

export function useAdminPromotion() {
  const { users, loadingUsers, usersFetchError } = useUsers()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [promoting, setPromoting] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return users

    return users
      .map((u) => {
        const username = (u.username ?? '').toLowerCase()
        const id = u.id.toLowerCase()

        let score: number | null = null
        if (username && username.startsWith(q)) score = 0
        else if (id.startsWith(q)) score = 1
        else if (username && username.includes(q)) score = 2
        else if (id.includes(q)) score = 3

        return { u, score, username, id }
      })
      .filter((x) => x.score !== null)
      .sort((a, b) => {
        if (a.score! !== b.score!) return a.score! - b.score!
        return (a.username || a.id).localeCompare(b.username || b.id)
      })
      .map((x) => x.u)
  }, [users, searchQuery])

  const selectedUserLabel = useMemo(() => {
    if (!selectedUserId) return null
    const user = users.find((u) => u.id === selectedUserId)
    return user?.username?.trim() || null
  }, [users, selectedUserId])

  const handlePromote = useCallback(async (): Promise<boolean> => {
    setError(null)
    setSuccessMessage(null)

    if (!selectedUserId) {
      setError('Please select a user to promote')
      return false
    }

    setPromoting(true)
    try {
      await promoteToAdmin(selectedUserId)
      setSuccessMessage(
        selectedUserLabel
          ? `User ${selectedUserLabel} has been promoted to admin`
          : 'User has been promoted to admin'
      )
      setSelectedUserId(null)
      setSearchQuery('')
      return true
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to promote user'))
      return false
    } finally {
      setPromoting(false)
    }
  }, [selectedUserId, selectedUserLabel])

  return {
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
    error: error ?? usersFetchError,
    handlePromote,
  }
}
