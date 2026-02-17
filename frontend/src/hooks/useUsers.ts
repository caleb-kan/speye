import { useState, useEffect, useRef } from 'react'
import { getUsers, type UserRecord } from '../services/userService'

export function useUsers() {
  const [users, setUsers] = useState<UserRecord[]>([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const isMounted = useRef(true)

  useEffect(() => {
    isMounted.current = true
    getUsers()
      .then((data) => {
        if (isMounted.current) setUsers(data)
      })
      .catch(() => {
        if (isMounted.current) setError('Failed to load users')
      })
      .finally(() => {
        if (isMounted.current) setLoadingUsers(false)
      })
    return () => {
      isMounted.current = false
    }
  }, [])

  return { users, loadingUsers, usersFetchError: error }
}
