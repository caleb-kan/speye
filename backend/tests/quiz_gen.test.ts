import { readFileSync } from 'fs'
import { parse as parseYaml } from 'yaml'
import { join } from 'path'
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest'
import { Quiz, PromptConfig } from '../groq/types'
import { generateQuiz } from '../groq/quizGenerator'

const mockCreate = vi.hoisted(() => vi.fn())

vi.mock('../groq/client', () => ({
  groqClient: {
    chat: {
      completions: {
        create: mockCreate,
      },
    },
  },
}))

const mockQuizResponse: Quiz = {
  questions: [
    {
      question: 'What is another name for the water cycle?',
      options: [
        'Hydrological cycle',
        'Carbon cycle',
        'Nitrogen cycle',
        'Rock cycle',
      ],
      correctAnswer: 0,
    },
    {
      question: "What percentage of Earth's water is in the oceans?",
      options: ['50%', '75%', '97%', '100%'],
      correctAnswer: 2,
    },
    {
      question: 'What process turns water into water vapor?',
      options: ['Condensation', 'Precipitation', 'Evaporation', 'Collection'],
      correctAnswer: 2,
    },
    {
      question: 'Where does water vapor turn into clouds?',
      options: [
        'In the ocean',
        'In the atmosphere',
        'Underground',
        'In rivers',
      ],
      correctAnswer: 1,
    },
    {
      question: "What percentage of Earth's water is fresh water?",
      options: ['3%', '25%', '50%', '97%'],
      correctAnswer: 0,
    },
  ],
}

const sampleText = `
The water cycle, also known as the hydrological cycle, describes the continuous movement of water 
on, above, and below the surface of the Earth. The cycle involves several key processes:

1. Evaporation: Water from oceans, lakes, and rivers turns into water vapor due to heat from the sun.
2. Condensation: Water vapor rises into the atmosphere, cools, and forms clouds.
3. Precipitation: Water falls back to Earth as rain, snow, sleet, or hail.
4. Collection: Water collects in oceans, lakes, rivers, and underground aquifers.

This cycle is essential for life on Earth, as it distributes fresh water across the planet and 
helps regulate temperature. Approximately 97% of Earth's water is in the oceans, while only 3% 
is fresh water, and most of that is locked in ice caps and glaciers.
`

