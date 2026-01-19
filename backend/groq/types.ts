export interface QuizQuestion {
  question: string
  options: [string, string, string, string] // Exactly 4 options
  correctAnswer: number // Index 0-3
}

export interface Quiz {
  questions: QuizQuestion[]
}

export interface PromptConfig {
  model: string
  temperature: number
  max_tokens: number
  top_p: number
  system_message: string
  user_message: string
}
