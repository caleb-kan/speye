import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import Groq from 'npm:groq-sdk@0.37.0'

// Must match frontend/src/constants/textUpload.ts MAX_CONTENT_CHARACTERS
const MAX_CONTENT_LENGTH = 15_000

// Retries for model outputs that are not valid JSON or don't match the expected
// response shape. A value of 2 means: initial attempt + 2 retries = 3 attempts.
const INVALID_OUTPUT_RETRIES = 2

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

// JSON schemas for Groq structured output (strict: true).
// Strict mode requires root type: "object", so fullSchema uses a flat
// object with nullable fields instead of root-level anyOf.
// Array length constraints (minItems/maxItems) are not supported in
// strict mode, so cardinality is enforced by prompt + runtime validation.
// Keep in sync with the TypeScript interfaces below.

/** Wraps a JSON schema type as nullable via anyOf. */
function nullable(schema: Record<string, unknown>): {
  anyOf: [Record<string, unknown>, { type: 'null' }]
} {
  return { anyOf: [schema, { type: 'null' }] }
}

const questionSchema = {
  type: 'object',
  properties: {
    question: { type: 'string' },
    options: {
      type: 'array',
      items: { type: 'string' },
    },
    correctAnswer: { type: 'integer' },
  },
  required: ['question', 'options', 'correctAnswer'],
  additionalProperties: false,
} as const

const questionSetSchema = {
  type: 'object',
  properties: {
    questions: {
      type: 'array',
      items: questionSchema,
    },
  },
  required: ['questions'],
  additionalProperties: false,
} as const

// Used when skipContentCheck is true (admin-approved, no error variant needed)
const successSchema = {
  type: 'object',
  properties: {
    status: { type: 'string', enum: ['success'] },
    title: nullable({ type: 'string' }),
    questionSets: {
      type: 'array',
      items: questionSetSchema,
    },
    fiction: { type: 'boolean' },
    summary: nullable({ type: 'string' }),
  },
  required: ['status', 'title', 'questionSets', 'fiction', 'summary'],
  additionalProperties: false,
} as const

// Used when TOS check is active: flat object with all fields.
// On error: status="error", error/violation_type populated, others null.
// On success: status="success", title/questionSets/fiction/summary populated,
// error/violation_type null. Discriminated by isErrorResponse/isValidResponse.
const fullSchema = {
  type: 'object',
  properties: {
    ...successSchema.properties,
    status: { type: 'string', enum: ['success', 'error'] },
    questionSets: nullable({ type: 'array', items: questionSetSchema }),
    fiction: nullable({ type: 'boolean' }),
    error: nullable({ type: 'string' }),
    violation_type: nullable({ type: 'string' }),
  },
  required: [...successSchema.required, 'error', 'violation_type'],
  additionalProperties: false,
} as const

// Prompt sections and schemas split for skipContentCheck handling.
// When true: TOS prompt/suffix excluded, successSchema used.
// When false: full TOS prompt included, fullSchema (error | success) used.
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

If the text violates ANY of these policies, set status to "error", provide a description in the "error" field and a brief category in the "violation_type" field, and set title, questionSets, fiction, and summary to null.

If the text does NOT violate policies, set status to "success", set error and violation_type to null, and process it by generating a title, quiz question sets, and summary (if non-fiction):

`

const PROCESSING_PROMPT = `{text_content}

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

