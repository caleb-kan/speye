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

export type ProcessingStatus = 'pending' | 'completed' | 'failed'

export type TextInput = {
  title?: string | null
  content: string
  summary?: string | null
  fiction?: boolean | null
  quiz?: Quiz | null
  processing_status?: ProcessingStatus
  quiz_valid?: boolean | null
  isPublic?: boolean
}

export type Text = {
  id: string
  title: string | null
  content: string
  summary: string | null
  uploaded_at: string
  owner_id: string | null
  quiz: Quiz | null
  fiction: boolean | null
  category: string | null
  complexity: number | null
  source: string | null
  processing_status: ProcessingStatus
  quiz_valid: boolean | null
}

export type TextPreview = {
  id: string
  title: string | null
  preview: string
  uploaded_at: string
  owner_id: string | null
  quiz: Quiz | null
  fiction: boolean | null
  category: string | null
  complexity: number | null
  source: string | null
  processing_status: ProcessingStatus
  quiz_valid: boolean | null
  has_summary: boolean
}

export type NotificationType = 'info' | 'alert' | 'error'

export type Notification = {
  id: string
  user_id: string
  message: string
  type: NotificationType
  seen: boolean
  created_at: string
}
