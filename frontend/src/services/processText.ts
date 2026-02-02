import { supabase } from '../../../lib/supabase'

interface QuizQuestion {
  question: string
  options: string[]
  correctAnswer: number
}

interface QuestionSet {
  questions: QuizQuestion[]
}

interface ProcessTextResponse {
  title: string | null
  questionSets: QuestionSet[]
  fiction: boolean
}

interface ProcessTextOptions {
  content: string
  generateTitle?: boolean
}

export async function processText(
  options: ProcessTextOptions
): Promise<ProcessTextResponse> {
  const { content, generateTitle = true } = options

  if (!content?.trim()) {
    throw new Error('Content is required')
  }

  const response = await supabase.functions.invoke<ProcessTextResponse>(
    'process-text',
    { body: { content, generateTitle } }
  )

  if (response.error) {
    console.error('Edge function error:', response.error)
    throw new Error(response.error.message || 'Failed to process text')
  }

  if (
    !response.data?.questionSets ||
    !Array.isArray(response.data.questionSets)
  ) {
    throw new Error('Invalid response: missing questionSets')
  }

  return {
    title: response.data.title,
    questionSets: response.data.questionSets,
    fiction: response.data.fiction,
  }
}
