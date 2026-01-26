import { supabase } from '../../../lib/supabase'

interface GenerateTitleResponse {
  title: string
}

export async function generateTitle(content: string): Promise<string> {
  if (!content?.trim()) {
    throw new Error('Content is required')
  }

  const response = await supabase.functions.invoke<GenerateTitleResponse>(
    'generate-title',
    { body: { content } }
  )

  if (response.error) {
    console.error('Edge function error:', response.error)
    throw new Error(response.error.message || 'Failed to generate title')
  }

  if (!response.data?.title) {
    throw new Error('No title in response')
  }

  return response.data.title
}
