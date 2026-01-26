import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
  },
}))

import { generateTitle } from '../services/generateTitle'
import { supabase } from '../../../lib/supabase'

const mockInvoke = vi.mocked(supabase.functions.invoke)

describe('generateTitle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should throw error when content is empty', async () => {
    await expect(generateTitle('')).rejects.toThrow('Content is required')
    expect(mockInvoke).not.toHaveBeenCalled()
  })

  it('should throw error when content is only whitespace', async () => {
    await expect(generateTitle('   ')).rejects.toThrow('Content is required')
    expect(mockInvoke).not.toHaveBeenCalled()
  })

  it('should return title on successful response', async () => {
    mockInvoke.mockResolvedValueOnce({
      data: { title: 'Generated Title' },
      error: null,
    })

    const result = await generateTitle('Some content to generate a title for')

    expect(result).toBe('Generated Title')
    expect(mockInvoke).toHaveBeenCalledWith('generate-title', {
      body: { content: 'Some content to generate a title for' },
    })
  })

  it('should throw error when edge function returns error', async () => {
    mockInvoke.mockResolvedValueOnce({
      data: null,
      error: { message: 'API error' },
    })

    await expect(generateTitle('content')).rejects.toThrow('API error')
  })

  it('should throw error when response has no title', async () => {
    mockInvoke.mockResolvedValueOnce({
      data: {},
      error: null,
    })

    await expect(generateTitle('content')).rejects.toThrow(
      'No title in response'
    )
  })

  it('should throw error when response data is null', async () => {
    mockInvoke.mockResolvedValueOnce({
      data: null,
      error: null,
    })

    await expect(generateTitle('content')).rejects.toThrow(
      'No title in response'
    )
  })

  it('should use default error message when error has no message', async () => {
    mockInvoke.mockResolvedValueOnce({
      data: null,
      error: {},
    })

    await expect(generateTitle('content')).rejects.toThrow(
      'Failed to generate title'
    )
  })
})
