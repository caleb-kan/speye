/**
 * Input data for creating or updating a text.
 * Used by both uploadText and updateText functions.
 */
export interface TextInput {
  title: string | null
  content: string
  fiction: boolean
}

/**
 * Full text record as stored in the database.
 */
export interface TextRecord {
  id: string
  owner_id: string | null
  title: string | null
  content: string
  fiction: boolean
  uploaded_at: string
  quiz: unknown
  category: string | null
  complexity: number | null
}
