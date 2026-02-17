import { describe, it, expect } from 'vitest'
import {
  normaliseUsername,
  getUsernameError,
  USERNAME_MIN_LENGTH,
  USERNAME_MAX_LENGTH,
} from '../../utils/username'

describe('normaliseUsername', () => {
  it('trims whitespace', () => {
    expect(normaliseUsername('  alice  ')).toBe('alice')
  })

  it('returns empty string for whitespace-only input', () => {
    expect(normaliseUsername('   ')).toBe('')
  })

  it('leaves valid input unchanged', () => {
    expect(normaliseUsername('bob_123')).toBe('bob_123')
  })
})

describe('getUsernameError', () => {
  it('returns error for empty string', () => {
    expect(getUsernameError('')).toBe('Username is required')
  })

  it('returns error for whitespace-only input', () => {
    expect(getUsernameError('   ')).toBe('Username is required')
  })

  it('returns error for too-short username', () => {
    const short = 'ab'
    expect(short.length).toBeLessThan(USERNAME_MIN_LENGTH)
    expect(getUsernameError(short)).toContain(`at least ${USERNAME_MIN_LENGTH}`)
  })

  it('returns error for too-long username', () => {
    const long = 'a'.repeat(USERNAME_MAX_LENGTH + 1)
    expect(getUsernameError(long)).toContain(`at most ${USERNAME_MAX_LENGTH}`)
  })

  it('returns error for special characters', () => {
    expect(getUsernameError('user@name')).toBe(
      'Use letters, numbers, and underscores only'
    )
  })

  it('returns error for spaces in username', () => {
    expect(getUsernameError('user name')).toBe(
      'Use letters, numbers, and underscores only'
    )
  })

  it('returns null for valid username at min length', () => {
    const valid = 'a'.repeat(USERNAME_MIN_LENGTH)
    expect(getUsernameError(valid)).toBeNull()
  })

  it('returns null for valid username at max length', () => {
    const valid = 'a'.repeat(USERNAME_MAX_LENGTH)
    expect(getUsernameError(valid)).toBeNull()
  })

  it('returns null for username with letters, numbers, underscores', () => {
    expect(getUsernameError('User_123')).toBeNull()
  })

  it('returns null for all-underscore username', () => {
    expect(getUsernameError('___')).toBeNull()
  })
})
