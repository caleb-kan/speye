import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import Groq from 'npm:groq-sdk@0.5.0'
import { createClient } from 'jsr:@supabase/supabase-js@2'

/**
 * One-time script to populate nonsectional non-fiction texts with null summaries.
 * Sectional texts and sources over 15000 characters are reported as skipped.
 *
 * Run from terminal:
 * curl -X POST "http://localhost:54321/functions/v1/populate-summaries" \
 *   -H "Authorization: Bearer <service-role-key>" \
 *   -H "Content-Type: application/json"
 */

const MAX_CONTENT_LENGTH = 15_000

const config = {
  model: 'openai/gpt-oss-120b',
  temperature: 0.3,
  max_tokens: 8000,
  top_p: 1,
  delayBetweenRequests: 3000,
  system_message: `You are an expert educational content processor. You analyze text and generate concise, accurate summaries. You respond with valid JSON only - no markdown code blocks, no explanations, no text before or after the JSON object.`,
  user_message: `Generate a summary for this non-fiction text:

{text_content}

---

OUTPUT SCHEMA:
{
  "summary": string
}

---

SUMMARY REQUIREMENTS:
1. Length: approximately 20-30% of the original text length, minimum 200 words
2. Preserve all key arguments, findings, and conclusions
3. Maintain the logical structure and flow of the original
4. Use clear, readable prose (not bullet points)
5. Retain specific facts, names, dates, and data central to the text
6. Must contain enough information to answer comprehension questions about the text
7. Do not add information not in the original text

---

Output valid JSON only:`,
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

interface TextRecord {
  id: string
  content: string
  title: string | null
  sectional: boolean
  worker_revision: string
}

interface SummaryResponse {
  summary: string
}

function isValidSummaryResponse(data: unknown): data is SummaryResponse {
  if (!data || typeof data !== 'object') return false
  const response = data as SummaryResponse
  return (
    typeof response.summary === 'string' && response.summary.trim().length > 0
  )
}

async function generateSummaryForText(
  groqClient: Groq,
  content: string
): Promise<string | null> {
  const userMessage = config.user_message.replace('{text_content}', () =>
    content.trim()
  )

  try {
    const response = await groqClient.chat.completions.create({
      model: config.model,
      messages: [
        { role: 'system', content: config.system_message },
        { role: 'user', content: userMessage },
      ],
      temperature: config.temperature,
      max_tokens: config.max_tokens,
      top_p: config.top_p,
    })

    const responseContent = response.choices[0]?.message?.content?.trim()

    if (!responseContent) {
      console.error('No content in response')
      return null
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(responseContent)
    } catch {
      const jsonMatch = responseContent.match(/\{[\s\S]*}/)
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0])
      } else {
        console.error('Invalid JSON in response')
        return null
      }
    }

    if (!isValidSummaryResponse(parsed)) {
      console.error('Response does not match expected format')
      return null
    }

    return parsed.summary
  } catch (error) {
    console.error('Error generating summary:', error)
    return null
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (
    !serviceKey ||
    req.headers.get('Authorization') !== `Bearer ${serviceKey}`
  ) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  const startTime = Date.now()
  const results: {
    processed: number
    success: number
    failed: number
    skipped: number
    details: { id: string; title: string | null; status: string }[]
  } = {
    processed: 0,
    success: 0,
    failed: 0,
    skipped: 0,
    details: [],
  }

  try {
    const groqApiKey = Deno.env.get('GROQ_API_KEY')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!groqApiKey) {
      return new Response(
        JSON.stringify({ error: 'GROQ_API_KEY not configured' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      )
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Supabase credentials not configured' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      )
    }

    const groqClient = new Groq({ apiKey: groqApiKey })
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Fetch non-fiction texts with empty summary
    console.log('Fetching non-fiction texts with empty summaries...')
    const { data: texts, error: fetchError } = await supabase
      .from('texts')
      .select(
        'id, content, title, summary, fiction, sectional, worker_revision'
      )
      .eq('fiction', false)
      .is('summary', null)
      .order('uploaded_at', { ascending: true })

    if (fetchError) {
      console.error('Failed to fetch texts:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch texts', details: fetchError }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      )
    }

    const filteredTexts = (texts ?? []).filter((t) => !t.summary)

    if (!filteredTexts || filteredTexts.length === 0) {
      return new Response(
        JSON.stringify({
          message: 'No non-fiction texts with empty summaries found',
          results,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      )
    }

    console.log(`Found ${filteredTexts.length} texts to process`)

    for (const text of filteredTexts as TextRecord[]) {
      results.processed++
      console.log(
        `\n[${results.processed}/${filteredTexts.length}] Processing: ${text.id} - "${text.title || 'Untitled'}"`
      )

      let skipReason: string | null = null
      if (text.sectional) {
        skipReason = 'sectional text does not use summaries'
      } else if (!text.content || text.content.trim().length < 100) {
        skipReason = 'content too short'
      } else if (text.content.trim().length > MAX_CONTENT_LENGTH) {
        skipReason = `content exceeds ${MAX_CONTENT_LENGTH} characters`
      }
      if (skipReason) {
        console.log(`Skipping: ${skipReason}`)
        results.skipped++
        results.details.push({
          id: text.id,
          title: text.title,
          status: `skipped - ${skipReason}`,
        })
        continue
      }

      const summary = await generateSummaryForText(groqClient, text.content)

      if (!summary) {
        console.log(`Failed to generate summary`)
        results.failed++
        results.details.push({
          id: text.id,
          title: text.title,
          status: 'failed - summary generation error',
        })
        await sleep(config.delayBetweenRequests)
        continue
      }

      const { data: updated, error: updateError } = await supabase
        .from('texts')
        .update({ summary })
        .eq('id', text.id)
        .eq('worker_revision', text.worker_revision)
        .is('summary', null)
        .select('id')

      if (updateError) {
        console.error(`Failed to update text ${text.id}:`, updateError)
        results.failed++
        results.details.push({
          id: text.id,
          title: text.title,
          status: `failed - update error: ${updateError.message}`,
        })
      } else if (!updated || updated.length === 0) {
        results.skipped++
        results.details.push({
          id: text.id,
          title: text.title,
          status: 'skipped - text changed while summary generated',
        })
      } else {
        console.log(`\u2713 Successfully updated`)
        results.success++
        results.details.push({
          id: text.id,
          title: text.title,
          status: 'success',
        })
      }

      if (results.processed < filteredTexts.length) {
        console.log(
          `Waiting ${config.delayBetweenRequests / 1000}s before next request...`
        )
        await sleep(config.delayBetweenRequests)
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1)
    console.log(`\n=== Completed in ${duration}s ===`)
    console.log(`Success: ${results.success}`)
    console.log(`Failed: ${results.failed}`)
    console.log(`Skipped: ${results.skipped}`)

    return new Response(
      JSON.stringify({
        message: 'Summary population completed',
        duration: `${duration}s`,
        results,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    )
  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({
        error: 'Unexpected error occurred',
        details: error instanceof Error ? error.message : String(error),
        results,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    )
  }
})
