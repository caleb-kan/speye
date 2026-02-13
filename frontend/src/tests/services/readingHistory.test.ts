import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as supabaseModule from '../../../../lib/supabase'
import { getLastReadingPosition } from '../../services/readingHistory'
import {
  createMockUser,
  createMockSession,
  mockSessionResponse,
} from '../helpers/mocks'
import { getLastReadingPosition as getLastReadingPositionDb } from '../../../../backend/supabase/database/userActivity/getLastReadingPosition'

vi.mock('../../../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
  },
}))

vi.mock(
  '../../../../backend/supabase/database/userActivity/getLastReadingPosition',
  () => ({
    getLastReadingPosition: vi.fn(),
  })
)

const mockSupabase = vi.mocked(supabaseModule.supabase)
const mockGetLastReadingPositionDb = vi.mocked(getLastReadingPositionDb)

describe('getLastReadingPosition', () => {
  const mockUser = createMockUser()
  const mockSession = createMockSession(mockUser)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns null when there is no authenticated user', async () => {
    mockSupabase.auth.getSession.mockResolvedValue(mockSessionResponse(null))

    const result = await getLastReadingPosition('text-123')

    expect(result).toBeNull()
    expect(mockGetLastReadingPositionDb).not.toHaveBeenCalled()
  })

  it('calls the backend function with correct userId and textId', async () => {
    mockSupabase.auth.getSession.mockResolvedValue(
      mockSessionResponse(mockSession)
    )
    mockGetLastReadingPositionDb.mockResolvedValue(5)

    await getLastReadingPosition('text-abc')

    expect(mockGetLastReadingPositionDb).toHaveBeenCalledWith(
      mockUser.id,
      'text-abc'
    )
  })

  it('returns the progress_index from the backend', async () => {
    mockSupabase.auth.getSession.mockResolvedValue(
      mockSessionResponse(mockSession)
    )
    mockGetLastReadingPositionDb.mockResolvedValue(42)

    const result = await getLastReadingPosition('text-xyz')

    expect(result).toBe(42)
  })

  it('returns 0 when progress_index is 0', async () => {
    mockSupabase.auth.getSession.mockResolvedValue(
      mockSessionResponse(mockSession)
    )
    mockGetLastReadingPositionDb.mockResolvedValue(0)

    const result = await getLastReadingPosition('text-xyz')

    expect(result).toBe(0)
  })

  it('returns null when no activity data exists', async () => {
    mockSupabase.auth.getSession.mockResolvedValue(
      mockSessionResponse(mockSession)
    )
    mockGetLastReadingPositionDb.mockResolvedValue(null)

    const result = await getLastReadingPosition('text-never-read')

    expect(result).toBeNull()
  })

  it('returns null and logs error when getSession throws', async () => {
    mockSupabase.auth.getSession.mockRejectedValue(new Error('Network error'))

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const result = await getLastReadingPosition('text-123')

    expect(result).toBeNull()
    expect(consoleSpy).toHaveBeenCalledWith(
      'Failed to restore reading position:',
      expect.any(Error)
    )

    consoleSpy.mockRestore()
  })

  it('returns null and logs error when backend function throws', async () => {
    mockSupabase.auth.getSession.mockResolvedValue(
      mockSessionResponse(mockSession)
    )
    mockGetLastReadingPositionDb.mockRejectedValue(new Error('Database error'))

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const result = await getLastReadingPosition('text-123')

    expect(result).toBeNull()
    expect(consoleSpy).toHaveBeenCalledWith(
      'Failed to restore reading position:',
      expect.any(Error)
    )

    consoleSpy.mockRestore()
  })
})
