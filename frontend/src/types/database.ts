export type Quiz = {
  questions: {
    question: string
    options: string[]
    correctAnswer: number
  }[]
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
