import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useNotificationCreator } from '../../hooks/useNotificationCreator'

const mockCreateNotification = vi.fn()
const mockUsers = [{ id: 'user-1' }, { id: 'user-2' }, { id: 'user-3' }]

let mockUseUsersReturn = {
  users: mockUsers,
  loadingUsers: false,
  usersFetchError: null as string | null,
}

vi.mock('../../hooks/useUsers', () => ({
  useUsers: () => mockUseUsersReturn,
}))

vi.mock('../../services/notificationService', () => ({
  createNotification: (...args: unknown[]) => mockCreateNotification(...args),
}))

describe('useNotificationCreator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCreateNotification.mockResolvedValue(undefined)
    mockUseUsersReturn = {
      users: mockUsers,
      loadingUsers: false,
      usersFetchError: null,
    }
  })

  it('should fetch users on mount', async () => {
    const { result } = renderHook(() => useNotificationCreator())

    expect(result.current.loadingUsers).toBe(false)
    expect(result.current.users).toEqual(mockUsers)
  })

  it('should set error when user fetch fails', async () => {
    mockUseUsersReturn = {
      users: [],
      loadingUsers: false,
      usersFetchError: 'Failed to load users',
    }

    const { result } = renderHook(() => useNotificationCreator())

    expect(result.current.error).toBe('Failed to load users')
  })

  it('should have correct default state', async () => {
    const { result } = renderHook(() => useNotificationCreator())

    expect(result.current.recipient).toBe('')
    expect(result.current.isBroadcast).toBe(false)
    expect(result.current.notificationType).toBe('info')
    expect(result.current.message).toBe('')
    expect(result.current.link).toBe('')
    expect(result.current.sending).toBe(false)
    expect(result.current.successMessage).toBeNull()
  })

  it('should send notification to a single recipient', async () => {
    const { result } = renderHook(() => useNotificationCreator())

    act(() => {
      result.current.setRecipient('user-1')
      result.current.setMessage('Hello!')
      result.current.setNotificationType('alert')
      result.current.setLink('/library')
    })

    await act(async () => {
      await result.current.handleSend()
    })

    expect(mockCreateNotification).toHaveBeenCalledTimes(1)
    expect(mockCreateNotification).toHaveBeenCalledWith(
      'user-1',
      'Hello!',
      'alert',
      '/library'
    )
    expect(result.current.successMessage).toBe('Notification sent successfully')
  })

  it('should broadcast notification to all users', async () => {
    const { result } = renderHook(() => useNotificationCreator())

    act(() => {
      result.current.setIsBroadcast(true)
      result.current.setMessage('Broadcast message')
    })

    await act(async () => {
      await result.current.handleSend()
    })

    expect(mockCreateNotification).toHaveBeenCalledTimes(3)
    expect(mockCreateNotification).toHaveBeenCalledWith(
      'user-1',
      'Broadcast message',
      'info',
      undefined
    )
    expect(mockCreateNotification).toHaveBeenCalledWith(
      'user-2',
      'Broadcast message',
      'info',
      undefined
    )
    expect(mockCreateNotification).toHaveBeenCalledWith(
      'user-3',
      'Broadcast message',
      'info',
      undefined
    )
    expect(result.current.successMessage).toBe(
      'Notification broadcast to 3 users'
    )
  })

  it('should set error when message is empty', async () => {
    const { result } = renderHook(() => useNotificationCreator())

    act(() => {
      result.current.setRecipient('user-1')
    })

    await act(async () => {
      await result.current.handleSend()
    })

    expect(mockCreateNotification).not.toHaveBeenCalled()
    expect(result.current.error).toBe('Message is required')
  })

  it('should set error when no recipient selected', async () => {
    const { result } = renderHook(() => useNotificationCreator())

    act(() => {
      result.current.setMessage('Hello!')
    })

    await act(async () => {
      await result.current.handleSend()
    })

    expect(mockCreateNotification).not.toHaveBeenCalled()
    expect(result.current.error).toBe('Please select a recipient')
  })

  it('should reset form after successful send', async () => {
    const { result } = renderHook(() => useNotificationCreator())

    act(() => {
      result.current.setRecipient('user-1')
      result.current.setMessage('Hello!')
      result.current.setNotificationType('error')
      result.current.setLink('/settings')
    })

    await act(async () => {
      await result.current.handleSend()
    })

    expect(result.current.recipient).toBe('')
    expect(result.current.isBroadcast).toBe(false)
    expect(result.current.notificationType).toBe('info')
    expect(result.current.message).toBe('')
    expect(result.current.link).toBe('')
  })

  it('should set error when send fails', async () => {
    mockCreateNotification.mockRejectedValue(new Error('Send failed'))

    const { result } = renderHook(() => useNotificationCreator())

    act(() => {
      result.current.setRecipient('user-1')
      result.current.setMessage('Hello!')
    })

    await act(async () => {
      await result.current.handleSend()
    })

    expect(result.current.error).toBe('Failed to send notification')
  })

  it('should not include link when link is empty', async () => {
    const { result } = renderHook(() => useNotificationCreator())

    act(() => {
      result.current.setRecipient('user-1')
      result.current.setMessage('Hello!')
    })

    await act(async () => {
      await result.current.handleSend()
    })

    expect(mockCreateNotification).toHaveBeenCalledWith(
      'user-1',
      'Hello!',
      'info',
      undefined
    )
  })
})
