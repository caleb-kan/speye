import { describe, it, expect } from 'vitest'
import type { User } from '@supabase/supabase-js'
import { getUsername } from '../../utils/getUsername'

function makeUser(metadata: Record<string, unknown>): User {
  return { user_metadata: metadata } as User
}

describe('getUsername', () => {
  it('returns username when present in metadata', () => {
    expect(getUsername(makeUser({ username: 'alice' }))).toBe('alice')
  })

  it('returns undefined when username is not set', () => {
    expect(getUsername(makeUser({}))).toBeUndefined()
  })

  it('returns undefined for null user', () => {
    expect(getUsername(null)).toBeUndefined()
  })

  it('returns undefined when username is a number', () => {
    expect(getUsername(makeUser({ username: 123 }))).toBeUndefined()
  })

  it('returns empty string when username is empty string', () => {
    expect(getUsername(makeUser({ username: '' }))).toBe('')
  })
})
