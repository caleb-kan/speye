import { describe, it, expect } from 'vitest'
import { truncateText } from '../../utils/truncateText'

describe('truncateText', () => {
  it('should return text unchanged when shorter than max length', () => {
    expect(truncateText('hello', 10)).toBe('hello')
  })

  it('should return text unchanged when exactly at max length', () => {
    expect(truncateText('hello', 5)).toBe('hello')
  })

  it('should truncate and add ellipsis when exceeding max length', () => {
    expect(truncateText('hello world', 5)).toBe('hello...')
  })

  it('should handle empty string', () => {
    expect(truncateText('', 10)).toBe('')
  })

  it('should handle max length of 0', () => {
    expect(truncateText('hello', 0)).toBe('...')
  })
})
