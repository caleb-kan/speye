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

// Prompt sections split for clean skipContentCheck handling
const TOS_CHECK_SYSTEM_SUFFIX =
  ' You also check if content violates terms of service.'

const TOS_CHECK_PROMPT = `FIRST, evaluate if the text violates any of these content policies:
- Unlawful content or promotion of unlawful activities
- Sexually obscene content
- Libelous, defamatory, or fraudulent content
- Discriminatory or abusive content toward any individual or group
- Hate speech, threatening, or pornographic content
- Content degrading others based on gender, race, class, ethnicity, national origin, religion, sexual preference, orientation, identity, disability, or other classification
- Content that incites violence or contains nudity or graphic/gratuitous violence
- Content that violates privacy or publicity rights
- Content that solicits or collects personal information without consent
- Malware or exploit-related content
- Content that infringes on proprietary rights (patent, trademark, copyright, etc.)

If the text violates ANY of these policies, respond with:
{
  "status": "error",
  "error": "Content violates terms of service",
  "violation_type": "brief description of violation"
}

If the text does NOT violate policies, process it by generating a title, quiz question sets, and summary (if non-fiction):

`

const PROCESSING_PROMPT = `{text_content}

---

OUTPUT SCHEMA (for approved content):
{
  "status": "success",
  "title": string | null,
  "questionSets": QuestionSet[],
  "fiction": boolean,
  "summary": string | null
}

- status: Always "success" for approved content
- title: Generate a title ONLY if generateTitle is true, otherwise set to null
- questionSets: Array of exactly 5 question sets, each containing 5 questions (25 questions total)
- fiction: true if the text is fiction, false if non-fiction
- summary: If the text is non-fiction, generate a concise summary. If fiction, set to null.

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
11. IMPORTANT: For non-fiction texts, every question must be answerable from BOTH the full text AND the generated summary. Focus on key concepts and main findings, not minor details.

---

SUMMARY REQUIREMENTS (non-fiction only, set to null for fiction):
1. Length: approximately 20-30% of the original text length, minimum 200 words
2. Preserve all key arguments, findings, and conclusions
3. Maintain the logical structure and flow of the original
4. Use clear, readable prose (not bullet points)
5. Retain specific facts, names, dates, and data central to the text
6. Must contain enough information to answer all quiz questions above
7. Do not add information not in the original text

---

CONFIGURATION:
generateTitle: {generate_title}

---

Output valid JSON only:`

const config = {
  model: 'openai/gpt-oss-120b',
  temperature: 0.3,
  max_tokens: 12000,
  top_p: 1,
  system_message: `You are an expert educational content processor. You analyze text and generate a title, comprehension quiz questions, classify if the text is fiction or non-fiction, and generate a summary for non-fiction texts.${TOS_CHECK_SYSTEM_SUFFIX} You respond with valid JSON only - no markdown code blocks, no explanations, no text before or after the JSON object.`,
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

// Canonical type definition: backend/supabase/database/texts/types.ts
interface QuizQuestion {
  question: string
  options: string[]
  correctAnswer: number
}

interface QuestionSet {
  questions: QuizQuestion[]
}

interface ErrorResponse {
  status: 'error'
  error: string
  violation_type: string
}

interface ProcessTextResponse {
  status: 'success'
  title: string | null
  questionSets: QuestionSet[]
  fiction: boolean
  summary: string | null
}

function isErrorResponse(data: unknown): data is ErrorResponse {
  if (!data || typeof data !== 'object') return false
  const response = data as ErrorResponse

  return (
    response.status === 'error' &&
    typeof response.error === 'string' &&
    typeof response.violation_type === 'string'
  )
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

  if (response.status !== 'success') return false

  if (response.title !== null && typeof response.title !== 'string')
    return false

  if (!Array.isArray(response.questionSets)) return false
  if (response.questionSets.length !== 5) return false

  if (typeof response.fiction !== 'boolean') return false

  // Validate summary: non-fiction must have a non-empty string summary.
  // Fiction summary is accepted here and nulled out in the response handler
  // to avoid rejecting an otherwise valid response due to LLM inconsistency.
  if (!response.fiction) {
    if (typeof response.summary !== 'string' || !response.summary.trim())
      return false
  }

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

    let body: {
      content?: unknown
      generateTitle?: unknown
      skipContentCheck?: unknown
    }
    try {
      body = await req.json()
    } catch {
      return jsonResponse({ error: 'Invalid JSON body' }, 400)
    }

    const { content, generateTitle = true } = body

    // skipContentCheck can only be used by the worker (service role key)
    // to prevent external callers from bypassing content moderation
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const authHeader = req.headers.get('Authorization')
    const isServiceRole =
      !!serviceRoleKey && authHeader === `Bearer ${serviceRoleKey}`
    const skipContentCheck = body.skipContentCheck === true && isServiceRole

    if (!content || typeof content !== 'string' || !content.trim()) {
      return jsonResponse(
        { error: 'Content is required and must be a non-empty string' },
        400
      )
    }

    const groqClient = new Groq({ apiKey: groqApiKey })
    // Match frontend MAX_CONTENT_CHARACTERS limit (15k)
    const truncatedContent = content.trim().slice(0, 15000)

    // When admin has approved flagged content, skip TOS check on reprocessing
    let systemMessage: string
    let userMessage: string
    if (skipContentCheck) {
      systemMessage = config.system_message.replace(TOS_CHECK_SYSTEM_SUFFIX, '')
      userMessage = (
        'This text has been reviewed and approved by an administrator. ' +
        'Do NOT perform any content policy checks. ' +
        'Process it by generating a title, quiz question sets, and summary (if non-fiction):\n\n' +
        PROCESSING_PROMPT
      )
        .replace('{generate_title}', String(generateTitle))
        .replace('{text_content}', truncatedContent)
    } else {
      systemMessage = config.system_message
      userMessage = (TOS_CHECK_PROMPT + PROCESSING_PROMPT)
        .replace('{generate_title}', String(generateTitle))
        .replace('{text_content}', truncatedContent)
    }

    const response = await groqClient.chat.completions.create({
      model: config.model,
      messages: [
        { role: 'system', content: systemMessage },
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

    // When skipContentCheck is true (admin-approved reprocessing), ignore
    // TOS error responses since the admin has explicitly approved this content
    if (!skipContentCheck && isErrorResponse(parsed)) {
      return jsonResponse(
        {
          error: parsed.error,
          violation_type: parsed.violation_type,
        },
        400,
        {
          'X-RateLimit-Remaining': String(rateLimit.remaining),
        }
      )
    }

    if (!isValidResponse(parsed)) {
      throw new Error('Response does not match expected format')
    }

    return jsonResponse(
      {
        title: parsed.title,
        questionSets: parsed.questionSets,
        fiction: parsed.fiction,
        summary: parsed.fiction ? null : (parsed.summary ?? null),
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
