import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

import { getQuiz } from '../services/getQuiz'
import { supabase } from '../../../lib/supabase'

const mockFrom = vi.mocked(supabase.from)

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

describe('getQuiz', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const createMockChain = (result: {
    data: unknown
    error: { message: string } | null
  }) => {
    const mockSingle = vi.fn().mockResolvedValue(result)
    const mockEq = vi.fn().mockReturnValue({ single: mockSingle })
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
    mockFrom.mockReturnValue({
      select: mockSelect,
    } as ReturnType<typeof supabase.from>)
    return { mockSelect, mockEq, mockSingle }
  }

  it('should return a question set on successful response', async () => {
    createMockChain({
      data: { quiz: { questionSets: mockQuestionSets } },
      error: null,
    })

    const result = await getQuiz('test-id')

    expect(result).toBeDefined()
    expect(result.questions).toHaveLength(5)
    expect(mockQuestionSets).toContainEqual(result)
  })

  it('should call supabase with correct parameters', async () => {
    const { mockSelect, mockEq } = createMockChain({
      data: { quiz: { questionSets: mockQuestionSets } },
      error: null,
    })

    await getQuiz('test-text-id')

    expect(mockFrom).toHaveBeenCalledWith('texts')
    expect(mockSelect).toHaveBeenCalledWith('quiz')
    expect(mockEq).toHaveBeenCalledWith('id', 'test-text-id')
  })

  it('should throw error when supabase returns error', async () => {
    createMockChain({
      data: null,
      error: { message: 'Database error' },
    })

    await expect(getQuiz('test-id')).rejects.toThrow('Failed to load quiz')
  })

  it('should throw error when quiz is null', async () => {
    createMockChain({
      data: { quiz: null },
      error: null,
    })

    await expect(getQuiz('test-id')).rejects.toThrow(
      'No quiz available for this text'
    )
  })

  it('should throw error when data is null', async () => {
    createMockChain({
      data: null,
      error: null,
    })

    await expect(getQuiz('test-id')).rejects.toThrow(
      'No quiz available for this text'
    )
  })

  it('should throw error when questionSets is not an array', async () => {
    createMockChain({
      data: { quiz: { questionSets: 'invalid' } },
      error: null,
    })

    await expect(getQuiz('test-id')).rejects.toThrow('Invalid quiz format')
  })

  it('should throw error when questionSets does not have 5 sets', async () => {
    createMockChain({
      data: { quiz: { questionSets: mockQuestionSets.slice(0, 3) } },
      error: null,
    })

    await expect(getQuiz('test-id')).rejects.toThrow('Invalid quiz format')
  })

  it('should return a random question set from available sets', async () => {
    createMockChain({
      data: { quiz: { questionSets: mockQuestionSets } },
      error: null,
    })

    // Call multiple times and verify we get valid sets
    const results = await Promise.all([
      getQuiz('test-id'),
      getQuiz('test-id'),
      getQuiz('test-id'),
    ])

    results.forEach((result) => {
      expect(mockQuestionSets).toContainEqual(result)
    })
  })
})
