import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)

export type Text = {
  id: string
  content: string
  is_public: boolean
  uploaded_at: string
  owner_id: string | null
  quiz: unknown | null
}
