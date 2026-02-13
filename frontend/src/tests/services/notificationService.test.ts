import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

import {
  getNotifications,
  markNotificationSeen,
  createNotification,
} from '../../services/notificationService'
import { supabase } from '../../../../lib/supabase'

const mockFrom = vi.mocked(supabase.from)

const mockNotifications = [
  {
    id: '1',
    user_id: 'user-1',
    message: 'Test notification 1',
    type: 'info' as const,
    seen: false,
    created_at: '2026-02-11T10:00:00Z',
    link: null,
  },
  {
    id: '2',
    user_id: 'user-1',
    message: 'Test notification 2',
    type: 'alert' as const,
    seen: false,
    created_at: '2026-02-11T10:05:00Z',
    link: null,
  },
  {
    id: '3',
    user_id: 'user-1',
    message: 'Test notification 3',
    type: 'error' as const,
    seen: true,
    created_at: '2026-02-11T10:10:00Z',
    link: null,
  },
]

describe('notificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getNotifications', () => {
    it('should fetch notifications for a user', async () => {
      const mockSelect = vi.fn()
      const mockEq = vi.fn()
      const mockOrder = vi.fn()

      mockOrder.mockResolvedValue({ data: mockNotifications, error: null })
      mockEq.mockReturnValue({ order: mockOrder })
      mockSelect.mockReturnValue({ eq: mockEq })
      mockFrom.mockReturnValue({ select: mockSelect } as unknown as ReturnType<
        typeof supabase.from
      >)

      const result = await getNotifications('user-1')

      expect(mockFrom).toHaveBeenCalledWith('notifications')
      expect(mockSelect).toHaveBeenCalledWith('*')
      expect(mockEq).toHaveBeenCalledWith('user_id', 'user-1')
      expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false })
      expect(result).toEqual(mockNotifications)
    })

    it('should return empty array if no notifications exist', async () => {
      const mockSelect = vi.fn()
      const mockEq = vi.fn()
      const mockOrder = vi.fn()

      mockOrder.mockResolvedValue({ data: null, error: null })
      mockEq.mockReturnValue({ order: mockOrder })
      mockSelect.mockReturnValue({ eq: mockEq })
      mockFrom.mockReturnValue({ select: mockSelect } as unknown as ReturnType<
        typeof supabase.from
      >)

      const result = await getNotifications('user-1')

      expect(result).toEqual([])
    })

    it('should throw error if query fails', async () => {
      const mockSelect = vi.fn()
      const mockEq = vi.fn()
      const mockOrder = vi.fn()

      mockOrder.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      })
      mockEq.mockReturnValue({ order: mockOrder })
      mockSelect.mockReturnValue({ eq: mockEq })
      mockFrom.mockReturnValue({ select: mockSelect } as unknown as ReturnType<
        typeof supabase.from
      >)

      await expect(getNotifications('user-1')).rejects.toThrow()
    })
  })

  describe('markNotificationSeen', () => {
    it('should mark a notification as seen', async () => {
      const mockUpdate = vi.fn()
      const mockEq = vi.fn()

      mockEq.mockResolvedValue({ error: null })
      mockUpdate.mockReturnValue({ eq: mockEq })
      mockFrom.mockReturnValue({ update: mockUpdate } as unknown as ReturnType<
        typeof supabase.from
      >)

      await markNotificationSeen('notification-1')

      expect(mockFrom).toHaveBeenCalledWith('notifications')
      expect(mockUpdate).toHaveBeenCalledWith({ seen: true })
      expect(mockEq).toHaveBeenCalledWith('id', 'notification-1')
    })

    it('should throw error if update fails', async () => {
      const mockUpdate = vi.fn()
      const mockEq = vi.fn()

      mockEq.mockResolvedValue({
        error: { message: 'Update failed' },
      })
      mockUpdate.mockReturnValue({ eq: mockEq })
      mockFrom.mockReturnValue({ update: mockUpdate } as unknown as ReturnType<
        typeof supabase.from
      >)

      await expect(markNotificationSeen('notification-1')).rejects.toThrow()
    })
  })

  describe('createNotification', () => {
    it('should create a notification with link', async () => {
      const mockInsert = vi.fn()

      mockInsert.mockResolvedValue({ error: null })
      mockFrom.mockReturnValue({
        insert: mockInsert,
      } as unknown as ReturnType<typeof supabase.from>)

      await createNotification('user-1', 'Test message', 'info', '/library')

      expect(mockFrom).toHaveBeenCalledWith('notifications')
      expect(mockInsert).toHaveBeenCalledWith({
        user_id: 'user-1',
        message: 'Test message',
        type: 'info',
        link: '/library',
      })
    })

    it('should create a notification without link', async () => {
      const mockInsert = vi.fn()

      mockInsert.mockResolvedValue({ error: null })
      mockFrom.mockReturnValue({
        insert: mockInsert,
      } as unknown as ReturnType<typeof supabase.from>)

      await createNotification('user-1', 'Test message', 'alert')

      expect(mockInsert).toHaveBeenCalledWith({
        user_id: 'user-1',
        message: 'Test message',
        type: 'alert',
      })
    })

    it('should throw error if insert fails', async () => {
      const mockInsert = vi.fn()

      mockInsert.mockResolvedValue({
        error: { message: 'Insert failed' },
      })
      mockFrom.mockReturnValue({
        insert: mockInsert,
      } as unknown as ReturnType<typeof supabase.from>)

      await expect(
        createNotification('user-1', 'Test message', 'info')
      ).rejects.toThrow()
    })
  })
})