describe('Quiz Generator', () => {
  let promptConfig: PromptConfig

  beforeAll(() => {
    const promptYaml = readFileSync(
      join(process.cwd(), 'groq/prompts/quiz_gen_prompt.yaml'),
      'utf-8'
    )
    promptConfig = parseYaml(promptYaml) as PromptConfig
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Prompt Configuration', () => {
    it('should load prompt configuration from YAML', () => {
      expect(promptConfig).toBeDefined()
      expect(promptConfig.model).toBe('openai/gpt-oss-120b')
      expect(promptConfig.temperature).toBe(0.1)
      expect(promptConfig.max_tokens).toBe(2000)
      expect(promptConfig.top_p).toBe(1)
    })

    it('should have system message defined', () => {
      expect(promptConfig.system_message).toBeDefined()
      expect(promptConfig.system_message).toContain('quiz generator')
    })

    it('should have user message with text_content placeholder', () => {
      expect(promptConfig.user_message).toBeDefined()
      expect(promptConfig.user_message).toContain('{text_content}')
    })
  })

  describe('generateQuiz function', () => {
    it('should call Groq API with correct parameters', async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify(mockQuizResponse),
            },
          },
        ],
      })

      await generateQuiz(sampleText)

      expect(mockCreate).toHaveBeenCalledTimes(1)
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: promptConfig.model,
          temperature: promptConfig.temperature,
          max_tokens: promptConfig.max_tokens,
          top_p: promptConfig.top_p,
          messages: expect.arrayContaining([
            expect.objectContaining({ role: 'system' }),
            expect.objectContaining({ role: 'user' }),
          ]),
        })
      )
    })

    it('should replace {text_content} placeholder with actual text', async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify(mockQuizResponse),
            },
          },
        ],
      })

      await generateQuiz(sampleText)

      const callArgs = mockCreate.mock.calls[0][0]
      const userMessage = callArgs.messages.find(
        (m: { role: string }) => m.role === 'user'
      )

      expect(userMessage.content).toContain('water cycle')
      expect(userMessage.content).not.toContain('{text_content}')
    })

    it('should return a valid Quiz object', async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify(mockQuizResponse),
            },
          },
        ],
      })

      const quiz = await generateQuiz(sampleText)

      expect(quiz).toBeDefined()
      expect(quiz.questions).toBeDefined()
      expect(Array.isArray(quiz.questions)).toBe(true)
    })

    it('should return quiz with 5 questions', async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify(mockQuizResponse),
            },
          },
        ],
      })

      const quiz = await generateQuiz(sampleText)

      expect(quiz.questions.length).toBe(5)
    })

    it('should return questions with correct structure', async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify(mockQuizResponse),
            },
          },
        ],
      })

      const quiz = await generateQuiz(sampleText)

      for (const question of quiz.questions) {
        expect(question.question).toBeDefined()
        expect(typeof question.question).toBe('string')

        expect(question.options).toBeDefined()
        expect(Array.isArray(question.options)).toBe(true)
        expect(question.options.length).toBe(4)

        expect(question.correctAnswer).toBeDefined()
        expect(typeof question.correctAnswer).toBe('number')
        expect(question.correctAnswer).toBeGreaterThanOrEqual(0)
        expect(question.correctAnswer).toBeLessThanOrEqual(3)
      }
    })

    it('should throw error when API returns no content', async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: null,
            },
          },
        ],
      })

      await expect(generateQuiz(sampleText)).rejects.toThrow(
        'No content in response'
      )
    })

    it('should throw error when API returns invalid JSON', async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: 'not valid json',
            },
          },
        ],
      })

      await expect(generateQuiz(sampleText)).rejects.toThrow(
        'Invalid JSON in response'
      )
    })

    it('should throw error when response does not match Quiz format', async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify({ invalid: 'format' }),
            },
          },
        ],
      })

      await expect(generateQuiz(sampleText)).rejects.toThrow(
        'Response does not match expected Quiz format'
      )
    })

    it('should throw error when questions have wrong number of options', async () => {
      const invalidQuiz = {
        questions: [
          {
            question: 'Test?',
            options: ['A', 'B', 'C'], // Only 3 options
            correctAnswer: 0,
          },
        ],
      }

      mockCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify(invalidQuiz),
            },
          },
        ],
      })

      await expect(generateQuiz(sampleText)).rejects.toThrow(
        'Response does not match expected Quiz format'
      )
    })

    it('should throw error when correctAnswer is out of range', async () => {
      const invalidQuiz = {
        questions: [
          {
            question: 'Test?',
            options: ['A', 'B', 'C', 'D'],
            correctAnswer: 5,
          },
        ],
      }

      mockCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify(invalidQuiz),
            },
          },
        ],
      })

      await expect(generateQuiz(sampleText)).rejects.toThrow(
        'Response does not match expected Quiz format'
      )
    })
  })

  describe('Quiz Question Validation', () => {
    it('should have all options as strings', async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify(mockQuizResponse),
            },
          },
        ],
      })

      const quiz = await generateQuiz(sampleText)

      for (const question of quiz.questions) {
        for (const option of question.options) {
          expect(typeof option).toBe('string')
        }
      }
    })

    it('should have correctAnswer pointing to a valid option index', async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify(mockQuizResponse),
            },
          },
        ],
      })

      const quiz = await generateQuiz(sampleText)

      for (const question of quiz.questions) {
        expect(question.options[question.correctAnswer]).toBeDefined()
      }
    })
  })
})
