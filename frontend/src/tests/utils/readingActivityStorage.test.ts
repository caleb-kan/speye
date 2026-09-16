import { beforeEach, describe, expect, it } from 'vitest'
import { STORAGE_KEYS } from '../../constants/storage'
import {
  clearReadingActivitySession,
  loadReadingActivitySession,
  setReadingActivityOwner,
  upsertReadingActivitySession,
} from '../../utils/readingActivityStorage'

beforeEach(() => {
  sessionStorage.clear()
  setReadingActivityOwner('account-a')
})

describe('reading activity storage ownership', () => {
  it('ignores legacy sessions whose owner cannot be established', () => {
    sessionStorage.setItem(
      STORAGE_KEYS.READING_ACTIVITY_SESSION,
      JSON.stringify({
        textId: 'public-text',
        started: true,
        startTime: '2026-09-16T10:00:00Z',
      })
    )
    setReadingActivityOwner('account-a')
    expect(loadReadingActivitySession('account-a')).toBeNull()
    expect(
      sessionStorage.getItem(STORAGE_KEYS.READING_ACTIVITY_SESSION)
    ).toBeNull()
  })

  it('does not let old callbacks read, clear, or overwrite the current owner session', () => {
    upsertReadingActivitySession(
      { textId: 'public-text', started: true, progressIndex: 12 },
      'account-a'
    )
    setReadingActivityOwner('account-b')
    const current = upsertReadingActivitySession(
      { textId: 'public-text', progressIndex: 3 },
      'account-b'
    )
    expect(loadReadingActivitySession('account-a')).toBeNull()
    expect(
      upsertReadingActivitySession(
        { started: true, progressIndex: 99 },
        'account-a'
      )
    ).toBeNull()
    clearReadingActivitySession('account-a')
    expect(loadReadingActivitySession('account-b')).toEqual(current)
  })

  it('preserves a matching session when binding the account again', () => {
    const current = upsertReadingActivitySession(
      {
        textId: 'public-text',
        started: true,
        mode: 'adaptive',
        progressIndex: 12,
      },
      'account-a'
    )
    setReadingActivityOwner('account-a')
    expect(loadReadingActivitySession('account-a')).toEqual(current)
  })
})
