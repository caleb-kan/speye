import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import Groq from 'npm:groq-sdk@0.5.0'

// Rate limiting: 20 requests per minute per IP
const RATE_LIMIT = {
  maxRequests: 20,
  windowMs: 60 * 1000,
}

// In-memory rate limit store (per edge function instance)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

function getClientIp(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  )
}

function checkRateLimit(clientIp: string): {
  allowed: boolean
  remaining: number
  resetTime: number
} {
  const now = Date.now()
  const record = rateLimitStore.get(clientIp)

  // Clean expired entry for this IP if it exists
  if (record && now > record.resetTime) {
    rateLimitStore.delete(clientIp)
  }

  // Periodic cleanup: remove all expired entries when store grows large
  if (rateLimitStore.size > 100) {
    for (const [ip, data] of rateLimitStore) {
      if (now > data.resetTime) {
        rateLimitStore.delete(ip)
      }
    }
  }

  const currentRecord = rateLimitStore.get(clientIp)

  if (!currentRecord) {
    const resetTime = now + RATE_LIMIT.windowMs
    rateLimitStore.set(clientIp, { count: 1, resetTime })
    return { allowed: true, remaining: RATE_LIMIT.maxRequests - 1, resetTime }
  }

  if (currentRecord.count >= RATE_LIMIT.maxRequests) {
    return { allowed: false, remaining: 0, resetTime: currentRecord.resetTime }
  }

  currentRecord.count++
  return {
    allowed: true,
    remaining: RATE_LIMIT.maxRequests - currentRecord.count,
    resetTime: currentRecord.resetTime,
  }
}

const config = {
  model: 'openai/gpt-oss-120b',
  temperature: 0.3,
  max_tokens: 8000,
  top_p: 1,
  system_message: `You are an expert educational content processor. You analyze text and generate both a title and comprehension quiz questions, and then classify if the text is fiction or non-fiction. You respond with valid JSON only - no markdown code blocks, no explanations, no text before or after the JSON object.`,
  user_message: `Process this text by generating a title and quiz question sets:

{text_content}

---

OUTPUT SCHEMA:
{
  "title": string | null,
  "questionSets": QuestionSet[],
  "fiction": boolean
}

- title: Generate a title ONLY if generateTitle is true, otherwise set to null
- questionSets: Array of exactly 5 question sets, each containing 5 questions (25 questions total)
- fiction: true if the text is fiction, false if non-fiction

QuestionSet object:
  - questions: Question[] (exactly 5 questions per set)

Question object:
  - question: string (the question text, clear and unambiguous)
  - options: string[4] (exactly 4 answer choices)
  - correctAnswer: integer (index 0-3 of the correct option)

---

TITLE REQUIREMENTS (only if generating title):
1. Length: 2-8 words (concise but descriptive)
2. Capture the central theme, argument, or narrative of the text
3. Be engaging and informative
4. Match the tone of the text (formal for academic, evocative for fiction)
5. Avoid generic titles like "An Interesting Story" or "Important Information"

---

QUIZ REQUIREMENTS:
1. Generate exactly 5 question sets, each with exactly 5 multiple-choice questions (25 total)
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

CONFIGURATION:
generateTitle: {generate_title}

---

Output valid JSON only:`,
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

function jsonResponse(
  data: Record<string, unknown>,
  status = 200,
  extraHeaders: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
      ...extraHeaders,
    },
  })
}

interface QuizQuestion {
  question: string
  options: string[]
  correctAnswer: number
}

interface QuestionSet {
  questions: QuizQuestion[]
}

interface ProcessTextResponse {
  title: string | null
  questionSets: QuestionSet[]
  fiction: boolean
}

function isValidQuestion(q: QuizQuestion): boolean {
  return (
    typeof q.question === 'string' &&
    Array.isArray(q.options) &&
    q.options.length === 4 &&
    q.options.every((opt: unknown) => typeof opt === 'string') &&
    typeof q.correctAnswer === 'number' &&
    q.correctAnswer >= 0 &&
    q.correctAnswer <= 3
  )
}

function isValidResponse(data: unknown): data is ProcessTextResponse {
  if (!data || typeof data !== 'object') return false
  const response = data as ProcessTextResponse

  if (response.title !== null && typeof response.title !== 'string')
    return false

  if (!Array.isArray(response.questionSets)) return false
  if (response.questionSets.length !== 5) return false

  if (typeof response.fiction !== 'boolean') return false

  return response.questionSets.every(
    (set: QuestionSet) =>
      set &&
      Array.isArray(set.questions) &&
      set.questions.length === 5 &&
      set.questions.every(isValidQuestion)
  )
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  const clientIp = getClientIp(req)
  const rateLimit = checkRateLimit(clientIp)

  if (!rateLimit.allowed) {
    const retryAfter = Math.ceil((rateLimit.resetTime - Date.now()) / 1000)
    return new Response(
      JSON.stringify({ error: 'Too many requests. Please try again later.' }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(retryAfter),
          ...corsHeaders,
        },
      }
    )
  }

  try {
    const groqApiKey = Deno.env.get('GROQ_API_KEY')
    if (!groqApiKey) {
      console.error('GROQ_API_KEY not set')
      return jsonResponse({ error: 'Server configuration error' }, 500)
    }

    let body: { content?: unknown; generateTitle?: unknown }
    try {
      body = await req.json()
    } catch {
      return jsonResponse({ error: 'Invalid JSON body' }, 400)
    }

    const { content, generateTitle = true } = body

    if (!content || typeof content !== 'string' || !content.trim()) {
      return jsonResponse(
        { error: 'Content is required and must be a non-empty string' },
        400
      )
    }

    const groqClient = new Groq({ apiKey: groqApiKey })
    // Match frontend MAX_CONTENT_CHARACTERS limit (15k)
    const truncatedContent = content.trim().slice(0, 15000)
    const userMessage = config.user_message
      .replace('{text_content}', truncatedContent)
      .replace('{generate_title}', String(generateTitle))

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
      throw new Error('No content in response')
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(responseContent)
    } catch {
      const jsonMatch = responseContent.match(/\{[\s\S]*}/)
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('Invalid JSON in response')
      }
    }

    if (!isValidResponse(parsed)) {
      throw new Error('Response does not match expected format')
    }

    return jsonResponse(
      {
        title: parsed.title,
        questionSets: parsed.questionSets,
        fiction: parsed.fiction,
      },
      200,
      {
        'X-RateLimit-Remaining': String(rateLimit.remaining),
      }
    )
  } catch (error) {
    console.error('Error processing text:', error)
    return jsonResponse({ error: 'Failed to process text' }, 500, {
      'X-RateLimit-Remaining': String(rateLimit.remaining),
    })
  }
})
