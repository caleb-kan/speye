import { describe, it, expect } from 'vitest'
import { formatNumberWithCommas, countWords } from '../utils/textUtils'

describe('formatNumberWithCommas', () => {
  it('should format numbers less than 1000 without commas', () => {
    expect(formatNumberWithCommas(0)).toBe('0')
    expect(formatNumberWithCommas(1)).toBe('1')
    expect(formatNumberWithCommas(100)).toBe('100')
    expect(formatNumberWithCommas(999)).toBe('999')
  })

  it('should add commas for thousands', () => {
    expect(formatNumberWithCommas(1000)).toBe('1,000')
    expect(formatNumberWithCommas(9999)).toBe('9,999')
  })

  it('should add commas for millions', () => {
    expect(formatNumberWithCommas(1000000)).toBe('1,000,000')
    expect(formatNumberWithCommas(1234567)).toBe('1,234,567')
  })

  it('should handle large numbers', () => {
    expect(formatNumberWithCommas(1000000000)).toBe('1,000,000,000')
    expect(formatNumberWithCommas(15000)).toBe('15,000')
  })
})

describe('countWords', () => {
  it('should return 0 for empty string', () => {
    expect(countWords('')).toBe(0)
  })

  it('should return 0 for whitespace only', () => {
    expect(countWords('   ')).toBe(0)
    expect(countWords('\t\n')).toBe(0)
  })

  it('should count single word', () => {
    expect(countWords('hello')).toBe(1)
  })

  it('should count multiple words separated by spaces', () => {
    expect(countWords('hello world')).toBe(2)
    expect(countWords('one two three four five')).toBe(5)
  })

  it('should handle multiple spaces between words', () => {
    expect(countWords('hello   world')).toBe(2)
    expect(countWords('one    two     three')).toBe(3)
  })

  it('should handle leading and trailing whitespace', () => {
    expect(countWords('  hello world  ')).toBe(2)
    expect(countWords('\n\thello world\t\n')).toBe(2)
  })

  it('should handle tabs and newlines as separators', () => {
    expect(countWords('hello\tworld')).toBe(2)
    expect(countWords('hello\nworld')).toBe(2)
    expect(countWords('hello\t\nworld')).toBe(2)
  })

  it('should count words with punctuation as single words', () => {
    expect(countWords('hello, world!')).toBe(2)
    expect(countWords("it's a test.")).toBe(3)
  })
})
