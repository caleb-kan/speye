export type Quiz = {
  questions: {
    question: string
    options: string[]
    correctAnswer: number
  }[]
}

export type Text = {
  id: string
  content: string
  is_public: boolean
  uploaded_at: string
  owner_id: string | null
  quiz: Quiz | null
}
