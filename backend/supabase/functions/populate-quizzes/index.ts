import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import Groq from 'npm:groq-sdk@0.5.0'
import { createClient } from 'jsr:@supabase/supabase-js@2'

/**
 * One-time script to populate supported nonsectional texts with null quizzes.
 * Sectional texts and sources over 4000 characters are reported as skipped.
 *
 * Run from terminal:
 * curl -X POST "https://<project-ref>.supabase.co/functions/v1/populate-quizzes" \
 *   -H "Authorization: Bearer <service-role-key>" \
 *   -H "Content-Type: application/json"
 *
 */

const MAX_CONTENT_LENGTH = 4_000

const config = {
  model: 'openai/gpt-oss-120b',
  temperature: 0.3,
  max_tokens: 8000,
  top_p: 1,
  delayBetweenRequests: 3000, // 3 seconds between requests to avoid rate limiting
  system_message: `You are an expert educational content processor. You analyze text and generate comprehension quiz questions. You respond with valid JSON only - no markdown code blocks, no explanations, no text before or after the JSON object.`,
  user_message: `Generate quiz question sets for this text:

{text_content}

---

OUTPUT SCHEMA:
{
  "questionSets": QuestionSet[]
}

- questionSets: Array of up to 5 question sets, each containing 5 to 7 questions. Decide the number of sets and questions per set based on the text's length, complexity, and number of key concepts.

QuestionSet object:
  - questions: Question[] (5 to 7 questions per set)

Question object:
  - question: string (the question text, clear and unambiguous)
  - options: string[4] (exactly 4 answer choices)
  - correctAnswer: integer (index 0-3 of the correct option)

---

QUIZ REQUIREMENTS:
1. Generate up to 5 question sets, each with 5 to 7 multiple-choice questions. Decide the number of sets and questions per set based on the text's length, complexity, and number of key concepts. Shorter/simpler texts may need fewer sets.
2. Each set should more or less cover the whole text
3. Questions must be answerable solely from the text provided
4. Cover different sections of the text, not just the beginning
5. Test comprehension of key concepts, not trivial details
6. All 4 options must be plausible - no obviously wrong answers
7. Options should be similar in length and grammatical structure
8. Randomize correct answer positions across questions (use 0, 1, 2, and 3)
9. Avoid "all of the above", "none of the above", or negative phrasing
10. Ensure questions across sets are unique and not repetitive

---

Output valid JSON only:`,
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

interface QuizQuestion {
  question: string
  options: string[]
  correctAnswer: number
}

interface QuestionSet {
  questions: QuizQuestion[]
}

interface QuizResponse {
  questionSets: QuestionSet[]
}

interface TextRecord {
  id: string
  content: string
  title: string | null
  sectional: boolean
  worker_revision: string
}

function isValidQuestion(q: QuizQuestion): boolean {
  return (
    !!q &&
    typeof q.question === 'string' &&
    q.question.trim().length > 0 &&
    Array.isArray(q.options) &&
    q.options.length === 4 &&
    q.options.every(
      (opt: unknown) => typeof opt === 'string' && opt.trim().length > 0
    ) &&
    Number.isInteger(q.correctAnswer) &&
    q.correctAnswer >= 0 &&
    q.correctAnswer <= 3
  )
}

function isValidQuizResponse(data: unknown): data is QuizResponse {
  if (!data || typeof data !== 'object') return false
  const response = data as QuizResponse

  if (!Array.isArray(response.questionSets)) return false
  if (response.questionSets.length < 1 || response.questionSets.length > 5)
    return false

  return response.questionSets.every(
    (set: QuestionSet) =>
      set &&
      Array.isArray(set.questions) &&
      set.questions.length >= 5 &&
      set.questions.length <= 7 &&
      set.questions.every(isValidQuestion)
  )
}

async function generateQuizForText(
  groqClient: Groq,
  content: string
): Promise<QuestionSet[] | null> {
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
      // Try to extract JSON from response if it contains extra text
      const jsonMatch = responseContent.match(/\{[\s\S]*}/)
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0])
      } else {
        console.error('Invalid JSON in response')
        return null
      }
    }

    if (!isValidQuizResponse(parsed)) {
      console.error('Response does not match expected format')
      return null
    }

    return parsed.questionSets
  } catch (error) {
    console.error('Error generating quiz:', error)
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
    // Get environment variables
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

    // Create clients
    const groqClient = new Groq({ apiKey: groqApiKey })
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Fetch texts with empty or null quiz
    console.log('Fetching texts with empty quizzes...')
    const { data: texts, error: fetchError } = await supabase
      .from('texts')
      .select('id, content, title, quiz, sectional, worker_revision')
      .is('quiz', null)
      .order('uploaded_at', { ascending: true })

    const filteredTexts = (texts ?? []).filter(
      (t) => !t.quiz || Object.keys(t.quiz).length === 0
    )

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

    if (!filteredTexts || filteredTexts.length === 0) {
      return new Response(
        JSON.stringify({
          message: 'No texts with empty quizzes found',
          results,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      )
    }

    console.log(`Found ${filteredTexts.length} texts to process`)

    // Process each text
    for (const text of filteredTexts as TextRecord[]) {
      results.processed++
      console.log(
        `\n[${results.processed}/${filteredTexts.length}] Processing: ${text.id} - "${text.title || 'Untitled'}"`
      )

      let skipReason: string | null = null
      if (text.sectional) {
        skipReason = 'sectional text requires section-aware processing'
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

      // Generate quiz
      const questionSets = await generateQuizForText(groqClient, text.content)

      if (!questionSets) {
        console.log(`Failed to generate quiz`)
        results.failed++
        results.details.push({
          id: text.id,
          title: text.title,
          status: 'failed - quiz generation error',
        })
        // Continue to next text even if this one fails
        await sleep(config.delayBetweenRequests)
        continue
      }

      // Update text with quiz
      const { data: updated, error: updateError } = await supabase
        .from('texts')
        .update({ quiz: { questionSets } })
        .eq('id', text.id)
        .eq('worker_revision', text.worker_revision)
        .is('quiz', null)
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
          status: 'skipped - text changed while quiz generated',
        })
      } else {
        console.log(`✓ Successfully updated`)
        results.success++
        results.details.push({
          id: text.id,
          title: text.title,
          status: 'success',
        })
      }

      // Delay before next request to avoid rate limiting
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
        message: 'Quiz population completed',
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
