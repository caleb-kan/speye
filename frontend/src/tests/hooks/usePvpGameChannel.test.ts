import { describe, it, expect } from 'vitest'
import {
  isValidProgressPayload,
  isValidMilestonePayload,
  isValidHeartbeatPayload,
  isValidGamePayload,
} from '../../hooks/usePvpGameChannel'

describe('isValidProgressPayload', () => {
  it('accepts valid payload', () => {
    expect(
      isValidProgressPayload({
        userId: 'u1',
        wordIndex: 10,
        totalWords: 100,
        percent: 10,
      })
    ).toBe(true)
  })

  it('rejects null', () => {
    expect(isValidProgressPayload(null)).toBe(false)
  })

  it('rejects undefined', () => {
    expect(isValidProgressPayload(undefined)).toBe(false)
  })

  it('rejects missing fields', () => {
    expect(isValidProgressPayload({ userId: 'u1' })).toBe(false)
  })

  it('rejects wrong types', () => {
    expect(
      isValidProgressPayload({
        userId: 123,
        wordIndex: 10,
        totalWords: 100,
        percent: 10,
      })
    ).toBe(false)
  })

  it('rejects string percent', () => {
    expect(
      isValidProgressPayload({
        userId: 'u1',
        wordIndex: 10,
        totalWords: 100,
        percent: '10',
      })
    ).toBe(false)
  })

  it('rejects negative wordIndex', () => {
    expect(
      isValidProgressPayload({
        userId: 'u1',
        wordIndex: -1,
        totalWords: 100,
        percent: 0,
      })
    ).toBe(false)
  })

  it('rejects zero totalWords', () => {
    expect(
      isValidProgressPayload({
        userId: 'u1',
        wordIndex: 0,
        totalWords: 0,
        percent: 0,
      })
    ).toBe(false)
  })
})

describe('isValidMilestonePayload', () => {
  it('accepts halfway milestone', () => {
    expect(isValidMilestonePayload({ userId: 'u1', type: 'halfway' })).toBe(
      true
    )
  })

  it('accepts started_quiz milestone', () => {
    expect(
      isValidMilestonePayload({ userId: 'u1', type: 'started_quiz' })
    ).toBe(true)
  })

  it('accepts finished milestone', () => {
    expect(isValidMilestonePayload({ userId: 'u1', type: 'finished' })).toBe(
      true
    )
  })

  it('rejects invalid milestone type', () => {
    expect(isValidMilestonePayload({ userId: 'u1', type: 'invalid' })).toBe(
      false
    )
  })

  it('rejects null', () => {
    expect(isValidMilestonePayload(null)).toBe(false)
  })

  it('rejects missing userId', () => {
    expect(isValidMilestonePayload({ type: 'halfway' })).toBe(false)
  })
})

describe('isValidHeartbeatPayload', () => {
  it('accepts valid payload', () => {
    expect(isValidHeartbeatPayload({ userId: 'u1', ts: Date.now() })).toBe(true)
  })

  it('rejects null', () => {
    expect(isValidHeartbeatPayload(null)).toBe(false)
  })

  it('rejects missing ts', () => {
    expect(isValidHeartbeatPayload({ userId: 'u1' })).toBe(false)
  })

  it('rejects string ts', () => {
    expect(isValidHeartbeatPayload({ userId: 'u1', ts: '12345' })).toBe(false)
  })
})

describe('isValidGamePayload', () => {
  const validGame = {
    id: 'g1',
    status: 'active',
    player1_id: 'p1',
    player2_id: 'p2',
    text_id: 't1',
    quiz_set_index: 0,
    expires_at: '2025-01-01T00:00:00Z',
    created_at: '2025-01-01T00:00:00Z',
    player1_ready: true,
    player2_ready: false,
    player1_progress: 50,
    player2_progress: 0,
  }

  it('accepts valid game payload', () => {
    expect(isValidGamePayload(validGame)).toBe(true)
  })

  it('rejects null', () => {
    expect(isValidGamePayload(null)).toBe(false)
  })

  it('rejects missing status', () => {
    expect(isValidGamePayload({ ...validGame, status: undefined })).toBe(false)
  })

  it('rejects numeric id', () => {
    expect(isValidGamePayload({ ...validGame, id: 123 })).toBe(false)
  })

  it('rejects empty object', () => {
    expect(isValidGamePayload({})).toBe(false)
  })

  it('rejects primitive types', () => {
    expect(isValidGamePayload('string')).toBe(false)
    expect(isValidGamePayload(42)).toBe(false)
    expect(isValidGamePayload(true)).toBe(false)
  })

  it('accepts all valid game statuses', () => {
    for (const status of ['pending', 'active', 'completed', 'abandoned']) {
      expect(isValidGamePayload({ ...validGame, status })).toBe(true)
    }
  })

  it('rejects invalid status', () => {
    expect(isValidGamePayload({ ...validGame, status: 'invalid_status' })).toBe(
      false
    )
  })

  it('rejects non-boolean player1_ready', () => {
    expect(isValidGamePayload({ ...validGame, player1_ready: 'true' })).toBe(
      false
    )
  })

  it('rejects non-number player1_progress', () => {
    expect(isValidGamePayload({ ...validGame, player1_progress: '50' })).toBe(
      false
    )
  })

  it('rejects missing text_id', () => {
    expect(isValidGamePayload({ ...validGame, text_id: undefined })).toBe(false)
  })

  it('rejects non-number quiz_set_index', () => {
    expect(isValidGamePayload({ ...validGame, quiz_set_index: '0' })).toBe(
      false
    )
  })

  it('rejects missing quiz_set_index', () => {
    expect(
      isValidGamePayload({ ...validGame, quiz_set_index: undefined })
    ).toBe(false)
  })
})