Output valid JSON only:`

const config = {
  model: 'openai/gpt-oss-120b',
  temperature: 0.3,
  max_tokens: 12000,
  top_p: 1,
  // "Respond with valid JSON" retained as belt-and-suspenders alongside
  // json_schema: the model has been observed ignoring the schema directive.
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

// Three representations of quiz structure must stay in sync:
// 1. Canonical types: backend/supabase/database/texts/types.ts
// 2. JSON schemas: questionSchema, questionSetSchema (above)
// 3. Local interfaces: QuizQuestion, QuestionSet (below)
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

// Must match lib/quizConstants.ts
const NUM_QUESTION_SETS = 5
const NUM_QUESTIONS = 5
const NUM_OPTIONS_PER_QUESTION = 4

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
    q.question.trim().length > 0 &&
    Array.isArray(q.options) &&
    q.options.length === NUM_OPTIONS_PER_QUESTION &&
    q.options.every(
      (opt: unknown) =>
        typeof opt === 'string' && (opt as string).trim().length > 0
    ) &&
    Number.isInteger(q.correctAnswer) &&
    q.correctAnswer >= 0 &&
    q.correctAnswer <= NUM_OPTIONS_PER_QUESTION - 1
  )
}

function isValidResponse(data: unknown): data is ProcessTextResponse {
  if (!data || typeof data !== 'object') return false
  const response = data as ProcessTextResponse

  if (response.status !== 'success') return false

  if (response.title !== null && typeof response.title !== 'string')
    return false

  if (!Array.isArray(response.questionSets)) return false
  if (response.questionSets.length !== NUM_QUESTION_SETS) return false

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
      set.questions.length === NUM_QUESTIONS &&
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
    return jsonResponse(
      { error: 'Too many requests. Please try again later.' },
      429,
      { 'Retry-After': String(retryAfter) }
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
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError)
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
    const truncatedContent = content.trim().slice(0, MAX_CONTENT_LENGTH)

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

    let lastInvalidOutputError: Error | null = null

    for (let attempt = 0; attempt <= INVALID_OUTPUT_RETRIES; attempt += 1) {
      const response = await groqClient.chat.completions.create({
        model: config.model,
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: userMessage },
        ],
        temperature: config.temperature,
        max_tokens: config.max_tokens,
        top_p: config.top_p,
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: skipContentCheck
              ? 'process_text_success'
              : 'process_text_response',
            strict: true,
            schema: skipContentCheck ? successSchema : fullSchema,
          },
        },
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

      let parsed: unknown
      try {
        parsed = JSON.parse(responseContent)
      } catch (parseError) {
        lastInvalidOutputError = new Error(
          `Structured output returned invalid JSON: ${(parseError as Error).message}`
        )
        console.error(
          `Attempt ${attempt + 1}/${INVALID_OUTPUT_RETRIES + 1} - ${lastInvalidOutputError.message}. ` +
            'Raw (first 500 chars):',
          responseContent.slice(0, 500)
        )

        if (attempt < INVALID_OUTPUT_RETRIES) {
          continue
        }

        return jsonResponse(
          {
            error: 'Failed to process text',
            code: 'invalid_llm_json',
            reason: lastInvalidOutputError.message,
          },
          502,
          {
            'X-RateLimit-Remaining': String(rateLimit.remaining),
          }
        )
      }

      // When skipContentCheck is true, successSchema prevents error responses
      // at the schema level. This guard is kept as defense-in-depth.
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

      // Catch malformed error responses where the LLM set status "error" but
      // left error/violation_type as null (passes schema, fails isErrorResponse).
      // Treat as invalid output and retry; if retries are exhausted, return an
      // "unknown" violation type.
      if (
        !skipContentCheck &&
        typeof parsed === 'object' &&
        parsed !== null &&
        (parsed as Record<string, unknown>).status === 'error'
      ) {
        lastInvalidOutputError = new Error(
          'LLM returned error status with incomplete fields'
        )
        console.error(
          `Attempt ${attempt + 1}/${INVALID_OUTPUT_RETRIES + 1} - ${lastInvalidOutputError.message}. ` +
            'Parsed (first 500 chars):',
          JSON.stringify(parsed).slice(0, 500)
        )

        if (attempt < INVALID_OUTPUT_RETRIES) {
          continue
        }

        return jsonResponse(
          {
            error: 'Content flagged but details unavailable',
            violation_type: 'unknown',
          },
          400,
          {
            'X-RateLimit-Remaining': String(rateLimit.remaining),
          }
        )
      }

      if (!isValidResponse(parsed)) {
        lastInvalidOutputError = new Error(
          'Response does not match expected format'
        )
        console.error(
          `Attempt ${attempt + 1}/${INVALID_OUTPUT_RETRIES + 1} - ${lastInvalidOutputError.message}. ` +
            'Parsed (first 500 chars):',
          JSON.stringify(parsed).slice(0, 500)
        )

        if (attempt < INVALID_OUTPUT_RETRIES) {
          continue
        }

        return jsonResponse(
          {
            error: 'Failed to process text',
            code: 'invalid_llm_output',
            reason: lastInvalidOutputError.message,
          },
          502,
          {
            'X-RateLimit-Remaining': String(rateLimit.remaining),
          }
        )
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
    }

    // Should be unreachable because the loop either returns or throws.
    throw lastInvalidOutputError ?? new Error('Unknown processing error')
  } catch (error) {
    console.error('Error processing text:', error)
    return jsonResponse({ error: 'Failed to process text' }, 500, {
      'X-RateLimit-Remaining': String(rateLimit.remaining),
    })
  }
})
