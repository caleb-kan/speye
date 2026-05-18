import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import Groq from 'npm:groq-sdk@0.37.0'

// Must match frontend/src/constants/textUpload.ts MAX_CONTENT_CHARACTERS
const MAX_CONTENT_LENGTH = 8_000
// Truncation limit for summary excerpt sent to the validation LLM
const MAX_SUMMARY_LENGTH = 5_000
const LLM_MAX_TOKENS = 1_000

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
  summary?: string | null
}

interface ValidationResult {
  isValid: boolean
}

const config = {
  // json_object mode (not json_schema): llama model does not support strict
  // structured output, but json_object guarantees valid JSON syntax.
  model: 'llama-3.3-70b-versatile',
  temperature: 0.1,
  max_tokens: LLM_MAX_TOKENS,
  // "Respond with valid JSON" retained as belt-and-suspenders alongside
  // json_object: ensures the model prioritizes JSON even if the mode fails.
  system_message: `You are a quiz quality validator. Your job is to evaluate if a quiz accurately tests reading comprehension of a given text. You respond with valid JSON only - no markdown code blocks, no explanations.`,
  user_message: `Evaluate if this quiz is a good comprehension test for the given text.

TEXT (excerpt):
{text_content}

{summary_section}

QUIZ (first question set):
{quiz_sample}

---

EVALUATION CRITERIA:
1. Questions should be answerable from the text provided
2. Correct answers should actually be correct based on the text
3. Wrong options should be plausible but clearly incorrect
4. Questions should test comprehension, not trivial details
{summary_criteria}

---

Evaluate and return a JSON object with a single field "isValid" set to true or false.`,
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
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError)
      return jsonResponse({ error: 'Invalid JSON body' }, 400)
    }

    const { content, quiz, summary } = body

    if (!content || typeof content !== 'string' || !content.trim()) {
      return jsonResponse({ error: 'Content is required' }, 400)
    }

    if (!quiz || !quiz.questionSets || !Array.isArray(quiz.questionSets)) {
      return jsonResponse({ error: 'Quiz with questionSets is required' }, 400)
    }

    const quizSample = quiz.questionSets[0]
    if (!quizSample || !quizSample.questions) {
      return jsonResponse({ error: 'Quiz has no questions' }, 400)
    }

    const groqClient = new Groq({ apiKey: groqApiKey })

    const truncatedContent = content.trim().slice(0, MAX_CONTENT_LENGTH)
    const quizSampleJson = JSON.stringify(quizSample, null, 2)

    const summarySection = summary
      ? `SUMMARY:\n${summary.trim().slice(0, MAX_SUMMARY_LENGTH)}`
      : ''
    const summaryCriteria = summary
      ? '5. Every question must also be answerable from the summary alone'
      : ''

    const userMessage = config.user_message
      .replace('{text_content}', truncatedContent)
      .replace('{quiz_sample}', quizSampleJson)
      .replace('{summary_section}', summarySection)
      .replace('{summary_criteria}', summaryCriteria)

    const response = await groqClient.chat.completions.create({
      model: config.model,
      messages: [
        { role: 'system', content: config.system_message },
        { role: 'user', content: userMessage },
      ],
      temperature: config.temperature,
      max_tokens: config.max_tokens,
      response_format: { type: 'json_object' },
    })

    const choice = response.choices[0]
    if (!choice) {
      throw new Error('No choices in API response')
    }

    if (choice.finish_reason === 'length') {
      throw new Error(
        'Model response truncated due to token limit ' +
          `(max_tokens: ${config.max_tokens})`
      )
    }

    const responseContent = choice.message?.content?.trim()
    if (!responseContent) {
      throw new Error(
        `No content in response (finish_reason: ${choice.finish_reason})`
      )
    }

    let parsed: ValidationResult
    try {
      parsed = JSON.parse(responseContent)
    } catch (parseError) {
      console.error(
        'json_object returned non-JSON. Raw (first 500 chars):',
        responseContent.slice(0, 500)
      )
      throw new Error(
        `json_object returned invalid JSON: ${(parseError as Error).message}`
      )
    }

    if (typeof parsed.isValid !== 'boolean') {
      console.error(
        'Unexpected validation response:',
        JSON.stringify(parsed).slice(0, 500)
      )
      throw new Error('Response missing isValid boolean')
    }

    return jsonResponse({ isValid: parsed.isValid })
  } catch (error) {
    console.error('Error validating quiz:', error)
    return jsonResponse({ error: 'Failed to validate quiz' }, 500)
  }
})
