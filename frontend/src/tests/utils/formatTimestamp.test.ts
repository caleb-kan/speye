import { describe, it, expect } from 'vitest'
import { formatTimestamp } from '../../utils/formatTimestamp'

describe('formatTimestamp', () => {
  it('should format ISO timestamp with date on first line and time on second', () => {
    const timestamp = '2026-02-11T10:30:45.000Z'
    const result = formatTimestamp(timestamp)

    const lines = result.split('\n')
    expect(lines).toHaveLength(2)

    // First line should be date
    expect(lines[0]).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/) // MM/DD/YYYY format

    // Second line should be time
    expect(lines[1]).toMatch(/\d{1,2}:\d{2}:\d{2}/) // HH:MM:SS format
  })

  it('should handle different timezones consistently', () => {
    const timestamp = '2026-02-11T15:45:30.000Z'
    const result = formatTimestamp(timestamp)

    expect(result).toContain('\n')
    const [date, time] = result.split('\n')
    expect(date).toBeTruthy()
    expect(time).toBeTruthy()
  })

  it('should format recent timestamps', () => {
    const now = new Date()
    const timestamp = now.toISOString()
    const result = formatTimestamp(timestamp)

    expect(result).toContain('\n')
    const lines = result.split('\n')
    expect(lines[0]).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/)
    expect(lines[1]).toMatch(/\d{1,2}:\d{2}:\d{2}/)
  })
})
