export type QuizQuestion = {
  question: string
  options: string[]
  correctAnswer: number
}

export type QuestionSet = {
  questions: QuizQuestion[]
}

export type Quiz = {
  questionSets: QuestionSet[]
}

export type Text = {
  id: string
  title: string | null
  content: string
  uploaded_at: string
  owner_id: string | null
  quiz: Quiz | null
  fiction: boolean
  category: string | null
  complexity: number | null
  source: string | null
}

export type TextPreview = {
  id: string
  title: string | null
  preview: string
  uploaded_at: string
  owner_id: string | null
  quiz: Quiz | null
  fiction: boolean
  category: string | null
  complexity: number | null
  source: string | null
}
