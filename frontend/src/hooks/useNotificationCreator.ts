import { useState, useEffect, useCallback, useRef } from 'react'
import { getUsers, type UserRecord } from '../services/userService'
import { createNotification } from '../services/notificationService'
import type { NotificationType } from '../types/database'

export function useNotificationCreator() {
  const [users, setUsers] = useState<UserRecord[]>([])
  const [loadingUsers, setLoadingUsers] = useState(true)

  const [recipient, setRecipient] = useState('')
  const [isBroadcast, setIsBroadcast] = useState(false)
  const [notificationType, setNotificationType] =
    useState<NotificationType>('info')
  const [message, setMessage] = useState('')
  const [link, setLink] = useState('')

  const [sending, setSending] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
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

  const resetForm = useCallback(() => {
    setRecipient('')
    setIsBroadcast(false)
    setNotificationType('info')
    setMessage('')
    setLink('')
  }, [])

  const handleSend = useCallback(async () => {
    setError(null)
    setSuccessMessage(null)

    if (!message.trim()) {
      setError('Message is required')
      return
    }

    const targets = isBroadcast ? users.map((u) => u.id) : [recipient]

    if (!isBroadcast && !recipient) {
      setError('Please select a recipient')
      return
    }

    setSending(true)
    try {
      const linkValue = link.trim() || undefined
      await Promise.all(
        targets.map((userId) =>
          createNotification(
            userId,
            message.trim(),
            notificationType,
            linkValue
          )
        )
      )
      const count = targets.length
      setSuccessMessage(
        isBroadcast
          ? `Notification broadcast to ${count} user${count !== 1 ? 's' : ''}`
          : 'Notification sent successfully'
      )
      resetForm()
    } catch {
      setError('Failed to send notification')
    } finally {
      setSending(false)
    }
  }, [
    isBroadcast,
    users,
    recipient,
    message,
    notificationType,
    link,
    resetForm,
  ])

  return {
    users,
    loadingUsers,
    recipient,
    setRecipient,
    isBroadcast,
    setIsBroadcast,
    notificationType,
    setNotificationType,
    message,
    setMessage,
    link,
    setLink,
    sending,
    successMessage,
    setSuccessMessage,
    error,
    setError,
    handleSend,
  }
}
