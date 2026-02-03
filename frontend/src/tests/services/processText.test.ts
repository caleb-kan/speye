import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../../../lib/supabase', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
  },
}))

import { processText } from '../../services/processText'
import { supabase } from '../../../../lib/supabase'

const mockInvoke = vi.mocked(supabase.functions.invoke)

const mockQuestionSets = [
  {
    questions: [
      { question: 'Q1', options: ['A', 'B', 'C', 'D'], correctAnswer: 0 },
      { question: 'Q2', options: ['A', 'B', 'C', 'D'], correctAnswer: 1 },
      { question: 'Q3', options: ['A', 'B', 'C', 'D'], correctAnswer: 2 },
      { question: 'Q4', options: ['A', 'B', 'C', 'D'], correctAnswer: 3 },
      { question: 'Q5', options: ['A', 'B', 'C', 'D'], correctAnswer: 0 },
    ],
  },
  {
    questions: [
      { question: 'Q6', options: ['A', 'B', 'C', 'D'], correctAnswer: 1 },
      { question: 'Q7', options: ['A', 'B', 'C', 'D'], correctAnswer: 2 },
      { question: 'Q8', options: ['A', 'B', 'C', 'D'], correctAnswer: 3 },
      { question: 'Q9', options: ['A', 'B', 'C', 'D'], correctAnswer: 0 },
      { question: 'Q10', options: ['A', 'B', 'C', 'D'], correctAnswer: 1 },
    ],
  },
  {
    questions: [
      { question: 'Q11', options: ['A', 'B', 'C', 'D'], correctAnswer: 2 },
      { question: 'Q12', options: ['A', 'B', 'C', 'D'], correctAnswer: 3 },
      { question: 'Q13', options: ['A', 'B', 'C', 'D'], correctAnswer: 0 },
      { question: 'Q14', options: ['A', 'B', 'C', 'D'], correctAnswer: 1 },
      { question: 'Q15', options: ['A', 'B', 'C', 'D'], correctAnswer: 2 },
    ],
  },
  {
    questions: [
      { question: 'Q16', options: ['A', 'B', 'C', 'D'], correctAnswer: 3 },
      { question: 'Q17', options: ['A', 'B', 'C', 'D'], correctAnswer: 0 },
      { question: 'Q18', options: ['A', 'B', 'C', 'D'], correctAnswer: 1 },
      { question: 'Q19', options: ['A', 'B', 'C', 'D'], correctAnswer: 2 },
      { question: 'Q20', options: ['A', 'B', 'C', 'D'], correctAnswer: 3 },
    ],
  },
  {
    questions: [
      { question: 'Q21', options: ['A', 'B', 'C', 'D'], correctAnswer: 0 },
      { question: 'Q22', options: ['A', 'B', 'C', 'D'], correctAnswer: 1 },
      { question: 'Q23', options: ['A', 'B', 'C', 'D'], correctAnswer: 2 },
      { question: 'Q24', options: ['A', 'B', 'C', 'D'], correctAnswer: 3 },
      { question: 'Q25', options: ['A', 'B', 'C', 'D'], correctAnswer: 0 },
    ],
  },
]

describe('processText', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should throw error when content is empty', async () => {
    await expect(processText({ content: '' })).rejects.toThrow(
      'Content is required'
    )
    expect(mockInvoke).not.toHaveBeenCalled()
  })

  it('should throw error when content is only whitespace', async () => {
    await expect(processText({ content: '   ' })).rejects.toThrow(
      'Content is required'
    )
    expect(mockInvoke).not.toHaveBeenCalled()
  })

  it('should return title and questionSets on successful response', async () => {
    mockInvoke.mockResolvedValueOnce({
      data: {
        title: 'Generated Title',
        questionSets: mockQuestionSets,
        fiction: true,
      },
      error: null,
    })

    const result = await processText({
      content: 'Some content to process',
      generateTitle: true,
    })

    expect(result.title).toBe('Generated Title')
    expect(result.questionSets).toEqual(mockQuestionSets)
    expect(result.fiction).toBe(true)
    expect(mockInvoke).toHaveBeenCalledWith('process-text', {
      body: { content: 'Some content to process', generateTitle: true },
    })
  })

  it('should return null title when generateTitle is false', async () => {
    mockInvoke.mockResolvedValueOnce({
      data: { title: null, questionSets: mockQuestionSets, fiction: true },
      error: null,
    })

    const result = await processText({
      content: 'Some content',
      generateTitle: false,
    })

    expect(result.title).toBeNull()
    expect(result.questionSets).toEqual(mockQuestionSets)
    expect(result.fiction).toBe(true)
    expect(mockInvoke).toHaveBeenCalledWith('process-text', {
      body: { content: 'Some content', generateTitle: false },
    })
  })

  it('should default generateTitle to true', async () => {
    mockInvoke.mockResolvedValueOnce({
      data: {
        title: 'Generated Title',
        questionSets: mockQuestionSets,
        fiction: true,
      },
      error: null,
    })

    await processText({ content: 'Some content' })

    expect(mockInvoke).toHaveBeenCalledWith('process-text', {
      body: { content: 'Some content', generateTitle: true },
    })
  })

  it('should return fiction: false when text is non-fiction', async () => {
    mockInvoke.mockResolvedValueOnce({
      data: {
        title: 'Non-Fiction Title',
        questionSets: mockQuestionSets,
        fiction: false,
      },
      error: null,
    })

    const result = await processText({ content: 'Some non-fiction content' })

    expect(result.fiction).toBe(false)
  })

  it('should throw error when edge function returns error', async () => {
    mockInvoke.mockResolvedValueOnce({
      data: null,
      error: { message: 'API error' },
    })

    await expect(processText({ content: 'content' })).rejects.toThrow(
      'API error'
    )
  })

  it('should throw error when response has no questionSets', async () => {
    mockInvoke.mockResolvedValueOnce({
      data: { title: 'Title', fiction: true },
      error: null,
    })

    await expect(processText({ content: 'content' })).rejects.toThrow(
      'Invalid response: missing questionSets'
    )
  })

  it('should throw error when response data is null', async () => {
    mockInvoke.mockResolvedValueOnce({
      data: null,
      error: null,
    })

    await expect(processText({ content: 'content' })).rejects.toThrow(
      'Invalid response: missing questionSets'
    )
  })

  it('should use default error message when error has no message', async () => {
    mockInvoke.mockResolvedValueOnce({
      data: null,
      error: {},
    })

    await expect(processText({ content: 'content' })).rejects.toThrow(
      'Failed to process text'
    )
  })
})
