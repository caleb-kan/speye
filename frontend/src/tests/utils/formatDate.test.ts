import { describe, it, expect } from 'vitest'
import { formatDate } from '../../utils/formatDate'

describe('formatDate', () => {
  it('should format a date string', () => {
    const result = formatDate('2026-01-15T10:30:00Z')
    expect(result).toContain('Jan')
    expect(result).toContain('15')
    expect(result).toContain('2026')
  })

  it('should include time in the output', () => {
    const result = formatDate('2026-01-15T10:30:00Z')
    expect(result).toMatch(/\d{1,2}:\d{2}/)
  })
})
