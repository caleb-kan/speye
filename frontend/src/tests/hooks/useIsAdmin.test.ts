import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useAuth } from '../../hooks/useAuth'
import { useIsAdmin } from '../../hooks/useIsAdmin'
import { createMockAuthContext, createMockUser } from '../helpers/mocks'

vi.mock('../../hooks/useAuth')

describe('useIsAdmin', () => {
  it('does not trust an admin role in editable user metadata', () => {
    vi.mocked(useAuth).mockReturnValue(
      createMockAuthContext(
        createMockUser({ user_metadata: { role: 'admin' } })
      )
    )
    expect(renderHook(() => useIsAdmin()).result.current).toBe(false)
  })

  it('recognizes the server-controlled admin role', () => {
    vi.mocked(useAuth).mockReturnValue(
      createMockAuthContext(createMockUser({ app_metadata: { role: 'admin' } }))
    )
    expect(renderHook(() => useIsAdmin()).result.current).toBe(true)
  })

  it('removes admin access when the account changes or signs out', () => {
    vi.mocked(useAuth).mockReturnValue(
      createMockAuthContext(createMockUser({ app_metadata: { role: 'admin' } }))
    )
    const { result, rerender } = renderHook(() => useIsAdmin())
    expect(result.current).toBe(true)

    vi.mocked(useAuth).mockReturnValue(
      createMockAuthContext(createMockUser({ id: 'other-user' }))
    )
    rerender()
    expect(result.current).toBe(false)

    vi.mocked(useAuth).mockReturnValue(createMockAuthContext())
    rerender()
    expect(result.current).toBe(false)
  })
})
