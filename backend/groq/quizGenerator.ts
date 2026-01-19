import { groqClient } from './client'
import { Quiz, QuizQuestion, PromptConfig } from './types'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { parse as parseYaml } from 'yaml'

// Cache prompt config - loaded once at module initialization
const __dirname = dirname(fileURLToPath(import.meta.url))
const promptPath = join(__dirname, 'prompts', 'quiz_gen_prompt.yaml')
const promptConfig: PromptConfig = parseYaml(readFileSync(promptPath, 'utf-8'))

function isValidQuiz(data: unknown): data is Quiz {
  if (!data || typeof data !== 'object') return false
  const quiz = data as Quiz
  if (!Array.isArray(quiz.questions)) return false

  return quiz.questions.every(
    (q: QuizQuestion) =>
      typeof q.question === 'string' &&
      Array.isArray(q.options) &&
      q.options.length === 4 &&
      q.options.every((opt: unknown) => typeof opt === 'string') &&
      typeof q.correctAnswer === 'number' &&
      q.correctAnswer >= 0 &&
      q.correctAnswer <= 3
  )
}

export async function generateQuiz(textContent: string): Promise<Quiz> {
  const userMessage = promptConfig.user_message.replace(
    '{text_content}',
    textContent
  )

  const response = await groqClient.chat.completions.create({
    model: promptConfig.model,
    messages: [
      { role: 'system', content: promptConfig.system_message },
      { role: 'user', content: userMessage },
    ],
    temperature: promptConfig.temperature,
    max_tokens: promptConfig.max_tokens,
    top_p: promptConfig.top_p,
  })

  const content = response.choices[0]?.message?.content
  if (!content) {
    throw new Error('No content in response')
  }

  let quiz: unknown
  try {
    quiz = JSON.parse(content)
  } catch {
    throw new Error('Invalid JSON in response')
  }

  if (!isValidQuiz(quiz)) {
    throw new Error('Response does not match expected Quiz format')
  }

  return quiz
}
