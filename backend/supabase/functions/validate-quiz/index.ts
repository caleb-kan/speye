import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import Groq from 'npm:groq-sdk@0.5.0'

const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

/**
 * Verify the request is authorized.
 * Only accepts service role key - this function should only be called by workers.
 */
function isAuthorized(req: Request): boolean {
  if (!supabaseServiceKey) return false
  const authHeader = req.headers.get('Authorization')
  return authHeader?.replace('Bearer ', '') === supabaseServiceKey
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

interface ValidateQuizRequest {
  content: string
  quiz: {
    questionSets: QuestionSet[]
  }
}

interface ValidationResult {
  isValid: boolean
}

const config = {
  model: 'llama-3.3-70b-versatile',
  temperature: 0.1,
  max_tokens: 1000,
  system_message: `You are a quiz quality validator. Your job is to evaluate if a quiz accurately tests reading comprehension of a given text. You respond with valid JSON only - no markdown code blocks, no explanations.`,
  user_message: `Evaluate if this quiz is a good comprehension test for the given text.

TEXT (excerpt):
{text_content}

QUIZ (first question set):
{quiz_sample}

---

EVALUATION CRITERIA:
1. Questions should be answerable from the text provided
2. Correct answers should actually be correct based on the text
3. Wrong options should be plausible but clearly incorrect
4. Questions should test comprehension, not trivial details

---

Respond with JSON only:
{ "isValid": true } or { "isValid": false }`,
}

function jsonResponse(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  // Verify authorization - only workers should call this function
  if (!isAuthorized(req)) {
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }

  try {
    const groqApiKey = Deno.env.get('GROQ_API_KEY')
    if (!groqApiKey) {
      console.error('GROQ_API_KEY not set')
      return jsonResponse({ error: 'Server configuration error' }, 500)
    }

    let body: ValidateQuizRequest
    try {
      body = await req.json()
    } catch {
      return jsonResponse({ error: 'Invalid JSON body' }, 400)
    }

    const { content, quiz } = body

    if (!content || typeof content !== 'string' || !content.trim()) {
      return jsonResponse({ error: 'Content is required' }, 400)
    }

    if (!quiz || !quiz.questionSets || !Array.isArray(quiz.questionSets)) {
      return jsonResponse({ error: 'Quiz with questionSets is required' }, 400)
    }

    // Use first question set as sample for validation
    const quizSample = quiz.questionSets[0]
    if (!quizSample || !quizSample.questions) {
      return jsonResponse({ error: 'Quiz has no questions' }, 400)
    }

    const groqClient = new Groq({ apiKey: groqApiKey })

    // Match frontend MAX_CONTENT_CHARACTERS limit (15k)
    const truncatedContent = content.trim().slice(0, 15000)
    const quizSampleJson = JSON.stringify(quizSample, null, 2)

    const userMessage = config.user_message
      .replace('{text_content}', truncatedContent)
      .replace('{quiz_sample}', quizSampleJson)

    const response = await groqClient.chat.completions.create({
      model: config.model,
      messages: [
        { role: 'system', content: config.system_message },
        { role: 'user', content: userMessage },
      ],
      temperature: config.temperature,
      max_tokens: config.max_tokens,
    })

    const responseContent = response.choices[0]?.message?.content?.trim()

    if (!responseContent) {
      throw new Error('No content in response')
    }

    let parsed: ValidationResult
    try {
      parsed = JSON.parse(responseContent)
    } catch {
      // Try to extract JSON from response
      const jsonMatch = responseContent.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('Invalid JSON in response')
      }
    }

    // Validate response structure
    if (typeof parsed.isValid !== 'boolean') {
      throw new Error('Response missing isValid boolean')
    }

    return jsonResponse({ isValid: parsed.isValid })
  } catch (error) {
    console.error('Error validating quiz:', error)
    return jsonResponse({ error: 'Failed to validate quiz' }, 500)
  }
})
